import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageOps, ImageFilter
import numpy as np

def trim_to_visual_content(img: Image.Image, padding: int = 4) -> Image.Image:
    """Trim solid background (whether transparent, white, black, or solid color)."""
    rgba = img.convert('RGBA')
    arr = np.array(rgba)
    alpha = arr[:, :, 3]
    rgb = arr[:, :, :3]
    
    # If transparent
    if np.any(alpha < 250):
        mask = alpha > 15
    else:
        # Determine background color from the 4 corners
        corners = np.array([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]], dtype=float)
        bg = np.median(corners, axis=0)
        diff = np.sqrt(np.sum((rgb.astype(float) - bg)**2, axis=2))
        mask = diff > 18
    
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        return img
    
    x0 = max(0, int(xs.min()) - padding)
    y0 = max(0, int(ys.min()) - padding)
    x1 = min(img.width, int(xs.max()) + padding)
    y1 = min(img.height, int(ys.max()) + padding)
    return img.crop((x0, y0, x1, y1))

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

# Crop in creative
cand = im_creative.crop((0, 15, 441, 138))

t23 = trim_to_visual_content(im23)
tcand = trim_to_visual_content(cand)

print("Trimmed im23 size:", t23.size)
print("Trimmed cand size:", tcand.size)

# Now compare
t23_rgb = t23.convert('RGB').resize((200, 50), Image.Resampling.LANCZOS)
tcand_rgb = tcand.convert('RGB').resize((200, 50), Image.Resampling.LANCZOS)

a = np.array(t23_rgb.convert('L'), dtype=float)
b = np.array(tcand_rgb.convert('L'), dtype=float)

# Normalized cross correlation
a_z = a - np.mean(a)
b_z = b - np.mean(b)
ncc = np.sum(a_z * b_z) / (np.sqrt(np.sum(a_z**2) * np.sum(b_z**2)) + 1e-6)
print("NCC after proper trimming:", ncc)
