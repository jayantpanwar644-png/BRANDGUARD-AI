"""
Test Suite: Brand Context Verification & Irrelevant Content Blocking Engine
Validates all 13 real-world scenarios against configured company profile.
"""

import sys
import io
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFont
from backend.core.database import SessionLocal
from backend.models.all_models import (
    Organisation, User, BrandProfile, BrandGuideline, DocumentSection,
    BrandRule, BrandAsset, UploadedContent, CompanyFact
)
from backend.services.context_verification_engine import verify_brand_context

def create_test_image(text: str, bg_color=(240, 240, 240), text_color=(20, 20, 20), w=800, h=600):
    img = Image.new("RGB", (w, h), color=bg_color)
    draw = ImageDraw.Draw(img)
    # Draw simple text
    draw.text((40, 50), text, fill=text_color)
    return img

def create_solid_blank_image(w=600, h=400):
    return Image.new("RGB", (w, h), color=(255, 255, 255))

async def run_scenario_tests():
    db = SessionLocal()

    # 1. Setup Nova Tech Testing Organisation & Context
    org = db.query(Organisation).filter(Organisation.name == "NOVA TECH").first()
    if not org:
        org = Organisation(
            name="NOVA TECH",
            official_email="contact@novatech.io",
            industry="Technology",
            website="https://novatech.io"
        )
        db.add(org)
        db.flush()
    else:
        org.industry = "Technology"
        db.flush()

    bp = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if not bp:
        bp = BrandProfile(
            organisation_id=org.id,
            company_name="NOVA TECH",
            primary_color="#1A56DB",
            secondary_color="#7E3AF2",
            accent_color="#10B981",
            business_category="Technology & Enterprise Computing",
            products_and_services="Nova Tech UltraBook Pro, Laptops, Computers, Computer Accessories, High-Performance Workstations",
            company_description="A technology company selling laptops, computers, and computing products.",
            target_audience="Enterprise technology professionals, software developers, and corporate IT buyers",
            tone_of_voice="Professional, Authoritative, Innovative",
            is_configured=True,
            is_setup_complete=True
        )
        db.add(bp)
        db.flush()
    else:
        bp.company_name = "NOVA TECH"
        bp.business_category = "Technology & Enterprise Computing"
        bp.products_and_services = "Nova Tech UltraBook Pro, Laptops, Computers, Computer Accessories, High-Performance Workstations"
        bp.company_description = "A technology company selling laptops, computers, and computing products."
        bp.is_configured = True
        db.flush()

    # Guidelines
    gl = db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org.id).first()
    if not gl:
        gl = BrandGuideline(
            organisation_id=org.id,
            document_name="Nova_Tech_Brand_Guidelines.pdf",
            file_path="/uploads/guidelines/Nova_Tech_Brand_Guidelines.pdf",
            file_size=15000,
            file_type=".pdf",
            is_active=True
        )
        db.add(gl)
        db.flush()

        sec = DocumentSection(
            guideline_id=gl.id,
            section_index=0,
            title="Computing Products & Hardware",
            content_text="Nova Tech UltraBook Pro laptops deliver 20 hours battery runtime, Intel Core Ultra processors, and OLED displays for business."
        )
        db.add(sec)
        db.flush()

    # Fact
    fact = db.query(CompanyFact).filter(CompanyFact.organisation_id == org.id).first()
    if not fact:
        fact = CompanyFact(
            organisation_id=org.id,
            fact_title="Nova Tech UltraBook Pro Laptops",
            fact_detail="Flagship business laptop engineered with aerospace aluminum and OLED displays.",
            category="Product"
        )
        db.add(fact)
        db.flush()

    test_dir = Path("backend/uploads/images/test_scenarios")
    test_dir.mkdir(parents=True, exist_ok=True)

    # 13 Real-World Scenario Definitions
    scenarios = [
        {
            "id": 1,
            "name": "Relevant company laptop advertisement",
            "text": "NOVA TECH UltraBook Pro\nNext-Gen Computing Performance with 20-Hour Battery\nIntel Core Ultra Processor & OLED Display\nOrder Your Corporate Laptop Today",
            "caption": "Experience peak business computing with the new Nova Tech UltraBook Pro laptop.",
            "expected_verdict": "PASS",
            "file": test_dir / "scen_1_laptop.png"
        },
        {
            "id": 2,
            "name": "Relevant technology product advertisement",
            "text": "NOVA TECH High-Performance Computing Hardware\nWorkstations, Docking Stations & Enterprise Computer Accessories\nEngineered for Tech Workspaces",
            "caption": "Power your tech infrastructure with Nova Tech high-performance computer peripherals.",
            "expected_verdict": "PASS",
            "file": test_dir / "scen_2_tech_hardware.png"
        },
        {
            "id": 3,
            "name": "Technology educational poster",
            "text": "Enterprise Hardware Architecture Guide\nHow Modern Multi-Core Processors & SSD Storage Maximize Computing Throughput\nTech Insights Series",
            "caption": "A quick educational infographic on modern computing hardware architecture.",
            "expected_verdict": "REVIEW_OR_PASS",
            "file": test_dir / "scen_3_tech_education.png"
        },
        {
            "id": 4,
            "name": "Food advertisement",
            "text": "Super Delicious Cheeseburger Combo!\nCrispy Golden Fries & Refreshing Beverage\nOnly $9.99 at Best Burger Dining Restaurant\nTasty Fast Food Menu Deal",
            "caption": "Craving a juicy burger and crispy fries for lunch? Try our combo meal today!",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_4_food.png"
        },
        {
            "id": 5,
            "name": "Fashion advertisement",
            "text": "Autumn Running Shoes & Fashion Apparel Collection\nBreathable Mesh Cushioning Athletic Sneakers\nShop Designer Streetwear & Hoodies Online",
            "caption": "Upgrade your autumn wardrobe with our latest running sneakers and fashion apparel.",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_5_fashion.png"
        },
        {
            "id": 6,
            "name": "Random animal photograph",
            "text": "Cute Golden Retriever Puppy Playing in the Park Grass\nAdorable Wildlife Animals & Domestic Pet Photography",
            "caption": "Look at this cute puppy running around in the morning sun!",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_6_animal.png"
        },
        {
            "id": 7,
            "name": "Random political poster",
            "text": "Vote for Candidate Johnathan Smith in the Upcoming General Election!\nBallot Reform, Political Freedom Rally & Citizen Voting Campaign",
            "caption": "Make your voice heard this November. Vote for Smith!",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_7_political.png"
        },
        {
            "id": 8,
            "name": "Gaming meme",
            "text": "When the boss fight starts but your ping spikes to 999ms\nFunny Gamer Humor & Dank Rage Comic Memes\nOnly True Gamers Understand",
            "caption": "Relatable gaming meme for late night multiplayer sessions.",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_8_meme.png"
        },
        {
            "id": 9,
            "name": "Unrelated vehicle advertisement",
            "text": "All-New 2026 Turbo SUV Passenger Automobile\n450 Horsepower V8 Engine, Luxury Cockpit & Test Drive at Downtown Dealership",
            "caption": "Experience extreme horsepower and driving comfort in our newest SUV vehicle.",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_9_vehicle.png"
        },
        {
            "id": 10,
            "name": "Company hiring announcement",
            "text": "WE'RE HIRING! Join the NOVA TECH Engineering Team\nSenior Hardware Systems Engineer & Full-Stack Developer Positions Open\nApply at novatech.io/careers",
            "caption": "Nova Tech is growing! We are hiring talented engineers to build next-generation computing hardware.",
            "expected_verdict": "REVIEW_OR_PASS",
            "file": test_dir / "scen_10_hiring.png"
        },
        {
            "id": 11,
            "name": "Company logo placed on unrelated content",
            "text": "NOVA TECH OFFICIAL LOGO\nSuper Crispy Fried Chicken Wings & Hot Pepper Sauce Dining Meal Deal\nTaste the Flavor Today",
            "caption": "Delicious crispy chicken wings with the Nova Tech brand logo attached.",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_11_logo_on_food.png"
        },
        {
            "id": 12,
            "name": "Completely blank or unreadable image",
            "text": "",  # Blank solid white
            "caption": "Test upload with no content",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_12_blank.png",
            "is_blank": True
        },
        {
            "id": 13,
            "name": "Corrupted video or unsupported format",
            "text": "CORRUPTED_VIDEO_BYTES",
            "caption": "Broken video stream file",
            "expected_verdict": "BLOCK",
            "file": test_dir / "scen_13_corrupt.mp4",
            "is_corrupt_video": True
        }
    ]

    print("=" * 80)
    print("EXECUTING BRAND CONTEXT VERIFICATION SCENARIOS (NOVA TECH - TECHNOLOGY)")
    print("=" * 80)

    passed_tests = 0
    results_summary = []

    for sc in scenarios:
        fpath = sc["file"]
        # Generate test file
        if sc.get("is_blank"):
            img = create_solid_blank_image(600, 400)
            img.save(fpath, format="PNG")
        elif sc.get("is_corrupt_video"):
            with open(fpath, "wb") as f:
                f.write(b"NOT_A_REAL_VIDEO_HEADER_GARBAGE_BYTES_CORRUPTED")
        else:
            img = create_test_image(sc["text"], w=800, h=600)
            img.save(fpath, format="PNG")

        # Run verification engine
        res = await verify_brand_context(
            file_path_str=str(fpath),
            org=org,
            brand_profile=bp,
            caption=sc["caption"]
        )

        score = res["context_score"]
        status = res["context_status"]
        exp = sc["expected_verdict"]

        is_success = False
        if exp == "PASS":
            is_success = score >= 75 and status in {"Highly Relevant", "Relevant"}
        elif exp == "BLOCK":
            is_success = score < 50 and status == "Irrelevant / Out of Context"
        elif exp == "REVIEW_OR_PASS":
            is_success = score >= 50 and status in {"Highly Relevant", "Relevant", "Needs Manual Review"}

        if is_success:
            passed_tests += 1
            verdict_icon = "PASS"
        else:
            verdict_icon = "FAIL"

        print(f"\nScenario {sc['id']}: {sc['name']}")
        print(f"  Target: {exp} | Actual Score: {score}/100 | Status: {status} | Result: [{verdict_icon}]")
        print(f"  Detected Subject: {res.get('detected_subject')}")
        if res.get('critical_flags'):
            print(f"  Critical Flags: {res['critical_flags']}")
        if res.get('mismatch_reasons'):
            print(f"  Mismatch Reasons: {res['mismatch_reasons'][:2]}")

        results_summary.append({
            "id": sc["id"],
            "name": sc["name"],
            "expected": exp,
            "score": score,
            "status": status,
            "success": is_success
        })

    print("\n" + "=" * 80)
    print(f"VERIFICATION RESULTS: {passed_tests}/{len(scenarios)} SCENARIOS PASSED")
    print("=" * 80)

    assert passed_tests == len(scenarios), f"Expected all {len(scenarios)} to pass, but {passed_tests} passed."
    print("ALL 13 TEST SCENARIOS COMPLETED WITH 100% SUCCESS RATE!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_scenario_tests())
