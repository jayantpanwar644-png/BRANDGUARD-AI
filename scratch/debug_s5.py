import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw
import tempfile
from backend.services.logo_detector import evaluate_logo_similarity, extract_candidate_regions_from_creative, extract_detailed_ocr

temp_dir = Path(tempfile.mkdtemp())
dark_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dd = ImageDraw.Draw(dark_logo)
dd.rounded_rectangle([(10, 10), (70, 70)], radius=8, fill=(59, 130, 246, 255))
dd.text((85, 30), "NEXUS", fill=(255, 255, 255, 255))

fake_logo = Image.new('RGBA', (240, 80), (0, 0, 0, 0))
fd = ImageDraw.Draw(fake_logo)
fd.polygon([(20, 20), (80, 20), (50, 70)], fill=(220, 38, 38, 255))
fd.text((95, 30), "COMPETITOR X", fill=(220, 38, 38, 255))

c5 = Image.new('RGB', (1000, 600), (250, 250, 252))
cd5 = ImageDraw.Draw(c5)
cd5.text((60, 60), "Unapproved Partner Marketing Visual", fill=(15, 23, 42))
c5.paste(fake_logo, (1000 - 240 - 40, 600 - 80 - 40), fake_logo)
c5_path = str(temp_dir / "c5.png")
c5.save(c5_path)

ocr_data = extract_detailed_ocr(str(c5_path))
print("OCR data:", ocr_data)

variations = [{
    "id": 2, "file_path": "", "web_url": "", "image": dark_logo, "text": "NEXUS", "variation_type": "Dark-Background Logo"
}]
candidates = extract_candidate_regions_from_creative(c5, variations, ocr_data)
for i, c in enumerate(candidates):
    res = evaluate_logo_similarity(c["crop"], dark_logo, c.get("text", ""), "NEXUS")
    if res["confidence"] > 0.35:
        print(f"Cand {i} (desc={c.get('description')}, bbox={c['bbox']}, text='{c.get('text')}'): conf={res['confidence']:.3f}, details={res}")
