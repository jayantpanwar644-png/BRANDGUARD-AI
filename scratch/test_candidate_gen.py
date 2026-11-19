import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageFilter
import numpy as np
import time

def extract_smart_candidate_regions(
    creative_img: Image.Image,
    official_variations: list,
    ocr_data: dict = None
):
    W, H = creative_img.size
    regions = []
    seen_boxes = set()

    def add_region(bbox, placement, desc, text=""):
        x0, y0, x1, y1 = [int(v) for v in bbox]
        x0 = max(0, min(W - 10, x0))
        y0 = max(0, min(H - 10, y0))
        x1 = max(x0 + 10, min(W, x1))
        y1 = max(y0 + 10, min(H, y1))
        # Quantize box to avoid duplicate near-identical boxes
        box_key = (round(x0, -1), round(y0, -1), round(x1, -1), round(y1, -1))
        if box_key in seen_boxes:
            return
        seen_boxes.add(box_key)
        crop = creative_img.crop((x0, y0, x1, y1))
        regions.append({
            "placement": placement,
            "crop": crop,
            "bbox": (x0, y0, x1, y1),
            "description": desc,
            "text": text
        })

    def get_placement_name(x0, y0, x1, y1):
        cx = (x0 + x1) / 2.0 / W
        cy = (y0 + y1) / 2.0 / H
        if cy < 0.28:
            if cx < 0.38: return "top-left"
            if cx > 0.62: return "top-right"
            return "header"
        elif cy > 0.72:
            if cx < 0.38: return "bottom-left"
            if cx > 0.62: return "bottom-right"
            return "footer"
        else:
            if cx < 0.35: return "center-left"
            if cx > 0.65: return "center-right"
            return "center"

    # 1. OCR-Guided Bounding Boxes
    if ocr_data and "lines" in ocr_data:
        # Collect keywords from official variations
        keywords = set()
        for var in official_variations:
            v_text = var.get("text", "")
            for word in v_text.split():
                clean_w = "".join(c for c in word.lower() if c.isalnum())
                if len(clean_w) >= 3:
                    keywords.add(clean_w)
        
        # Check for matching lines in OCR data
        matching_lines = []
        for line in ocr_data["lines"]:
            line_text = line.get("text", "").lower()
            line_words = ["".join(c for c in w if c.isalnum()) for w in line_text.split()]
            if any(k in line_words or k in line_text for k in keywords):
                matching_lines.append(line)
        
        if matching_lines:
            # Group vertically close matching lines
            min_x = min(l["bbox"][0] for l in matching_lines)
            min_y = min(l["bbox"][1] for l in matching_lines)
            max_x = max(l["bbox"][0] + l["bbox"][2] for l in matching_lines)
            max_y = max(l["bbox"][1] + l["bbox"][3] for l in matching_lines)
            
            # Pad to include icon marks or breathing room
            pad_x = int((max_x - min_x) * 0.10) + 15
            pad_y = int((max_y - min_y) * 0.25) + 15
            
            bx0 = max(0, min_x - pad_x)
            by0 = max(0, min_y - pad_y)
            bx1 = min(W, max_x + pad_x)
            by1 = min(H, max_y + pad_y)
            
            p_name = get_placement_name(bx0, by0, bx1, by1)
            matched_txt = " ".join(l["text"] for l in matching_lines)
            add_region((bx0, by0, bx1, by1), p_name, "OCR Brandmark Region", matched_txt)
            # Also tight box
            add_region((max(0, min_x - 5), max(0, min_y - 5), min(W, max_x + 5), min(H, max_y + 5)), p_name, "OCR Tight Wordmark Region", matched_txt)

    # 2. Multi-Scale Structural Search for each variation
    c_gray = creative_img.convert('L')
    scale_factor = 0.5
    search_w = int(W * scale_factor)
    search_h = int(H * scale_factor)
    c_small = c_gray.resize((search_w, search_h), Image.Resampling.BILINEAR)
    c_edge = np.array(c_small.filter(ImageFilter.FIND_EDGES), dtype=np.float32)

    for var in official_variations:
        ref_img = var.get("image")
        if not ref_img:
            continue
        ref_w, ref_h = ref_img.size
        ref_gray = ref_img.convert('L')
        
        for s in [0.4, 0.6, 0.8, 1.0, 1.25]:
            tw = int(ref_w * scale_factor * s)
            th = int(ref_h * scale_factor * s)
            if tw >= search_w or th >= search_h or tw < 20 or th < 10:
                continue
            
            tpl = np.array(ref_gray.filter(ImageFilter.FIND_EDGES).resize((tw, th), Image.Resampling.BILINEAR), dtype=np.float32)
            tpl_z = tpl - np.mean(tpl)
            tpl_std = np.sqrt(np.sum(tpl_z**2))
            if tpl_std < 1e-3:
                continue
                
            step = max(3, int(min(tw, th) / 6))
            best_s = -1.0
            best_pos = None
            
            for y in range(0, search_h - th + 1, step):
                # Standard zones
                if not (y < search_h * 0.40 or y > search_h * 0.60 or (search_h * 0.25 <= y <= search_h * 0.55)):
                    continue
                for x in range(0, search_w - tw + 1, step):
                    patch = c_edge[y:y+th, x:x+tw]
                    p_z = patch - np.mean(patch)
                    p_std = np.sqrt(np.sum(p_z**2))
                    if p_std < 1e-3:
                        continue
                    sc = np.sum(tpl_z * p_z) / (tpl_std * p_std)
                    if sc > best_s:
                        best_s = sc
                        best_pos = (x, y)
            
            if best_s > 0.35 and best_pos:
                ox0 = int(best_pos[0] / scale_factor)
                oy0 = int(best_pos[1] / scale_factor)
                ox1 = int((best_pos[0] + tw) / scale_factor)
                oy1 = int((best_pos[1] + th) / scale_factor)
                p_name = get_placement_name(ox0, oy0, ox1, oy1)
                add_region((ox0, oy0, ox1, oy1), p_name, f"Structural Match Peak (scale={s:.1f}, score={best_s:.2f})")

    # 3. Standard Placement Quadrants & Proportional Bounding Boxes
    quadrants = [
        ("top-left", 0.0, 0.0, 0.45, 0.35),
        ("top-right", 0.55, 0.0, 1.0, 0.35),
        ("bottom-left", 0.0, 0.65, 0.45, 1.0),
        ("bottom-right", 0.55, 0.65, 1.0, 1.0),
        ("header", 0.0, 0.0, 1.0, 0.25),
        ("footer", 0.0, 0.75, 1.0, 1.0),
        ("center", 0.20, 0.20, 0.80, 0.80)
    ]
    for qname, x0_p, y0_p, x1_p, y1_p in quadrants:
        x0, y0 = int(W * x0_p), int(H * y0_p)
        x1, y1 = int(W * x1_p), int(H * y1_p)
        add_region((x0, y0, x1, y1), qname, f"{qname.replace('-', ' ').title()} Quadrant")

    # 4. Full Canvas
    add_region((0, 0, W, H), "full", "Full Canvas")

    return regions

# Let's test on creative 66 with im23
im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

ocr_data = {
    "text": "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW Work. Create. Perform. All Day Long.",
    "lines": [
        {"text": "N I NOVA TECH", "bbox": [28, 37, 333, 41]},
        {"text": "INNOVATION FOR A BETTER TOMORROW", "bbox": [29, 88, 400, 10]},
        {"text": "CORRECT CLAIM", "bbox": [561, 49, 170, 21]}
    ]
}

official_variations = [{
    "id": 23,
    "name": "WhatsApp Image",
    "variation_type": "Light-Background Logo",
    "image": im23,
    "text": "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW"
}]

t0 = time.time()
regs = extract_smart_candidate_regions(im_creative, official_variations, ocr_data)
el = time.time() - t0
print(f"Generated {len(regs)} candidate regions in {el:.3f}s:")
for i, r in enumerate(regs):
    print(f"  R{i}: {r['placement']} | {r['description']} | bbox={r['bbox']}")
