"""
BrandGuard AI — Official Instagram Provider
Implements Instagram Login for Business & Creator Accounts.
Official authorization: https://www.instagram.com/oauth/authorize
Scopes: instagram_business_basic, instagram_business_manage_comments
"""

import logging
import requests
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security_tokens import decrypt_token, encrypt_token
from backend.models.all_models import (
    ConnectedSocialAccount, UploadedContent, PublishedPost
)
from backend.services.social_providers.base import BaseSocialProvider

logger = logging.getLogger(__name__)


class InstagramProvider(BaseSocialProvider):
    platform_name = "Instagram"
    platform_key = "instagram"

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """
        Constructs official Instagram Login for Business authorization dialog URL.
        Endpoint: https://www.instagram.com/oauth/authorize
        Scopes:
          - instagram_business_basic: Account identity, username, profile picture, media list
          - instagram_business_manage_comments: Read comments and comment replies
        """
        auth_mode = getattr(settings, "INSTAGRAM_AUTH_MODE", "instagram_login").lower()
        if auth_mode == "meta_graph":
            # Facebook Login dialog with Instagram Graph API scopes
            params = {
                "client_id": settings.META_APP_ID,
                "redirect_uri": redirect_uri,
                "scope": "instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement",
                "response_type": "code",
                "state": state,
            }
            return "https://www.facebook.com/v22.0/dialog/oauth?" + urlencode(params)

        # Standard Instagram Login for Business
        params = {
            "client_id": settings.META_APP_ID,
            "redirect_uri": redirect_uri,
            "scope": "instagram_business_basic,instagram_business_manage_comments",
            "response_type": "code",
            "state": state,
            "enable_fb_login": "0",
            "force_authentication": "1",
        }
        return "https://www.instagram.com/oauth/authorize?" + urlencode(params)

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchanges authorization code for an access token.
        1. Exchanges code for short-lived token via api.instagram.com
        2. Exchanges short-lived token for long-lived 60-day token via graph.instagram.com
        """
        # Strip potential trailing hash fragments (#_ or #) appended by Meta
        clean_code = code.split("#")[0].strip()

        # Step 1: Exchange code for short-lived token via api.instagram.com
        ig_resp = requests.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": clean_code,
            },
            timeout=15,
        )

        user_access_token = None
        short_data = {}
        if ig_resp.status_code == 200:
            short_data = ig_resp.json()
            user_access_token = short_data.get("access_token")
        else:
            try:
                short_data = ig_resp.json()
            except Exception:
                short_data = {"raw_text": ig_resp.text}

        # Step 1b: Fallback to Meta Graph API if Facebook-linked Business Login was used
        if not user_access_token:
            fb_resp = requests.post(
                "https://graph.facebook.com/v22.0/oauth/access_token",
                data={
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": clean_code,
                },
                timeout=15,
            )
            if fb_resp.status_code == 200:
                short_data = fb_resp.json()
                user_access_token = short_data.get("access_token")

        if not user_access_token:
            err_msg = (
                short_data.get("error_message")
                or short_data.get("error", {}).get("message")
                or short_data.get("error_description")
                or "Meta rejected authorization code exchange. Ensure App Secret and Redirect URI match Meta Dashboard exactly."
            )
            raise ValueError(f"Instagram authorization failed: {err_msg}")

        # Step 2: Exchange short-lived token for 60-day long-lived access token
        expires_in = 5183944  # 60 days default in seconds (60 * 24 * 3600 = 5,184,000)
        long_token = user_access_token

        ll_resp = requests.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": settings.META_APP_SECRET,
                "access_token": user_access_token,
            },
            timeout=15,
        )

        if ll_resp.status_code == 200:
            ll_data = ll_resp.json()
            long_token = ll_data.get("access_token", user_access_token)
            expires_in = ll_data.get("expires_in", 5183944)
        else:
            # Fallback for Facebook Graph tokens
            fb_ll = requests.get(
                "https://graph.facebook.com/v22.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "fb_exchange_token": user_access_token,
                },
                timeout=15,
            )
            if fb_ll.status_code == 200:
                fb_ll_data = fb_ll.json()
                long_token = fb_ll_data.get("access_token", user_access_token)
                expires_in = fb_ll_data.get("expires_in", 5183944)

        return {
            "access_token": long_token,
            "refresh_token": None,
            "expires_in": int(expires_in),
            "raw_response": short_data,
        }

    def refresh_access_token(self, access_token: str) -> Dict[str, Any]:
        """
        Refreshes a long-lived Instagram access token before it expires.
        Endpoint: GET https://graph.instagram.com/refresh_access_token
        Tokens must be at least 24 hours old and not yet expired.
        """
        try:
            resp = requests.get(
                "https://graph.instagram.com/refresh_access_token",
                params={
                    "grant_type": "ig_refresh_token",
                    "access_token": access_token,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "access_token": data.get("access_token", access_token),
                    "expires_in": data.get("expires_in", 5183944),
                    "success": True,
                }
            return {"access_token": access_token, "success": False, "error": resp.text}
        except Exception as exc:
            logger.warning(f"Error during Instagram token refresh: {exc}")
            return {"access_token": access_token, "success": False, "error": str(exc)}

    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """
        Queries official Instagram Graph API for authentic account identity,
        username, display name, and profile picture.
        """
        account_id = "unknown"
        account_name = "instagram_user"
        display_name = ""
        account_type = "Instagram Professional"
        profile_picture_url = None

        # 1. Primary: Instagram Graph API /me endpoint
        me_resp = requests.get(
            "https://graph.instagram.com/v22.0/me",
            params={
                "fields": "id,username,name,account_type,profile_picture_url",
                "access_token": access_token,
            },
            timeout=12,
        )

        if me_resp.status_code == 200:
            me_data = me_resp.json()
            account_id = str(me_data.get("id", account_id))
            account_name = me_data.get("username", account_name)
            display_name = me_data.get("name", "")
            account_type = me_data.get("account_type", account_type)
            profile_picture_url = me_data.get("profile_picture_url")
        else:
            # Retry with minimal fields in case profile_picture_url is omitted
            me_min = requests.get(
                "https://graph.instagram.com/v22.0/me",
                params={"fields": "id,username,account_type", "access_token": access_token},
                timeout=12,
            )
            if me_min.status_code == 200:
                me_data = me_min.json()
                account_id = str(me_data.get("id", account_id))
                account_name = me_data.get("username", account_name)
                account_type = me_data.get("account_type", account_type)
            else:
                # 2. Secondary: Fallback for Meta Business Suite / Facebook Linked Accounts
                fb_resp = requests.get(
                    "https://graph.facebook.com/v22.0/me",
                    params={
                        "fields": "id,name,instagram_business_account{id,username,name,profile_picture_url}",
                        "access_token": access_token,
                    },
                    timeout=12,
                )
                if fb_resp.status_code == 200:
                    fb_data = fb_resp.json()
                    ig_biz = fb_data.get("instagram_business_account")
                    if ig_biz:
                        account_id = str(ig_biz.get("id", account_id))
                        account_name = ig_biz.get("username", account_name)
                        display_name = ig_biz.get("name", "")
                        profile_picture_url = ig_biz.get("profile_picture_url")
                else:
                    # 3. Tertiary: Check /me/accounts for pages with connected Instagram account
                    pages_resp = requests.get(
                        "https://graph.facebook.com/v22.0/me/accounts",
                        params={
                            "fields": "id,name,instagram_business_account{id,username,name,profile_picture_url}",
                            "access_token": access_token,
                        },
                        timeout=12,
                    )
                    if pages_resp.status_code == 200:
                        for page in pages_resp.json().get("data", []):
                            ig_biz = page.get("instagram_business_account")
                            if ig_biz:
                                account_id = str(ig_biz.get("id", account_id))
                                account_name = ig_biz.get("username", account_name)
                                display_name = ig_biz.get("name", "")
                                profile_picture_url = ig_biz.get("profile_picture_url")
                                break

        clean_handle = account_name if account_name.startswith("@") else f"@{account_name}"

        return {
            "account_id": account_id,
            "account_name": clean_handle,
            "display_name": display_name,
            "profile_picture_url": profile_picture_url,
            "account_type": f"{account_type} Account",
            "permissions": "instagram_business_basic, instagram_business_manage_comments",
        }

    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """
        Fetches authentic published posts and customer comments from Instagram Graph API.
        - Synchronizes posts into UploadedContent & PublishedPost
        - Analyzes comments via AI Sentiment Analysis
        - Updates BrandGuard Reputation Risk Center
        """
        token = decrypt_token(account.access_token)
        if not token:
            account.status = "Token Expired"
            account.connection_error = "OAuth access token missing. Please reconnect."
            db.commit()
            return {"error": "Missing token", "imported_comments": 0, "posts_scanned": 0}

        # Check token expiry and automatically refresh if expiring within 7 days
        if account.token_expires_at:
            exp = account.token_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp - datetime.now(timezone.utc) < timedelta(days=7):
                logger.info(f"Instagram token for {account.account_name} expiring soon. Refreshing...")
                refreshed = self.refresh_access_token(token)
                if refreshed.get("success"):
                    token = refreshed["access_token"]
                    account.access_token = encrypt_token(token)
                    new_exp = datetime.now(timezone.utc) + timedelta(seconds=int(refreshed.get("expires_in", 5183944)))
                    account.token_expires_at = new_exp
                    db.commit()
                    logger.info("Instagram token successfully refreshed.")

        base_url = "https://graph.instagram.com/v22.0"
        media_url = f"{base_url}/me/media"
        params = {
            "fields": "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,comments_count,like_count",
            "access_token": token,
            "limit": 25,
        }

        resp = requests.get(media_url, params=params, timeout=15)

        # Fallback to Facebook Graph API for Meta Business Linked Accounts
        if resp.status_code != 200 and account.account_id and account.account_id != "unknown":
            clean_id = account.account_id.replace("@", "")
            resp = requests.get(f"https://graph.facebook.com/v22.0/{clean_id}/media", params=params, timeout=15)

        # Check for expired/revoked token
        if resp.status_code in (401, 190):
            account.status = "Token Expired"
            account.connection_error = "Instagram session expired or was revoked. Please click Reconnect."
            db.commit()
            return {"error": "Token expired", "imported_comments": 0, "posts_scanned": 0}

        if resp.status_code != 200:
            err_data = resp.json().get("error", {}) if resp.status_code != 500 else {}
            err_msg = err_data.get("message", f"Instagram API responded with HTTP {resp.status_code}")
            account.connection_error = f"Instagram API notice: {err_msg}"
            db.commit()
            return {"error": err_msg, "imported_comments": 0, "posts_scanned": 0}

        data = resp.json().get("data", [])
        total_imported = 0
        posts_scanned = len(data)

        for post in data:
            post_id = str(post.get("id", ""))
            permalink = post.get("permalink") or f"https://www.instagram.com/p/{post_id}/"
            caption = post.get("caption") or ""
            media_type = post.get("media_type") or "IMAGE"
            media_url_val = post.get("media_url") or post.get("thumbnail_url") or permalink
            comments_count = int(post.get("comments_count") or 0)
            likes_count = int(post.get("like_count") or 0)
            post_time_raw = post.get("timestamp")

            post_time = datetime.now(timezone.utc)
            if post_time_raw:
                try:
                    post_time = datetime.fromisoformat(post_time_raw.replace("Z", "+00:00"))
                except Exception:
                    pass

            if not post_id:
                continue

            # Ensure this published post exists in BRANDGUARD AI PublishedPost and UploadedContent
            pub_post = db.query(PublishedPost).filter(
                PublishedPost.organisation_id == account.organisation_id,
                PublishedPost.platform == "Instagram",
                PublishedPost.external_post_id == post_id
            ).first()

            if not pub_post:
                # Create a matching UploadedContent record so the post is registered in Content Intelligence
                title_preview = (caption[:45] + "…") if len(caption) > 45 else (caption or f"Instagram Post #{post_id[-6:]}")
                content_item = UploadedContent(
                    organisation_id=account.organisation_id,
                    title=title_preview,
                    caption=caption,
                    platform="Instagram",
                    media_type="Image" if "IMAGE" in media_type.upper() else "Video",
                    file_path=media_url_val,
                    file_name=f"instagram_{post_id}.jpg",
                    file_size=0,
                    approval_status="Approved",
                    created_at=post_time,
                )
                db.add(content_item)
                db.flush()

                pub_post = PublishedPost(
                    organisation_id=account.organisation_id,
                    content_id=content_item.id,
                    platform="Instagram",
                    external_post_id=post_id,
                    post_url=permalink,
                    published_at=post_time,
                    likes_count=likes_count,
                    comments_count=comments_count,
                    status="Published",
                    publish_response="Synchronized via official Instagram Graph API."
                )
                db.add(pub_post)
                db.flush()
            else:
                pub_post.likes_count = likes_count
                pub_post.comments_count = comments_count

            # Fetch comments for this media item (with replies)
            comments_resp = requests.get(
                f"{base_url}/{post_id}/comments",
                params={
                    "fields": "id,text,timestamp,username,from,replies{id,text,username,timestamp}",
                    "access_token": token,
                    "limit": 50,
                },
                timeout=12,
            )

            # Fallback if replies field is restricted
            if comments_resp.status_code != 200:
                comments_resp = requests.get(
                    f"{base_url}/{post_id}/comments",
                    params={
                        "fields": "id,text,timestamp,username,from",
                        "access_token": token,
                        "limit": 50,
                    },
                    timeout=12,
                )

            if comments_resp.status_code != 200:
                continue

            comments_data = comments_resp.json().get("data", [])
            for c in comments_data:
                c_id = c.get("id")
                c_text = c.get("text")
                author = c.get("username") or c.get("from", {}).get("username", "instagram_user")
                c_time_raw = c.get("timestamp")
                c_time = datetime.now(timezone.utc)
                if c_time_raw:
                    try:
                        c_time = datetime.fromisoformat(c_time_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass

                if self.record_comment_feedback(
                    account=account,
                    db=db,
                    comment_id=str(c_id),
                    comment_text=c_text,
                    author_name=author,
                    comment_date=c_time,
                    post_id=str(post_id),
                    post_url=permalink,
                    internal_post_id=pub_post.id,
                ):
                    total_imported += 1

                # Process replies if present
                replies = c.get("replies", {}).get("data", [])
                for reply in replies:
                    r_id = reply.get("id")
                    r_text = reply.get("text")
                    r_author = reply.get("username") or reply.get("from", {}).get("username", "instagram_user")
                    r_time_raw = reply.get("timestamp")
                    r_time = datetime.now(timezone.utc)
                    if r_time_raw:
                        try:
                            r_time = datetime.fromisoformat(r_time_raw.replace("Z", "+00:00"))
                        except Exception:
                            pass

                    if self.record_comment_feedback(
                        account=account,
                        db=db,
                        comment_id=str(r_id),
                        comment_text=r_text,
                        author_name=r_author,
                        comment_date=r_time,
                        post_id=str(post_id),
                        post_url=permalink,
                        internal_post_id=pub_post.id,
                    ):
                        total_imported += 1

        account.status = "Connected"
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None
        db.commit()

        # Update reputation risks in BrandGuard AI
        self.update_reputation_risks(account.organisation_id, db)

        return {
            "platform": "Instagram",
            "posts_scanned": posts_scanned,
            "imported_comments": total_imported,
            "status": "Success",
            "last_synced_at": account.last_synced_at.isoformat(),
        }
