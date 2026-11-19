import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

# Asset 23 is 441 x 123
# In creative, logo is at (0, 15, 441, 15 + 123) = (0, 15, 441, 138)
exact_crop = im_creative.crop((0, 15, 441, 138))

arr_crop = np.array(exact_crop.convert('RGB'))
arr_23 = np.array(im23.convert('RGB'))

diff = np.abs(arr_crop.astype(float) - arr_23.astype(float))
print("Mean absolute pixel difference:", np.mean(diff))
print("Max absolute pixel difference:", np.max(diff))
print("Percentage of pixels with diff < 10:", np.mean(diff < 10) * 100)
