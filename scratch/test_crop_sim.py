import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
from backend.services.logo_detector import compare_visual_similarity, resolve_asset_local_path

im = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
p23 = resolve_asset_local_path('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im23 = Image.open(p23)

p17 = resolve_asset_local_path('backend/uploads/logos/logo_org_19_Screenshot 2026-09-30 145013.png')
im17 = Image.open(p17)

# Let's crop various boxes around the logo at the top
for bbox in [
    (20, 25, 435, 115),
    (25, 30, 430, 110),
    (20, 30, 370, 75),  # just NOVA TECH with mark
    (20, 20, 440, 120)
]:
    crop = im.crop(bbox)
    score23, mode23 = compare_visual_similarity(crop, im23)
    score17, mode17 = compare_visual_similarity(crop, im17)
    print(f"Bbox {bbox}: score with Asset 23={score23:.4f} ({mode23}), with Asset 17={score17:.4f} ({mode17})")
