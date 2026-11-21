"""
BrandGuard AI — Official LinkedIn Provider
Implements LinkedIn OAuth 2.0 and Community Management API for Company Pages.
Official authorization: https://www.linkedin.com/oauth/v2/authorization
Scopes: openid, profile, email, r_organization_social, w_organization_social, rw_organization_admin
"""

import logging
import requests
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security_tokens import decrypt_token
from backend.models.all_models import ConnectedSocialAccount, UploadedContent, PublishedPost
from backend.services.social_providers.base import BaseSocialProvider

logger = logging.getLogger(__name__)


class LinkedInProvider(BaseSocialProvider):
    platform_name = "LinkedIn"
    platform_key = "linkedin"

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Official LinkedIn OAuth 2.0 authorization code flow."""
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid profile email r_organization_social w_organization_social rw_organization_admin",
        }
        return "https://www.linkedin.com/oauth/v2/authorization?" + urlencode(params)

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchanges authorization code for access token via LinkedIn OAuth endpoint."""
        resp = requests.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        token_data = resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            err_msg = token_data.get("error_description") or token_data.get("error", "LinkedIn token exchange failed")
            raise ValueError(f"LinkedIn authorization failed: {err_msg}")

        expires_in = token_data.get("expires_in", 5183944)
        return {
            "access_token": access_token,
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": int(expires_in),
            "raw_response": token_data,
        }

    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieves member profile and checks administrator access to authorized LinkedIn Company Pages.
        """
        account_name = "LinkedIn Organization"
        account_id = "unknown"
        account_type = "Company Page via Community API"
        approval_required = False

        headers = {"Authorization": f"Bearer {access_token}"}

        # 1. Retrieve member profile via OpenID userinfo
        me_resp = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers, timeout=10)
        if me_resp.status_code == 200:
            me_data = me_resp.json()
            account_name = me_data.get("name", "LinkedIn Member")
            account_id = me_data.get("sub", account_id)

        # 2. Check Organization Administration Access (Community Management API)
        org_resp = requests.get(
            "https://api.linkedin.com/v2/organizationalEntityAcls",
            params={"q": "roleAssignee", "role": "ADMINISTRATOR"},
            headers=headers,
            timeout=10,
        )

        if org_resp.status_code == 403:
            approval_required = True
            logger.info("LinkedIn organizationalEntityAcls returned 403: Community Management API approval required.")
        elif org_resp.status_code == 200:
            elements = org_resp.json().get("elements", [])
            if elements:
                target_urn = elements[0].get("organizationalTarget", "")
                if target_urn:
                    org_numeric_id = target_urn.split(":")[-1]
                    account_id = org_numeric_id
                    account_name = f"LinkedIn Company #{org_numeric_id}"

                    # Try resolving friendly organization name
                    try:
                        org_info_resp = requests.get(
                            f"https://api.linkedin.com/v2/organizations/{org_numeric_id}",
                            headers=headers,
                            timeout=8,
                        )
                        if org_info_resp.status_code == 200:
                            org_info = org_info_resp.json()
                            account_name = org_info.get("localizedName") or account_name
                    except Exception:
                        pass

        return {
            "account_id": str(account_id),
            "account_name": account_name,
            "account_type": account_type,
            "approval_required": approval_required,
            "permissions": "openid, profile, email, r_organization_social, w_organization_social, rw_organization_admin",
        }

    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """
        Synchronizes posts and comments for authorized LinkedIn Company Pages.
        Respects LinkedIn Community Management API approval tiers.
        """
        token = decrypt_token(account.access_token)
        if not token:
            account.status = "Token Expired"
            account.connection_error = "OAuth access token missing. Please reconnect."
            db.commit()
            return {"error": "Missing token", "imported_comments": 0}

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202401",
        }

        # Verify Community Management API permission status
        org_id = account.account_id
        if not org_id or org_id == "unknown":
            org_id = "me"

        # Check permissions tier
        posts_url = f"https://api.linkedin.com/rest/posts?author=urn:li:organization:{org_id}&q=author&count=10"
        resp = requests.get(posts_url, headers=headers, timeout=12)

        if resp.status_code == 403:
            # Community Management API approval required
            account.status = "Approval Required"
            account.connection_error = "LinkedIn Community Management API approval required."
            db.commit()
            return {
                "platform": "LinkedIn",
                "status": "Approval Required",
                "message": "LinkedIn Community Management API approval required.",
                "imported_comments": 0,
            }

        if resp.status_code in (401, 190):
            account.status = "Token Expired"
            account.connection_error = "LinkedIn session expired. Please click Reconnect."
            db.commit()
            return {"error": "Token expired", "imported_comments": 0}

        total_imported = 0
        posts_scanned = 0

        if resp.status_code == 200:
            posts = resp.json().get("elements", [])
            posts_scanned = len(posts)

            for post in posts:
                post_urn = post.get("id")
                if not post_urn:
                    continue

                caption = post.get("commentary") or post.get("text") or ""
                media_url = ""
                content_obj = post.get("content") or {}
                if isinstance(content_obj, dict):
                    media_url = content_obj.get("entity", {}).get("url") or content_obj.get("media", {}).get("id") or ""

                post_time = datetime.now(timezone.utc)
                created_ts = post.get("createdAt")
                if created_ts:
                    try:
                        post_time = datetime.fromtimestamp(created_ts / 1000.0, tz=timezone.utc)
                    except Exception:
                        pass

                clean_urn = post_urn.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "")
                permalink = f"https://www.linkedin.com/feed/update/{post_urn}/"

                pub_post = db.query(PublishedPost).filter(
                    PublishedPost.organisation_id == account.organisation_id,
                    PublishedPost.platform == "LinkedIn",
                    PublishedPost.external_post_id == post_urn
                ).first()

                if not pub_post:
                    title_preview = (caption[:45] + "…") if len(caption) > 45 else (caption or f"LinkedIn Post #{clean_urn[-6:]}")
                    content_item = UploadedContent(
                        organisation_id=account.organisation_id,
                        title=title_preview,
                        caption=caption,
                        platform="LinkedIn",
                        media_type="Article" if not media_url else "Image",
                        file_path=media_url or permalink,
                        file_name=f"linkedin_{clean_urn}.jpg",
                        file_size=0,
                        approval_status="Approved",
                        created_at=post_time,
                    )
                    db.add(content_item)
                    db.flush()

                    pub_post = PublishedPost(
                        organisation_id=account.organisation_id,
                        content_id=content_item.id,
                        platform="LinkedIn",
                        external_post_id=post_urn,
                        post_url=permalink,
                        published_at=post_time,
                        likes_count=0,
                        comments_count=0,
                        shares_count=0,
                        status="Published",
                        publish_response="Synchronized via official LinkedIn Community Management API."
                    )
                    db.add(pub_post)
                    db.flush()

                # Query social comments for this post
                comments_url = f"https://api.linkedin.com/rest/socialActions/{post_urn}/comments?count=20"
                c_resp = requests.get(comments_url, headers=headers, timeout=10)
                if c_resp.status_code == 200:
                    comments = c_resp.json().get("elements", [])
                    pub_post.comments_count = len(comments)
                    for c in comments:
                        c_urn = c.get("id", str(datetime.now(timezone.utc).timestamp()))
                        c_text = c.get("message", {}).get("text", "")
                        author_urn = c.get("actor", "")
                        author_name = author_urn.split(":")[-1] if author_urn else "LinkedIn Member"
                        c_time = datetime.now(timezone.utc)

                        if self.record_comment_feedback(
                            account=account,
                            db=db,
                            comment_id=str(c_urn),
                            comment_text=c_text,
                            author_name=author_name,
                            comment_date=c_time,
                            post_id=str(post_urn),
                            post_url=permalink,
                            internal_post_id=pub_post.id,
                        ):
                            total_imported += 1

        account.status = "Connected"
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None
        db.commit()

        self.update_reputation_risks(account.organisation_id, db)

        return {
            "platform": "LinkedIn",
            "posts_scanned": posts_scanned,
            "imported_comments": total_imported,
            "status": "Success",
            "last_synced_at": account.last_synced_at.isoformat(),
        }
