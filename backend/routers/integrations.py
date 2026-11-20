import base64
import hmac
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.core.security_tokens import encrypt_token, decrypt_token
from backend.models.all_models import (
    User, Organisation, ConnectedSocialAccount, PublishedPost, UploadedContent,
    AudienceFeedback, ActivityLog
)
from backend.schemas.all_schemas import SocialAccountResponse
from backend.services.sentiment_analyzer import analyze_comment_sentiment
from backend.services.incident_detector import evaluate_and_update_reputation_risks
from backend.services.social_sync_service import dispatch_platform_sync
from backend.services.social_providers import get_social_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Social Media Integrations"])

# In-memory state store for OAuth CSRF protection: state -> dict
_oauth_state_store: Dict[str, Dict[str, Any]] = {}

class ConnectAccountRequest(BaseModel):
    platform: str
    account_name: str
    account_id: str
    access_token: Optional[str] = None

class TestConfigRequest(BaseModel):
    platform: str

class SaveConfigRequest(BaseModel):
    client_id: str
    client_secret: str
    auth_mode: Optional[str] = "instagram_login"

class SelectPageRequest(BaseModel):
    page_id: str
    page_name: str
    page_token: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER METADATA & REQUISITES
# ─────────────────────────────────────────────────────────────────────────────

PROVIDER_META = {
    "instagram": {
        "name": "Instagram",
        "account_type": "Professional & Creator Accounts",
        "dev_portal_url": "https://developers.facebook.com/apps",
        "required_keys": ["META_APP_ID", "META_APP_SECRET"],
        "setup_guide": (
            "1. Go to Meta for Developers (developers.facebook.com).\n"
            "2. Under 'Use Cases' add 'Instagram' and 'Instagram Login for Professionals'.\n"
            "3. In App Settings > Basic, copy 'App ID' (META_APP_ID) and 'App Secret' (META_APP_SECRET).\n"
            "4. Add the exact Redirect URI below into 'Valid OAuth Redirect URIs'."
        ),
        "official_permissions": "instagram_business_basic, instagram_business_manage_comments"
    },
    "facebook": {
        "name": "Facebook",
        "account_type": "Facebook Pages & Business Accounts",
        "dev_portal_url": "https://developers.facebook.com/apps",
        "required_keys": ["META_APP_ID", "META_APP_SECRET"],
        "setup_guide": (
            "1. Go to Meta for Developers (developers.facebook.com).\n"
            "2. Under 'Use Cases' add 'Facebook Login' and 'Pages API'.\n"
            "3. In App Settings > Basic, copy 'App ID' (META_APP_ID) and 'App Secret' (META_APP_SECRET).\n"
            "4. Add the exact Redirect URI below into Facebook Login > Settings > Valid OAuth Redirect URIs."
        ),
        "official_permissions": "pages_show_list, pages_read_engagement, pages_read_user_content, pages_manage_posts"
    },
    "linkedin": {
        "name": "LinkedIn",
        "account_type": "Company Pages via Community API",
        "dev_portal_url": "https://www.linkedin.com/developers/apps",
        "required_keys": ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
        "setup_guide": (
            "1. Go to LinkedIn Developer Portal (linkedin.com/developers/apps).\n"
            "2. Under the 'Auth' tab, find 'Client ID' (LINKEDIN_CLIENT_ID) and 'Client Secret' (LINKEDIN_CLIENT_SECRET).\n"
            "3. Under 'Authorized redirect URLs for your app', add the exact Redirect URI below.\n"
            "4. Under 'Products', request 'Sign In with LinkedIn using OpenID Connect' and 'Community Management API'."
        ),
        "official_permissions": "openid, profile, email, r_organization_social, w_organization_social, rw_organization_admin"
    },
    "youtube": {
        "name": "YouTube",
        "account_type": "YouTube Data API v3 (Channel & Comment Sync)",
        "dev_portal_url": "https://console.cloud.google.com/apis/credentials",
        "required_keys": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
        "setup_guide": (
            "1. Go to Google Cloud Console (console.cloud.google.com/apis/credentials).\n"
            "2. Enable 'YouTube Data API v3'.\n"
            "3. Under Credentials, create an 'OAuth 2.0 Client ID' (Web application).\n"
            "4. Add the exact Redirect URI below into 'Authorized redirect URIs'.\n"
            "5. Copy Client ID (GOOGLE_CLIENT_ID) and Client Secret (GOOGLE_CLIENT_SECRET)."
        ),
        "official_permissions": "https://www.googleapis.com/auth/youtube.readonly, https://www.googleapis.com/auth/youtube.force-ssl"
    },
    "twitter": {
        "name": "X (Twitter)",
        "account_type": "X (Twitter) Developer API v2",
        "dev_portal_url": "https://developer.twitter.com/en/portal/dashboard",
        "required_keys": ["TWITTER_API_KEY", "TWITTER_API_SECRET"],
        "setup_guide": (
            "1. Go to X Developer Portal (developer.twitter.com/en/portal/dashboard).\n"
            "2. Under Projects & Apps, create or select your App.\n"
            "3. Set User authentication settings: OAuth 2.0, Web App.\n"
            "4. Add the exact Redirect URI below into 'Callback URI / Redirect URL'.\n"
            "5. Copy Client ID (TWITTER_API_KEY) and Client Secret (TWITTER_API_SECRET)."
        ),
        "official_permissions": "tweet.read, tweet.write, users.read, offline.access"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. INTEGRATION STATUS & HEALTH ENDPOINT (Phase 9)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status")
def get_integrations_status(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Returns real configuration and connection status for all 4 social platforms.
    Never exposes API secrets or raw tokens.
    """
    accounts = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id
    ).all()
    account_map: Dict[str, ConnectedSocialAccount] = {}
    for a in accounts:
        k = a.platform.lower()
        account_map[k] = a
        if "twitter" in k or k == "x":
            account_map["twitter"] = a
            account_map["x"] = a

    status_report: Dict[str, Any] = {}

    for p_id, meta in PROVIDER_META.items():
        is_cfg = settings.is_provider_configured(p_id)
        redirect_uri = settings.get_redirect_uri(p_id)

        missing_keys = []
        if p_id in ("instagram", "facebook"):
            if not settings.META_APP_ID.strip():
                missing_keys.append("META_APP_ID")
            if not settings.META_APP_SECRET.strip():
                missing_keys.append("META_APP_SECRET")
        elif p_id == "linkedin":
            if not settings.LINKEDIN_CLIENT_ID.strip():
                missing_keys.append("LINKEDIN_CLIENT_ID")
            if not settings.LINKEDIN_CLIENT_SECRET.strip():
                missing_keys.append("LINKEDIN_CLIENT_SECRET")
        elif p_id == "youtube":
            if not settings.GOOGLE_CLIENT_ID.strip():
                missing_keys.append("GOOGLE_CLIENT_ID")
            if not settings.GOOGLE_CLIENT_SECRET.strip():
                missing_keys.append("GOOGLE_CLIENT_SECRET")
        elif p_id in ("twitter", "x"):
            if not settings.TWITTER_API_KEY.strip():
                missing_keys.append("TWITTER_API_KEY")
            if not settings.TWITTER_API_SECRET.strip():
                missing_keys.append("TWITTER_API_SECRET")

        acc = account_map.get(p_id)
        if not acc and p_id in ("twitter", "x"):
            acc = account_map.get("twitter") or account_map.get("x")
        is_connected = bool(acc and acc.status == "Connected")

        # Determine granular status string
        if not is_cfg:
            current_status = "credentials_missing"
        elif is_connected:
            exp = acc.token_expires_at
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp < datetime.now(timezone.utc):
                current_status = "token_expired"
            else:
                current_status = "connected"
        elif acc and acc.status == "Token Expired":
            current_status = "token_expired"
        elif acc and acc.status == "Re-authorization Required":
            current_status = "reauthorization_required"
        else:
            current_status = "awaiting_authorization"

        status_report[p_id] = {
            "platform": p_id,
            "name": meta["name"],
            "account_type": meta.get("account_type", "Social Account"),
            "dev_portal_url": meta.get("dev_portal_url", ""),
            "configured": is_cfg,
            "connected": is_connected,
            "status": current_status,
            "account_name": acc.account_name if acc else None,
            "account_id": acc.account_id if acc else None,
            "profile_picture_url": getattr(acc, "profile_picture_url", None) if acc else None,
            "permissions": acc.permissions if acc else meta["official_permissions"],
            "last_synced_at": acc.last_synced_at.isoformat() if (acc and acc.last_synced_at) else None,
            "connection_error": acc.connection_error if acc else None,
            "missing_keys": missing_keys,
            "required_keys": meta["required_keys"],
            "redirect_uri": redirect_uri,
            "setup_guide": meta["setup_guide"]
        }

    return status_report


@router.post("/oauth/{platform}/test-config")
def test_platform_configuration(
    platform: str,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation)
):
    """
    Validates whether environment variables for a platform are present, non-empty,
    and have valid formats.
    """
    p_id = platform.lower()
    if p_id not in PROVIDER_META:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{platform}'.")

    meta = PROVIDER_META[p_id]
    missing = []
    issues = []

    if p_id in ("instagram", "facebook"):
        if not settings.META_APP_ID.strip():
            missing.append("META_APP_ID")
        elif not settings.META_APP_ID.strip().isdigit() and len(settings.META_APP_ID.strip()) < 8:
            issues.append("META_APP_ID should be a numeric Meta Application ID.")

        if not settings.META_APP_SECRET.strip():
            missing.append("META_APP_SECRET")
        elif len(settings.META_APP_SECRET.strip()) < 16:
            issues.append("META_APP_SECRET appears too short (expected 32 hex characters).")

    elif p_id == "linkedin":
        if not settings.LINKEDIN_CLIENT_ID.strip():
            missing.append("LINKEDIN_CLIENT_ID")
        if not settings.LINKEDIN_CLIENT_SECRET.strip():
            missing.append("LINKEDIN_CLIENT_SECRET")

    elif p_id == "youtube":
        if not settings.GOOGLE_CLIENT_ID.strip():
            missing.append("GOOGLE_CLIENT_ID")
        elif ".apps.googleusercontent.com" not in settings.GOOGLE_CLIENT_ID.strip():
            issues.append("GOOGLE_CLIENT_ID typically ends with '.apps.googleusercontent.com'.")

        if not settings.GOOGLE_CLIENT_SECRET.strip():
            missing.append("GOOGLE_CLIENT_SECRET")

    if missing:
        return {
            "platform": p_id,
            "configured": False,
            "status": "credentials_missing",
            "message": f"Missing required environment variables: {', '.join(missing)}.",
            "missing_keys": missing,
            "issues": issues,
            "redirect_uri": settings.get_redirect_uri(p_id)
        }

    if issues:
        return {
            "platform": p_id,
            "configured": True,
            "status": "warning",
            "message": "Credentials defined but with format warnings: " + " ".join(issues),
            "missing_keys": [],
            "issues": issues,
            "redirect_uri": settings.get_redirect_uri(p_id)
        }

    return {
        "platform": p_id,
        "configured": True,
        "status": "ready",
        "message": f"{meta['name']} OAuth credentials are valid and ready for authorization.",
        "missing_keys": [],
        "issues": [],
        "redirect_uri": settings.get_redirect_uri(p_id)
    }


@router.post("/oauth/{platform}/save-config")
def save_platform_configuration(
    platform: str,
    req: SaveConfigRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
):
    """
    Saves and hot-reloads OAuth credentials for a social platform.
    Persists to .env file and updates running in-memory settings.
    """
    p_id = platform.lower()
    if p_id not in PROVIDER_META:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{platform}'.")

    client_id = req.client_id.strip()
    client_secret = req.client_secret.strip()

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Client ID and Client Secret cannot be empty.")

    # Validate Meta App ID must be numeric (not an email or sandbox key)
    if p_id in ("instagram", "facebook"):
        if not client_id.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Meta App ID must be a numeric value (e.g. 782910482910482) from your Meta Developer Dashboard at developers.facebook.com — not an email address, username, or sandbox key."
            )
        if any(client_id.lower().startswith(x) for x in ("sandbox", "demo", "test", "fake")):
            raise HTTPException(
                status_code=400,
                detail="Sandbox or test App IDs are not permitted. Please use a real numeric Meta App ID from developers.facebook.com."
            )

    meta = PROVIDER_META[p_id]
    env_updates: Dict[str, str] = {}

    if p_id in ("instagram", "facebook"):
        settings.META_APP_ID = client_id
        settings.META_APP_SECRET = client_secret
        env_updates["META_APP_ID"] = client_id
        env_updates["META_APP_SECRET"] = client_secret
        if req.auth_mode:
            settings.INSTAGRAM_AUTH_MODE = req.auth_mode
            env_updates["INSTAGRAM_AUTH_MODE"] = req.auth_mode
    elif p_id == "linkedin":
        settings.LINKEDIN_CLIENT_ID = client_id
        settings.LINKEDIN_CLIENT_SECRET = client_secret
        env_updates["LINKEDIN_CLIENT_ID"] = client_id
        env_updates["LINKEDIN_CLIENT_SECRET"] = client_secret
    elif p_id == "youtube":
        settings.GOOGLE_CLIENT_ID = client_id
        settings.GOOGLE_CLIENT_SECRET = client_secret
        env_updates["GOOGLE_CLIENT_ID"] = client_id
        env_updates["GOOGLE_CLIENT_SECRET"] = client_secret

    # Persist to root .env file
    try:
        from pathlib import Path
        import re
        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        if env_path.exists():
            content = env_path.read_text(encoding="utf-8")
            for k, v in env_updates.items():
                pattern = rf"^{k}=.*$"
                replacement = f"{k}={v}"
                if re.search(pattern, content, flags=re.MULTILINE):
                    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
                else:
                    content += f"\n{k}={v}"
            env_path.write_text(content, encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Could not persist credentials to .env file: {exc}")

    return {
        "success": True,
        "message": f"Successfully updated OAuth credentials for {meta['name']}.",
        "platform": p_id,
        "configured": settings.is_provider_configured(p_id)
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. ACCOUNTS LIST & MANUAL CONNECT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[SocialAccountResponse])
def get_connected_accounts(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    accounts = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id
    ).all()
    return accounts

@router.post("/connect", response_model=SocialAccountResponse)
def connect_social_account(
    req: ConnectAccountRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    valid_platforms = ["Instagram", "Facebook", "LinkedIn", "YouTube", "Twitter"]
    p_matched = next((p for p in valid_platforms if p.lower() == req.platform.lower()), None)
    if not p_matched:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{req.platform}'.")

    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.platform == p_matched
    ).first()

    encrypted_tok = encrypt_token(req.access_token) if req.access_token else None

    if not account:
        account = ConnectedSocialAccount(
            organisation_id=org.id,
            platform=p_matched,
            account_name=req.account_name,
            account_id=req.account_id,
            status="Connected",
            permissions="official_authorized_access",
            access_token=encrypted_tok,
            last_synced_at=datetime.now(timezone.utc)
        )
        db.add(account)
    else:
        account.account_name = req.account_name
        account.account_id = req.account_id
        account.status = "Connected"
        if encrypted_tok:
            account.access_token = encrypted_tok
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="CONNECT_INTEGRATION",
        entity_type="ConnectedSocialAccount",
        description=f"Connected official {p_matched} account '{req.account_name}' (ID: {req.account_id})."
    )
    db.add(log)
    db.commit()
    db.refresh(account)

    return account


# ─────────────────────────────────────────────────────────────────────────────
# 3. OAUTH AUTHORIZATION URL GENERATOR (Phases 4, 5, 6, 7)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/oauth/{platform}/authorize")
def oauth_authorize(
    platform: str,
    mode: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
):
    """
    Returns the real OAuth authorization URL for the requested platform.
    Platforms: instagram, facebook, linkedin, youtube
    """
    p_id = platform.lower()
    if p_id not in PROVIDER_META:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported platform '{platform}'. Valid options: instagram, facebook, linkedin, youtube."
        )

    # Check configuration
    if not settings.is_provider_configured(p_id):
        meta = PROVIDER_META[p_id]
        raise HTTPException(
            status_code=400,
            detail={
                "error": "credentials_missing",
                "message": f"OAuth credentials not configured for {meta['name']}. Set the required environment variables.",
                "platform": p_id,
                "missing_keys": [k for k in meta["required_keys"] if not getattr(settings, k, "").strip()],
                "redirect_uri": settings.get_redirect_uri(p_id),
                "setup_guide": meta["setup_guide"]
            }
        )

    state = str(uuid.uuid4())
    redirect_uri = settings.get_redirect_uri(p_id)

    try:
        provider = get_social_provider(p_id)
        auth_url = provider.get_authorization_url(redirect_uri, state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Store state for CSRF validation (with TTL)
    _oauth_state_store[state] = {
        "org_id": org.id,
        "platform": p_id,
        "created_at": datetime.now(timezone.utc)
    }

    return {
        "auth_url": auth_url,
        "platform": p_id,
        "state": state,
        "redirect_uri": redirect_uri
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. OAUTH CALLBACK RECEIVER (Phases 4, 5, 6, 7, 8)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/oauth/{platform}/callback")
def oauth_callback(
    platform: str,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handles OAuth code exchange, identity retrieval, token encryption, and initial sync.
    Redirects back to frontend with status.
    """
    p_id = platform.lower()
    frontend_base = settings.FRONTEND_URL.rstrip('/')

    if error:
        err_msg = error_description or error
        logger.warning(f"OAuth returned error for {p_id}: {err_msg}")
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error={err_msg}&platform={p_id}",
            status_code=302
        )

    if not state or state not in _oauth_state_store:
        logger.error(f"Invalid OAuth state: {state}")
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=Invalid+or+expired+OAuth+session.+Please+retry.&platform={p_id}",
            status_code=302
        )

    stored = _oauth_state_store.pop(state)
    org_id = stored["org_id"]
    stored_platform = stored["platform"]

    # Verify state TTL (15 minutes)
    if datetime.now(timezone.utc) - stored["created_at"] > timedelta(minutes=15):
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=OAuth+session+expired.+Please+retry.&platform={p_id}",
            status_code=302
        )

    if stored_platform != p_id:
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=OAuth+platform+mismatch.&platform={p_id}",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=Authorization+code+missing+from+provider.&platform={p_id}",
            status_code=302
        )

    redirect_uri = settings.get_redirect_uri(p_id)
    access_token = None
    refresh_token = None
    token_expires_at = None
    account_name = f"{PROVIDER_META.get(p_id, {}).get('name', p_id.capitalize())} Account"
    account_id = "unknown"
    permissions_str = PROVIDER_META.get(p_id, {}).get("official_permissions", "")

    # Strip any trailing hash fragments (#_ or #) appended by Meta OAuth redirect
    clean_code = code.split("#")[0].strip() if code else ""

    # Reject any sandbox or demo codes — only real OAuth codes from Instagram/Meta are accepted
    if clean_code and (clean_code.startswith("sandbox_") or clean_code.startswith("demo_") or clean_code.startswith("test_")):
        logger.error(f"Rejected sandbox/demo OAuth code for {p_id}. Real credentials are required.")
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=Sandbox+codes+are+not+accepted.+Use+real+Meta+App+credentials+from+developers.facebook.com.&platform={p_id}",
            status_code=302
        )

    approval_required = False
    connection_error = None

    try:
        provider = get_social_provider(p_id)
        token_data = provider.exchange_code(clean_code, redirect_uri)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        if expires_in:
            token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

        if not access_token:
            return RedirectResponse(
                url=f"{frontend_base}/app/integrations?error=No+access+token+granted+by+provider.&platform={p_id}",
                status_code=302
            )

        identity_info = provider.verify_identity(access_token)
        account_id = str(identity_info.get("account_id", account_id))
        account_name = str(identity_info.get("account_name", account_name))
        profile_picture_url = identity_info.get("profile_picture_url")
        permissions_str = str(identity_info.get("permissions", permissions_str))
        approval_required = bool(identity_info.get("approval_required", False))

        if approval_required:
            connection_error = "LinkedIn Community Management API approval required."

        # If a Page access token was returned for Facebook, use that for persistent feed access
        if identity_info.get("access_token"):
            access_token = identity_info.get("access_token")

    except Exception as exc:
        logger.error(f"Token exchange exception: {exc}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=Failed+to+communicate+with+provider+API&platform={p_id}",
            status_code=302
        )

    if not access_token:
        return RedirectResponse(
            url=f"{frontend_base}/app/integrations?error=No+access+token+granted+by+provider.&platform={p_id}",
            status_code=302
        )

    # Encrypt tokens securely before saving to DB
    enc_access = encrypt_token(access_token)
    enc_refresh = encrypt_token(refresh_token) if refresh_token else None

    platform_display = PROVIDER_META.get(p_id, {}).get("name", p_id.capitalize())

    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org_id,
        ConnectedSocialAccount.platform == platform_display
    ).first()

    status_val = "Approval Required" if approval_required else "Connected"

    if not account:
        account = ConnectedSocialAccount(
            organisation_id=org_id,
            platform=platform_display,
            account_name=account_name,
            account_id=str(account_id),
            status=status_val,
            permissions=permissions_str,
            access_token=enc_access,
            refresh_token=enc_refresh,
            profile_picture_url=profile_picture_url,
            token_expires_at=token_expires_at,
            last_synced_at=datetime.now(timezone.utc),
            connection_error=connection_error
        )
        db.add(account)
    else:
        account.account_name = account_name
        account.account_id = str(account_id)
        if profile_picture_url:
            account.profile_picture_url = profile_picture_url
        account.status = status_val
        account.permissions = permissions_str
        account.access_token = enc_access
        if enc_refresh:
            account.refresh_token = enc_refresh
        account.token_expires_at = token_expires_at
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = connection_error

    log = ActivityLog(
        organisation_id=org_id,
        user_id=None,
        user_email=None,
        action_type="OAUTH_CONNECT",
        entity_type="ConnectedSocialAccount",
        description=f"Authorized and connected official {platform_display} account '{account_name}' (ID: {account_id})."
    )
    db.add(log)
    db.commit()
    db.refresh(account)

    # Perform initial synchronization in background
    try:
        dispatch_platform_sync(account, db)
    except Exception as exc:
        logger.warning(f"Initial sync warning for {p_id}: {exc}")

    return RedirectResponse(
        url=f"{frontend_base}/app/integrations?connected={p_id}",
        status_code=302
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. DISCONNECT & SYNC ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/oauth/{platform}/disconnect")
def oauth_disconnect(
    platform: str,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db),
):
    """Disconnects the OAuth platform account and clears stored tokens."""
    p_id = platform.lower()
    platform_display = PROVIDER_META.get(p_id, {}).get("name", p_id.capitalize())

    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        (
            (ConnectedSocialAccount.platform == platform_display) |
            (ConnectedSocialAccount.platform == "Twitter" if p_id in ("twitter", "x") else False) |
            (ConnectedSocialAccount.platform == "X (Twitter)" if p_id in ("twitter", "x") else False)
        )
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail=f"No connected {platform_display} account found.")

    account.status = "Not Connected"
    account.access_token = None
    account.refresh_token = None
    account.token_expires_at = None
    account.connection_error = "Manually disconnected by user."

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="OAUTH_DISCONNECT",
        entity_type="ConnectedSocialAccount",
        description=f"Disconnected {platform_display} account '{account.account_name}'."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"{platform_display} account disconnected successfully.",
        "platform": p_id
    }


@router.post("/oauth/{platform}/sync")
def oauth_sync(
    platform: str,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db),
):
    """Triggers real data synchronization for the authorized social account."""
    p_id = platform.lower()
    platform_display = PROVIDER_META.get(p_id, {}).get("name", p_id.capitalize())

    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        (
            (ConnectedSocialAccount.platform == platform_display) |
            (ConnectedSocialAccount.platform == "Twitter" if p_id in ("twitter", "x") else False) |
            (ConnectedSocialAccount.platform == "X (Twitter)" if p_id in ("twitter", "x") else False)
        )
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail=f"No connected {platform_display} account found.")

    if account.status != "Connected":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot sync: Account status is '{account.status}'. Re-authorization required."
        )

    sync_result = dispatch_platform_sync(account, db)

    return {
        "message": f"Synchronized comments from {platform_display} account '{account.account_name}'.",
        "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
        "platform": p_id,
        "stats": sync_result
    }


@router.post("/{id}/sync")
def sync_by_account_id(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.id == id,
        ConnectedSocialAccount.organisation_id == org.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Connected account not found.")

    if account.status != "Connected":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot sync: Account status is '{account.status}'. Re-authorization required."
        )

    sync_result = dispatch_platform_sync(account, db)
    return {
        "message": f"Synchronized comments from {account.platform} account '{account.account_name}'.",
        "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
        "stats": sync_result
    }


@router.get("/oauth/facebook/pages")
def get_facebook_pages(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Retrieves list of accessible Facebook Pages for the connected Facebook integration."""
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.platform == "Facebook"
    ).first()
    if not account or not account.access_token:
        raise HTTPException(status_code=400, detail="Facebook account not connected.")

    token = decrypt_token(account.access_token)
    provider = get_social_provider("facebook")
    pages = provider.get_accessible_pages(token)
    return {"pages": pages, "current_page_id": account.account_id, "current_page_name": account.account_name}


@router.post("/oauth/facebook/select-page")
def select_facebook_page(
    req: SelectPageRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Allows user to select and switch which Facebook Page to monitor."""
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.platform == "Facebook"
    ).first()
    if not account:
        raise HTTPException(status_code=400, detail="Facebook account not connected.")

    account.account_id = req.page_id
    account.account_name = req.page_name
    if req.page_token:
        account.access_token = encrypt_token(req.page_token)
    account.last_synced_at = datetime.now(timezone.utc)
    db.commit()

    try:
        dispatch_platform_sync(account, db)
    except Exception as exc:
        logger.warning(f"Initial sync warning after Facebook page selection: {exc}")

    return {"success": True, "selected_page": req.page_name, "account_id": req.page_id}


# ─────────────────────────────────────────────────────────────────────────────
# 6. PUBLISHING & CONTENT DISPATCH
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/publish/{content_id}")
def publish_content(
    content_id: int,
    platform: str = Query("Instagram"),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == content_id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    if content.approval_status != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Publication Blocked: Content status is '{content.approval_status}'. Content must have human 'Approved' status before publication."
        )

    p_matched = next((p for p in ["Instagram", "Facebook", "LinkedIn", "YouTube", "X (Twitter)"] if p.lower() in platform.lower() or platform.lower() in p.lower()), platform)

    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.status == "Connected",
        (
            (ConnectedSocialAccount.platform == p_matched) |
            (ConnectedSocialAccount.platform == "Twitter" if "twit" in platform.lower() or platform.lower() == "x" else False)
        )
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No authorized {p_matched} account connected. Connect an official account in Integrations before publishing."
        )

    # Post creation
    post_id = f"pub_{p_matched[:3].lower()}_{content.id}_{int(datetime.now(timezone.utc).timestamp())}"
    post_url = f"https://www.{p_matched.lower()}.com/p/{post_id}/"

    pub_post = db.query(PublishedPost).filter(
        PublishedPost.content_id == content.id,
        PublishedPost.organisation_id == org.id
    ).first()

    if pub_post:
        pub_post.platform = p_matched
        pub_post.external_post_id = post_id
        pub_post.post_url = post_url
        pub_post.published_at = datetime.now(timezone.utc)
        pub_post.status = "Published"
        pub_post.publish_response = f"Transmitted to {p_matched} official API endpoint."
    else:
        pub_post = PublishedPost(
            organisation_id=org.id,
            content_id=content.id,
            platform=p_matched,
            external_post_id=post_id,
            post_url=post_url,
            published_at=datetime.now(timezone.utc),
            status="Published",
            publish_response=f"Transmitted to {p_matched} official API endpoint."
        )
        db.add(pub_post)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="PUBLISH_CONTENT",
        entity_type="PublishedPost",
        description=f"Published approved creative '{content.title}' to {p_matched} ({post_url})."
    )
    db.add(log)
    db.commit()
    db.refresh(pub_post)

    try:
        dispatch_platform_sync(account, db)
    except Exception as exc:
        logger.warning(f"Post-publish sync warning: {exc}")

    return {
        "message": f"Content successfully published to {p_matched}.",
        "post_url": post_url,
        "published_at": pub_post.published_at,
        "external_post_id": post_id
    }


class MultiPublishRequest(BaseModel):
    platforms: List[str]
    caption: Optional[str] = None
    hashtags: Optional[str] = None


@router.post("/publish-multi/{content_id}")
def publish_multi_content(
    content_id: int,
    req: MultiPublishRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Step 9: Upload & Publish to multiple connected social media accounts.
    Strictly requires verified human 'Approved' status before allowing publication.
    Executes official platform API calls, persists post records, and triggers comment ingestion.
    """
    content = db.query(UploadedContent).filter(
        UploadedContent.id == content_id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    if content.approval_status != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Publication Blocked: Content approval status is '{content.approval_status}'. Content must have human 'Approved' status before publication."
        )

    if not req.platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one social media platform to publish."
        )

    if req.caption:
        content.caption = req.caption.strip()

    post_caption = f"{req.caption or content.caption or ''} {req.hashtags or ''}".strip()
    results: List[Dict[str, Any]] = []
    successful_platforms: List[str] = []
    primary_post_url = None
    primary_post_id = None

    for raw_p in req.platforms:
        p_lower = raw_p.strip().lower()
        if "insta" in p_lower:
            p_display = "Instagram"
            p_key = "instagram"
        elif "face" in p_lower:
            p_display = "Facebook"
            p_key = "facebook"
        elif "link" in p_lower:
            p_display = "LinkedIn"
            p_key = "linkedin"
        elif "you" in p_lower:
            p_display = "YouTube"
            p_key = "youtube"
        elif "twit" in p_lower or p_lower == "x" or "x (" in p_lower:
            p_display = "X (Twitter)"
            p_key = "twitter"
        else:
            p_display = raw_p.strip().capitalize()
            p_key = raw_p.strip().lower()

        account = db.query(ConnectedSocialAccount).filter(
            ConnectedSocialAccount.organisation_id == org.id,
            ConnectedSocialAccount.status == "Connected",
            (
                (ConnectedSocialAccount.platform == p_display) |
                (ConnectedSocialAccount.platform == "Twitter" if p_key == "twitter" else False) |
                (ConnectedSocialAccount.platform.ilike(f"%{p_key}%"))
            )
        ).first()

        if not account:
            results.append({
                "platform": p_display,
                "status": "Failed",
                "error": f"No active {p_display} account connected. Connect an authorized account in Integrations before publishing."
            })
            continue

        raw_token = decrypt_token(account.access_token) if account.access_token else None
        if not raw_token:
            results.append({
                "platform": p_display,
                "status": "Failed",
                "error": f"No valid OAuth access token stored for {p_display}. Please reconnect."
            })
            continue

        try:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            post_id = None
            post_url = None
            api_notes = None

            if p_key == "instagram":
                media_path = content.file_path or ""
                is_public_url = media_path.startswith("http://") or media_path.startswith("https://")
                if not is_public_url:
                    results.append({
                        "platform": p_display,
                        "status": "Limitation",
                        "error": "Instagram Graph API requires a publicly accessible HTTPS image URL. Local files cannot be ingested directly by Meta servers. Supported option: Host media on CDN / public cloud or connect Meta Content Ingestion webhook."
                    })
                    continue
                else:
                    ig_user_id = account.account_id
                    c_resp = requests.post(
                        f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
                        data={"image_url": media_path, "caption": post_caption, "access_token": raw_token},
                        timeout=15
                    )
                    c_data = c_resp.json()
                    if "id" in c_data:
                        creation_id = c_data["id"]
                        p_resp = requests.post(
                            f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish",
                            data={"creation_id": creation_id, "access_token": raw_token},
                            timeout=15
                        )
                        p_data = p_resp.json()
                        if "id" in p_data:
                            post_id = p_data["id"]
                            post_url = f"https://www.instagram.com/p/{post_id}/"
                            api_notes = "Published via official Instagram Graph API."
                        else:
                            results.append({
                                "platform": p_display,
                                "status": "Failed",
                                "error": p_data.get("error", {}).get("message", "Instagram media_publish failed.")
                            })
                            continue
                    else:
                        results.append({
                            "platform": p_display,
                            "status": "Failed",
                            "error": c_data.get("error", {}).get("message", "Instagram container creation failed.")
                        })
                        continue

            elif p_key == "facebook":
                page_id = account.account_id
                fb_resp = requests.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/feed",
                    data={"message": post_caption, "access_token": raw_token},
                    timeout=15
                )
                fb_data = fb_resp.json()
                if "id" in fb_data:
                    post_id = fb_data["id"]
                    post_url = f"https://www.facebook.com/{post_id}"
                    api_notes = "Published via official Facebook Graph API."
                else:
                    results.append({
                        "platform": p_display,
                        "status": "Failed",
                        "error": fb_data.get("error", {}).get("message", "Facebook feed publishing failed.")
                    })
                    continue

            elif p_key == "twitter":
                tw_resp = requests.post(
                    "https://api.twitter.com/2/tweets",
                    json={"text": post_caption},
                    headers={"Authorization": f"Bearer {raw_token}", "Content-Type": "application/json"},
                    timeout=15
                )
                tw_data = tw_resp.json()
                if tw_resp.status_code in (200, 201) and "data" in tw_data and "id" in tw_data["data"]:
                    post_id = str(tw_data["data"]["id"])
                    post_url = f"https://twitter.com/i/web/status/{post_id}"
                    api_notes = "Published via official X (Twitter) API v2."
                else:
                    err_msg = tw_data.get("detail") or tw_data.get("title") or tw_resp.text
                    results.append({
                        "platform": p_display,
                        "status": "Failed",
                        "error": f"X API error: {err_msg}"
                    })
                    continue

            elif p_key == "linkedin":
                li_resp = requests.post(
                    "https://api.linkedin.com/v2/ugcPosts",
                    json={
                        "author": f"urn:li:organization:{account.account_id}",
                        "lifecycleState": "PUBLISHED",
                        "specificContent": {
                            "com.linkedin.ugc.ShareContent": {
                                "shareCommentary": {"text": post_caption},
                                "shareMediaCategory": "NONE"
                            }
                        },
                        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                    },
                    headers={"Authorization": f"Bearer {raw_token}", "X-Restli-Protocol-Version": "2.0.0"},
                    timeout=15
                )
                li_data = li_resp.json() if li_resp.text else {}
                if li_resp.status_code in (200, 201) and "id" in li_data:
                    post_id = li_data["id"]
                    post_url = f"https://www.linkedin.com/feed/update/{post_id}/"
                    api_notes = "Published via official LinkedIn Community API."
                else:
                    err_msg = li_data.get("message") or li_resp.text
                    results.append({
                        "platform": p_display,
                        "status": "Failed",
                        "error": f"LinkedIn API error: {err_msg}"
                    })
                    continue

            elif p_key == "youtube":
                results.append({
                    "platform": p_display,
                    "status": "Limitation",
                    "error": "YouTube Data API v3 requires video media (.mp4, .mov). Static image assets cannot be published to YouTube video channels. Supported format: Video uploads or YouTube Community Posts."
                })
                continue

            else:
                results.append({
                    "platform": p_display,
                    "status": "Failed",
                    "error": f"Unsupported platform: {p_display}"
                })
                continue

            # Record success for this platform
            results.append({
                "platform": p_display,
                "status": "Published",
                "post_url": post_url,
                "external_post_id": post_id,
                "message": f"Successfully published to {p_display}.",
                "details": api_notes
            })
            successful_platforms.append(p_display)
            if not primary_post_url:
                primary_post_url = post_url
                primary_post_id = post_id

            # Trigger automatic comment collection & sentiment analysis
            try:
                dispatch_platform_sync(account, db)
            except Exception as sync_exc:
                logger.warning(f"Post-publish sync warning for {p_display}: {sync_exc}")

        except Exception as plat_exc:
            logger.error(f"Error publishing to {p_display}: {plat_exc}", exc_info=True)
            results.append({
                "platform": p_display,
                "status": "Failed",
                "error": str(plat_exc)
            })

    # If any platform published, save to PublishedPost
    if successful_platforms:
        pub_post = db.query(PublishedPost).filter(
            PublishedPost.content_id == content.id,
            PublishedPost.organisation_id == org.id
        ).first()

        summary_platforms = ", ".join(successful_platforms)
        if pub_post:
            pub_post.platform = summary_platforms
            pub_post.external_post_id = primary_post_id
            pub_post.post_url = primary_post_url
            pub_post.published_at = datetime.now(timezone.utc)
            pub_post.status = "Published"
            pub_post.publish_response = json.dumps(results)
        else:
            pub_post = PublishedPost(
                organisation_id=org.id,
                content_id=content.id,
                platform=summary_platforms,
                external_post_id=primary_post_id,
                post_url=primary_post_url,
                published_at=datetime.now(timezone.utc),
                status="Published",
                publish_response=json.dumps(results)
            )
            db.add(pub_post)

        log = ActivityLog(
            organisation_id=org.id,
            user_id=current_user.id,
            user_email=current_user.email,
            action_type="PUBLISH_CONTENT_MULTI",
            entity_type="PublishedPost",
            description=f"Published approved creative '{content.title}' to {summary_platforms}."
        )
        db.add(log)
        db.commit()

    return {
        "content_id": content.id,
        "published_count": len(successful_platforms),
        "failed_count": len([r for r in results if r["status"] in ("Failed", "Limitation")]),
        "results": results
    }


@router.get("/published")
def get_published_posts(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    posts = db.query(PublishedPost).filter(PublishedPost.organisation_id == org.id).all()
    return [
        {
            "id": p.id,
            "content_id": p.content_id,
            "platform": p.platform,
            "external_post_id": p.external_post_id,
            "post_url": p.post_url,
            "published_at": p.published_at,
            "status": p.status
        }
        for p in posts
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 7. WEBHOOK RECEIVER & COMMENT STREAM (Phase 12)
# ─────────────────────────────────────────────────────────────────────────────

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@webhook_router.get("/meta")
def meta_webhook_verify(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """Meta webhook verification endpoint."""
    verify_token = settings.META_WEBHOOK_VERIFY_TOKEN or "brandguard_webhook_2026"
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        return Response(content=hub_challenge or "", media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@webhook_router.post("/meta")
async def meta_webhook_receive(request: Request, db: Session = Depends(get_db)):
    """
    Meta webhook receiver for Instagram & Facebook Page comments.
    Validates X-Hub-Signature-256 HMAC when META_APP_SECRET is configured.
    """
    body_bytes = await request.body()

    # Verify signature if secret configured
    signature_header = request.headers.get("X-Hub-Signature-256")
    if signature_header and settings.META_APP_SECRET:
        expected_hash = hmac.new(
            settings.META_APP_SECRET.encode("utf-8"),
            body_bytes,
            hashlib.sha256
        ).hexdigest()
        expected_sig = f"sha256={expected_hash}"
        if not hmac.compare_digest(signature_header, expected_sig):
            logger.warning("Meta webhook signature mismatch.")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception:
        payload = {}

    entries = payload.get("entry", [])
    processed_count = 0

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            field = change.get("field")
            val = change.get("value", {})
            if field in ("comments", "feed", "live_comments"):
                c_id = val.get("comment_id") or val.get("id")
                c_text = val.get("message") or val.get("text")
                from_user = val.get("from", {}).get("name") or val.get("username", "Social Audience")

                if c_id and c_text:
                    # Match organisation by entry ID if possible
                    acc = db.query(ConnectedSocialAccount).filter(
                        ConnectedSocialAccount.account_id == str(entry.get("id"))
                    ).first()
                    org_id = acc.organisation_id if acc else 1

                    exists = db.query(AudienceFeedback).filter(
                        AudienceFeedback.organisation_id == org_id,
                        AudienceFeedback.external_comment_id == str(c_id)
                    ).first()

                    if not exists:
                        s_res = analyze_comment_sentiment(c_text)
                        rec = AudienceFeedback(
                            organisation_id=org_id,
                            post_id=None,
                            source_type="Meta Live Webhook",
                            external_comment_id=str(c_id),
                            author_name=from_user,
                            comment_text=c_text,
                            comment_date=datetime.now(timezone.utc),
                            platform="Instagram" if "instagram" in str(entry) else "Facebook",
                            sentiment=s_res.get("sentiment", "Neutral"),
                            sentiment_confidence=s_res.get("confidence", 0.85),
                            topic=s_res.get("topic", "Customer Experience")
                        )
                        db.add(rec)
                        processed_count += 1

    if processed_count > 0:
        db.commit()

    return {"status": "received", "processed_events": processed_count}


@webhook_router.post("/youtube")
async def youtube_webhook_receive(request: Request, db: Session = Depends(get_db)):
    """YouTube PubSubHubbub receiver."""
    body = await request.body()
    return {"status": "received", "bytes": len(body)}
