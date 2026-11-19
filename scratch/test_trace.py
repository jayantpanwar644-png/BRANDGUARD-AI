import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.logo_detector import extract_candidate_regions_from_creative, compare_visual_similarity, resolve_asset_local_path
from PIL import Image

im = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
regions = extract_candidate_regions_from_creative(im)

p17 = resolve_asset_local_path('backend/uploads/logos/logo_org_19_Screenshot 2026-09-30 145013.png')
p23 = resolve_asset_local_path('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')

im17 = Image.open(p17)
im23 = Image.open(p23)

print(f"im17 size: {im17.size}, im23 size: {im23.size}")

print("=== Scores with Asset 17 ===")
for i, r in enumerate(regions):
    score, mode = compare_visual_similarity(r['crop'], im17)
    print(f"R{i} ({r['placement']}, {r['description']}): score={score:.4f}, mode={mode}")

print("\n=== Scores with Asset 23 ===")
for i, r in enumerate(regions):
    score, mode = compare_visual_similarity(r['crop'], im23)
    print(f"R{i} ({r['placement']}, {r['description']}): score={score:.4f}, mode={mode}")
