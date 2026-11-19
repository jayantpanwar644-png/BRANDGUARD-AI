import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scratch.test_robust_engine import evaluate_logo_similarity
from PIL import Image

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

def optimize_bbox_alignment(creative_img, bbox, ref_img, cand_text="", ref_text=""):
    x0, y0, x1, y1 = bbox
    best_conf = -1.0
    best_bbox = bbox
    best_res = None
    
    # Check small jitters in x and y
    for dx in [-8, -4, 0, 4, 8]:
        for dy in [-8, -4, 0, 4, 8]:
            nx0 = max(0, x0 + dx)
            ny0 = max(0, y0 + dy)
            nx1 = min(creative_img.width, x1 + dx)
            ny1 = min(creative_img.height, y1 + dy)
            crop = creative_img.crop((nx0, ny0, nx1, ny1))
            res = evaluate_logo_similarity(crop, ref_img, cand_text, ref_text)
            if res["confidence"] > best_conf:
                best_conf = res["confidence"]
                best_bbox = (nx0, ny0, nx1, ny1)
                best_res = res
    return best_bbox, best_res

bbox_r2 = (0, 20, 440, 142)
opt_box, opt_res = optimize_bbox_alignment(im_creative, bbox_r2, im23)
print("Before jitter: bbox=(0, 20, 440, 142)")
print("After jitter:", opt_box)
print("Opt res:", opt_res)
