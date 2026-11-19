import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw
import tempfile
from backend.services.logo_detector import extract_candidate_regions_from_creative, evaluate_logo_similarity, extract_detailed_ocr

temp_dir = Path(tempfile.mkdtemp())
icon_logo = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
id4 = ImageDraw.Draw(icon_logo)
id4.rectangle([(15, 15), (105, 105)], fill=(37, 99, 235, 255))
id4.ellipse([(35, 35), (85, 85)], fill=(255, 255, 255, 255))
icon_path = temp_dir / 'icon_logo.png'
icon_logo.save(icon_path)

creative_4 = Image.new('RGB', (800, 800), (255, 255, 255))
cd4 = ImageDraw.Draw(creative_4)
cd4.text((50, 50), 'Compact Icon Ad Layout', fill=(20, 20, 20))
creative_4.paste(icon_logo, (50, 120), icon_logo)

c4_path = temp_dir / 'c4.png'
creative_4.save(c4_path)

variations = [{
    'id': 4, 'file_path': str(icon_path), 'web_url': str(icon_path), 'image': icon_logo, 'text': '', 'variation_type': 'Icon-Only Logo'
}]
ocr_data = extract_detailed_ocr(str(c4_path))
print('OCR data:', ocr_data)
candidates = extract_candidate_regions_from_creative(creative_4, variations, ocr_data)
print(f"Total candidates: {len(candidates)}")
for i, c in enumerate(candidates):
    res = evaluate_logo_similarity(c['crop'], icon_logo, c.get('text', ''), '')
    print(f"Cand {i} ({c['placement']}, bbox={c['bbox']}, desc={c.get('description')}): conf={res['confidence']:.3f}, details={res}")
