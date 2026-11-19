import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import urllib.request
from backend.core.database import SessionLocal
from backend.models.all_models import GeneratedReport, User
from backend.core.security import create_access_token

db = SessionLocal()
report = db.query(GeneratedReport).order_by(GeneratedReport.id.desc()).first()
user = db.query(User).filter(User.organisation_id == report.organisation_id).first()
token = create_access_token({"sub": str(user.id)})
report_id = report.id
file_path = Path(report.file_path)
db.close()

print(f"Testing Report {report_id}...")

# 1. Test regular download (attachment)
url_dl = f"http://127.0.0.1:8000/api/reports/{report_id}/download?token={token}"
with urllib.request.urlopen(url_dl) as resp:
    assert resp.status == 200
    headers = dict(resp.headers)
    print("Download Content-Disposition:", headers.get("content-disposition"))
    assert "attachment" in headers.get("content-disposition", "")
    content = resp.read()
    assert len(content) > 1000
    print(f"✓ Regular download passed ({len(content)} bytes)")

# 2. Test preview (inline)
url_prev = f"http://127.0.0.1:8000/api/reports/{report_id}/download?token={token}&preview=true"
with urllib.request.urlopen(url_prev) as resp:
    assert resp.status == 200
    headers = dict(resp.headers)
    print("Preview Content-Disposition:", headers.get("content-disposition"))
    assert "inline" in headers.get("content-disposition", "")
    content = resp.read()
    assert len(content) > 1000
    print(f"✓ Preview inline passed ({len(content)} bytes)")

# 3. Test auto-regeneration when physical file is missing
temp_bak = file_path.with_suffix(".bak")
file_path.rename(temp_bak)
try:
    assert not file_path.exists()
    print("File renamed away, testing on-the-fly regeneration...")
    with urllib.request.urlopen(url_dl) as resp:
        assert resp.status == 200
        content = resp.read()
        assert len(content) > 1000
        print(f"✓ Auto-regeneration on missing file passed! ({len(content)} bytes)")
finally:
    if temp_bak.exists():
        temp_bak.unlink()

print("\nALL REPORT DOWNLOAD & PREVIEW TESTS PASSED SUCCESSFULLY!")
