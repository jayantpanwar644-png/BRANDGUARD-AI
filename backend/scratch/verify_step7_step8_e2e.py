import io
import os
import sys
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.core.database import SessionLocal
from backend.models.all_models import User, Organisation, UploadedContent, AuditReport, BrandProfile

client = TestClient(app)

def create_test_image_bytes(text="Original Ad 100% guaranteed"):
    img = Image.new("RGB", (800, 600), color=(240, 240, 240))
    d = ImageDraw.Draw(img)
    d.text((50, 50), text, fill=(20, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()

def run_e2e_verification():
    print("=== Step 7 & Step 8 E2E Automated Verification ===")
    
    # 1. Fetch or authenticate a user
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        print("Creating mock user for testing...")
        org = Organisation(name="Verification Org")
        db.add(org)
        db.commit()
        db.refresh(org)
        user = User(email="test@example.com", hashed_password="pw", organisation_id=org.id)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    org_id = user.organisation_id
    user_id = user.id
    db.close()

    from backend.core.security import create_access_token
    token = create_access_token(data={"sub": str(user_id), "org_id": org_id})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload initial creative (v1)
    print("\n--- 1. Uploading initial creative (v1) ---")
    img_bytes = create_test_image_bytes("Brand Ad 100% guaranteed miracle results")
    files = {"file": ("creative_v1.png", img_bytes, "image/png")}
    data = {
        "title": "Spring Campaign 2026",
        "content_type": "ad_creative",
        "file_type": "image",
        "target_audience": "General Public"
    }
    res = client.post("/api/content/upload", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    content_data = res.json()
    content_item = content_data["content"]
    content_id = content_item["id"]
    print(f"Content created: ID {content_id}, Current Version: {content_item.get('current_version', 1)}")

    # Initial Audit
    print("Running initial audit...")
    res = client.post(f"/api/content/{content_id}/analyse", headers=headers)
    assert res.status_code == 200, f"Audit failed: {res.text}"
    initial_audit = res.json()
    print(f"Initial Audit Score: {initial_audit.get('compliance_score')} | Findings count: {len(initial_audit.get('findings', []))}")

    # 3. Test AI Edit (Generates v2)
    print("\n--- 2. Generating AI Edit (Step 7 AI Fix -> v2) ---")
    req_body = {
        "correction_type": "all",
        "custom_instructions": "Embed brand logo and fix restricted vocabulary"
    }
    res = client.post(f"/api/content/{content_id}/generate-revised-creative", json=req_body, headers=headers)
    assert res.status_code == 200, f"AI Fix failed: {res.text}"
    ai_fix_res = res.json()
    assert ai_fix_res["new_version_number"] == 2, f"Expected v2, got {ai_fix_res['new_version_number']}"
    print(f"Generated v2: {ai_fix_res['new_version_number']} | Applied corrections: {len(ai_fix_res['applied_corrections'])}")
    for corr in ai_fix_res['applied_corrections']:
        print(f"  - [{corr.get('issue_type')}] {corr.get('title')}: {corr.get('description')}")

    # 4. Test User Upload Final Image (Step 8 User Upload -> v3)
    print("\n--- 3. Uploading User-Edited Final Image (Step 8 -> v3) ---")
    final_img_bytes = create_test_image_bytes("Approved Enterprise Creative - Polished")
    user_upload_files = {"file": ("user_final_creative.webp", final_img_bytes, "image/webp")}
    res = client.post(f"/api/content/{content_id}/upload-version", files=user_upload_files, headers=headers)
    assert res.status_code == 200, f"Upload version failed: {res.text}"
    upload_res = res.json()
    v_data = upload_res["version"]
    assert v_data["version_number"] == 3, f"Expected v3, got {v_data['version_number']}"
    assert v_data["generated_by"] == "User Uploaded", f"Expected User Uploaded, got {v_data['generated_by']}"
    print(f"Uploaded v3 successfully: Version {v_data['version_number']} ({v_data['generated_by']})")

    # 5. Verify all versions are preserved and intact
    print("\n--- 4. Verifying All Versions Intact ---")
    res = client.get(f"/api/content/{content_id}/versions", headers=headers)
    assert res.status_code == 200, f"Get versions failed: {res.text}"
    versions = res.json()
    version_nums = [v["version_number"] for v in versions]
    print(f"Existing versions in DB: {version_nums}")
    assert 1 in version_nums and 2 in version_nums and 3 in version_nums, "All versions (1, 2, 3) must be preserved!"
    print("All 3 versions preserved intact without overwriting.")

    # 6. Re-Audit the selected final image (Step 8 Re-Audit)
    print("\n--- 5. Re-Auditing Selected Final Creative (v3) ---")
    res = client.post(f"/api/content/{content_id}/reanalyse-version/3", headers=headers)
    assert res.status_code == 200, f"Re-audit failed: {res.text}"
    re_audit_data = res.json()
    print(f"Re-Audit complete: New Score {re_audit_data.get('compliance_score')} (Old: {re_audit_data.get('previous_score')})")
    print(f"Fixed Issues: {len(re_audit_data.get('fixed_issues', []))} | Remaining: {len(re_audit_data.get('remaining_issues', []))}")

    # 7. Download selected high quality version
    print("\n--- 6. Downloading High-Quality Image for Version 3 ---")
    res = client.get(f"/api/content/{content_id}/download-version/3", headers=headers)
    assert res.status_code == 200, f"Download failed: {res.text}"
    assert "image" in res.headers.get("content-type", ""), f"Expected image content-type, got {res.headers.get('content-type')}"
    print(f"Successfully downloaded v3: Content-Type: {res.headers.get('content-type')}, Size: {len(res.content)} bytes")

    # 8. Generate and download executive PDF report
    print("\n--- 7. Generating & Downloading Executive PDF Report ---")
    pdf_req = {
        "report_type": "Brand Audit Report",
        "date_range": "30d",
        "content_id": content_id
    }
    res = client.post("/api/reports/generate", json=pdf_req, headers=headers)
    assert res.status_code == 200, f"Generate report failed: {res.text}"
    report_meta = res.json()
    report_id = report_meta["id"]
    print(f"Generated PDF Report record ID: {report_id} | Path: {report_meta.get('file_path')}")

    res = client.get(f"/api/reports/{report_id}/download", headers=headers)
    assert res.status_code == 200, f"Download PDF failed: {res.text}"
    assert "application/pdf" in res.headers.get("content-type", ""), f"Expected application/pdf, got {res.headers.get('content-type')}"
    print(f"Successfully downloaded PDF Report: Size: {len(res.content)} bytes")

    print("\nALL VERIFICATION CRITERIA PASSED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    run_e2e_verification()
