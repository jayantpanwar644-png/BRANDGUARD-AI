import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scratch.test_refined_engine import official_variations, evaluate_logo_similarity, get_placement_name
from scratch.test_ocr_json import extract_detailed_ocr
from PIL import Image

def cluster_ocr_matching_lines(lines, keywords, W, H):
    matching = []
    for l in lines:
        lt = l.get("text", "").lower()
        lw = ["".join(c for c in w if c.isalnum()) for w in lt.split()]
        # Check how many keywords match
        hits = sum(1 for k in keywords if k in lw or k in lt)
        if hits > 0:
            matching.append((hits, l))
            
    if not matching:
        return []
        
    # Sort matching lines by y position
    matching.sort(key=lambda item: item[1]["bbox"][1])
    
    clusters = []
    curr_cluster = [matching[0][1]]
    for _, l in matching[1:]:
        prev_y_end = curr_cluster[-1]["bbox"][1] + curr_cluster[-1]["bbox"][3]
        # If vertical gap is within 35 pixels, group together
        if l["bbox"][1] - prev_y_end <= 35:
            curr_cluster.append(l)
        else:
            clusters.append(curr_cluster)
            curr_cluster = [l]
    clusters.append(curr_cluster)
    
    results = []
    for cl in clusters:
        min_x = min(l["bbox"][0] for l in cl)
        min_y = min(l["bbox"][1] for l in cl)
        max_x = max(l["bbox"][0] + l["bbox"][2] for l in cl)
        max_y = max(l["bbox"][1] + l["bbox"][3] for l in cl)
        
        # Add tight box
        results.append(((min_x, min_y, max_x, max_y), " ".join(l["text"] for l in cl)))
        # Add padded box
        pad_x = int((max_x - min_x) * 0.12) + 10
        pad_y = int((max_y - min_y) * 0.20) + 10
        bx0 = max(0, min_x - pad_x)
        by0 = max(0, min_y - pad_y)
        bx1 = min(W, max_x + pad_x)
        by1 = min(H, max_y + pad_y)
        results.append(((bx0, by0, bx1, by1), " ".join(l["text"] for l in cl)))
    return results

im_comp = Image.open('backend/uploads/evidence/test_scenario_compressed.jpeg')
d = extract_detailed_ocr('backend/uploads/evidence/test_scenario_compressed.jpeg')

keywords = {"nova", "tech", "innovation", "better", "tomorrow"}
boxes = cluster_ocr_matching_lines(d['lines'], keywords, im_comp.width, im_comp.height)
print("Clusters found:")
for b, t in boxes:
    print(" ", b, t)
    crop = im_comp.crop(b)
    res = evaluate_logo_similarity(crop, official_variations[0]["image"], t, official_variations[0]["text"])
    print(f"    -> conf={res['confidence']:.4f}, edge={res['edge_ncc']:.3f}, lum={res['lum_ncc']:.3f}, text={res['text_sim']:.2f}")
