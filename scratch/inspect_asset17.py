import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image

p17 = Path('backend/uploads/logos/logo_org_19_Screenshot 2026-09-30 145013.png')
im17 = Image.open(p17)
print("Asset 17 size:", im17.size, "mode:", im17.mode)
print("Asset 17 extrema:", im17.getextrema())
