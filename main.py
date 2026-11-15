"""
BrandGuard AI - Root Entry Point for Vercel & Production
Exposes ASGI application 'app' for FastAPI framework deployment.
"""
import sys
import os
from pathlib import Path

# Ensure root and backend directories are in sys.path
_root = Path(__file__).resolve().parent
for _p in [str(_root), str(_root / "backend")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
