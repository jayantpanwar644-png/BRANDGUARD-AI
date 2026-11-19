"""
BrandGuard AI — Base Social Provider Interface
Defines the unified connection and comment ingestion contract for all social platforms.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.models.all_models import (
    ConnectedSocialAccount, SocialComment, AudienceFeedback
)
from backend.services.sentiment_analyzer import analyze_comment_sentiment
from backend.services.incident_detector import evaluate_and_update_reputation_risks

logger = logging.getLogger(__name__)


class BaseSocialProvider(ABC):
    """
    Abstract Base Class for all social media OAuth and sync providers.
    Ensures consistent OAuth handshake, token exchange, and comment ingestion.
    """

    platform_name: str = "Generic"
    platform_key: str = "generic"

    @abstractmethod
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Constructs and returns the official platform OAuth authorization URL."""
        pass

    @abstractmethod
    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchanges authorization code for access tokens.
        Returns dict with:
            - access_token (str)
            - refresh_token (Optional[str])
            - expires_in (Optional[int])
            - raw_response (Dict[str, Any])
        """
        pass

    @abstractmethod
    def verify_identity(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieves and verifies the authorized account/page/channel identity.
        Returns dict with:
            - account_id (str)
            - account_name (str)
            - account_type (str)
            - permissions (str)
        """
        pass

    @abstractmethod
    def fetch_content_and_comments(self, account: ConnectedSocialAccount, db: Session) -> Dict[str, Any]:
        """
        Fetches accessible posts and customer comments from the platform API.
        Deduplicates, processes AI sentiment, and updates reputation risks.
        """
        pass

    def record_comment_feedback(
        self,
        account: ConnectedSocialAccount,
        db: Session,
        comment_id: str,
        comment_text: str,
        author_name: str,
        comment_date: datetime,
        post_id: Optional[str] = None,
        post_url: Optional[str] = None,
        internal_post_id: Optional[int] = None,
    ) -> bool:
        """
        Helper method to store a comment in SocialComment and AudienceFeedback tables
        with AI sentiment and reputation risk analysis.
        Returns True if newly inserted, False if already exists (deduplicated).
        """
        if not comment_text or not comment_text.strip():
            return False

        org_id = account.organisation_id

        # Deduplication check in AudienceFeedback
        existing = db.query(AudienceFeedback).filter(
            AudienceFeedback.organisation_id == org_id,
            AudienceFeedback.external_comment_id == str(comment_id)
        ).first()

        if existing:
            return False

        # Run AI Sentiment & Tone Analysis
        sentiment_res = analyze_comment_sentiment(comment_text)
        sentiment_label = sentiment_res.get("sentiment", "Neutral")
        confidence = float(sentiment_res.get("sentiment_confidence") or sentiment_res.get("confidence") or 0.85)
        topic = sentiment_res.get("topic", "Customer Feedback")
        emotion = sentiment_res.get("emotion")
        complaint_category = sentiment_res.get("complaint_category")
        is_spam = bool(sentiment_res.get("is_spam", False))
        urgency_score = float(sentiment_res.get("urgency_score") or 0.0)
        suggested_response = sentiment_res.get("suggested_response")
        recommended_action = sentiment_res.get("recommended_action")

        feedback_record = AudienceFeedback(
            organisation_id=org_id,
            post_id=internal_post_id,
            source_type=f"{self.platform_name} Live Sync",
            external_comment_id=str(comment_id),
            author_name=author_name or f"{self.platform_name} User",
            comment_text=comment_text,
            comment_date=comment_date or datetime.now(timezone.utc),
            platform=self.platform_name,
            sentiment=sentiment_label,
            sentiment_confidence=confidence,
            topic=topic,
        )
        db.add(feedback_record)

        # Also store in SocialComment for granular social audit trail
        social_comment = db.query(SocialComment).filter(
            SocialComment.organisation_id == org_id,
            SocialComment.external_comment_id == str(comment_id)
        ).first()

        if not social_comment:
            urgency_str = "High" if urgency_score >= 0.7 else ("Medium" if urgency_score >= 0.4 else "Low")
            social_comment = SocialComment(
                organisation_id=org_id,
                social_account_id=account.id,
                platform=self.platform_name,
                external_comment_id=str(comment_id),
                external_post_id=str(post_id) if post_id else None,
                author_name=author_name or f"{self.platform_name} User",
                comment_text=comment_text,
                sentiment=sentiment_label,
                sentiment_confidence=confidence,
                topic=topic,
                is_spam=is_spam,
                urgency_level=urgency_str,
                ai_analyzed=True,
                comment_timestamp=comment_date or datetime.now(timezone.utc),
                synced_at=datetime.now(timezone.utc),
            )
            db.add(social_comment)

        return True

    def update_reputation_risks(self, org_id: int, db: Session):
        """Triggers reputation incident detection after comment synchronization."""
        try:
            evaluate_and_update_reputation_risks(org_id, db)
        except Exception as exc:
            logger.warning(f"Error evaluating reputation risks for org {org_id}: {exc}")
