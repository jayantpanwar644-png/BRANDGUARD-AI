import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

im = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')
quad_crop = im.crop((0, 0, 345, 304))

rgb_q = quad_crop.convert('RGB')
arr_q = np.array(rgb_q, dtype=np.float32)
corner_col = arr_q[0, 0]
print("corner_col:", corner_col)
diff_q = np.sqrt(np.sum((arr_q - corner_col)**2, axis=2))
mask_q = diff_q > 20

row_counts = np.sum(mask_q, axis=1)
active_rows = np.where(row_counts > 4)[0]
print("active_rows count:", len(active_rows))
splits = np.where(np.diff(active_rows) > 6)[0]
print("splits:", splits)
starts = [active_rows[0]] + [active_rows[i+1] for i in splits]
ends = [active_rows[i] for i in splits] + [active_rows[-1]]
for s, e in zip(starts, ends):
    print("cluster s-e:", s, e)
