import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
from backend.core.config import settings

def hash_password(password: str) -> str:
    """Secure password hashing using PBKDF2-HMAC-SHA256 with 100,000 rounds and random 16-byte salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"pbkdf2:sha256:100000${salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        parts = hashed_password.split('$')
        if len(parts) != 3:
            return False
        algorithm_info, salt_hex, key_hex = parts
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(key, computed_key)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
