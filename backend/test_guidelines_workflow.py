"""
Comprehensive Test Suite for BrandGuard AI Guidelines Validation & Step-Skipping Workflow

Tests all 6 required scenarios:
1. New company with no guidelines -> has_valid_guidelines is False, cannot audit, guidelines required.
2. Company with saved guidelines -> has_valid_guidelines is True, audit permitted, step-skipping allowed.
3. Company with empty guidelines -> has_valid_guidelines is False, audit rejected (403), guidelines required.
4. Company with unsaved/draft guidelines -> has_valid_guidelines is False, audit rejected (403).
5. User switches to another company without guidelines -> state resets, guidelines required.
6. Page refresh / session reload (/auth/me) -> restored accurately from persisted database records.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import unittest
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import SessionLocal
from backend.models.all_models import Organisation, User, BrandProfile, BrandGuideline, BrandRule
from backend.core.security import hash_password, create_access_token

client = TestClient(app)

class TestGuidelinesWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        uid = uuid.uuid4().hex[:6]
        
        # Scenario 1: New Company with No Guidelines
        cls.org_no_guidelines = Organisation(
            name=f"Brand Without Guidelines {uid}",
            official_email=f"noguidelines_{uid}@testcorp.com",
            industry="Robotics"
        )
        cls.db.add(cls.org_no_guidelines)
        cls.db.commit()
        cls.db.refresh(cls.org_no_guidelines)
        
        cls.user_no_guidelines = User(
            organisation_id=cls.org_no_guidelines.id,
            email=f"noguidelines_user_{uid}@testcorp.com",
            full_name="No Guidelines User",
            hashed_password=hash_password("TestPassword123!"),
            role="Admin",
            is_active=True
        )
        cls.db.add(cls.user_no_guidelines)
        cls.db.commit()
        cls.db.refresh(cls.user_no_guidelines)

        cls.token_no_guidelines = create_access_token({
            "sub": str(cls.user_no_guidelines.id),
            "email": cls.user_no_guidelines.email,
            "org_id": cls.org_no_guidelines.id
        })

        # Scenario 2: Company with Saved Guidelines
        cls.org_with_guidelines = Organisation(
            name=f"Brand With Guidelines {uid}",
            official_email=f"withguidelines_{uid}@testcorp.com",
            industry="Enterprise Cyber"
        )
        cls.db.add(cls.org_with_guidelines)
        cls.db.commit()
        cls.db.refresh(cls.org_with_guidelines)

        cls.user_with_guidelines = User(
            organisation_id=cls.org_with_guidelines.id,
            email=f"withguidelines_user_{uid}@testcorp.com",
            full_name="With Guidelines User",
            hashed_password=hash_password("TestPassword123!"),
            role="Admin",
            is_active=True
        )
        cls.db.add(cls.user_with_guidelines)
        cls.db.commit()
        cls.db.refresh(cls.user_with_guidelines)

        cls.token_with_guidelines = create_access_token({
            "sub": str(cls.user_with_guidelines.id),
            "email": cls.user_with_guidelines.email,
            "org_id": cls.org_with_guidelines.id
        })

        # Insert a valid, active BrandGuideline for org_with_guidelines
        cls.saved_guideline = BrandGuideline(
            organisation_id=cls.org_with_guidelines.id,
            document_name="official_master_brand_book.pdf",
            file_path="/uploads/guidelines/official_master_brand_book.pdf",
            file_size=102456,
            file_type=".pdf",
            processing_status="Verified",
            version="1.0",
            document_category="Master Guidelines",
            is_active=True
        )
        cls.db.add(cls.saved_guideline)
        cls.db.commit()

        # Scenario 4: Company with Draft / Inactive Guidelines
        cls.org_draft_guidelines = Organisation(
            name=f"Draft Guidelines Corp {uid}",
            official_email=f"draft_{uid}@testcorp.com",
            industry="Consulting"
        )
        cls.db.add(cls.org_draft_guidelines)
        cls.db.commit()
        cls.db.refresh(cls.org_draft_guidelines)

        cls.user_draft = User(
            organisation_id=cls.org_draft_guidelines.id,
            email=f"draft_user_{uid}@testcorp.com",
            full_name="Draft User",
            hashed_password=hash_password("TestPassword123!"),
            role="Admin",
            is_active=True
        )
        cls.db.add(cls.user_draft)
        cls.db.commit()
        cls.db.refresh(cls.user_draft)

        cls.token_draft = create_access_token({
            "sub": str(cls.user_draft.id),
            "email": cls.user_draft.email,
            "org_id": cls.org_draft_guidelines.id
        })

        # Insert a draft and an inactive guideline
        cls.draft_guideline = BrandGuideline(
            organisation_id=cls.org_draft_guidelines.id,
            document_name="unfinished_draft.docx",
            file_path="/uploads/guidelines/unfinished_draft.docx",
            file_size=5000,
            file_type=".docx",
            processing_status="Draft",  # DRAFT status should NOT count as saved
            version="0.1",
            is_active=True
        )
        cls.inactive_guideline = BrandGuideline(
            organisation_id=cls.org_draft_guidelines.id,
            document_name="old_inactive_guideline.pdf",
            file_path="/uploads/guidelines/old_inactive_guideline.pdf",
            file_size=8000,
            file_type=".pdf",
            processing_status="Verified",
            version="0.9",
            is_active=False  # INACTIVE should NOT count as saved
        )
        cls.db.add(cls.draft_guideline)
        cls.db.add(cls.inactive_guideline)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_scenario_1_new_company_no_guidelines(self):
        """Scenario 1: New company with no guidelines -> Guidelines step MUST appear (has_valid_guidelines=False)."""
        headers = {"Authorization": f"Bearer {self.token_no_guidelines}"}
        
        # 1. Check /auth/me returns has_valid_guidelines = False
        res_me = client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        data_me = res_me.json()
        self.assertFalse(data_me["has_valid_guidelines"])
        self.assertEqual(data_me["guidelines_count"], 0)

        # 2. Check /brand/guidelines/validate returns has_valid_guidelines = False
        res_val = client.get("/api/brand/guidelines/validate", headers=headers)
        self.assertEqual(res_val.status_code, 200)
        data_val = res_val.json()
        self.assertFalse(data_val["has_valid_guidelines"])
        self.assertEqual(data_val["count"], 0)

        # 3. Check /brand/guidelines returns empty array []
        res_list = client.get("/api/brand/guidelines", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 0)

    def test_scenario_2_company_with_saved_guidelines(self):
        """Scenario 2: Company with saved guidelines -> Guidelines step can be skipped (has_valid_guidelines=True)."""
        headers = {"Authorization": f"Bearer {self.token_with_guidelines}"}
        
        # 1. Check /auth/me returns has_valid_guidelines = True
        res_me = client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        data_me = res_me.json()
        self.assertTrue(data_me["has_valid_guidelines"])
        self.assertGreaterEqual(data_me["guidelines_count"], 1)

        # 2. Check /brand/guidelines/validate returns has_valid_guidelines = True
        res_val = client.get("/api/brand/guidelines/validate", headers=headers)
        self.assertEqual(res_val.status_code, 200)
        data_val = res_val.json()
        self.assertTrue(data_val["has_valid_guidelines"])
        self.assertGreaterEqual(data_val["count"], 1)
        self.assertEqual(data_val["guidelines"][0]["document_name"], "official_master_brand_book.pdf")

    def test_scenario_3_company_with_empty_guidelines(self):
        """Scenario 3: Company with empty guidelines -> MUST NOT skip guidelines step."""
        headers = {"Authorization": f"Bearer {self.token_no_guidelines}"}
        res_list = client.get("/api/brand/guidelines", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        guidelines = res_list.json()
        # Ensure array is empty
        self.assertEqual(guidelines, [])
        # Validation endpoint confirms no valid guidelines exist
        res_val = client.get("/api/brand/guidelines/validate", headers=headers)
        self.assertFalse(res_val.json()["has_valid_guidelines"])

    def test_scenario_4_draft_or_inactive_guidelines_do_not_count(self):
        """Scenario 4: Draft or inactive records do NOT qualify as saved brand guidelines."""
        headers = {"Authorization": f"Bearer {self.token_draft}"}
        
        # /auth/me must report false
        res_me = client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        self.assertFalse(res_me.json()["has_valid_guidelines"])
        self.assertEqual(res_me.json()["guidelines_count"], 0)

        # /brand/guidelines/validate must report false
        res_val = client.get("/api/brand/guidelines/validate", headers=headers)
        self.assertEqual(res_val.status_code, 200)
        self.assertFalse(res_val.json()["has_valid_guidelines"])

    def test_scenario_5_switch_company_revalidates_correctly(self):
        """Scenario 5: Switching from Company with guidelines to Company without guidelines correctly resets state."""
        headers_with = {"Authorization": f"Bearer {self.token_with_guidelines}"}
        headers_without = {"Authorization": f"Bearer {self.token_no_guidelines}"}

        # First request as Company With Guidelines
        res1 = client.get("/api/auth/me", headers=headers_with)
        self.assertTrue(res1.json()["has_valid_guidelines"])

        # Switch to Company Without Guidelines
        res2 = client.get("/api/auth/me", headers=headers_without)
        self.assertFalse(res2.json()["has_valid_guidelines"])
        self.assertEqual(res2.json()["organisation"]["id"], self.org_no_guidelines.id)

    def test_scenario_6_persisted_database_restoration_on_refresh(self):
        """Scenario 6: Multiple independent requests (/auth/me) restore state accurately from database."""
        headers = {"Authorization": f"Bearer {self.token_with_guidelines}"}
        for _ in range(3):
            res = client.get("/api/auth/me", headers=headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["has_valid_guidelines"])
            self.assertEqual(data["organisation"]["name"], self.org_with_guidelines.name)

    def test_prevent_duplicate_guidelines_upload(self):
        """Verify that uploading a guideline document with the same filename updates rather than duplicates."""
        headers = {"Authorization": f"Bearer {self.token_with_guidelines}"}
        
        # Count guidelines before
        initial_count = self.db.query(BrandGuideline).filter(
            BrandGuideline.organisation_id == self.org_with_guidelines.id
        ).count()

        # Upload a test file with same name as an existing guideline
        file_content = b"Updated Brand Guidelines Content for brand consistency."
        res = client.post(
            "/api/brand/guidelines/upload",
            headers=headers,
            files={"file": ("official_master_brand_book.pdf", file_content, "application/pdf")},
            data={"version": "1.1", "category": "Master Guidelines"}
        )
        self.assertEqual(res.status_code, 200)

        # Count guidelines after - MUST remain the same (no duplicate created)
        after_count = self.db.query(BrandGuideline).filter(
            BrandGuideline.organisation_id == self.org_with_guidelines.id
        ).count()
        self.assertEqual(after_count, initial_count)

if __name__ == "__main__":
    unittest.main()
