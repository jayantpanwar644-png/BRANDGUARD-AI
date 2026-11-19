import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

p23 = Path('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im23 = Image.open(p23)

im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
crop = im_creative.crop((20, 25, 435, 115))

print("Asset 23 size:", im23.size, "mode:", im23.mode)
print("Crop size:", crop.size, "mode:", crop.mode)

crop.save('backend/uploads/evidence/test_crop.png')
im23.save('backend/uploads/evidence/test_asset23.png')

# Let's inspect pixel values or stats
print("Asset 23 min/max per band:")
for band, ext in zip(im23.getbands(), im23.getextrema()):
    print(f"  {band}: {ext}")

print("Crop min/max per band:")
for band, ext in zip(crop.getbands(), crop.getextrema()):
    print(f"  {band}: {ext}")
