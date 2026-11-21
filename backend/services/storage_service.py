"""
BrandGuard AI — Persistent Storage Service
Supports local file storage and Supabase Storage for persistent cloud asset hosting.
"""
import os
import mimetypes
import logging
from pathlib import Path
from typing import Optional, Tuple
import requests

from backend.core.config import settings

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
USE_SUPABASE_STORAGE = bool(SUPABASE_URL and SUPABASE_KEY)

def get_bucket_for_category(category: str) -> str:
    cat = category.lower()
    if "logo" in cat:
        return "logos"
    elif "guideline" in cat:
        return "guidelines"
    elif "evidence" in cat:
        return "evidence"
    elif "report" in cat:
        return "reports"
    return "creatives"

def save_uploaded_file(
    file_bytes: bytes,
    filename: str,
    subfolder: str = "images"
) -> Tuple[str, str]:
    """
    Saves uploaded file to persistent storage.
    Returns a tuple of: (relative_or_remote_path, absolute_local_path_if_saved_locally)
    """
    # 1. Always ensure local copy in settings.UPLOAD_DIR for local processing/CV/OCR
    local_dir = settings.UPLOAD_DIR / subfolder
    local_dir.mkdir(parents=True, exist_ok=True)
    local_path = local_dir / filename
    local_path.write_bytes(file_bytes)

    # 2. If Supabase Storage is configured, sync to Supabase Storage bucket
    if USE_SUPABASE_STORAGE:
        try:
            bucket = get_bucket_for_category(subfolder)
            mime_type, _ = mimetypes.guess_type(filename)
            headers = {
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "Content-Type": mime_type or "application/octet-stream"
            }
            upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
            res = requests.post(upload_url, headers=headers, data=file_bytes, timeout=15)
            if res.status_code in (200, 201):
                # Public bucket URL
                remote_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
                logger.info(f"Uploaded asset to Supabase Storage: {remote_url}")
                return (remote_url, str(local_path))
            else:
                logger.warning(f"Supabase storage upload returned {res.status_code}: {res.text}")
        except Exception as exc:
            logger.warning(f"Could not upload to Supabase Storage: {exc}")

    # Fallback to local server path
    rel_path = f"/uploads/{subfolder}/{filename}"
    return (rel_path, str(local_path))
