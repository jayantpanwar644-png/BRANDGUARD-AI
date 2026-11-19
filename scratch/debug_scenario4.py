import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw
import tempfile
from backend.services.logo_detector import detect_and_verify_brand_logo, extract_candidate_regions_from_creative, evaluate_logo_similarity, extract_detailed_ocr

temp_dir = Path(tempfile.mkdtemp())
master_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dm = ImageDraw.Draw(master_logo)
dm.rounded_rectangle([(10, 10), (70, 70)], radius=8, fill=(26, 86, 219, 255))
dm.text((85, 30), "NEXUS", fill=(15, 23, 42, 255))
master_logo_path = str(temp_dir / "official_master_logo.png")
master_logo.save(master_logo_path)

dark_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dd = ImageDraw.Draw(dark_logo)
dd.rounded_rectangle([(10, 10), (70, 70)], radius=8, fill=(59, 130, 246, 255))
dd.text((85, 30), "NEXUS", fill=(255, 255, 255, 255))
dark_logo_path = str(temp_dir / "official_dark_logo.png")
dark_logo.save(dark_logo_path)

icon_logo = Image.new('RGBA', (90, 90), (0, 0, 0, 0))
di = ImageDraw.Draw(icon_logo)
di.rounded_rectangle([(8, 8), (82, 82)], radius=12, fill=(26, 86, 219, 255))
di.ellipse([(20, 20), (70, 70)], fill=(255, 255, 255, 255))
icon_logo_path = str(temp_dir / "official_icon_logo.png")
icon_logo.save(icon_logo_path)

class MockAsset:
    def __init__(self, id, name, path, variation_type, is_primary=False):
        self.id = id
        self.file_name = name
        self.file_path = path
        self.raster_path = path
        self.variation_type = variation_type
        self.is_primary = is_primary

class MockProfile:
    def __init__(self, name, logo_path):
        self.company_name = name
        self.is_configured = True
        self.logo_path = logo_path

brand_profile = MockProfile("Nexus Technologies", logo_path=master_logo_path)
brand_assets = [
    MockAsset(1, "Master Logo.png", master_logo_path, variation_type="Primary Logo", is_primary=True),
    MockAsset(2, "Dark Theme Logo.png", dark_logo_path, variation_type="Dark-Background Logo"),
    MockAsset(3, "Icon Mark.png", icon_logo_path, variation_type="Icon-Only Logo")
]

creative_4 = Image.new('RGB', (800, 800), (255, 255, 255))
cd4 = ImageDraw.Draw(creative_4)
cd4.text((50, 50), "Compact Icon Ad Layout", fill=(20, 20, 20))
creative_4.paste(icon_logo, (50, 120), icon_logo)
c4_path = str(temp_dir / "c4.png")
creative_4.save(c4_path)

ocr_data = extract_detailed_ocr(str(c4_path))
variations = []
for a in brand_assets:
    variations.append({
        "id": a.id, "name": a.file_name, "variation_type": a.variation_type,
        "file_path": a.file_path, "web_url": a.file_path, "image": Image.open(a.file_path),
        "text": "" if "icon" in a.variation_type.lower() else "Nexus Technologies",
        "is_primary": a.is_primary
    })

candidates = extract_candidate_regions_from_creative(creative_4, variations, ocr_data)
print(f"Total candidates: {len(candidates)}")
for i, c in enumerate(candidates):
    print(f"Cand {i}: bbox={c['bbox']}, desc={c.get('description')}")
for var in variations:
    print(f"\n--- Checking against variation: {var['variation_type']} (text='{var['text']}') ---")
    for i, c in enumerate(candidates):
        res = evaluate_logo_similarity(c["crop"], var["image"], c.get("text", ""), var.get("text", ""))
        if res["confidence"] > 0.35:
            print(f"  Cand {i} (desc={c.get('description')}, bbox={c['bbox']}): conf={res['confidence']:.3f}, details={res}")
