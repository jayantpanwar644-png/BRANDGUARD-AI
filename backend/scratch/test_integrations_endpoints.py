import os
import sys

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.core.security_tokens import encrypt_token, decrypt_token
from backend.models.all_models import Organisation, User, ConnectedSocialAccount
from backend.routers.integrations import (
    get_integrations_status, test_platform_configuration, oauth_authorize
)

def run_tests():
    db = SessionLocal()
    try:
        org = db.query(Organisation).first()
        user = db.query(User).first()
        print(f"Testing with Organisation ID: {org.id}, User: {user.email}")

        # 1. Test Token Encryption / Decryption
        raw_tok = "EAABwzLIX56YBAK7q_meta_long_lived_user_access_token_sample_123456789"
        enc_tok = encrypt_token(raw_tok)
        dec_tok = decrypt_token(enc_tok)
        assert raw_tok == dec_tok, "Encryption/Decryption mismatch!"
        assert enc_tok != raw_tok, "Token is not encrypted!"
        print("✓ Token Encryption & Decryption test passed!")

        # 2. Test /integrations/status
        status_res = get_integrations_status(org=org, db=db)
        print(f"✓ /integrations/status returned platforms: {list(status_res.keys())}")
        for p in ["instagram", "facebook", "linkedin", "youtube"]:
            assert p in status_res
            print(f"  [{p}] configured={status_res[p]['configured']}, status={status_res[p]['status']}, redirect_uri={status_res[p]['redirect_uri']}")
            assert "access_token" not in status_res[p], "Access token leaked in status!"
            assert "client_secret" not in status_res[p], "Client secret leaked in status!"

        # 3. Test /oauth/{platform}/test-config with missing keys
        test_cfg = test_platform_configuration("instagram", current_user=user, org=org)
        print("✓ /oauth/instagram/test-config response:", test_cfg["message"])
        assert test_cfg["configured"] is False
        assert "META_APP_ID" in test_cfg["missing_keys"]

        # 4. Test OAuth authorize URL generation with configured credentials
        settings.META_APP_ID = "123456789012345"
        settings.META_APP_SECRET = "abcdef0123456789abcdef0123456789"
        auth_res = oauth_authorize("instagram", org=org)
        print("✓ OAuth Authorize for Instagram generated URL:", auth_res["auth_url"])
        assert "client_id=123456789012345" in auth_res["auth_url"]
        assert "instagram_basic" in auth_res["auth_url"]
        assert auth_res["state"]

        # Reset temporary settings
        settings.META_APP_ID = ""
        settings.META_APP_SECRET = ""

        print(">>> ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! <<<")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
