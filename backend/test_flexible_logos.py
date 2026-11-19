import io
import sys
import uuid
import tempfile
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
from fastapi.testclient import TestClient
from backend.main import app as fastapi_app
from backend.core.database import SessionLocal
from backend.models.all_models import Organisation, User, BrandProfile, BrandAsset
from backend.services.logo_processor import sanitize_svg

client = TestClient(fastapi_app)

def run_tests():
    print("=" * 70)
    print("TESTING FLEXIBLE COMPANY LOGO UPLOAD & EXTRACTION")
    print("=" * 70)

    # 1. Test SVG Sanitization security
    dirty_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
      <script>alert('malicious')</script>
      <rect width="200" height="100" fill="#2563eb" onload="hack()" />
      <text x="20" y="50" fill="white">Aegis Brand</text>
    </svg>"""
    safe_svg = sanitize_svg(dirty_svg)
    assert "<script>" not in safe_svg, "Script tag not stripped!"
    assert "onload=" not in safe_svg, "Event handler not stripped!"
    print("✓ SVG Sanitization verified: Malicious elements safely stripped.")

    # 2. Register test organisation
    email = f"logo_test_{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post("/api/auth/register", json={
        "company_name": "FlexiLogo Enterprise",
        "official_email": email,
        "full_name": "Brand Admin",
        "password": "Password123!",
        "industry": "Software"
    })
    assert reg.status_code == 200, f"Registration failed: {reg.text}"
    token = reg.json().get("token") or reg.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Registered test company with JWT token.")

    # 3. Test Direct SVG upload & rasterization
    clean_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80">
      <rect width="240" height="80" rx="10" fill="#0f172a" />
      <text x="25" y="50" fill="#38bdf8" font-family="Arial" font-size="28" font-weight="bold">FLEXILOGO</text>
    </svg>"""
    res = client.post(
        "/api/brand/logos/process",
        headers=headers,
        files={"file": ("master_logo.svg", clean_svg.encode("utf-8"), "image/svg+xml")}
    )
    assert res.status_code == 200, f"SVG upload failed: {res.text}"
    data = res.json()
    assert data["source_format"] == "SVG"
    assert data["raster_path"].endswith(".png")
    print(f"✓ SVG upload & high-res rasterization passed: {data['raster_path']}")

    # 4. Test Confirmation of SVG as Primary Logo
    conf_res = client.post(
        "/api/brand/logos/confirm",
        headers=headers,
        json={
            "original_path": data["original_path"],
            "raster_path": data["raster_path"],
            "file_name": "FlexiLogo Master Vector.svg",
            "asset_type": "Primary Logo",
            "variation_type": "Primary Logo",
            "description": "Official Master Brand Vector",
            "is_primary": True
        }
    )
    assert conf_res.status_code == 200, f"Confirm logo failed: {conf_res.text}"
    primary_asset = conf_res.json()
    assert primary_asset["is_primary"] is True
    print(f"✓ Primary logo confirmed (Asset ID: {primary_asset['id']}).")

    # 5. Test Multi-frame GIF upload (extracts first static frame)
    gif_buf = io.BytesIO()
    im1 = Image.new("RGBA", (150, 150), (255, 0, 0, 255))
    im2 = Image.new("RGBA", (150, 150), (0, 255, 0, 255))
    im1.save(gif_buf, format="GIF", save_all=True, append_images=[im2], duration=200, loop=0)
    gif_buf.seek(0)
    res_gif = client.post(
        "/api/brand/logos/process",
        headers=headers,
        files={"file": ("animated_logo.gif", gif_buf.getvalue(), "image/gif")}
    )
    assert res_gif.status_code == 200, f"GIF upload failed: {res_gif.text}"
    gif_data = res_gif.json()
    assert gif_data["source_format"] == "GIF"
    assert gif_data["raster_path"].endswith(".png")
    print("✓ GIF upload & static frame extraction passed.")

    # 6. Test BMP & TIFF upload
    bmp_buf = io.BytesIO()
    Image.new("RGB", (120, 60), (30, 80, 200)).save(bmp_buf, format="BMP")
    bmp_buf.seek(0)
    res_bmp = client.post(
        "/api/brand/logos/process",
        headers=headers,
        files={"file": ("legacy_logo.bmp", bmp_buf.getvalue(), "image/bmp")}
    )
    assert res_bmp.status_code == 200, f"BMP upload failed: {res_bmp.text}"
    assert res_bmp.json()["source_format"] == "BMP"
    print("✓ BMP upload & conversion passed.")

    # 7. Test PDF embedded image candidate extraction
    from reportlab.pdfgen import canvas
    pdf_buf = io.BytesIO()
    c = canvas.Canvas(pdf_buf)
    # embed a test logo image
    logo_img = Image.new("RGB", (100, 100), (40, 160, 90))
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tmp_name = tf.name
        logo_img.save(tmp_name)
    c.drawImage(tmp_name, 100, 100, width=80, height=80)
    c.save()
    try:
        Path(tmp_name).unlink(missing_ok=True)
    except Exception:
        pass
    pdf_buf.seek(0)

    res_pdf = client.post(
        "/api/brand/logos/process",
        headers=headers,
        files={"file": ("brand_guide.pdf", pdf_buf.getvalue(), "application/pdf")}
    )
    assert res_pdf.status_code == 200, f"PDF extraction failed: {res_pdf.text}"
    pdf_data = res_pdf.json()
    assert pdf_data["status"] == "candidates_found"
    assert len(pdf_data["candidates"]) >= 1
    cand = pdf_data["candidates"][0]
    print(f"✓ PDF candidate extraction passed: Found {len(pdf_data['candidates'])} selectable logo candidate(s).")

    # 8. Test Selecting and Promoting PDF Candidate
    res_select = client.post(
        "/api/brand/logos/select-candidate",
        headers=headers,
        json={
            "candidate_preview_url": cand["preview_url"],
            "original_filename": "brand_guide.pdf"
        }
    )
    assert res_select.status_code == 200, f"Candidate selection failed: {res_select.text}"
    cand_ready = res_select.json()
    assert cand_ready["status"] == "ready"
    print("✓ Promoted document candidate to ready logo raster.")

    # 9. Test Interactive Cropping
    res_crop = client.post(
        "/api/brand/logos/crop",
        headers=headers,
        json={
            "raster_url": cand_ready["raster_path"],
            "x": 10,
            "y": 10,
            "width": 80,
            "height": 80,
            "is_percentage": True
        }
    )
    assert res_crop.status_code == 200, f"Crop failed: {res_crop.text}"
    crop_data = res_crop.json()
    assert "cropped" in crop_data["raster_path"]
    print("✓ Crop region executed successfully.")

    # 10. Confirm Second Variation: Secondary Logo
    res_sec = client.post(
        "/api/brand/logos/confirm",
        headers=headers,
        json={
            "original_path": pdf_data["original_path"],
            "raster_path": crop_data["raster_path"],
            "file_name": "Cropped PDF Logo Mark.png",
            "asset_type": "Secondary Logo",
            "variation_type": "Secondary Logo",
            "description": "Secondary cropped mark from PDF Brand Guide",
            "is_primary": False
        }
    )
    assert res_sec.status_code == 200
    sec_asset = res_sec.json()
    assert sec_asset["is_primary"] is False
    print(f"✓ Secondary logo variation saved (ID: {sec_asset['id']}).")

    # 11. Test Setting Secondary Logo as Primary (and demoting SVG)
    res_set_prim = client.post(
        f"/api/brand/assets/{sec_asset['id']}/set-primary",
        headers=headers
    )
    assert res_set_prim.status_code == 200
    assert res_set_prim.json()["is_primary"] is True

    # Verify previous primary is now demoted
    assets_list = client.get("/api/brand/assets", headers=headers).json()
    svg_in_db = next(a for a in assets_list if a["id"] == primary_asset["id"])
    assert svg_in_db["is_primary"] is False, "Previous primary was not demoted!"
    print("✓ Primary logo promotion & demotion verified.")

    # 12. Test Renaming asset
    res_patch = client.patch(
        f"/api/brand/assets/{sec_asset['id']}",
        headers=headers,
        json={"file_name": "Official Brand Crest.png", "description": "Renamed master crest"}
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["file_name"] == "Official Brand Crest.png"
    print("✓ Asset rename & update verified.")

    # 13. Test Deleting an asset
    res_del = client.delete(f"/api/brand/assets/{primary_asset['id']}", headers=headers)
    assert res_del.status_code == 200
    print("✓ Asset deletion verified.")

    print("=" * 70)
    print("ALL FLEXIBLE LOGO BACKEND TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
