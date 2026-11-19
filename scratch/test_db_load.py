import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import time
from PIL import Image
from backend.services.logo_detector import resolve_asset_local_path
from backend.models.all_models import UploadedContent, BrandProfile, BrandAsset, AuditReport, AuditFinding
from backend.core.database import SessionLocal

db = SessionLocal()
content = db.query(UploadedContent).filter(UploadedContent.id == 51).first()
org_id = content.organisation_id
profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org_id).first()
assets = db.query(BrandAsset).filter(BrandAsset.organisation_id == org_id).all()

local_path = resolve_asset_local_path(content.file_path)
print("Content 51 path:", local_path)
print("Assets count:", len(assets))
for a in assets:
    print("Asset:", a.id, a.asset_type, a.file_name, a.variation_type)

db.close()
