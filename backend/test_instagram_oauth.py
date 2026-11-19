"""
BrandGuard AI — Comprehensive Instagram OAuth Integration Test Suite
Validates the complete official Meta Instagram OAuth 2.0 flow:
1. Authorization URL generation with required scopes & CSRF state
2. CSRF state validation & rejection of forged/expired sessions
3. Meta error response handling
4. Code exchange (short-lived & 60-day long-lived tokens)
5. Account identity & profile picture retrieval
6. Secure Fernet token encryption
7. Media (posts) & comments ingestion
8. AI Sentiment analysis & Reputation Risk update
9. Token refresh logic
10. Disconnect & Reconnect flow
"""

import sys
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.core.security import create_access_token, hash_password
from backend.core.security_tokens import decrypt_token, encrypt_token
from backend.models.all_models import (
    User, Organisation, ConnectedSocialAccount, PublishedPost,
    UploadedContent, AudienceFeedback, SocialComment
)
from backend.routers.integrations import _oauth_state_store
from backend.services.social_providers import get_social_provider
from backend.services.social_providers.instagram import InstagramProvider


class TestInstagramOAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        # Ensure test organization and user exist
        cls.org = cls.db.query(Organisation).filter(Organisation.name == "Instagram Test Org").first()
        if not cls.org:
            cls.org = Organisation(
                name="Instagram Test Org",
                official_email="ig_test@brandguard.ai",
                industry="Social Media & Brand Safety"
            )
            cls.db.add(cls.org)
            cls.db.commit()
            cls.db.refresh(cls.org)

        cls.user = cls.db.query(User).filter(User.email == "ig_tester@brandguard.ai").first()
        if not cls.user:
            cls.user = User(
                email="ig_tester@brandguard.ai",
                hashed_password=hash_password("SecurePassword2026!"),
                full_name="Instagram Tester",
                role="Brand Manager",
                organisation_id=cls.org.id
            )
            cls.db.add(cls.user)
            cls.db.commit()
            cls.db.refresh(cls.user)

        cls.token = create_access_token(data={"sub": str(cls.user.id)})
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        # Clean up test accounts
        cls.db.query(SocialComment).filter(SocialComment.organisation_id == cls.org.id).delete()
        cls.db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == cls.org.id).delete()
        cls.db.query(PublishedPost).filter(PublishedPost.organisation_id == cls.org.id).delete()
        cls.db.query(UploadedContent).filter(UploadedContent.organisation_id == cls.org.id).delete()
        cls.db.query(ConnectedSocialAccount).filter(ConnectedSocialAccount.organisation_id == cls.org.id).delete()
        cls.db.commit()
        cls.db.close()

    def setUp(self):
        # Configure temporary test credentials in settings
        self.orig_meta_id = settings.META_APP_ID
        self.orig_meta_secret = settings.META_APP_SECRET
        self.orig_redirect = settings.INSTAGRAM_REDIRECT_URI

        settings.META_APP_ID = "782910482910482"
        settings.META_APP_SECRET = "abc1234567890abcdef1234567890abc"
        settings.INSTAGRAM_REDIRECT_URI = "http://localhost:3000/api/integrations/oauth/instagram/callback"

    def tearDown(self):
        settings.META_APP_ID = self.orig_meta_id
        settings.META_APP_SECRET = self.orig_meta_secret
        settings.INSTAGRAM_REDIRECT_URI = self.orig_redirect

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Test Authorization URL Generation
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_authorization_url_generation(self):
        """Verifies official Instagram authorization URL construction with correct scopes & state."""
        resp = self.client.get("/api/integrations/oauth/instagram/authorize", headers=self.headers)
        self.assertEqual(resp.status_code, 200, f"Authorize endpoint failed: {resp.text}")
        data = resp.json()

        self.assertIn("auth_url", data)
        self.assertIn("state", data)
        self.assertIn("redirect_uri", data)

        auth_url = data["auth_url"]
        self.assertTrue(auth_url.startswith("https://www.instagram.com/oauth/authorize"))
        self.assertIn("client_id=782910482910482", auth_url)
        self.assertIn("response_type=code", auth_url)
        self.assertIn("instagram_business_basic", auth_url)
        self.assertIn("instagram_business_manage_comments", auth_url)

        # State must be safely stored in the server memory store with TTL
        state = data["state"]
        self.assertIn(state, _oauth_state_store)
        self.assertEqual(_oauth_state_store[state]["platform"], "instagram")
        self.assertEqual(_oauth_state_store[state]["org_id"], self.org.id)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Test CSRF State Validation
    # ─────────────────────────────────────────────────────────────────────────
    def test_02_csrf_state_validation(self):
        """Rejects forged or missing CSRF state tokens."""
        # Bogus state
        resp = self.client.get(
            "/api/integrations/oauth/instagram/callback?code=mock_code_123&state=forged_state_token",
            follow_redirects=False
        )
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=", resp.headers["location"])
        self.assertIn("Invalid+or+expired", resp.headers["location"])

        # Missing state
        resp2 = self.client.get(
            "/api/integrations/oauth/instagram/callback?code=mock_code_123",
            follow_redirects=False
        )
        self.assertEqual(resp2.status_code, 302)
        self.assertIn("error=", resp2.headers["location"])

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Test Meta Provider Error Responses
    # ─────────────────────────────────────────────────────────────────────────
    def test_03_meta_error_response_handling(self):
        """Gracefully handles when user denies permissions on Meta login dialog."""
        resp = self.client.get(
            "/api/integrations/oauth/instagram/callback?error=access_denied&error_description=Permissions+not+granted",
            follow_redirects=False
        )
        self.assertEqual(resp.status_code, 302)
        location = resp.headers["location"]
        self.assertIn("error=", location)
        self.assertTrue("Permissions" in location)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Test Token Exchange & Secure Storage
    # ─────────────────────────────────────────────────────────────────────────
    @patch("requests.post")
    @patch("requests.get")
    def test_04_token_exchange_and_secure_storage(self, mock_get, mock_post):
        """Mocks Meta Graph API responses and tests full code exchange & Fernet encryption."""
        # 1. Create valid state
        auth_resp = self.client.get("/api/integrations/oauth/instagram/authorize", headers=self.headers)
        state = auth_resp.json()["state"]

        # Mock Short-Lived Token Exchange
        short_resp = MagicMock()
        short_resp.status_code = 200
        short_resp.json.return_value = {
            "access_token": "IG_SHORT_LIVED_TOKEN_12345",
            "user_id": 178414000123456
        }
        mock_post.return_value = short_resp

        # Mock Long-Lived Token Exchange & Identity & Media
        def mock_get_side_effect(url, **kwargs):
            m = MagicMock()
            m.status_code = 200
            params = kwargs.get("params", {})
            if isinstance(params, dict) and params.get("grant_type") == "ig_exchange_token":
                m.json.return_value = {
                    "access_token": "IG_LONG_LIVED_TOKEN_60_DAYS_67890",
                    "token_type": "bearer",
                    "expires_in": 5183944
                }
            elif "/me/media" in url:
                m.json.return_value = {
                    "data": [
                        {
                            "id": "18012345678901234",
                            "caption": "Protecting enterprise brand trust across every consumer touchpoint.",
                            "media_type": "IMAGE",
                            "media_url": "https://scontent.cdninstagram.com/post_1.jpg",
                            "permalink": "https://www.instagram.com/p/Cxyz1234/",
                            "timestamp": "2026-11-18T10:00:00Z",
                            "comments_count": 2,
                            "like_count": 142
                        }
                    ]
                }
            elif "/comments" in url:
                m.json.return_value = {
                    "data": [
                        {
                            "id": "17998877665544332",
                            "text": "This platform has completely transformed our brand compliance workflow! Incredible speed.",
                            "username": "sarah_marketing",
                            "timestamp": "2026-11-18T11:30:00Z",
                            "replies": {
                                "data": [
                                    {
                                        "id": "17998877665544333",
                                        "text": "Agreed! The real-time sentiment alerts saved us last week.",
                                        "username": "david_cmo",
                                        "timestamp": "2026-11-18T12:00:00Z"
                                    }
                                ]
                            }
                        }
                    ]
                }
            elif "/me" in url:
                m.json.return_value = {
                    "id": "178414000123456",
                    "username": "brandguard_official",
                    "name": "BrandGuard AI Official",
                    "account_type": "BUSINESS",
                    "profile_picture_url": "https://scontent.cdninstagram.com/v/t51/brandguard_avatar.jpg"
                }
            return m

        mock_get.side_effect = mock_get_side_effect

        # Trigger OAuth Callback
        callback_resp = self.client.get(
            f"/api/integrations/oauth/instagram/callback?code=AQD_REAL_CODE_12345&state={state}#_",
            follow_redirects=False
        )

        self.assertEqual(callback_resp.status_code, 302)
        self.assertIn("connected=instagram", callback_resp.headers["location"])

        # Verify DB Persistence & Fernet Token Encryption
        account = self.db.query(ConnectedSocialAccount).filter(
            ConnectedSocialAccount.organisation_id == self.org.id,
            ConnectedSocialAccount.platform == "Instagram"
        ).first()

        self.assertIsNotNone(account)
        self.assertEqual(account.status, "Connected")
        self.assertEqual(account.account_name, "@brandguard_official")
        self.assertEqual(account.account_id, "178414000123456")
        self.assertEqual(account.profile_picture_url, "https://scontent.cdninstagram.com/v/t51/brandguard_avatar.jpg")

        # Access token must be securely encrypted and NOT plaintext in the database
        self.assertNotEqual(account.access_token, "IG_LONG_LIVED_TOKEN_60_DAYS_67890")
        decrypted = decrypt_token(account.access_token)
        self.assertEqual(decrypted, "IG_LONG_LIVED_TOKEN_60_DAYS_67890")

        # Verify PublishedPost & UploadedContent were synced
        pub_post = self.db.query(PublishedPost).filter(
            PublishedPost.organisation_id == self.org.id,
            PublishedPost.external_post_id == "18012345678901234"
        ).first()
        self.assertIsNotNone(pub_post)
        self.assertEqual(pub_post.platform, "Instagram")
        self.assertEqual(pub_post.likes_count, 142)

        # Verify AudienceFeedback & Sentiment were recorded
        feedbacks = self.db.query(AudienceFeedback).filter(
            AudienceFeedback.organisation_id == self.org.id,
            AudienceFeedback.platform == "Instagram"
        ).all()
        self.assertGreaterEqual(len(feedbacks), 1)

        # Verify SocialComment was created
        social_comments = self.db.query(SocialComment).filter(
            SocialComment.organisation_id == self.org.id,
            SocialComment.platform == "Instagram"
        ).all()
        self.assertGreaterEqual(len(social_comments), 1)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Test Status Reporting Endpoint
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_status_reporting(self):
        """Verifies /api/integrations/status exposes correct connection info without leaking secrets."""
        resp = self.client.get("/api/integrations/status", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("instagram", data)
        ig_status = data["instagram"]
        self.assertEqual(ig_status["name"], "Instagram")
        self.assertTrue(ig_status["configured"])
        self.assertEqual(ig_status["connected"], True)
        self.assertEqual(ig_status["status"], "connected")
        self.assertEqual(ig_status["account_name"], "@brandguard_official")
        self.assertIsNotNone(ig_status["profile_picture_url"])

        # Never expose actual secrets in response
        self.assertNotIn(settings.META_APP_SECRET, str(ig_status.values()))
        self.assertNotIn("access_token", ig_status)

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Test Disconnect Endpoint
    # ─────────────────────────────────────────────────────────────────────────
    def test_06_disconnect_instagram(self):
        """Verifies disconnect revokes stored tokens and resets account status."""
        resp = self.client.post("/api/integrations/oauth/instagram/disconnect", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("disconnected successfully", resp.json()["message"])

        # Verify database update
        account = self.db.query(ConnectedSocialAccount).filter(
            ConnectedSocialAccount.organisation_id == self.org.id,
            ConnectedSocialAccount.platform == "Instagram"
        ).first()

        self.assertEqual(account.status, "Not Connected")
        self.assertIsNone(account.access_token)
        self.assertIsNone(account.token_expires_at)

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Test Token Refresh Logic
    # ─────────────────────────────────────────────────────────────────────────
    @patch("requests.get")
    def test_07_token_refresh(self, mock_get):
        """Tests that InstagramProvider.refresh_access_token correctly calls the refresh endpoint."""
        m = MagicMock()
        m.status_code = 200
        m.json.return_value = {
            "access_token": "REFRESHED_LONG_TOKEN_99999",
            "token_type": "bearer",
            "expires_in": 5183944
        }
        mock_get.return_value = m

        provider = InstagramProvider()
        result = provider.refresh_access_token("OLD_TOKEN_11111")
        self.assertTrue(result["success"])
        self.assertEqual(result["access_token"], "REFRESHED_LONG_TOKEN_99999")
        self.assertEqual(result["expires_in"], 5183944)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Test Manual Sync & Dashboard Feedback Propagation
    # ─────────────────────────────────────────────────────────────────────────
    @patch("requests.get")
    def test_08_sync_endpoint_and_feedback(self, mock_get):
        """Verifies /api/integrations/oauth/instagram/sync fetches real comments and updates audience records."""
        # Restore connected account
        account = self.db.query(ConnectedSocialAccount).filter(
            ConnectedSocialAccount.organisation_id == self.org.id,
            ConnectedSocialAccount.platform == "Instagram"
        ).first()

        account.status = "Connected"
        account.access_token = encrypt_token("IG_VALID_ACTIVE_LONG_LIVED_TOKEN")
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        self.db.commit()

        def mock_sync_get(url, **kwargs):
            m = MagicMock()
            m.status_code = 200
            if "/me/media" in url:
                m.json.return_value = {
                    "data": [
                        {
                            "id": "18999999999999999",
                            "caption": "New BrandGuard AI v2 release is now live!",
                            "media_type": "IMAGE",
                            "permalink": "https://www.instagram.com/p/Cz999999/",
                            "media_url": "https://scontent.cdninstagram.com/post_2.jpg",
                            "comments_count": 1,
                            "like_count": 89
                        }
                    ]
                }
            elif "/comments" in url:
                m.json.return_value = {
                    "data": [
                        {
                            "id": "17888888888888888",
                            "text": "Great work on the update, love the clean interface and fast performance!",
                            "username": "happy_client",
                            "timestamp": "2026-11-19T14:00:00Z"
                        }
                    ]
                }
            return m

        mock_get.side_effect = mock_sync_get

        sync_resp = self.client.post("/api/integrations/oauth/instagram/sync", headers=self.headers)
        self.assertEqual(sync_resp.status_code, 200)
        data = sync_resp.json()
        self.assertIn("Synchronized comments", data["message"])

        # Verify audience feedback endpoint contains the synced comment
        feedback_resp = self.client.get("/api/audience/feedback?platform=Instagram", headers=self.headers)
        self.assertEqual(feedback_resp.status_code, 200)
        items = feedback_resp.json()
        self.assertTrue(any(item["external_comment_id"] == "17888888888888888" for item in items))


if __name__ == "__main__":
    unittest.main()
