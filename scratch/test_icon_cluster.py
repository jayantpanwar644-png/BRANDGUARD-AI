import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFilter
import numpy as np

temp_dir = Path("scratch")
icon_logo = Image.new('RGBA', (90, 90), (0, 0, 0, 0))
di = ImageDraw.Draw(icon_logo)
di.rounded_rectangle([(8, 8), (82, 82)], radius=12, fill=(26, 86, 219, 255))
di.ellipse([(20, 20), (70, 70)], fill=(255, 255, 255, 255))

creative_4 = Image.new('RGB', (800, 800), (255, 255, 255))
cd4 = ImageDraw.Draw(creative_4)
cd4.text((50, 50), "Compact Icon Ad Layout", fill=(20, 20, 20))
creative_4.paste(icon_logo, (50, 120), icon_logo)

# Let's inspect edges in creative_4
gray = creative_4.convert('L')
edges = gray.filter(ImageFilter.FIND_EDGES)
arr_e = np.array(edges)

# In top-left quadrant (0, 0, 360, 280)
# Look at projection profile
sub_e = arr_e[0:280, 0:360]
# Active rows with edge energy
row_energy = np.mean(sub_e, axis=1)
print("Row energy > 2:")
active_y = np.where(row_energy > 2)[0]
# Find gaps
gaps = np.where(np.diff(active_y) > 8)[0]
starts = [active_y[0]] + [active_y[i+1] for i in gaps]
ends = [active_y[i] for i in gaps] + [active_y[-1]]
for s, e in zip(starts, ends):
    col_energy = np.mean(sub_e[s:e+1, :], axis=0)
    act_x = np.where(col_energy > 2)[0]
    if len(act_x) > 0:
        bx0 = act_x[0]
        bx1 = act_x[-1]
        print(f"Isolated cluster: y=[{s}, {e}], x=[{bx0}, {bx1}]")
