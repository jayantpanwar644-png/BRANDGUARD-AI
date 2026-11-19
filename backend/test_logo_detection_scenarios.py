import io
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.logo_detector import detect_and_verify_brand_logo

class MockBrandAsset:
    def __init__(self, id, file_name, file_path, raster_path=None, variation_type="Primary Logo", is_primary=False):
        self.id = id
        self.file_name = file_name
        self.file_path = file_path
        self.raster_path = raster_path or file_path
        self.variation_type = variation_type
        self.is_primary = is_primary

class MockBrandProfile:
    def __init__(self, company_name="Nexus Technologies", logo_path=None, is_configured=True):
        self.company_name = company_name
        self.logo_path = logo_path
        self.is_configured = is_configured

def run_tests():
    print("=" * 75)
    print("RUNNING LOGO DETECTION VERIFICATION TEST SCENARIOS")
    print("=" * 75)

    temp_dir = Path(tempfile.mkdtemp())

    # 1. Create Base Master Official Logo (Nexus Technologies: Blue badge + white text/symbols)
    master_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
    d = ImageDraw.Draw(master_logo)
    d.rounded_rectangle([(8, 8), (252, 82)], radius=12, fill=(26, 86, 219, 255))
    d.ellipse([(20, 22), (66, 68)], fill=(255, 255, 255, 255))
    d.text((80, 36), "NEXUS TECH", fill=(255, 255, 255, 255))

    master_logo_path = str(temp_dir / "official_master_logo.png")
    master_logo.save(master_logo_path)

    # Secondary Variation: Dark-Background Inverted (white/light cyan badge for dark themes)
    dark_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dark_logo)
    dd.rounded_rectangle([(8, 8), (252, 82)], radius=12, fill=(255, 255, 255, 255))
    dd.ellipse([(20, 22), (66, 68)], fill=(26, 86, 219, 255))
    dd.text((80, 36), "NEXUS TECH", fill=(26, 86, 219, 255))
    dark_logo_path = str(temp_dir / "official_dark_logo.png")
    dark_logo.save(dark_logo_path)

    # Icon-Only Variation: Square mark
    icon_logo = Image.new('RGBA', (90, 90), (0, 0, 0, 0))
    di = ImageDraw.Draw(icon_logo)
    di.rounded_rectangle([(8, 8), (82, 82)], radius=12, fill=(26, 86, 219, 255))
    di.ellipse([(20, 20), (70, 70)], fill=(255, 255, 255, 255))
    icon_logo_path = str(temp_dir / "official_icon_logo.png")
    icon_logo.save(icon_logo_path)

    brand_profile = MockBrandProfile("Nexus Technologies", logo_path=master_logo_path)
    brand_assets = [
        MockBrandAsset(1, "Master Logo.png", master_logo_path, variation_type="Primary Logo", is_primary=True),
        MockBrandAsset(2, "Dark Theme Logo.png", dark_logo_path, variation_type="Dark-Background Logo"),
        MockBrandAsset(3, "Icon Mark.png", icon_logo_path, variation_type="Icon-Only Logo")
    ]

    # -------------------------------------------------------------
    # Scenario 1: Exact official uploaded logo embedded in creative
    # -------------------------------------------------------------
    creative_1 = Image.new('RGB', (1000, 600), (250, 250, 252))
    cd1 = ImageDraw.Draw(creative_1)
    cd1.text((60, 60), "Empowering Enterprise Cloud Scale", fill=(15, 23, 42))
    # Place exact logo in bottom-right
    creative_1.paste(master_logo, (1000 - 260 - 40, 600 - 90 - 40), master_logo)
    c1_path = str(temp_dir / "creative_scenario_1.png")
    creative_1.save(c1_path)

    res1 = detect_and_verify_brand_logo(c1_path, brand_profile, brand_assets, ocr_text="Empowering Enterprise Cloud Scale", combined_text="")
    print(f"\n[Scenario 1 - Exact Official Logo in Creative]")
    print(f"Status: {res1['status']} | Confidence: {res1['confidence']:.2f} | Placement: {res1['placement']}")
    print(f"Finding: {res1['finding']}")
    assert res1['detected'] is True, "Exact official logo was not detected!"
    assert res1['status'] == "Logo Verified", f"Expected 'Logo Verified', got {res1['status']}"
    assert res1['finding'] is None, "False-positive finding was generated for exact official logo!"
    print("✓ Scenario 1 PASSED: Exact official logo verified with 0 false-positive findings.")

    # -------------------------------------------------------------
    # Scenario 2: Resized and compressed JPEG logo in creative
    # -------------------------------------------------------------
    creative_2 = Image.new('RGB', (1000, 600), (245, 247, 250))
    cd2 = ImageDraw.Draw(creative_2)
    cd2.text((60, 60), "Next-Gen Infrastructure Solutions", fill=(15, 23, 42))
    # Resized to 160x55 (scaled down by ~40%)
    resized = master_logo.resize((160, 55), Image.Resampling.LANCZOS)
    creative_2.paste(resized, (1000 - 160 - 35, 600 - 55 - 35), resized)
    
    # Save as compressed JPEG with quality 65
    c2_path = str(temp_dir / "creative_scenario_2.jpg")
    creative_2.save(c2_path, format="JPEG", quality=65)

    res2 = detect_and_verify_brand_logo(c2_path, brand_profile, brand_assets, ocr_text="Next-Gen Infrastructure Solutions", combined_text="")
    print(f"\n[Scenario 2 - Resized & Compressed Logo in Creative]")
    print(f"Status: {res2['status']} | Confidence: {res2['confidence']:.2f} | Placement: {res2['placement']}")
    assert res2['detected'] is True, "Resized/compressed logo was not detected!"
    assert res2['status'] == "Logo Verified", f"Expected 'Logo Verified', got {res2['status']}"
    assert res2['finding'] is None, "False-positive finding generated for resized/compressed logo!"
    print("✓ Scenario 2 PASSED: Resized and compressed logo correctly verified.")

    # -------------------------------------------------------------
    # Scenario 3: Transparent and different background versions
    # -------------------------------------------------------------
    # Dark themed banner with Dark-Background logo variation
    creative_3 = Image.new('RGB', (1000, 600), (15, 23, 42))  # Dark slate background
    cd3 = ImageDraw.Draw(creative_3)
    cd3.text((60, 60), "Mission Critical Cybersecurity", fill=(248, 250, 252))
    creative_3.paste(dark_logo, (1000 - 260 - 40, 600 - 90 - 40), dark_logo)
    c3_path = str(temp_dir / "creative_scenario_3.png")
    creative_3.save(c3_path)

    res3 = detect_and_verify_brand_logo(c3_path, brand_profile, brand_assets, ocr_text="Mission Critical Cybersecurity", combined_text="")
    print(f"\n[Scenario 3 - Dark Theme Background & Inverted Variation]")
    print(f"Status: {res3['status']} | Confidence: {res3['confidence']:.2f} | Matched: {res3['matched_variation']}")
    assert res3['detected'] is True, "Dark-background variation was not detected on dark canvas!"
    assert res3['status'] == "Logo Verified", f"Expected 'Logo Verified', got {res3['status']}"
    assert res3['finding'] is None, "False-positive finding generated for dark-background variation!"
    print("✓ Scenario 3 PASSED: Dark theme background & variation correctly verified.")

    # -------------------------------------------------------------
    # Scenario 4: All confirmed official logo variations (Icon-Only)
    # -------------------------------------------------------------
    creative_4 = Image.new('RGB', (800, 800), (255, 255, 255))
    cd4 = ImageDraw.Draw(creative_4)
    cd4.text((50, 50), "Compact Icon Ad Layout", fill=(20, 20, 20))
    # Place Icon-Only logo in top-left
    creative_4.paste(icon_logo, (50, 120), icon_logo)
    c4_path = str(temp_dir / "creative_scenario_4.png")
    creative_4.save(c4_path)

    res4 = detect_and_verify_brand_logo(c4_path, brand_profile, brand_assets, ocr_text="Compact Icon Ad Layout", combined_text="")
    print(f"\n[Scenario 4 - Icon-Only Confirmed Logo Variation]")
    print(f"Status: {res4['status']} | Confidence: {res4['confidence']:.2f} | Matched: {res4['matched_variation']}")
    assert res4['detected'] is True, "Icon-Only logo variation was not detected!"
    assert res4['status'] == "Logo Verified", f"Expected 'Logo Verified', got {res4['status']}"
    assert res4['finding'] is None, "False-positive finding generated for Icon-Only variation!"
    print("✓ Scenario 4 PASSED: Icon-only confirmed logo variation verified.")

    # -------------------------------------------------------------
    # Scenario 5: Genuinely different / mismatched logo
    # -------------------------------------------------------------
    fake_logo = Image.new('RGBA', (240, 80), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fake_logo)
    fd.polygon([(20, 20), (80, 20), (50, 70)], fill=(220, 38, 38, 255)) # Red triangle
    fd.text((95, 30), "COMPETITOR X", fill=(220, 38, 38, 255))

    creative_5 = Image.new('RGB', (1000, 600), (250, 250, 252))
    cd5 = ImageDraw.Draw(creative_5)
    cd5.text((60, 60), "Unapproved Partner Marketing Visual", fill=(15, 23, 42))
    creative_5.paste(fake_logo, (1000 - 240 - 40, 600 - 80 - 40), fake_logo)
    c5_path = str(temp_dir / "creative_scenario_5.png")
    creative_5.save(c5_path)

    res5 = detect_and_verify_brand_logo(c5_path, brand_profile, brand_assets, ocr_text="Unapproved Partner Marketing Visual", combined_text="")
    print(f"\n[Scenario 5 - Genuinely Different / Mismatched Logo]")
    print(f"Status: {res5['status']} | Confidence: {res5['confidence']:.2f} | Placement: {res5['placement']}")
    print(f"Finding: {res5['finding']['title'] if res5['finding'] else None} | Severity: {res5['finding']['severity'] if res5['finding'] else None}")
    assert res5['detected'] is False, "Different logo should NOT be verified as official brand logo!"
    assert res5['status'] in ["Incorrect Logo", "Not Detected"], f"Unexpected status: {res5['status']}"
    assert res5['finding'] is not None, "A finding should be generated for mismatched logo!"
    assert res5['finding']['severity'] == "High", f"Expected High severity for incorrect logo, got {res5['finding']['severity']}"
    print("✓ Scenario 5 PASSED: Genuinely different logo flagged with High severity.")

    print("\n" + "=" * 75)
    print("ALL 5 LOGO DETECTION TEST SCENARIOS PASSED WITH 100% ACCURACY!")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()
