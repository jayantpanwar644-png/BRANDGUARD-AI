"""
BrandGuard AI — Official X (Twitter) Provider
Implements X (Twitter) OAuth 2.0 authorization code flow with PKCE and API v2.
"""

import logging
import requests
from urllib.parse import urlencode
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security_tokens import decrypt_token
from backend.models.all_models import ConnectedSocialAccount
from backend.services.social_providers.base import BaseSocialProvider

logger = logging.getLogger(__name__)


class TwitterProvider(BaseSocialProvider):
    platform_name = "X (Twitter)"
    platform_key = "twitter"

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Constructs official X OAuth 2.0 authorization URL."""
        params = {
            "response_type": "code",
            "client_id": settings.TWITTER_API_KEY,
            "redirect_uri": redirect_uri,
            "scope": "tweet.read tweet.write users.read offline.access",
            "state": state,
            "code_challenge": "challenge",
            "code_challenge_method": "plain"
        }
        return "https://twitter.com/i/oauth2/authorize?" + urlencode(params)

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchanges authorization code for access token via X API v2 oauth2/token."""
        token_url = "https://api.twitter.com/2/oauth2/token"
        data = {
            "code": code,
            "grant_type": "authorization_code",
            "client_id": settings.TWITTER_API_KEY,
            "redirect_uri": redirect_uri,
            "code_verifier": "challenge"
        }
        auth = (settings.TWITTER_API_KEY, settings.TWITTER_API_SECRET)
        resp = requests.post(token_url, data=data, auth=auth, timeout=15)
        res_data = resp.json()
        if "access_token" not in res_data:
            err = res_data.get("error_description") or res_data.get("error", "X token exchange failed")
            raise ValueError(f"X (Twitter) authorization failed: {err}")

        return {
            "access_token": res_data["access_token"],
            "refresh_token": res_data.get("refresh_token"),
            "expires_in": res_data.get("expires_in", 7200),
            "raw_response": res_data
        }

    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """Retrieves authorized user profile from /2/users/me."""
        url = "https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified"
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(url, headers=headers, timeout=15)
        data = resp.json()
        user_data = data.get("data", {})
        account_id = str(user_data.get("id", "twitter_account"))
        username = user_data.get("username", "XUser")

        return {
            "account_id": account_id,
            "account_name": f"@{username}",
            "account_type": "X (Twitter) Profile",
            "permissions": "tweet.read, tweet.write, users.read",
            "profile_picture_url": user_data.get("profile_image_url")
        }

    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """Fetches recent replies and mentions on X."""
        token = decrypt_token(account.access_token)
        if not token:
            return {"platform": "X (Twitter)", "status": "Error", "error": "Decryption failed", "imported_comments": 0}

        headers = {"Authorization": f"Bearer {token}"}
        url = f"https://api.twitter.com/2/users/{account.account_id}/mentions?max_results=20&tweet.fields=created_at,author_id,conversation_id"
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"X mentions returned HTTP {resp.status_code}: {resp.text}")
                return {"platform": "X (Twitter)", "status": "Synced", "imported_comments": 0}

            tweets = resp.json().get("data", [])
            imported = 0
            for tw in tweets:
                tw_id = tw.get("id")
                tw_text = tw.get("text", "")
                if self.record_comment_feedback(
                    account=account,
                    db=db,
                    external_comment_id=f"tw_{tw_id}",
                    author_name=f"User_{tw.get('author_id', 'unknown')}",
                    author_id=tw.get("author_id"),
                    comment_text=tw_text,
                    created_at=datetime.now(timezone.utc),
                    is_reply=True
                ):
                    imported += 1

            account.last_synced_at = datetime.now(timezone.utc)
            db.commit()
            return {"platform": "X (Twitter)", "status": "Success", "imported_comments": imported}
        except Exception as e:
            logger.error(f"Error fetching X comments: {e}")
            return {"platform": "X (Twitter)", "status": "Error", "error": str(e), "imported_comments": 0}
