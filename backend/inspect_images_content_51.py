from pathlib import Path
from PIL import Image

p1 = Path(r"backend/uploads/images/content_org_19_1794714097_66.jpeg")
p2 = Path(r"backend/uploads/logos/logo_org_19_Screenshot 2026-09-30 145013.png")
p3 = Path(r"backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png")
p4 = Path(r"backend/uploads/logos/originals/orig_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.jpeg")
p5 = Path(r"backend/uploads/evidence/detected_logo_1a95042bee.png")

for name, p in [("Creative 66", p1), ("Asset 17 (Screenshot)", p2), ("Asset 23 (Raster)", p3), ("Asset 23 (Original)", p4), ("Detected Crop", p5)]:
    exists = p.exists()
    print(f"=== {name} ===")
    print(f"Path: {p}")
    print(f"Exists: {exists}")
    if exists:
        try:
            with Image.open(p) as im:
                print(f"Size: {im.size}, Mode: {im.mode}, Format: {im.format}")
        except Exception as e:
            print(f"Error opening: {e}")
