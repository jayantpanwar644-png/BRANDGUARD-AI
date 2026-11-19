import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageEnhance, ImageFilter
import io

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
im_creative = Image.open('backend/uploads/images/content_org_19_1794714097_66.jpeg')

# SCENARIO 1: The real creative (actual case)
# Already verified: 92% - 99% match!

# SCENARIO 2: Resized & Compressed creative
# Scale creative down to 70%, then save as heavy JPEG compression
creative_resized = im_creative.resize((int(im_creative.width * 0.7), int(im_creative.height * 0.7)), Image.Resampling.LANCZOS)
buf = io.BytesIO()
creative_resized.save(buf, format="JPEG", quality=35)
buf.seek(0)
creative_compressed = Image.open(buf)
creative_compressed.save('backend/uploads/evidence/test_scenario_compressed.jpeg')

# SCENARIO 4: Genuinely different logo
# Replace top-left logo with a completely different graphic (e.g. a red circular warning/target mark)
different_creative = im_creative.copy()
from PIL import ImageDraw
draw = ImageDraw.Draw(different_creative)
# Overwrite top-left with dark background and a different alien symbol
draw.rectangle([0, 0, 450, 140], fill=(2, 18, 34))
draw.ellipse([80, 20, 180, 120], outline=(255, 50, 50), width=8)
draw.polygon([(130, 40), (100, 100), (160, 100)], fill=(255, 200, 0))
draw.text((200, 60), "ACME CORP", fill=(255, 255, 255))
different_creative.save('backend/uploads/evidence/test_scenario_alien_logo.jpeg')

# SCENARIO 5: Unclear logo
# Heavy blur / noise over logo
unclear_creative = im_creative.copy()
logo_region = unclear_creative.crop((0, 15, 441, 138)).filter(ImageFilter.GaussianBlur(radius=8))
unclear_creative.paste(logo_region, (0, 15))
unclear_creative.save('backend/uploads/evidence/test_scenario_unclear.jpeg')

print("Created scenario test images successfully.")
