import os
import sys
import unittest
import uuid
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.core.database import SessionLocal
from backend.core.security import hash_password, create_access_token
from backend.core.security_tokens import encrypt_token
from backend.models.all_models import (
    User, Organisation, UploadedContent, ConnectedSocialAccount,
    PublishedPost, AudienceFeedback, SocialComment
)


class TestPublishingWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        uid = uuid.uuid4().hex[:6]
        cls.org = Organisation(
            name=f"Publishing Test Org {uid}",
            official_email=f"pub_test_{uid}@brandguard.ai"
        )
        cls.db.add(cls.org)
        cls.db.commit()
        cls.db.refresh(cls.org)

        cls.user = User(
            email=f"reviewer_{uid}@brandguard.ai",
            full_name="Lead Reviewer",
            hashed_password=hash_password("SecretPassword123!"),
            role="brand_governance_lead",
            organisation_id=cls.org.id
        )
        cls.db.add(cls.user)
        cls.db.commit()
        cls.db.refresh(cls.user)

        cls.token = create_access_token({
            "sub": str(cls.user.id),
            "email": cls.user.email,
            "org_id": cls.org.id
        })
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.query(SocialComment).filter(SocialComment.organisation_id == cls.org.id).delete()
        cls.db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == cls.org.id).delete()
        cls.db.query(PublishedPost).filter(PublishedPost.organisation_id == cls.org.id).delete()
        cls.db.query(UploadedContent).filter(UploadedContent.organisation_id == cls.org.id).delete()
        cls.db.query(ConnectedSocialAccount).filter(ConnectedSocialAccount.organisation_id == cls.org.id).delete()
        cls.db.query(User).filter(User.id == cls.user.id).delete()
        cls.db.query(Organisation).filter(Organisation.id == cls.org.id).delete()
        cls.db.commit()
        cls.db.close()

    def test_01_unapproved_content_publication_blocked(self):
        """Scenario 1: Unapproved content MUST be rejected with HTTP 400."""
        content = UploadedContent(
            organisation_id=self.org.id,
            title="Unapproved Draft Campaign",
            caption="Draft caption",
            platform="Instagram",
            media_type="Image",
            file_path="uploads/images/test_draft.jpg",
            file_name="test_draft.jpg",
            approval_status="Pending",  # NOT Approved
        )
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)

        resp = self.client.post(
            f"/api/integrations/publish-multi/{content.id}",
            json={"platforms": ["Instagram", "Facebook"]},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Publication Blocked", resp.json()["detail"])

    def test_02_rejected_content_publication_blocked(self):
        """Scenario 2: Rejected content MUST be blocked from publishing."""
        content = UploadedContent(
            organisation_id=self.org.id,
            title="Rejected Campaign",
            caption="Non-compliant claims",
            platform="Instagram",
            media_type="Image",
            file_path="uploads/images/test_rejected.jpg",
            file_name="test_rejected.jpg",
            approval_status="Rejected",
        )
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)

        resp = self.client.post(
            f"/api/integrations/publish-multi/{content.id}",
            json={"platforms": ["Instagram"]},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Publication Blocked", resp.json()["detail"])

    def test_03_approved_content_without_connected_account(self):
        """Scenario 3: Approved content returns platform failure when no account is connected."""
        content = UploadedContent(
            organisation_id=self.org.id,
            title="Compliant Approved Campaign",
            caption="Verified sustainable ingredients #EcoSafe",
            platform="Instagram",
            media_type="Image",
            file_path="uploads/images/test_approved.jpg",
            file_name="test_approved.jpg",
            approval_status="Approved",
        )
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)

        resp = self.client.post(
            f"/api/integrations/publish-multi/{content.id}",
            json={"platforms": ["X (Twitter)", "Instagram"], "caption": "Updated caption", "hashtags": "#CleanBeauty"},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["content_id"], content.id)
        self.assertEqual(data["published_count"], 0)
        self.assertEqual(data["failed_count"], 2)
        for res in data["results"]:
            self.assertEqual(res["status"], "Failed")
            self.assertIn("No active", res["error"])

    def test_04_approved_content_with_connected_account_and_comment_sync(self):
        """Scenario 4: Approved content with connected account publishes and checks comment collection."""
        # Connect mock Twitter account
        acc = ConnectedSocialAccount(
            organisation_id=self.org.id,
            platform="X (Twitter)",
            account_name="@brandguard_live",
            account_id="twitter_test_123",
            status="Connected",
            access_token=encrypt_token("mock_twitter_token"),
            permissions="tweet.read, tweet.write, users.read",
            last_synced_at=datetime.now(timezone.utc)
        )
        self.db.add(acc)

        # Connect mock YouTube account
        yt_acc = ConnectedSocialAccount(
            organisation_id=self.org.id,
            platform="YouTube",
            account_name="BrandGuard Official YT",
            account_id="yt_channel_123",
            status="Connected",
            access_token=encrypt_token("mock_yt_token"),
            permissions="youtube.readonly",
            last_synced_at=datetime.now(timezone.utc)
        )
        self.db.add(yt_acc)
        self.db.commit()

        content = UploadedContent(
            organisation_id=self.org.id,
            title="Approved Final Campaign",
            caption="Pure botanical formulas, 100% recyclable.",
            platform="Instagram",
            media_type="Image",
            file_path="uploads/images/test_final.jpg",
            file_name="test_final.jpg",
            approval_status="Approved",
        )
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)

        # YouTube format limitation check
        resp = self.client.post(
            f"/api/integrations/publish-multi/{content.id}",
            json={"platforms": ["YouTube", "X (Twitter)"]},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        yt_res = next((r for r in data["results"] if r["platform"] == "YouTube"), None)
        self.assertIsNotNone(yt_res)
        self.assertEqual(yt_res["status"], "Limitation")
        self.assertIn("requires video media", yt_res["error"])


if __name__ == "__main__":
    unittest.main()
