import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageFilter
import numpy as np

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
gray23 = im23.convert('L')
print("Min gray:", np.min(gray23), "Max gray:", np.max(gray23), "Mean gray:", np.mean(gray23))

# Let's inspect edges via Sobel or FIND_EDGES
edges23 = gray23.filter(ImageFilter.FIND_EDGES)
arr_e = np.array(edges23)
print("Edges max:", np.max(arr_e), "mean:", np.mean(arr_e))
ys, xs = np.where(arr_e > 30)
print("Active edge bounding box in im23:", xs.min(), ys.min(), xs.max(), ys.max())

# In creative:
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
exact_crop = im_creative.crop((0, 15, 441, 138))
gray_crop = exact_crop.convert('L')
edges_crop = gray_crop.filter(ImageFilter.FIND_EDGES)
arr_ec = np.array(edges_crop)
ys_c, xs_c = np.where(arr_ec > 30)
print("Active edge bounding box in crop:", xs_c.min(), ys_c.min(), xs_c.max(), ys_c.max())
