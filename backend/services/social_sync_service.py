"""
BrandGuard AI — Social Media Content & Comment Synchronization Service
Centralized ingestion pipeline that coordinates social media synchronization
across all supported platforms using dedicated provider adapters.
"""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.models.all_models import ConnectedSocialAccount
from backend.services.social_providers import get_social_provider

logger = logging.getLogger(__name__)


def sync_instagram_account(account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
    """Fetches real published media and comments from Instagram Graph API."""
    provider = get_social_provider("instagram")
    return provider.fetch_content_and_comments(account, db)


def sync_facebook_account(account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
    """Fetches real published feed posts and comments from Meta Facebook Page API."""
    provider = get_social_provider("facebook")
    return provider.fetch_content_and_comments(account, db)


def sync_linkedin_account(account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
    """Fetches real published posts and comments from LinkedIn Community Management API."""
    provider = get_social_provider("linkedin")
    return provider.fetch_content_and_comments(account, db)


def sync_youtube_account(account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
    """Fetches real video comments and comment replies from YouTube Data API v3."""
    provider = get_social_provider("youtube")
    return provider.fetch_content_and_comments(account, db)


def dispatch_platform_sync(account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
    """
    Dispatches synchronization to the correct platform provider adapter.
    No simulated or fabricated data is ever created.
    """
    p_key = account.platform.strip().lower()
    try:
        provider = get_social_provider(p_key)
        return provider.fetch_content_and_comments(account, db)
    except ValueError as exc:
        logger.warning(f"Unsupported platform synchronization request: {exc}")
        return {
            "platform": account.platform,
            "status": "Error",
            "error": str(exc),
            "imported_comments": 0
        }
    except Exception as exc:
        logger.error(f"Unexpected error during {account.platform} synchronization: {exc}", exc_info=True)
        account.connection_error = f"Synchronization error: {str(exc)}"
        db.commit()
        return {
            "platform": account.platform,
            "status": "Error",
            "error": str(exc),
            "imported_comments": 0
        }
