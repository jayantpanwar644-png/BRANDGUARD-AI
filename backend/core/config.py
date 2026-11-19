import os
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Attempt to load local .env files if python-dotenv is present
try:
    from dotenv import load_dotenv
    _config_dir = Path(__file__).resolve().parent
    _backend_dir = _config_dir.parent
    _root_dir = _backend_dir.parent
    for _env_candidate in [_root_dir / ".env", _backend_dir / ".env", Path(".env")]:
        if _env_candidate.is_file():
            load_dotenv(dotenv_path=_env_candidate, override=False)
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# Robust detection for Vercel, AWS Lambda, or any serverless/read-only container
is_serverless = bool(
    os.getenv("VERCEL") == "1"
    or os.getenv("VERCEL") == "true"
    or bool(os.getenv("VERCEL_ENV"))
    or bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    or not os.access(str(BASE_DIR), os.W_OK)
)

default_upload_dir = Path("/tmp/uploads") if is_serverless else BASE_DIR / "uploads"
default_db_url = "sqlite:////tmp/brandguard.db" if is_serverless else f"sqlite:///{BASE_DIR}/brandguard.db"

class Settings(BaseModel):
    PROJECT_NAME: str = "BrandGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db_url)
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brandguard-enterprise-security-token-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    TOKEN_ENCRYPTION_KEY: str = os.getenv("TOKEN_ENCRYPTION_KEY", "")

    # Domain URLs for local & production OAuth callbacks
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    
    # AI & Vision
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Upload Storage
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(default_upload_dir)))
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_DOC_EXTENSIONS: set = {".pdf", ".docx", ".txt", ".csv", ".png", ".jpg", ".jpeg"}

    # OAuth — Meta (Facebook + Instagram)
    META_APP_ID: str = os.getenv("META_APP_ID", "")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    META_REDIRECT_URI: str = os.getenv("META_REDIRECT_URI", "")
    INSTAGRAM_REDIRECT_URI: str = os.getenv("INSTAGRAM_REDIRECT_URI", "")
    FACEBOOK_REDIRECT_URI: str = os.getenv("FACEBOOK_REDIRECT_URI", "")
    INSTAGRAM_AUTH_MODE: str = os.getenv("INSTAGRAM_AUTH_MODE", "instagram_login")  # instagram_login or meta_graph

    # OAuth — LinkedIn
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    LINKEDIN_REDIRECT_URI: str = os.getenv("LINKEDIN_REDIRECT_URI", "")

    # OAuth — Google / YouTube
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "")

    # Webhooks
    META_WEBHOOK_VERIFY_TOKEN: str = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "brandguard_webhook_2026")

    def get_redirect_uri(self, platform: str) -> str:
        """
        Computes the canonical OAuth redirect URI for each platform.
        Prefers specific environment variable override if defined,
        otherwise generates using BACKEND_URL + API endpoint.
        """
        p = platform.lower()
        if p == "instagram":
            if self.INSTAGRAM_REDIRECT_URI:
                return self.INSTAGRAM_REDIRECT_URI
            if self.META_REDIRECT_URI and "instagram" in self.META_REDIRECT_URI:
                return self.META_REDIRECT_URI
            # On localhost, default to frontend proxy port 3000 since Meta accepts localhost but blocks 127.0.0.1
            base = self.FRONTEND_URL.rstrip('/') if "localhost" in self.FRONTEND_URL else self.BACKEND_URL.rstrip('/')
            return f"{base}/api/integrations/oauth/instagram/callback"
        elif p == "facebook":
            if self.FACEBOOK_REDIRECT_URI:
                return self.FACEBOOK_REDIRECT_URI
            if self.META_REDIRECT_URI:
                return self.META_REDIRECT_URI
            return f"{self.BACKEND_URL.rstrip('/')}/api/integrations/oauth/facebook/callback"
        elif p == "linkedin":
            if self.LINKEDIN_REDIRECT_URI:
                return self.LINKEDIN_REDIRECT_URI
            return f"{self.BACKEND_URL.rstrip('/')}/api/integrations/oauth/linkedin/callback"
        elif p == "youtube":
            if self.GOOGLE_REDIRECT_URI:
                return self.GOOGLE_REDIRECT_URI
            return f"{self.BACKEND_URL.rstrip('/')}/api/integrations/oauth/youtube/callback"
        return f"{self.BACKEND_URL.rstrip('/')}/api/integrations/oauth/{p}/callback"

    def is_provider_configured(self, platform: str) -> bool:
        """Checks whether the required credentials for a platform are configured."""
        p = platform.lower()
        if p in ("instagram", "facebook"):
            return bool(self.META_APP_ID.strip() and self.META_APP_SECRET.strip())
        elif p == "linkedin":
            return bool(self.LINKEDIN_CLIENT_ID.strip() and self.LINKEDIN_CLIENT_SECRET.strip())
        elif p == "youtube":
            return bool(self.GOOGLE_CLIENT_ID.strip() and self.GOOGLE_CLIENT_SECRET.strip())
        return False

settings = Settings()

# Normalize postgres:// to postgresql:// if needed for SQLAlchemy 2.0+ compatibility
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure upload directories exist safely without crashing on read-only environments
for subfolder in ["images", "guidelines", "evidence", "reports", "logos", "csv"]:
    try:
        (settings.UPLOAD_DIR / subfolder).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
