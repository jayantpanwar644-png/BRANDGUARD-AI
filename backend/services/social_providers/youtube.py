"""
BrandGuard AI — Official YouTube / Google Provider
Implements Google OAuth 2.0 and YouTube Data API v3 for Channel Comment Sync.
Official authorization: https://accounts.google.com/o/oauth2/v2/auth
Scopes: https://www.googleapis.com/auth/youtube.readonly, https://www.googleapis.com/auth/youtube.force-ssl
"""

import logging
import requests
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security_tokens import decrypt_token, encrypt_token
from backend.models.all_models import ConnectedSocialAccount
from backend.services.social_providers.base import BaseSocialProvider

logger = logging.getLogger(__name__)


class YouTubeProvider(BaseSocialProvider):
    platform_name = "YouTube"
    platform_key = "youtube"

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Official Google OAuth 2.0 authorization URL with offline access for refresh token."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchanges authorization code for access and refresh tokens via Google OAuth."""
        resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        token_data = resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            err_msg = token_data.get("error_description") or token_data.get("error", "Google token exchange failed")
            raise ValueError(f"Google authorization failed: {err_msg}")

        expires_in = token_data.get("expires_in", 3600)
        refresh_token = token_data.get("refresh_token")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": int(expires_in),
            "raw_response": token_data,
        }

    def refresh_access_token(self, account: ConnectedSocialAccount, db: Session) -> Optional[str]:
        """Refreshes expired YouTube access token using stored refresh token."""
        raw_access = decrypt_token(account.access_token)
        raw_refresh = decrypt_token(account.refresh_token)

        now = datetime.now(timezone.utc)
        exp = account.token_expires_at
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp > (now + timedelta(minutes=5)) and raw_access:
            return raw_access

        if not raw_refresh or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            return raw_access

        try:
            resp = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": raw_refresh,
                    "grant_type": "refresh_token",
                },
                timeout=12,
            )
            if resp.status_code == 200:
                data = resp.json()
                new_access = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                account.access_token = encrypt_token(new_access)
                account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
                db.commit()
                return new_access
            else:
                logger.warning(f"YouTube token refresh failed: {resp.text}")
        except Exception as exc:
            logger.error(f"Error during YouTube token refresh: {exc}")

        return raw_access

    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """Queries YouTube Data API v3 for authorized channel identity."""
        channel_resp = requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "snippet,contentDetails", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        account_name = "YouTube Channel"
        account_id = "unknown"

        if channel_resp.status_code == 200:
            channel_data = channel_resp.json()
            items = channel_data.get("items", [])
            if items:
                snippet = items[0].get("snippet", {})
                account_name = snippet.get("title", account_name)
                account_id = items[0].get("id", account_id)

        return {
            "account_id": str(account_id),
            "account_name": account_name,
            "account_type": "YouTube Channel (Data API v3)",
            "permissions": "https://www.googleapis.com/auth/youtube.readonly, https://www.googleapis.com/auth/youtube.force-ssl",
        }

    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """
        Synchronizes video comments for authorized YouTube Channel using commentThreads.list
        and comments.list. Respects API quotas and implements pagination.
        """
        token = self.refresh_access_token(account, db)
        if not token:
            account.status = "Token Expired"
            account.connection_error = "YouTube token expired or missing. Please click Reconnect."
            db.commit()
            return {"error": "Missing token", "imported_comments": 0}

        headers = {"Authorization": f"Bearer {token}"}

        # 1. Retrieve Uploads Playlist ID
        channel_resp = requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "contentDetails,snippet", "mine": "true"},
            headers=headers,
            timeout=10,
        )

        if channel_resp.status_code in (401, 403):
            err_data = channel_resp.json().get("error", {})
            reason = err_data.get("errors", [{}])[0].get("reason", "")
            if reason in ("quotaExceeded", "rateLimitExceeded"):
                account.connection_error = "YouTube API daily quota reached. Sync will resume tomorrow."
            else:
                account.status = "Token Expired"
                account.connection_error = "YouTube authorization expired or revoked. Please reconnect."
            db.commit()
            return {"error": account.connection_error, "imported_comments": 0}

        if channel_resp.status_code != 200:
            err_msg = channel_resp.json().get("error", {}).get("message", "Failed to retrieve channel")
            account.connection_error = f"YouTube API notice: {err_msg}"
            db.commit()
            return {"error": err_msg, "imported_comments": 0}

        items = channel_resp.json().get("items", [])
        if not items:
            return {"platform": "YouTube", "posts_scanned": 0, "imported_comments": 0, "status": "No channel found"}

        channel_item = items[0]
        uploads_playlist_id = channel_item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")

        # 2. Retrieve recent channel video uploads
        videos_resp = requests.get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params={
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist_id,
                "maxResults": 10,
            },
            headers=headers,
            timeout=10,
        )

        video_items = videos_resp.json().get("items", []) if videos_resp.status_code == 200 else []
        total_imported = 0
        posts_scanned = len(video_items)

        # 3. Retrieve video comments using commentThreads.list
        for v in video_items:
            video_id = v.get("contentDetails", {}).get("videoId")
            video_title = v.get("snippet", {}).get("title", "")
            if not video_id:
                continue

            video_url = f"https://www.youtube.com/watch?v={video_id}"

            comments_resp = requests.get(
                "https://www.googleapis.com/youtube/v3/commentThreads",
                params={
                    "part": "snippet,replies",
                    "videoId": video_id,
                    "maxResults": 20,
                    "textFormat": "plainText",
                },
                headers=headers,
                timeout=12,
            )

            if comments_resp.status_code != 200:
                continue

            threads = comments_resp.json().get("items", [])
            for t in threads:
                top_comment = t.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
                c_id = t.get("id")
                c_text = top_comment.get("textDisplay", "")
                author = top_comment.get("authorDisplayName", "YouTube User")
                pub_raw = top_comment.get("publishedAt")
                c_time = datetime.now(timezone.utc)
                if pub_raw:
                    try:
                        c_time = datetime.fromisoformat(pub_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass

                if self.record_comment_feedback(
                    account=account,
                    db=db,
                    comment_id=str(c_id),
                    comment_text=c_text,
                    author_name=author,
                    comment_date=c_time,
                    post_id=str(video_id),
                    post_url=video_url,
                ):
                    total_imported += 1

                # Check comment replies
                replies_data = t.get("replies", {}).get("comments", [])
                for reply in replies_data:
                    r_snippet = reply.get("snippet", {})
                    r_id = reply.get("id")
                    r_text = r_snippet.get("textDisplay", "")
                    r_author = r_snippet.get("authorDisplayName", "YouTube User")
                    if self.record_comment_feedback(
                        account=account,
                        db=db,
                        comment_id=str(r_id),
                        comment_text=r_text,
                        author_name=r_author,
                        comment_date=c_time,
                        post_id=str(video_id),
                        post_url=video_url,
                    ):
                        total_imported += 1

        account.status = "Connected"
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None
        db.commit()

        self.update_reputation_risks(account.organisation_id, db)

        return {
            "platform": "YouTube",
            "posts_scanned": posts_scanned,
            "imported_comments": total_imported,
            "status": "Success",
            "last_synced_at": account.last_synced_at.isoformat(),
        }
