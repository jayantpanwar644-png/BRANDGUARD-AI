import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageOps
import numpy as np
from backend.services.logo_detector import crop_content_bounding_box, composite_to_rgb, compute_ncc, compute_dhash

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
candidate_img = im_creative.crop((20, 25, 435, 115))

c_tight = crop_content_bounding_box(candidate_img)
r_tight = crop_content_bounding_box(im23)

print("c_tight size:", c_tight.size, "r_tight size:", r_tight.size)

ar_c = c_tight.width / max(1, c_tight.height)
ar_r = r_tight.width / max(1, r_tight.height)
ar_ratio = min(ar_c, ar_r) / max(ar_c, ar_r)
print("ar_c:", ar_c, "ar_r:", ar_r, "ar_ratio:", ar_ratio)

target_size = (160, 80)
c_rgb_w = composite_to_rgb(c_tight, (255, 255, 255)).resize(target_size, Image.Resampling.LANCZOS)
r_rgb_w = composite_to_rgb(r_tight, (255, 255, 255)).resize(target_size, Image.Resampling.LANCZOS)

c_gray = c_rgb_w.convert('L')
r_gray = r_rgb_w.convert('L')
r_gray_inv = ImageOps.invert(r_gray)

# Let's check mean luminance
print("c_gray mean:", np.mean(np.array(c_gray)))
print("r_gray mean:", np.mean(np.array(r_gray)))

c_b = np.array(c_gray.resize((32, 16), Image.Resampling.BOX), dtype=np.float32)
r_b = np.array(r_gray.resize((32, 16), Image.Resampling.BOX), dtype=np.float32)
r_b_inv = np.array(r_gray_inv.resize((32, 16), Image.Resampling.BOX), dtype=np.float32)

b_ncc_norm = compute_ncc(c_b, r_b)
b_ncc_inv = compute_ncc(c_b, r_b_inv)
print("b_ncc_norm:", b_ncc_norm, "b_ncc_inv:", b_ncc_inv)

h_c = compute_dhash(c_gray, 16)
h_r = compute_dhash(r_gray, 16)
h_r_inv = compute_dhash(r_gray_inv, 16)
dhash_norm = float(np.mean(h_c == h_r))
dhash_inv = float(np.mean(h_c == h_r_inv))
print("dhash_norm:", dhash_norm, "dhash_inv:", dhash_inv)

c_arr = np.array(c_gray, dtype=np.float32)
r_arr = np.array(r_gray, dtype=np.float32)
r_arr_inv = 255.0 - r_arr
dir_ncc_norm = compute_ncc(c_arr, r_arr)
dir_ncc_inv = compute_ncc(c_arr, r_arr_inv)
print("dir_ncc_norm:", dir_ncc_norm, "dir_ncc_inv:", dir_ncc_inv)
