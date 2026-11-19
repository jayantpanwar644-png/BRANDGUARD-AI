import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from backend.core.config import settings

def _get_fernet_key() -> bytes:
    """
    Derives a standard 32-byte URL-safe base64 key for Fernet AES encryption.
    Uses TOKEN_ENCRYPTION_KEY if set, otherwise falls back to SECRET_KEY.
    """
    secret = (getattr(settings, "TOKEN_ENCRYPTION_KEY", "") or settings.SECRET_KEY or "brandguard-default-encryption-salt-2026").encode()
    # Use SHA-256 to produce exactly 32 bytes, then base64-urlsafe encode
    key_32 = hashlib.sha256(secret).digest()
    return base64.urlsafe_b64encode(key_32)

def encrypt_token(plain_token: Optional[str]) -> Optional[str]:
    """Encrypts an OAuth access or refresh token before database storage."""
    if not plain_token:
        return None
    try:
        f = Fernet(_get_fernet_key())
        return f.encrypt(plain_token.encode("utf-8")).decode("utf-8")
    except Exception as exc:
        # Fallback to base64 if unexpected encryption failure occurs
        return "b64:" + base64.b64encode(plain_token.encode("utf-8")).decode("utf-8")

def decrypt_token(encrypted_token: Optional[str]) -> Optional[str]:
    """Decrypts a stored OAuth token. Supports Fernet and legacy base64 format."""
    if not encrypted_token:
        return None
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        # Fallback check for legacy base64 or plaintext
        if encrypted_token.startswith("b64:"):
            try:
                return base64.b64decode(encrypted_token[4:]).decode("utf-8")
            except Exception:
                return encrypted_token
        try:
            return base64.b64decode(encrypted_token).decode("utf-8")
        except Exception:
            return encrypted_token
