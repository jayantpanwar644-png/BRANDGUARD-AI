import io
import os
import sys
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.core.database import SessionLocal
from backend.models.all_models import User, Organisation, UploadedContent, DetectedClaim
from backend.core.security import create_access_token

client = TestClient(app)

def create_image(fmt="PNG", size=(600, 400), text="Test Creative"):
    img = Image.new("RGB", size, (240, 245, 250))
    d = ImageDraw.Draw(img)
    d.text((30, 30), text, fill=(20, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.getvalue()

def run_tests():
    print("=== Testing All 7 Upload Endpoints ===")
    
    db = SessionLocal()
    user = db.query(User).first()
    assert user is not None
    org_id = user.organisation_id
    token = create_access_token(data={"sub": str(user.id), "org_id": org_id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Company Logo Upload (PNG, JPG, WEBP, SVG)
    print("\n1. Testing Company Logo Upload...")
    logo_bytes = create_image("PNG", (200, 200), "BrandLogo")
    files = {"file": ("brand_logo.png", logo_bytes, "image/png")}
    res = client.post("/api/organisations/logo", files=files, headers=headers)
    assert res.status_code == 200, f"Logo upload failed: {res.text}"
    logo_data = res.json()
    assert "logo_url" in logo_data
    print(f"  ✓ Logo uploaded: {logo_data['logo_url']}")

    # 2. Brand Guidelines Document Upload (PDF, DOCX, TXT)
    print("\n2. Testing Brand Guidelines Upload...")
    doc_text = "Rule 1: Always use certified primary blue #1A56DB.\nRule 2: Never make 100% guarantee statements."
    files = {"file": ("guidelines_v1.txt", doc_text.encode('utf-8'), "text/plain")}
    data = {"version": "1.0", "document_category": "Master Guidelines"}
    res = client.post("/api/brand/guidelines/upload", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Guideline upload failed: {res.text}"
    print(f"  ✓ Guideline uploaded successfully")

    # 3. Brand Asset Upload (Primary Logo, Product Image, Alternate Logo)
    print("\n3. Testing Brand Asset Upload...")
    asset_bytes = create_image("PNG", (400, 300), "Product Hero")
    files = {"file": ("product_hero.png", asset_bytes, "image/png")}
    data = {"asset_name": "Product Hero 2026", "asset_type": "Product Image", "description": "Key visual"}
    res = client.post("/api/brand/assets", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Asset upload failed: {res.text}"
    asset_data = res.json().get("asset", res.json())
    print(f"  ✓ Brand asset uploaded: ID {asset_data['id']}")

    # 4. Post / Creative Image Upload
    print("\n4. Testing Creative Image Upload...")
    creative_bytes = create_image("PNG", (800, 600), "Spring Promotion")
    files = {"file": ("creative_ad.png", creative_bytes, "image/png")}
    data = {"title": "Spring Promo Ad", "caption": "Launch campaign", "platform": "Instagram"}
    res = client.post("/api/content/upload", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Creative upload failed: {res.text}"
    content_id = res.json()["content"]["id"]
    print(f"  ✓ Creative uploaded: ID {content_id}")

    # 5. Claim Evidence Document Upload
    print("\n5. Testing Claim Evidence Document Upload...")
    # Find or create a detected claim
    content = db.query(UploadedContent).filter(UploadedContent.id == content_id).first()
    claim = db.query(DetectedClaim).first()
    if not claim:
        claim = DetectedClaim(
            organisation_id=org_id,
            content_id=content_id,
            statement="Certified 99.9% uptime guaranteed",
            claim_type="Numerical",
            verification_status="Pending Evidence"
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)
    
    proof_text = "Third-party audit report confirming 99.9% uptime compliance."
    files = {"file": ("proof_document.txt", proof_text.encode('utf-8'), "text/plain")}
    data = {
        "document_name": "Uptime Audit Report",
        "description": "Third party ISO verification"
    }
    res = client.post(f"/api/claims/{claim.id}/evidence", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Evidence upload failed: {res.text}"
    evidence_data = res.json()
    print(f"  ✓ Evidence uploaded: {evidence_data.get('message')}")

    # 6. Final Image Upload (Version increment)
    print("\n6. Testing User Final Image Upload...")
    final_bytes = create_image("WEBP", (800, 600), "Final User Edited Creative")
    files = {"file": ("final_creative.webp", final_bytes, "image/webp")}
    data = {"notes": "Approved final version"}
    res = client.post(f"/api/content/{content_id}/upload-version", files=files, data=data, headers=headers)
    assert res.status_code == 200, f"Final image upload failed: {res.text}"
    v_info = res.json()["version"]
    print(f"  ✓ Final image uploaded: Version {v_info['version_number']} ({v_info['generated_by']})")

    # 7. Audience Feedback CSV Upload
    print("\n7. Testing Audience Feedback CSV Upload...")
    csv_content = (
        "comment_text,platform,author\n"
        "\"Amazing brand reliability and fast response time!\",Instagram,user1\n"
        "\"The product delivery was slightly delayed but support helped.\",Twitter,user2\n"
        "\"Not happy with the recent pricing changes.\",Reddit,user3\n"
    )
    files = {"file": ("customer_feedback.csv", csv_content.encode('utf-8'), "text/csv")}
    res = client.post("/api/audience/import-csv", files=files, headers=headers)
    assert res.status_code == 200, f"Audience CSV import failed: {res.text}"
    csv_data = res.json()
    print(f"  ✓ Audience CSV imported: {csv_data.get('total_imported', csv_data.get('imported_count', 'OK'))} records")

    # 8. Test Invalid File Extension handling (Must return 400, not 500)
    print("\n8. Testing Validation on Invalid File Extensions...")
    bad_files = {"file": ("malicious_script.exe", b"MZ...", "application/x-msdownload")}
    res = client.post("/api/content/upload", files=bad_files, data={"title": "Bad"}, headers=headers)
    assert res.status_code == 400, f"Expected 400 for bad extension, got {res.status_code}"
    print(f"  ✓ Invalid extension properly rejected with HTTP 400: {res.json().get('detail')}")

    db.close()
    print("\n>>> ALL 7 BACKEND UPLOAD WORKFLOWS PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    run_tests()
