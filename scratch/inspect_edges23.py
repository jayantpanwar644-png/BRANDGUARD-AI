import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
rgb23 = np.array(im23.convert('RGB'))

print("Top 5 rows mean color:")
for r in range(5):
    print(r, np.mean(rgb23[r, :, :], axis=0))

print("Bottom 5 rows mean color:")
for r in range(118, 123):
    print(r, np.mean(rgb23[r, :, :], axis=0))

print("Left 5 cols mean color:")
for c in range(5):
    print(c, np.mean(rgb23[:, c, :], axis=0))

print("Right 5 cols mean color:")
for c in range(436, 441):
    print(c, np.mean(rgb23[:, c, :], axis=0))
