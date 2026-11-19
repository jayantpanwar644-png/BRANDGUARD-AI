import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw
import tempfile
from backend.services.logo_detector import detect_and_verify_brand_logo

temp_dir = Path(tempfile.mkdtemp())

# Master Logo (Light theme)
master_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dm = ImageDraw.Draw(master_logo)
dm.rounded_rectangle([(10, 10), (70, 70)], radius=8, fill=(26, 86, 219, 255))
dm.text((85, 30), "NEXUS", fill=(15, 23, 42, 255))
master_logo_path = str(temp_dir / "official_master_logo.png")
master_logo.save(master_logo_path)

# Dark Theme Logo
dark_logo = Image.new('RGBA', (260, 90), (0, 0, 0, 0))
dd = ImageDraw.Draw(dark_logo)
dd.rounded_rectangle([(10, 10), (70, 70)], radius=8, fill=(59, 130, 246, 255))
dd.text((85, 30), "NEXUS", fill=(255, 255, 255, 255))
dark_logo_path = str(temp_dir / "official_dark_logo.png")
dark_logo.save(dark_logo_path)

# Icon Mark
icon_logo = Image.new('RGBA', (90, 90), (0, 0, 0, 0))
di = ImageDraw.Draw(icon_logo)
di.rounded_rectangle([(8, 8), (82, 82)], radius=12, fill=(26, 86, 219, 255))
di.ellipse([(20, 20), (70, 70)], fill=(255, 255, 255, 255))
icon_logo_path = str(temp_dir / "official_icon_logo.png")
icon_logo.save(icon_logo_path)

class MockAsset:
    def __init__(self, id, name, path, variation_type, is_primary=False):
        self.id = id
        self.file_name = name
        self.file_path = path
        self.raster_path = path
        self.variation_type = variation_type
        self.is_primary = is_primary

class MockProfile:
    def __init__(self, name, logo_path):
        self.company_name = name
        self.is_configured = True
        self.logo_path = logo_path

brand_profile = MockProfile("Nexus Technologies", logo_path=master_logo_path)
brand_assets = [
    MockAsset(1, "Master Logo.png", master_logo_path, variation_type="Primary Logo", is_primary=True),
    MockAsset(2, "Dark Theme Logo.png", dark_logo_path, variation_type="Dark-Background Logo"),
    MockAsset(3, "Icon Mark.png", icon_logo_path, variation_type="Icon-Only Logo")
]

# Scenario 1: Exact logo
c1 = Image.new('RGB', (1000, 600), (250, 250, 252))
cd1 = ImageDraw.Draw(c1)
cd1.text((60, 60), "Empowering Enterprise Cloud Scale", fill=(15, 23, 42))
c1.paste(master_logo, (1000 - 260 - 40, 600 - 90 - 40), master_logo)
c1_path = str(temp_dir / "c1.png"); c1.save(c1_path)

res1 = detect_and_verify_brand_logo(c1_path, brand_profile, brand_assets, ocr_text="Empowering Enterprise Cloud Scale", combined_text="")
print("S1:", res1["status"], res1["confidence"], res1.get("finding") is None)

# Scenario 2: Resized logo
c2 = Image.new('RGB', (1000, 600), (245, 247, 250))
cd2 = ImageDraw.Draw(c2)
cd2.text((60, 60), "Next-Gen Infrastructure Solutions", fill=(15, 23, 42))
resized = master_logo.resize((160, 55), Image.Resampling.LANCZOS)
c2.paste(resized, (1000 - 160 - 35, 600 - 55 - 35), resized)
c2_path = str(temp_dir / "c2.jpg"); c2.save(c2_path, format="JPEG", quality=65)

res2 = detect_and_verify_brand_logo(c2_path, brand_profile, brand_assets, ocr_text="Next-Gen Infrastructure Solutions", combined_text="")
print("S2:", res2["status"], res2["confidence"], res2.get("finding") is None)

# Scenario 3: Dark theme
c3 = Image.new('RGB', (1000, 600), (15, 23, 42))
cd3 = ImageDraw.Draw(c3)
cd3.text((60, 60), "Mission Critical Cybersecurity", fill=(248, 250, 252))
c3.paste(dark_logo, (1000 - 260 - 40, 600 - 90 - 40), dark_logo)
c3_path = str(temp_dir / "c3.png"); c3.save(c3_path)

res3 = detect_and_verify_brand_logo(c3_path, brand_profile, brand_assets, ocr_text="Mission Critical Cybersecurity", combined_text="")
print("S3:", res3["status"], res3["confidence"], res3.get("finding") is None)

# Scenario 4: Icon only
c4 = Image.new('RGB', (800, 800), (255, 255, 255))
cd4 = ImageDraw.Draw(c4)
cd4.text((50, 50), "Compact Icon Ad Layout", fill=(20, 20, 20))
c4.paste(icon_logo, (50, 120), icon_logo)
c4_path = str(temp_dir / "c4.png"); c4.save(c4_path)

res4 = detect_and_verify_brand_logo(c4_path, brand_profile, brand_assets, ocr_text="Compact Icon Ad Layout", combined_text="")
print("S4:", res4["status"], res4["confidence"], res4.get("finding") is None)

# Scenario 5: Competitor
fake_logo = Image.new('RGBA', (240, 80), (0, 0, 0, 0))
fd = ImageDraw.Draw(fake_logo)
fd.polygon([(20, 20), (80, 20), (50, 70)], fill=(220, 38, 38, 255))
fd.text((95, 30), "COMPETITOR X", fill=(220, 38, 38, 255))

c5 = Image.new('RGB', (1000, 600), (250, 250, 252))
cd5 = ImageDraw.Draw(c5)
cd5.text((60, 60), "Unapproved Partner Marketing Visual", fill=(15, 23, 42))
c5.paste(fake_logo, (1000 - 240 - 40, 600 - 80 - 40), fake_logo)
c5_path = str(temp_dir / "c5.png"); c5.save(c5_path)

res5 = detect_and_verify_brand_logo(c5_path, brand_profile, brand_assets, ocr_text="Unapproved Partner Marketing Visual", combined_text="")
print("S5:", res5["status"], res5["confidence"], res5.get("finding") is not None)
