import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw
import tempfile
from backend.services.logo_detector import evaluate_logo_similarity, extract_candidate_regions_from_creative, extract_detailed_ocr, detect_and_verify_brand_logo
from types import SimpleNamespace

temp_dir = Path(tempfile.mkdtemp())

# Master Logo Assets for Brand 'Nexus Cyber'
primary_logo = Image.new('RGBA', (300, 100), (0, 0, 0, 0))
pd = ImageDraw.Draw(primary_logo)
pd.rectangle([(20, 20), (80, 80)], fill=(37, 99, 235, 255))
pd.text((95, 40), 'NEXUS SECURE', fill=(15, 23, 42, 255))
primary_path = temp_dir / 'primary_logo.png'
primary_logo.save(primary_path)

dark_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dd = ImageDraw.Draw(dark_logo)
dd.rectangle([(15, 15), (75, 75)], fill=(56, 189, 248, 255))
dd.text((90, 35), 'NEXUS SECURE', fill=(255, 255, 255, 255))
dark_path = temp_dir / 'dark_logo.png'
dark_logo.save(dark_path)

brand_profile = SimpleNamespace(
    company_name='Nexus Cyber',
    is_configured=True,
    logo_path=str(primary_path)
)

brand_assets = [
    SimpleNamespace(id=1, file_path=str(primary_path), raster_path=str(primary_path), variation_type='Primary Logo', asset_type='Primary Logo', file_name='primary.png', is_primary=True),
    SimpleNamespace(id=2, file_path=str(dark_path), raster_path=str(dark_path), variation_type='Dark-Background Logo', asset_type='Dark-Background Logo', file_name='dark.png', is_primary=False)
]

fake_logo = Image.new('RGBA', (240, 80), (0, 0, 0, 0))
fd = ImageDraw.Draw(fake_logo)
fd.polygon([(20, 20), (80, 20), (50, 70)], fill=(220, 38, 38, 255))
fd.text((95, 30), 'COMPETITOR X', fill=(220, 38, 38, 255))

creative_5 = Image.new('RGB', (1000, 600), (250, 250, 252))
cd5 = ImageDraw.Draw(creative_5)
cd5.text((60, 60), 'Unapproved Partner Marketing Visual', fill=(15, 23, 42))
creative_5.paste(fake_logo, (1000 - 240 - 40, 600 - 80 - 40), fake_logo)
c5_path = str(temp_dir / 'creative_scenario_5.png')
creative_5.save(c5_path)

candidates = extract_candidate_regions_from_creative(creative_5, [
    {"id": 2, "file_path": str(dark_path), "web_url": str(dark_path), "image": dark_logo, "text": "NEXUS SECURE", "variation_type": "Dark-Background Logo"}
], None)

for i, c in enumerate(candidates):
    res = evaluate_logo_similarity(c["crop"], dark_logo, c.get("text", ""), "NEXUS SECURE")
    if res["confidence"] > 0.35:
        print(f"Cand {i}: bbox={c['bbox']}, desc={c.get('description')}, conf={res['confidence']:.3f}, details={res}")

res5 = detect_and_verify_brand_logo(c5_path, brand_profile, brand_assets, ocr_text='Unapproved Partner Marketing Visual', combined_text='')
print("res5 status:", res5["status"])
print("res5 confidence:", res5["confidence"])
print("res5 placement:", res5["placement"])
print("res5 matched_variation:", res5["matched_variation"])
print("res5 finding:", res5.get("finding"))
