"""
Vercel Serverless Function Entrypoint for BrandGuard AI
Exposes FastAPI ASGI application with proper module path resolution.
"""
import sys
import os
from pathlib import Path

# Bootstrapping sys.path for Vercel runtime
_current_dir = Path(__file__).resolve().parent
_root_dir = _current_dir.parent
for _p in [str(_root_dir), str(_root_dir / "backend")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.main import app

# Export for both ASGI and legacy WSGI/serverless handlers
handler = app
