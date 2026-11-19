import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scratch.test_ocr_json import extract_detailed_ocr
from PIL import Image, ImageFilter, ImageStat, ImageOps
import numpy as np

def compute_ncc(a: np.ndarray, b: np.ndarray) -> float:
    a_f = a.astype(np.float32)
    b_f = b.astype(np.float32)
    a_zero = a_f - np.mean(a_f)
    b_zero = b_f - np.mean(b_f)
    denom = np.sqrt(np.sum(a_zero**2) * np.sum(b_zero**2))
    if denom < 1e-4:
        return 0.0
    return float(np.sum(a_zero * b_zero) / denom)

def compute_dhash(img_gray: Image.Image, hash_size: int = 16) -> np.ndarray:
    resized = img_gray.resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    arr = np.array(resized, dtype=np.float32)
    return arr[:, 1:] > arr[:, :-1]

def clean_word(w: str) -> str:
    return "".join(c for c in w.lower() if c.isalnum())

def compute_text_similarity(cand_text: str, ref_text: str) -> float:
    if not cand_text or not ref_text:
        return 0.0
    r_words = set(clean_word(w) for w in ref_text.split() if len(clean_word(w)) >= 2)
    c_words = set(clean_word(w) for w in cand_text.split() if len(clean_word(w)) >= 2)
    if not r_words or not c_words:
        return 0.0
    return float(len(r_words.intersection(c_words)) / len(r_words))

def evaluate_logo_similarity(cand_img: Image.Image, ref_img: Image.Image, cand_text: str = "", ref_text: str = ""):
    ar_c = cand_img.width / max(1, cand_img.height)
    ar_r = ref_img.width / max(1, ref_img.height)
    ar_consistency = min(ar_c, ar_r) / max(ar_c, ar_r)
    
    target_w = 180
    target_h = max(24, int(180 / max(0.2, ar_r)))
    if target_h > 180:
        target_h = 180
        target_w = max(24, int(180 * ar_r))
    target_size = (target_w, target_h)
    
    c_gray = cand_img.convert('L').resize(target_size, Image.Resampling.LANCZOS)
    c_arr = np.array(c_gray, dtype=np.float32)
    c_edge = np.array(c_gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    r_rgba = ref_img.convert('RGBA')
    bg_w = Image.new('RGB', r_rgba.size, (255, 255, 255))
    bg_w.paste(r_rgba, (0, 0), r_rgba)
    r_gray_w = bg_w.convert('L').resize(target_size, Image.Resampling.LANCZOS)
    r_arr_w = np.array(r_gray_w, dtype=np.float32)
    r_edge_w = np.array(r_gray_w.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    r_arr_w_inv = 255.0 - r_arr_w
    
    edge_ncc = compute_ncc(c_edge, r_edge_w)
    lum_ncc_norm = compute_ncc(c_arr, r_arr_w)
    lum_ncc_inv = compute_ncc(c_arr, r_arr_w_inv)
    lum_ncc = max(lum_ncc_norm, lum_ncc_inv)
    
    h_c = compute_dhash(c_gray, 16)
    h_r = compute_dhash(r_gray_w, 16)
    h_r_inv = compute_dhash(ImageOps.invert(r_gray_w), 16)
    dhash_sim = max(float(np.mean(h_c == h_r)), float(np.mean(h_c == h_r_inv)))
    
    text_sim = compute_text_similarity(cand_text, ref_text)
    has_text_eval = bool(ref_text and cand_text)
            
    if has_text_eval and text_sim >= 0.50:
        base_score = max(edge_ncc, lum_ncc, (dhash_sim - 0.5) / 0.5)
        conf = 0.50 * text_sim + 0.50 * max(0.40, base_score)
    else:
        norm_edge = max(0.0, edge_ncc)
        norm_lum = max(0.0, lum_ncc)
        norm_dhash = max(0.0, (dhash_sim - 0.55) / 0.45)
        conf = (0.45 * norm_edge) + (0.35 * norm_lum) + (0.20 * norm_dhash)
        if has_text_eval and text_sim > 0.30:
            conf = min(1.0, conf + 0.15 * text_sim)
            
    if ar_consistency < 0.40:
        conf *= (0.50 + 0.50 * ar_consistency)
        
    mode_note = "Standard Presentation"
    if lum_ncc_inv > lum_ncc_norm and lum_ncc_inv > 0.45:
        mode_note = "Monochrome / Inverted Theme"
    elif edge_ncc > 0.50:
        mode_note = "Structural Edge Alignment"
        
    return {
        "confidence": float(np.clip(conf, 0.0, 1.0)),
        "edge_ncc": edge_ncc,
        "lum_ncc": lum_ncc,
        "dhash_sim": dhash_sim,
        "text_sim": text_sim,
        "ar_consistency": ar_consistency,
        "mode_note": mode_note
    }

def get_placement_name(x0, y0, x1, y1, W, H):
    cx = (x0 + x1) / 2.0 / W
    cy = (y0 + y1) / 2.0 / H
    if cy < 0.32:
        if cx < 0.38: return "top-left"
        if cx > 0.62: return "top-right"
        return "header"
    elif cy > 0.68:
        if cx < 0.38: return "bottom-left"
        if cx > 0.62: return "bottom-right"
        return "footer"
    else:
        if cx < 0.35: return "center-left"
        if cx > 0.65: return "center-right"
        return "center"

def measure_sharpness(img: Image.Image) -> float:
    gray = img.convert('L')
    edges = np.array(gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    return float(np.mean(edges**2))

def detect_and_verify_refined(creative_path, official_variations, ocr_data=None):
    if ocr_data is None:
        ocr_data = extract_detailed_ocr(creative_path)
        
    im_creative = Image.open(creative_path)
    W, H = im_creative.size
    
    regions = []
    seen = set()
    
    def add_region(bbox, placement, desc, text=""):
        x0, y0, x1, y1 = [int(v) for v in bbox]
        x0 = max(0, min(W - 10, x0))
        y0 = max(0, min(H - 10, y0))
        x1 = max(x0 + 10, min(W, x1))
        y1 = max(y0 + 10, min(H, y1))
        box_key = (round(x0, -1), round(y0, -1), round(x1, -1), round(y1, -1))
        if box_key in seen:
            return
        seen.add(box_key)
        regions.append({
            "placement": placement,
            "crop": im_creative.crop((x0, y0, x1, y1)),
            "bbox": (x0, y0, x1, y1),
            "description": desc,
            "text": text
        })

    # (A) OCR anchored regions with spatial proximity clustering
    if ocr_data and "lines" in ocr_data:
        keywords = set()
        for var in official_variations:
            v_text = var.get("text", "")
            for word in v_text.split():
                cw = clean_word(word)
                if len(cw) >= 3:
                    keywords.add(cw)
        
        matching = []
        for line in ocr_data["lines"]:
            lt = line.get("text", "").lower()
            lw = [clean_word(w) for w in lt.split()]
            hits = sum(1 for k in keywords if k in lw or (len(k) >= 4 and any(k in cw or cw in k for cw in lw)))
            if hits > 0:
                matching.append(line)
                
        if matching:
            matching.sort(key=lambda l: l["bbox"][1])
            clusters = []
            curr = [matching[0]]
            for l in matching[1:]:
                prev_y_end = curr[-1]["bbox"][1] + curr[-1]["bbox"][3]
                if l["bbox"][1] - prev_y_end <= 40:
                    curr.append(l)
                else:
                    clusters.append(curr)
                    curr = [l]
            clusters.append(curr)
            
            for cl in clusters:
                min_x = min(l["bbox"][0] for l in cl)
                min_y = min(l["bbox"][1] for l in cl)
                max_x = max(l["bbox"][0] + l["bbox"][2] for l in cl)
                max_y = max(l["bbox"][1] + l["bbox"][3] for l in cl)
                matched_txt = " ".join(l["text"] for l in cl)
                p_name = get_placement_name(min_x, min_y, max_x, max_y, W, H)
                
                # 1. Padded cluster box
                pad_x = int((max_x - min_x) * 0.12) + 12
                pad_y = int((max_y - min_y) * 0.20) + 12
                add_region((min_x - pad_x, min_y - pad_y, max_x + pad_x, max_y + pad_y), p_name, "OCR Padded Cluster", matched_txt)
                
                # 2. Aspect-ratio fitted candidate box matching each official variation
                for var in official_variations:
                    ref_img = var.get("image")
                    if ref_img:
                        ar_r = ref_img.width / max(1, ref_img.height)
                        cl_h = max_y - min_y
                        box_h = int(cl_h * 1.5) + 10
                        box_w = int(box_h * ar_r)
                        fit_x0 = max(0, min_x - 15)
                        fit_y0 = max(0, min_y - 12)
                        add_region((fit_x0, fit_y0, fit_x0 + box_w, fit_y0 + box_h), p_name, f"OCR Aspect-Ratio Fit ({ar_r:.2f}:1)", matched_txt)

    # (B) Multi-scale structural search
    scale_factor = 0.5
    search_w = int(W * scale_factor)
    search_h = int(H * scale_factor)
    c_small = im_creative.convert('L').resize((search_w, search_h), Image.Resampling.BILINEAR)
    c_edge = np.array(c_small.filter(ImageFilter.FIND_EDGES), dtype=np.float32)

    for var in official_variations:
        ref_img = var.get("image")
        if not ref_img: continue
        ref_w, ref_h = ref_img.size
        ref_gray = ref_img.convert('L')
        
        for s in [0.35, 0.5, 0.7, 0.85, 1.0, 1.25]:
            tw = int(ref_w * scale_factor * s)
            th = int(ref_h * scale_factor * s)
            if tw >= search_w or th >= search_h or tw < 20 or th < 10:
                continue
            tpl = np.array(ref_gray.filter(ImageFilter.FIND_EDGES).resize((tw, th), Image.Resampling.BILINEAR), dtype=np.float32)
            tpl_z = tpl - np.mean(tpl)
            tpl_std = np.sqrt(np.sum(tpl_z**2))
            if tpl_std < 1e-3: continue
            
            step = max(3, int(min(tw, th) / 6))
            best_s = -1.0
            best_pos = None
            for y in range(0, search_h - th + 1, step):
                if not (y < search_h * 0.40 or y > search_h * 0.60 or (search_h * 0.25 <= y <= search_h * 0.55)):
                    continue
                for x in range(0, search_w - tw + 1, step):
                    patch = c_edge[y:y+th, x:x+tw]
                    p_z = patch - np.mean(patch)
                    p_std = np.sqrt(np.sum(p_z**2))
                    if p_std < 1e-3: continue
                    sc = np.sum(tpl_z * p_z) / (tpl_std * p_std)
                    if sc > best_s:
                        best_s = sc
                        best_pos = (x, y)
            if best_s > 0.30 and best_pos:
                ox0 = int(best_pos[0] / scale_factor)
                oy0 = int(best_pos[1] / scale_factor)
                ox1 = int((best_pos[0] + tw) / scale_factor)
                oy1 = int((best_pos[1] + th) / scale_factor)
                p_name = get_placement_name(ox0, oy0, ox1, oy1, W, H)
                add_region((ox0, oy0, ox1, oy1), p_name, f"Structural Peak (s={s:.2f}, score={best_s:.2f})")

    # (C) Standard Placement Quadrants
    for qname, x0_p, y0_p, x1_p, y1_p in [
        ("top-left", 0.0, 0.0, 0.45, 0.35),
        ("top-right", 0.55, 0.0, 1.0, 0.35),
        ("bottom-left", 0.0, 0.65, 0.45, 1.0),
        ("bottom-right", 0.55, 0.65, 1.0, 1.0),
        ("header", 0.0, 0.0, 1.0, 0.25),
        ("footer", 0.0, 0.75, 1.0, 1.0),
        ("center", 0.20, 0.20, 0.80, 0.80)
    ]:
        add_region((int(W * x0_p), int(H * y0_p), int(W * x1_p), int(H * y1_p)), qname, f"{qname} Quadrant")

    # (D) Full canvas
    add_region((0, 0, W, H), "full", "Full Canvas")

    # 2. Evaluation against all variations
    best_match = None
    highest_score = -1.0

    for r in regions:
        box = r["bbox"]
        for var in official_variations:
            ref_img = var["image"]
            res = evaluate_logo_similarity(r["crop"], ref_img, r.get("text", ""), var.get("text", ""))
            
            # Fine alignment jitter
            if res["confidence"] > 0.30:
                for dx in [-8, 0, 8]:
                    for dy in [-6, 0, 6]:
                        if dx == 0 and dy == 0: continue
                        jx0 = max(0, box[0] + dx)
                        jy0 = max(0, box[1] + dy)
                        jx1 = min(W, box[2] + dx)
                        jy1 = min(H, box[3] + dy)
                        jcrop = im_creative.crop((jx0, jy0, jx1, jy1))
                        jres = evaluate_logo_similarity(jcrop, ref_img, r.get("text", ""), var.get("text", ""))
                        if jres["confidence"] > res["confidence"]:
                            res = jres
                            r["crop"] = jcrop
                            r["bbox"] = (jx0, jy0, jx1, jy1)

            if res["confidence"] > highest_score:
                highest_score = res["confidence"]
                best_match = {
                    "score": round(res["confidence"], 3),
                    "placement": r["placement"],
                    "candidate_crop": r["crop"],
                    "candidate_bbox": r["bbox"],
                    "matched_variation": var,
                    "mode_note": res["mode_note"],
                    "details": res
                }

    sim_percent = int(highest_score * 100) if highest_score >= 0 else 0
    matched_var_type = best_match["matched_variation"]["variation_type"] if best_match else "Official Primary Logo"
    placement = best_match["placement"] if best_match else "not found"

    # RULE 1: Verified if confidence >= 0.50 OR (text match >= 0.50 and visual >= 0.40)
    has_text_confirmation = (best_match and best_match["details"].get("text_sim", 0.0) >= 0.50 and highest_score >= 0.40)
    if highest_score >= 0.50 or has_text_confirmation:
        explanation = (
            f"Visual similarity match ({sim_percent}%) confirmed against official '{matched_var_type}'. "
            f"Geometry, wordmark contours, and aspect ratio verified in {placement} position ({best_match['mode_note']})."
        )
        return {
            "detected": True,
            "status": "Logo Verified",
            "placement": placement,
            "confidence": highest_score,
            "matched_variation": matched_var_type,
            "candidate_crop": best_match["candidate_crop"],
            "matched_variation_obj": best_match["matched_variation"],
            "comparison_explanation": explanation,
            "finding": None
        }

    # Check for unclear / uncertain result (RULE 3 & 5)
    potential_mark_found = False
    is_mark_unclear = False
    unclear_zone = placement
    for qname, x0_p, y0_p, x1_p, y1_p in [
        ("top-left", 0.0, 0.0, 0.45, 0.30),
        ("top-right", 0.55, 0.0, 1.0, 0.30),
        ("bottom-left", 0.0, 0.70, 0.45, 1.0),
        ("bottom-right", 0.55, 0.70, 1.0, 1.0)
    ]:
        z_crop = im_creative.crop((int(W * x0_p), int(H * y0_p), int(W * x1_p), int(H * y1_p)))
        sh = measure_sharpness(z_crop)
        arr_z = np.array(z_crop.convert('L'))
        z_std = float(np.std(arr_z))
        if z_std > 15:
            potential_mark_found = True
            unclear_zone = qname
            if sh < 200:
                is_mark_unclear = True
                break

    if highest_score >= 0.35 or is_mark_unclear:
        explanation = (
            f"Candidate brandmark detected in {unclear_zone} position with moderate or marginal visual correlation ({sim_percent}%). "
            f"Asset resolution, compression, or partial background occlusion requires human review."
        )
        return {
            "detected": False,
            "status": "Needs Review",
            "placement": unclear_zone,
            "confidence": highest_score,
            "matched_variation": matched_var_type,
            "candidate_crop": best_match["candidate_crop"] if best_match else None,
            "matched_variation_obj": best_match["matched_variation"] if best_match else official_variations[0],
            "comparison_explanation": explanation,
            "finding": {
                "issue_type": "Logo",
                "severity": "Low",
                "title": "Logo Verification Needs Review",
                "description": f"Visual scanner detected a potential brand mark in the {unclear_zone} area with {sim_percent}% visual correlation to '{matched_var_type}', but clarity or confidence is marginal.",
                "expected_rule": "Maintain high visual fidelity and uncompromised resolution for all official brand marks.",
                "comparison_result": "Needs Review",
                "why_it_matters": "Marginal visual similarity can indicate low-resolution exports, unauthorized alteration, or compression artifacts.",
                "evidence_found": f"Detected mark in {unclear_zone} with {sim_percent}% correlation to '{matched_var_type}'.",
                "suggested_correction": "Review detected mark side-by-side with official master logo in Approval Center."
            }
        }

    # RULE 4: Confirmed Mismatch
    if potential_mark_found:
        explanation = (
            f"Visual element detected in {unclear_zone} contradicts all {len(official_variations)} confirmed official logo variations "
            f"(maximum visual correlation was only {sim_percent}%). Visual mismatch identified."
        )
        return {
            "detected": False,
            "status": "Incorrect Logo",
            "placement": unclear_zone,
            "confidence": highest_score,
            "matched_variation": None,
            "candidate_crop": best_match["candidate_crop"] if best_match else None,
            "matched_variation_obj": official_variations[0],
            "comparison_explanation": explanation,
            "finding": {
                "issue_type": "Logo",
                "severity": "High",
                "title": "Incorrect or Mismatched Logo",
                "description": f"Visual element in {unclear_zone} does not match any confirmed official brand variations.",
                "expected_rule": "Every external commercial visual must feature an approved official company logo asset.",
                "comparison_result": "Contradicted",
                "why_it_matters": "Displaying incorrect or outdated brand marks weakens trademark protection and creates brand confusion.",
                "evidence_found": f"Visual element detected in {unclear_zone} fails similarity verification against confirmed master assets (Score: {sim_percent}%).",
                "suggested_correction": f"Replace with confirmed official {official_variations[0]['variation_type']}."
            }
        }
    else:
        explanation = f"Visual scanning detected zero high-confidence matches across all {len(official_variations)} confirmed official logo variations."
        return {
            "detected": False,
            "status": "Not Detected",
            "placement": "not found",
            "confidence": highest_score,
            "matched_variation": None,
            "candidate_crop": None,
            "matched_variation_obj": official_variations[0],
            "comparison_explanation": explanation,
            "finding": {
                "issue_type": "Logo",
                "severity": "High",
                "title": "Official Company Logo Not Detected",
                "description": "The creative does not feature the verified organisation logo in standard bounding regions.",
                "expected_rule": "Every external commercial visual must include the official master logo.",
                "comparison_result": "Needs Improvement",
                "why_it_matters": "Unbranded commercial content reduces enterprise recall and opens risks of fraudulent impersonation.",
                "evidence_found": "Visual scanning detected zero high-confidence matches for official logo asset.",
                "suggested_correction": "Place the official approved logo in the upper-left or bottom-right quadrant with proper exclusion zone."
            }
        }

if __name__ == "__main__":
    im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
    official_variations = [{
        "id": 23,
        "name": "WhatsApp Image",
        "variation_type": "Light-Background Logo",
        "image": im23,
        "text": "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW",
        "web_url": "/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png"
    }]

    tests = [
        ("Actual Creative 66 (Correct Logo)", "backend/uploads/images/content_org_19_1794714097_66.jpeg"),
        ("Resized / Compressed Creative", "backend/uploads/evidence/test_scenario_compressed.jpeg"),
        ("Genuinely Different / Alien Logo", "backend/uploads/evidence/test_scenario_alien_logo.jpeg"),
        ("Unclear / Blurred Logo", "backend/uploads/evidence/test_scenario_unclear.jpeg")
    ]

    for name, path in tests:
        res = detect_and_verify_refined(path, official_variations)
        f_title = res['finding']['title'] if res.get('finding') else "NONE"
        f_comp = res['finding']['comparison_result'] if res.get('finding') else "N/A"
        print(f"\n[{name}]")
        print(f"  Status: {res['status']}, Conf: {res['confidence']:.2f}, Placement: {res['placement']}")
        print(f"  Finding: {f_title} ({f_comp})")
