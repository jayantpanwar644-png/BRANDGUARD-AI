"""
BrandGuard AI — Official Facebook Provider
Implements Meta Facebook Login for Facebook Pages.
Official authorization: https://www.facebook.com/v22.0/dialog/oauth
Scopes: pages_show_list, pages_read_engagement, pages_read_user_content, pages_manage_posts
"""

import logging
import requests
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security_tokens import decrypt_token
from backend.models.all_models import ConnectedSocialAccount
from backend.services.social_providers.base import BaseSocialProvider

logger = logging.getLogger(__name__)


class FacebookProvider(BaseSocialProvider):
    platform_name = "Facebook"
    platform_key = "facebook"

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Official Facebook Page OAuth authorization dialog."""
        params = {
            "client_id": settings.META_APP_ID,
            "redirect_uri": redirect_uri,
            "scope": "pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts",
            "response_type": "code",
            "state": state,
        }
        return "https://www.facebook.com/v22.0/dialog/oauth?" + urlencode(params)

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchanges authorization code for user access token via Meta Graph API."""
        resp = requests.post(
            "https://graph.facebook.com/v22.0/oauth/access_token",
            data={
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "redirect_uri": redirect_uri,
                "code": code,
            },
            timeout=15,
        )
        token_data = resp.json()
        user_access_token = token_data.get("access_token")
        if not user_access_token:
            err_msg = token_data.get("error", {}).get("message", "Facebook token exchange failed")
            raise ValueError(f"Facebook authorization failed: {err_msg}")

        expires_in = token_data.get("expires_in", 5183944)
        return {
            "access_token": user_access_token,
            "refresh_token": None,
            "expires_in": int(expires_in),
            "raw_response": token_data,
        }

    def get_accessible_pages(self, user_access_token: str) -> List[Dict[str, Any]]:
        """Retrieves list of Facebook Pages managed by authorized user."""
        resp = requests.get(
            "https://graph.facebook.com/v22.0/me/accounts",
            params={
                "fields": "id,name,access_token,category,tasks",
                "access_token": user_access_token,
            },
            timeout=12,
        )
        if resp.status_code == 200:
            return resp.json().get("data", [])
        return []

    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieves user's managed Facebook Pages and selects the primary Page
        using the Page Access Token.
        """
        pages = self.get_accessible_pages(access_token)
        if pages:
            # Use the first authorized Page
            first_page = pages[0]
            page_id = str(first_page.get("id"))
            page_name = first_page.get("name", "Facebook Page")
            page_token = first_page.get("access_token", access_token)
            return {
                "account_id": page_id,
                "account_name": page_name,
                "account_type": "Facebook Business Page",
                "access_token": page_token,  # Store Page token for persistent feed access
                "permissions": "pages_show_list, pages_read_engagement, pages_read_user_content, pages_manage_posts",
                "available_pages": [{"id": str(p.get("id")), "name": p.get("name")} for p in pages],
            }

        # Fallback to User identity if no pages yet created
        me_resp = requests.get(
            "https://graph.facebook.com/v22.0/me",
            params={"fields": "id,name", "access_token": access_token},
            timeout=10,
        )
        me_data = me_resp.json() if me_resp.status_code == 200 else {}
        return {
            "account_id": str(me_data.get("id", "fb_user")),
            "account_name": me_data.get("name", "Facebook Account"),
            "account_type": "Facebook Profile / Personal Account",
            "access_token": access_token,
            "permissions": "pages_show_list, pages_read_engagement",
            "available_pages": [],
        }

    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """Fetches published posts and feed comments from the Facebook Page API."""
        token = decrypt_token(account.access_token)
        if not token:
            account.status = "Token Expired"
            account.connection_error = "Page access token missing. Please reconnect."
            db.commit()
            return {"error": "Missing token", "imported_comments": 0}

        page_id = account.account_id
        if not page_id or page_id == "unknown":
            page_id = "me"

        feed_url = f"https://graph.facebook.com/v22.0/{page_id}/feed"
        params = {
            "fields": "id,message,created_time,permalink_url,shares",
            "access_token": token,
            "limit": 15,
        }

        resp = requests.get(feed_url, params=params, timeout=15)
        if resp.status_code in (401, 190):
            account.status = "Token Expired"
            account.connection_error = "Facebook Page token expired or permissions revoked. Reconnection required."
            db.commit()
            return {"error": "Token expired", "imported_comments": 0}

        if resp.status_code != 200:
            err_msg = resp.json().get("error", {}).get("message", f"API status {resp.status_code}")
            account.connection_error = f"Facebook API notice: {err_msg}"
            db.commit()
            return {"error": err_msg, "imported_comments": 0}

        data = resp.json().get("data", [])
        total_imported = 0
        posts_scanned = len(data)

        for post in data:
            post_id = post.get("id")
            permalink = post.get("permalink_url")
            if not post_id:
                continue

            # Fetch comments for this Page post
            comments_resp = requests.get(
                f"https://graph.facebook.com/v22.0/{post_id}/comments",
                params={
                    "fields": "id,message,created_time,from,comments{id,message,from,created_time}",
                    "access_token": token,
                    "limit": 25,
                },
                timeout=12,
            )
            if comments_resp.status_code != 200:
                continue

            comments_data = comments_resp.json().get("data", [])
            for c in comments_data:
                c_id = c.get("id")
                c_text = c.get("message")
                author = c.get("from", {}).get("name", "Facebook User")
                c_time_raw = c.get("created_time")
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
                ):
                    total_imported += 1

                # Check sub-comments/replies
                sub_comments = c.get("comments", {}).get("data", [])
                for sub in sub_comments:
                    s_id = sub.get("id")
                    s_text = sub.get("message")
                    s_author = sub.get("from", {}).get("name", "Facebook User")
                    if self.record_comment_feedback(
                        account=account,
                        db=db,
                        comment_id=str(s_id),
                        comment_text=s_text,
                        author_name=s_author,
                        comment_date=c_time,
                        post_id=str(post_id),
                        post_url=permalink,
                    ):
                        total_imported += 1

        account.status = "Connected"
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None
        db.commit()

        self.update_reputation_risks(account.organisation_id, db)

        return {
            "platform": "Facebook",
            "posts_scanned": posts_scanned,
            "imported_comments": total_imported,
            "status": "Success",
            "last_synced_at": account.last_synced_at.isoformat(),
        }
