import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

# Exactly aligned crop
exact_crop = im_creative.crop((0, 15, 441, 138))

a = np.array(im23.convert('L'), dtype=float)
b = np.array(exact_crop.convert('L'), dtype=float)

a_z = a - np.mean(a)
b_z = b - np.mean(b)
ncc = np.sum(a_z * b_z) / (np.sqrt(np.sum(a_z**2) * np.sum(b_z**2)) + 1e-6)
print("Direct NCC between exact_crop and im23:", ncc)
