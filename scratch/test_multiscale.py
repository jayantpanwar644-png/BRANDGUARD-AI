import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import time
from PIL import Image, ImageFilter
import numpy as np

def find_logo_via_multiscale_match(creative_img: Image.Image, ref_img: Image.Image):
    t0 = time.time()
    W_c, H_c = creative_img.size
    
    # Trim reference content if needed or use reference
    ref_gray = ref_img.convert('L')
    ref_edge = np.array(ref_gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    # Downscale creative for search
    scale_factor = 0.5
    search_w = int(W_c * scale_factor)
    search_h = int(H_c * scale_factor)
    c_small = creative_img.resize((search_w, search_h), Image.Resampling.BILINEAR)
    c_edge = np.array(c_small.convert('L').filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    best_score = -1.0
    best_bbox = None
    
    # Test scales of the reference logo (e.g. 0.3 to 1.2 of its original size, scaled to the small search space)
    ref_w, ref_h = ref_img.size
    for s in [0.4, 0.6, 0.8, 1.0, 1.2, 1.5]:
        target_w = int(ref_w * scale_factor * s)
        target_h = int(ref_h * scale_factor * s)
        if target_w >= search_w or target_h >= search_h or target_w < 20 or target_h < 10:
            continue
        
        tpl = np.array(ref_gray.filter(ImageFilter.FIND_EDGES).resize((target_w, target_h), Image.Resampling.BILINEAR), dtype=np.float32)
        tpl_z = tpl - np.mean(tpl)
        tpl_std = np.sqrt(np.sum(tpl_z**2))
        if tpl_std < 1e-3:
            continue
            
        # Standard search zones in search space:
        # Check top-half, bottom-half, corners
        step = max(2, int(min(target_w, target_h) / 8))
        for y in range(0, search_h - target_h + 1, step):
            # Focus on top 35% and bottom 35% and center
            if not (y < search_h * 0.40 or y > search_h * 0.60 or (search_h * 0.25 <= y <= search_h * 0.55)):
                continue
            for x in range(0, search_w - target_w + 1, step):
                patch = c_edge[y:y+target_h, x:x+target_w]
                p_z = patch - np.mean(patch)
                p_std = np.sqrt(np.sum(p_z**2))
                if p_std < 1e-3:
                    continue
                score = np.sum(tpl_z * p_z) / (tpl_std * p_std)
                if score > best_score:
                    best_score = score
                    # Convert back to full creative coords
                    orig_x0 = int(x / scale_factor)
                    orig_y0 = int(y / scale_factor)
                    orig_x1 = int((x + target_w) / scale_factor)
                    orig_y1 = int((y + target_h) / scale_factor)
                    best_bbox = (orig_x0, orig_y0, orig_x1, orig_y1)
    
    elapsed = time.time() - t0
    return best_score, best_bbox, elapsed

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

score, bbox, el = find_logo_via_multiscale_match(im_creative, im23)
print(f"Multiscale edge match: score={score:.4f}, bbox={bbox}, time={el:.3f}s")
