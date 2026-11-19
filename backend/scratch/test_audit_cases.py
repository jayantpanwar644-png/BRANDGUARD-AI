import sys
import io
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from backend.main import app as fastapi_app
from backend.core.database import SessionLocal
from backend.models.all_models import (
    Organisation, User, BrandProfile, BrandGuideline, DocumentSection,
    BrandRule, BrandAsset, UploadedContent, AuditReport, AuditFinding, DetectedClaim
)
from backend.core.security import create_access_token

def generate_test_image(color=(26, 86, 219), text="Test Creative", w=600, h=400):
    img = Image.new('RGB', (w, h), color=color)
    draw = ImageDraw.Draw(img)
    draw.text((30, 40), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def run_tests():
    db = SessionLocal()
    client = TestClient(fastapi_app)

    # 1. Setup or retrieve dedicated test organization
    org = db.query(Organisation).filter(Organisation.name == "Nova Tech Testing Corp").first()
    if not org:
        org = Organisation(name="Nova Tech Testing Corp", official_email="contact@novatech.test", industry="Computing & Hardware")
        db.add(org)
        db.flush()
    else:
        org.industry = "Computing & Hardware"

    user = db.query(User).filter(User.email == "tester@novatech.test").first()
    if not user:
        user = User(
            email="tester@novatech.test",
            hashed_password="testpassword",
            full_name="Compliance Tester",
            organisation_id=org.id,
            role="Admin"
        )
        db.add(user)
        db.flush()

    # Configure Brand Profile
    bp = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if not bp:
        bp = BrandProfile(
            organisation_id=org.id,
            company_name="Nova Tech",
            primary_color="#1A56DB",
            secondary_color="#7E3AF2",
            accent_color="#10B981",
            tone_of_voice="Professional, Authoritative, Trustworthy",
            restricted_words="miracle, cheat, hack, revolutionize, cheapest",
            prohibited_claims="100% error-free, never charge again, zero heating",
            products_and_services="Nova Tech UltraBook Pro, Enterprise Workstations, Cloud Hardware",
            company_description="Enterprise computer hardware manufacturer delivering ultra-efficient laptops.",
            is_configured=True,
            is_setup_complete=True
        )
        db.add(bp)
    else:
        bp.company_name = "Nova Tech"
        bp.primary_color = "#1A56DB"
        bp.restricted_words = "miracle, cheat, hack, revolutionize, cheapest"
        bp.prohibited_claims = "100% error-free, never charge again, zero heating"
        bp.products_and_services = "Nova Tech UltraBook Pro, Enterprise Workstations, Cloud Hardware"
        bp.company_description = "Enterprise computer hardware manufacturer delivering ultra-efficient laptops."
        bp.is_configured = True
        bp.is_setup_complete = True

    # Configure Brand Guideline & Document Section
    gl = db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org.id).first()
    if not gl:
        gl = BrandGuideline(
            organisation_id=org.id,
            document_name="Nova_Tech_Guidelines.pdf",
            file_path="/uploads/guidelines/Nova_Tech_Guidelines.pdf",
            file_size=12000,
            file_type=".pdf",
            processing_status="Processed",
            is_active=True
        )
        db.add(gl)
        db.flush()
        
        sec1 = DocumentSection(
            guideline_id=gl.id,
            section_index=0,
            title="Product Specifications",
            content_text="Nova Tech UltraBook Pro tested battery runtime: Up to 20 hours under MobileMark testing. Intel Core Ultra processor. OLED display."
        )
        sec2 = DocumentSection(
            guideline_id=gl.id,
            section_index=1,
            title="Prohibited Communications",
            content_text="Claims such as never charge again, zero heating, or 100 hours battery are strictly prohibited."
        )
        db.add(sec1)
        db.add(sec2)

    # Configure Brand Rules
    existing_rules = db.query(BrandRule).filter(BrandRule.organisation_id == org.id).all()
    if not existing_rules:
        r1 = BrandRule(
            organisation_id=org.id,
            rule_category="Visual",
            rule_name="Brand Palette Adherence & Contrast Standards",
            description="Visuals must prominently feature the primary brand color #1A56DB.",
            severity="High",
            is_active=True,
            review_status="Confirmed"
        )
        r2 = BrandRule(
            organisation_id=org.id,
            rule_category="Terminology",
            rule_name="Restricted Vocabulary & Hype-Free Communication",
            description="Unsubstantiated superlatives (miracle, cheat, hack) are strictly prohibited.",
            severity="High",
            is_active=True,
            review_status="Confirmed"
        )
        r3 = BrandRule(
            organisation_id=org.id,
            rule_category="Claim",
            rule_name="Empirical Claim Substantiation Requirement",
            description="Every performance assertion must match verified product specifications.",
            severity="High",
            is_active=True,
            review_status="Confirmed"
        )
        db.add(r1)
        db.add(r2)
        db.add(r3)

    # Configure Official Logo Asset
    logo_asset = db.query(BrandAsset).filter(BrandAsset.organisation_id == org.id, BrandAsset.is_primary == True).first()
    if not logo_asset:
        logo_buf = generate_test_image(color=(26, 86, 219), text="NOVA TECH", w=160, h=60)
        logo_path = Path("backend/uploads/logos/nova_tech_primary_logo.png")
        logo_path.parent.mkdir(parents=True, exist_ok=True)
        with open(logo_path, "wb") as f:
            f.write(logo_buf.getvalue())
        logo_asset = BrandAsset(
            organisation_id=org.id,
            asset_type="Primary Logo",
            file_name="nova_tech_primary_logo.png",
            file_path="/uploads/logos/nova_tech_primary_logo.png",
            variation_type="Primary",
            is_primary=True
        )
        db.add(logo_asset)

    db.commit()

    token = create_access_token({"sub": str(user.id), "org_id": org.id})
    headers = {"Authorization": f"Bearer {token}"}

    results = {}

    # -------------------------------------------------------------------------
    # TEST A: Correct Company Post
    # -------------------------------------------------------------------------
    img_a = generate_test_image(
        color=(26, 86, 219), # Official Primary Brand Blue #1A56DB
        text="Nova Tech UltraBook Pro.\nUp to 20 Hours Battery Life.\nIntel Core Ultra Processor.\nProfessional enterprise computing.\nExplore Verified Solutions."
    )
    res_a = client.post(
        "/api/content/upload",
        data={"title": "Test A: Compliant UltraBook Ad", "caption": "Nova Tech UltraBook Pro. Up to 20 Hours Battery Life. Intel Core Ultra Processor. Professional enterprise computing.", "platform": "LinkedIn"},
        files={"file": ("test_a_compliant.png", img_a, "image/png")},
        headers=headers
    )
    cid_a = res_a.json()["content"]["id"]
    audit_a = client.post(f"/api/content/{cid_a}/analyse", headers=headers).json()
    rel_a = audit_a.get("report", {}).get("company_relevance", {})
    findings_a = audit_a.get("report", {}).get("findings", [])
    results["Test A"] = {
        "status": rel_a.get("status"),
        "matched_offering": rel_a.get("matched_company_offering"),
        "findings_count": len(findings_a),
        "passed": (rel_a.get("status") == "Related to Company")
    }

    # -------------------------------------------------------------------------
    # TEST B: Wrong Brand Colours
    # -------------------------------------------------------------------------
    img_b = generate_test_image(
        color=(255, 0, 85), # Hot Pink / Magenta (Violates #1A56DB palette)
        text="Nova Tech UltraBook Pro.\nUp to 20 Hours Battery Life.\nIntel Core Ultra Processor.\nExplore Verified Solutions."
    )
    res_b = client.post(
        "/api/content/upload",
        data={"title": "Test B: Wrong Color Ad", "caption": "Nova Tech UltraBook Pro. Up to 20 Hours Battery Life.", "platform": "Instagram"},
        files={"file": ("test_b_color.png", img_b, "image/png")},
        headers=headers
    )
    cid_b = res_b.json()["content"]["id"]
    audit_b = client.post(f"/api/content/{cid_b}/analyse", headers=headers).json()
    rel_b = audit_b.get("report", {}).get("company_relevance", {})
    findings_b = audit_b.get("report", {}).get("findings", [])
    has_color_finding = any(f.get("issue_type") == "Color" for f in findings_b)
    results["Test B"] = {
        "status": rel_b.get("status"),
        "has_color_finding": has_color_finding,
        "color_findings": [f.get("title") for f in findings_b if f.get("issue_type") == "Color"],
        "passed": (rel_b.get("status") == "Related to Company" and has_color_finding)
    }

    # -------------------------------------------------------------------------
    # TEST C: Restricted Vocabulary
    # -------------------------------------------------------------------------
    img_c = generate_test_image(
        color=(26, 86, 219),
        text="Nova Tech UltraBook Pro.\nThe miracle laptop for enterprise leaders.\nUp to 20 Hours Battery Life.\nExplore Verified Solutions."
    )
    res_c = client.post(
        "/api/content/upload",
        data={"title": "Test C: Restricted Vocab Ad", "caption": "The miracle laptop for enterprise.", "platform": "LinkedIn"},
        files={"file": ("test_c_vocab.png", img_c, "image/png")},
        headers=headers
    )
    cid_c = res_c.json()["content"]["id"]
    audit_c = client.post(f"/api/content/{cid_c}/analyse", headers=headers).json()
    rel_c = audit_c.get("report", {}).get("company_relevance", {})
    findings_c = audit_c.get("report", {}).get("findings", [])
    has_vocab_finding = any(f.get("issue_type") == "Restricted Vocabulary" and "miracle" in f.get("title", "").lower() for f in findings_c)
    results["Test C"] = {
        "status": rel_c.get("status"),
        "has_vocab_finding": has_vocab_finding,
        "vocab_findings": [f.get("title") for f in findings_c if f.get("issue_type") == "Restricted Vocabulary"],
        "passed": (rel_c.get("status") == "Related to Company" and has_vocab_finding)
    }

    # -------------------------------------------------------------------------
    # TEST D: Unrelated Product
    # -------------------------------------------------------------------------
    img_d = generate_test_image(
        color=(30, 41, 59),
        text="Air Sprint Running Shoes.\nMaximum athletic cushioning for marathon runners.\nLightweight sneakers.\nShop Now."
    )
    res_d = client.post(
        "/api/content/upload",
        data={"title": "Test D: Running Shoes Ad", "caption": "Air Sprint Running Shoes. Maximum athletic cushioning for marathon runners. Lightweight sneakers.", "platform": "Instagram"},
        files={"file": ("test_d_unrelated.png", img_d, "image/png")},
        headers=headers
    )
    cid_d = res_d.json()["content"]["id"]
    audit_d = client.post(f"/api/content/{cid_d}/analyse", headers=headers).json()
    rel_d = audit_d.get("report", {}).get("company_relevance", {})
    findings_d = audit_d.get("report", {}).get("findings", [])
    has_rel_finding = any(f.get("issue_type") == "Company/Product Relevance" for f in findings_d)
    results["Test D"] = {
        "status": rel_d.get("status"),
        "detected_product": rel_d.get("detected_product_or_service"),
        "has_relevance_finding": has_rel_finding,
        "passed": (rel_d.get("status") == "Not Related to Company" and has_rel_finding)
    }

    # -------------------------------------------------------------------------
    # TEST E: Unsupported Claim
    # -------------------------------------------------------------------------
    img_e = generate_test_image(
        color=(26, 86, 219),
        text="Nova Tech UltraBook Pro.\nOur Laptop Gives 100 Hours Battery Backup!\nNever Charge Again!\nExplore Verified Solutions."
    )
    res_e = client.post(
        "/api/content/upload",
        data={"title": "Test E: Unsupported Claims Ad", "caption": "Nova Tech UltraBook Pro. Our Laptop Gives 100 Hours Battery Backup! Never Charge Again!", "platform": "LinkedIn"},
        files={"file": ("test_e_unsupported.png", img_e, "image/png")},
        headers=headers
    )
    cid_e = res_e.json()["content"]["id"]
    audit_e = client.post(f"/api/content/{cid_e}/analyse", headers=headers).json()
    rel_e = audit_e.get("report", {}).get("company_relevance", {})
    claims_e = audit_e.get("report", {}).get("detected_claims", [])
    findings_e = audit_e.get("report", {}).get("findings", [])
    has_unsupported_claim = any(c.get("verification_status") in ["Contradicted", "Not Verified", "Needs Human Review"] for c in claims_e)
    results["Test E"] = {
        "status": rel_e.get("status"),
        "claims_count": len(claims_e),
        "claims_statuses": [c.get("verification_status") for c in claims_e],
        "has_claim_finding": any(f.get("issue_type") == "Claim" for f in findings_e),
        "passed": (rel_e.get("status") == "Related to Company" and has_unsupported_claim)
    }

    # -------------------------------------------------------------------------
    # TEST F: Unclear Product
    # -------------------------------------------------------------------------
    img_f = generate_test_image(
        color=(50, 50, 50),
        text="Vibes"
    )
    res_f = client.post(
        "/api/content/upload",
        data={"title": "Test F: Ambiguous Content", "caption": "Vibes", "platform": "Instagram"},
        files={"file": ("test_f_unclear.png", img_f, "image/png")},
        headers=headers
    )
    cid_f = res_f.json()["content"]["id"]
    audit_f = client.post(f"/api/content/{cid_f}/analyse", headers=headers).json()
    rel_f = audit_f.get("report", {}).get("company_relevance", {})
    results["Test F"] = {
        "status": rel_f.get("status"),
        "detected_product": rel_f.get("detected_product_or_service"),
        "passed": (rel_f.get("status") == "Needs Review")
    }

    print("\n===============================")
    print("MANDATORY AUDIT SUITE RESULTS")
    print("===============================")
    for test_name, res in results.items():
        pass_str = "PASS [OK]" if res["passed"] else "FAIL [X]"
        print(f"{test_name}: {pass_str} -> {res}")
    
    all_passed = all(r["passed"] for r in results.values())
    print("===============================")
    print(f"FINAL OUTCOME: {'ALL 6 TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print("===============================\n")

if __name__ == "__main__":
    run_tests()
