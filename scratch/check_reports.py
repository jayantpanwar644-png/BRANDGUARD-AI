import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.database import SessionLocal
from backend.models.all_models import GeneratedReport

db = SessionLocal()
reports = db.query(GeneratedReport).all()
print(f"Total GeneratedReport rows in DB: {len(reports)}")
for r in reports:
    p = Path(r.file_path)
    exists = p.exists()
    print(f"ID {r.id}: Org={r.organisation_id}, Title='{r.title}', Size={r.file_size}, Exists={exists}, Path={r.file_path}")
db.close()
