import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scratch.test_robust_engine import evaluate_logo_similarity
from scratch.test_candidate_gen import extract_smart_candidate_regions
from PIL import Image

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

ocr_data = {
    "text": "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW Work. Create. Perform. All Day Long.",
    "lines": [
        {"text": "N I NOVA TECH", "bbox": [28, 37, 333, 41]},
        {"text": "INNOVATION FOR A BETTER TOMORROW", "bbox": [29, 88, 400, 10]},
        {"text": "CORRECT CLAIM", "bbox": [561, 49, 170, 21]}
    ]
}

official_variations = [{
    "id": 23,
    "name": "WhatsApp Image",
    "variation_type": "Light-Background Logo",
    "image": im23,
    "text": "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW"
}]

regs = extract_smart_candidate_regions(im_creative, official_variations, ocr_data)

print("=== Evaluating All Candidate Regions against Asset 23 ===")
for i, r in enumerate(regs):
    eval_res = evaluate_logo_similarity(r["crop"], im23, r.get("text", ""), official_variations[0]["text"])
    print(f"R{i} ({r['placement']}, {r['description']}): confidence={eval_res['confidence']:.4f}, edge={eval_res['edge_ncc']:.3f}, lum={eval_res['lum_ncc']:.3f}, text={eval_res['text_sim']:.2f}")
