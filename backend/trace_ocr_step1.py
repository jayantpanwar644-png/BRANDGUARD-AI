import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image

p_creative = Path(r"backend/uploads/images/content_org_19_1794714097_66.jpeg")
p_asset17 = Path(r"backend/uploads/logos/logo_org_19_Screenshot 2026-09-30 145013.png")
p_asset23 = Path(r"backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png")
p_crop = Path(r"backend/uploads/evidence/detected_logo_1a95042bee.png")

from backend.services.vision_engine import run_system_ocr
print("=== OCR ON ASSET 17 ===")
print(run_system_ocr(str(p_asset17)))

print("\n=== OCR ON ASSET 23 ===")
print(run_system_ocr(str(p_asset23)))

print("\n=== OCR ON CREATIVE 66 ===")
print(run_system_ocr(str(p_creative)))

print("\n=== OCR ON DETECTED CROP ===")
print(run_system_ocr(str(p_crop)))
