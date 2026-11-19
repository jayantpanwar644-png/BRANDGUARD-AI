import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageOps, ImageFilter, ImageEnhance
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

def evaluate_logo_similarity(cand_img: Image.Image, ref_img: Image.Image, cand_text: str = "", ref_text: str = ""):
    # 1. Normalize aspect ratio target size
    ar_c = cand_img.width / max(1, cand_img.height)
    ar_r = ref_img.width / max(1, ref_img.height)
    ar_consistency = min(ar_c, ar_r) / max(ar_c, ar_r)
    
    # Standard normalized size preserving ref aspect ratio
    target_w = 180
    target_h = max(24, int(180 / max(0.2, ar_r)))
    if target_h > 180:
        target_h = 180
        target_w = max(24, int(180 * ar_r))
    target_size = (target_w, target_h)
    
    # 2. Convert candidate to grayscale and edge
    c_gray = cand_img.convert('L').resize(target_size, Image.Resampling.LANCZOS)
    c_arr = np.array(c_gray, dtype=np.float32)
    c_edge = np.array(c_gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    # 3. Composite ref onto white and dark
    r_rgba = ref_img.convert('RGBA')
    bg_w = Image.new('RGB', r_rgba.size, (255, 255, 255))
    bg_w.paste(r_rgba, (0, 0), r_rgba)
    r_gray_w = bg_w.convert('L').resize(target_size, Image.Resampling.LANCZOS)
    r_arr_w = np.array(r_gray_w, dtype=np.float32)
    r_edge_w = np.array(r_gray_w.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    
    # Also test inverted
    r_arr_w_inv = 255.0 - r_arr_w
    
    # Edge NCC
    edge_ncc = compute_ncc(c_edge, r_edge_w)
    
    # Luminance NCC
    lum_ncc_norm = compute_ncc(c_arr, r_arr_w)
    lum_ncc_inv = compute_ncc(c_arr, r_arr_w_inv)
    lum_ncc = max(lum_ncc_norm, lum_ncc_inv)
    
    # dHash
    h_c = compute_dhash(c_gray, 16)
    h_r = compute_dhash(r_gray_w, 16)
    h_r_inv = compute_dhash(ImageOps.invert(r_gray_w), 16)
    dhash_sim = max(float(np.mean(h_c == h_r)), float(np.mean(h_c == h_r_inv)))
    
    # Textual matching if both have text
    text_sim = 0.0
    has_text_eval = False
    if ref_text and cand_text:
        has_text_eval = True
        r_words = set(w.lower() for w in ref_text.split() if len(w) > 1)
        c_words = set(w.lower() for w in cand_text.split() if len(w) > 1)
        if r_words:
            overlap = len(r_words.intersection(c_words))
            text_sim = overlap / len(r_words)
    
    # Multi-metric composite confidence
    # If text is present and matches:
    if has_text_eval and text_sim >= 0.70:
        base_score = max(edge_ncc, lum_ncc, (dhash_sim - 0.5) / 0.5)
        conf = 0.50 * text_sim + 0.50 * max(0.40, base_score)
    else:
        norm_edge = max(0.0, edge_ncc)
        norm_lum = max(0.0, lum_ncc)
        norm_dhash = max(0.0, (dhash_sim - 0.55) / 0.45)
        conf = (0.45 * norm_edge) + (0.35 * norm_lum) + (0.20 * norm_dhash)
        if has_text_eval and text_sim > 0.30:
            conf = min(1.0, conf + 0.15 * text_sim)
            
    if ar_consistency < 0.45:
        conf *= (0.60 + 0.40 * ar_consistency)
        
    return {
        "confidence": float(np.clip(conf, 0.0, 1.0)),
        "edge_ncc": edge_ncc,
        "lum_ncc": lum_ncc,
        "dhash_sim": dhash_sim,
        "text_sim": text_sim,
        "ar_consistency": ar_consistency
    }

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

# Test exact crop
crop = im_creative.crop((0, 15, 441, 138))
res = evaluate_logo_similarity(crop, im23, "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW", "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW")
print("Exact crop with Asset 23:", res)

# Test without text match passed
res_notext = evaluate_logo_similarity(crop, im23, "", "")
print("Exact crop without text:", res_notext)

# Test top-right quadrant (where CORRECT CLAIM is) with Asset 23
tr_crop = im_creative.crop((421, 0, 767, 304))
res_tr = evaluate_logo_similarity(tr_crop, im23, "CORRECT CLAIM", "N I NOVA TECH INNOVATION FOR A BETTER TOMORROW")
print("Top-right with Asset 23:", res_tr)
