import os
from pathlib import Path
from pydantic import BaseModel

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
    
    # AI & Vision
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Upload Storage
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(default_upload_dir)))
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_DOC_EXTENSIONS: set = {".pdf", ".docx", ".txt", ".csv", ".png", ".jpg", ".jpeg"}

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
