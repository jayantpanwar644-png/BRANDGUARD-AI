import sys
import os
import types
import mimetypes
from pathlib import Path

# Ensure root repository and backend directories are in sys.path regardless of execution environment
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent
_root_dir = _backend_dir.parent

for _p in [str(_root_dir), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# In Vercel Multi-Service where root is 'backend', dynamically alias current directory as 'backend'
if "backend" not in sys.modules and (_backend_dir / "core").is_dir():
    _backend_pkg = types.ModuleType("backend")
    _backend_pkg.__path__ = [str(_backend_dir)]
    _backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = _backend_pkg

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, HTMLResponse
from backend.core.config import settings
from backend.core.database import engine, Base
import backend.models.all_models  # ensure models are registered with Base

# Create tables safely on startup
try:
    Base.metadata.create_all(bind=engine)
    try:
        from backend.migrations.migrate_social_accounts import run_migration as run_social_migration
        run_social_migration()
    except Exception:
        pass
    # Auto-seed demo enterprise data
    def _seed_initial_demo_data():
        from backend.core.database import SessionLocal
        from backend.core.security import hash_password
        from backend.models.all_models import User, Organisation, BrandProfile
        db = SessionLocal()
        try:
            if not db.query(User).filter(User.email == "admin@nexusdynamics.io").first():
                org = Organisation(
                    name="Nexus Dynamics Inc",
                    official_email="admin@nexusdynamics.io",
                    industry="Enterprise Security / SaaS",
                    website="https://nexusdynamics.io",
                )
                db.add(org)
                db.flush()
                profile = BrandProfile(
                    organisation_id=org.id,
                    company_name="Nexus Dynamics",
                    primary_color="#1A56DB",
                    secondary_color="#7E3AF2",
                    accent_color="#10B981",
                    is_configured=True
                )
                db.add(profile)
                user = User(
                    organisation_id=org.id,
                    email="admin@nexusdynamics.io",
                    full_name="Chief Brand Officer",
                    hashed_password=hash_password("SecurePassword2026!"),
                    role="Admin",
                    is_active=True
                )
                db.add(user)
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    _seed_initial_demo_data()
except Exception as e:
    print(f"Startup warning: Database initialization: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI Brand Governance & Reputation Protection Platform"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if built frontend is available to serve (checks frontend/dist or root dist)
_frontend_dist = _root_dir / "frontend" / "dist"
if not (_frontend_dist / "index.html").exists():
    _frontend_dist = _root_dir / "dist"
_has_frontend_build = _frontend_dist.exists() and (_frontend_dist / "index.html").exists()

# Safe serverless static assets handler (never hangs on ASGI adapters)
@app.get("/assets/{asset_path:path}")
def serve_asset(asset_path: str):
    if _has_frontend_build:
        target = _frontend_dist / "assets" / asset_path
        if target.is_file():
            mime, _ = mimetypes.guess_type(str(target))
            return Response(
                content=target.read_bytes(),
                media_type=mime or "application/octet-stream",
                headers={"Cache-Control": "public, max-age=31536000, immutable"}
            )
    raise HTTPException(status_code=404, detail="Asset not found")

# Safe serverless upload files handler
@app.get("/uploads/{upload_path:path}")
def serve_upload(upload_path: str):
    target = settings.UPLOAD_DIR / upload_path
    if target.is_file():
        mime, _ = mimetypes.guess_type(str(target))
        return Response(
            content=target.read_bytes(),
            media_type=mime or "application/octet-stream"
        )
    raise HTTPException(status_code=404, detail="File not found")

# Include Routers
from backend.routers import (
    auth, organisation, brand_knowledge, content,
    claims, approvals, audience, reputation, reports,
    integrations, dashboard, settings as settings_router, chat
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(organisation.router, prefix=settings.API_V1_STR)
app.include_router(brand_knowledge.router, prefix=settings.API_V1_STR)
app.include_router(content.router, prefix=settings.API_V1_STR)
app.include_router(claims.router, prefix=settings.API_V1_STR)
app.include_router(approvals.router, prefix=settings.API_V1_STR)
app.include_router(audience.router, prefix=settings.API_V1_STR)
app.include_router(reputation.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(integrations.router, prefix=settings.API_V1_STR)
app.include_router(integrations.webhook_router, prefix=settings.API_V1_STR)
app.include_router(integrations.webhook_router)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)

# Health check endpoints for Vercel, uptime monitors and load balancers
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "Operational",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }

@app.get("/")
def root():
    if _has_frontend_build:
        index_file = _frontend_dist / "index.html"
        return HTMLResponse(
            content=index_file.read_text(encoding="utf-8"),
            headers={"Cache-Control": "no-cache"}
        )
    return {
        "name": settings.PROJECT_NAME,
        "tagline": "Protecting Brand Identity Before Publication and Public Trust After Publication.",
        "version": settings.VERSION,
        "status": "Operational",
        "docs_url": "/docs"
    }

# SPA route fallback for client-side routing
if _has_frontend_build:
    @app.get("/{full_path:path}")
    def serve_spa_frontend(full_path: str):
        # Never swallow API, uploads, docs or health endpoints
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path in ["docs", "openapi.json", "health"]:
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = _frontend_dist / full_path
        if target_file.is_file():
            mime, _ = mimetypes.guess_type(str(target_file))
            return Response(
                content=target_file.read_bytes(),
                media_type=mime or "application/octet-stream"
            )
        return HTMLResponse(
            content=(_frontend_dist / "index.html").read_text(encoding="utf-8"),
            headers={"Cache-Control": "no-cache"}
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
