import os
import shutil
import zipfile
from pathlib import Path

ROOT = Path(r"c:\Users\hp\Downloads\BRANDGUID AI")
EXPORT = ROOT / "BrandGuard-AI-Final"
ZIP_PATH = ROOT / "BrandGuard-AI-Final.zip"

print(f"Export directory: {EXPORT}")
print(f"Zip destination: {ZIP_PATH}")

# 1. Clean previous export if any
if EXPORT.exists():
    shutil.rmtree(EXPORT)
EXPORT.mkdir(parents=True, exist_ok=True)

# 2. Setup directory tree
(EXPORT / "backend").mkdir(parents=True, exist_ok=True)
(EXPORT / "frontend").mkdir(parents=True, exist_ok=True)
(EXPORT / "api").mkdir(parents=True, exist_ok=True)

# 3. Copy Backend Code
backend_src = ROOT / "backend"
backend_dst = EXPORT / "backend"

# Folders to copy recursively
backend_subdirs = ["core", "models", "routers", "schemas", "services", "migrations"]
for sub in backend_subdirs:
    s_dir = backend_src / sub
    d_dir = backend_dst / sub
    if s_dir.exists():
        shutil.copytree(s_dir, d_dir, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo"))

# Core backend root files
backend_core_files = [
    "main.py",
    "__init__.py",
    "pyproject.toml",
    "requirements.txt",
    "test_e2e.py",
    "test_flexible_logos.py",
    "test_logo_detection_scenarios.py",
    "test_real_product_e2e.py",
    "test_audit_cases.py",
    "test_aegis_creative.png",
    "test_aegis_logo.png",
    "inspect_db.py",
    "inspect_images_content_51.py",
    "inspect_report_55.py",
    "trace_content_51.py",
    "trace_ocr_step1.py"
]
for bf in backend_core_files:
    sf = backend_src / bf
    if sf.exists():
        shutil.copy2(sf, backend_dst / bf)

# Copy API folder files for Vercel
api_src = ROOT / "api"
api_dst = EXPORT / "api"
if api_src.exists():
    for f in api_src.iterdir():
        if f.is_file():
            shutil.copy2(f, api_dst / f.name)

# Create clean upload directory tree with .gitkeep
upload_dirs = [
    "csv",
    "evidence",
    "guidelines",
    "images",
    "logos/originals",
    "logos/rasters",
    "reports"
]
for ud in upload_dirs:
    p = backend_dst / "uploads" / ud
    p.mkdir(parents=True, exist_ok=True)
    gitkeep = p / ".gitkeep"
    gitkeep.write_text("# Placeholder to preserve directory structure in Git\n", encoding="utf-8")

# Copy requirements.txt directly from root to preserve exact bytes & hashes
req_content = (ROOT / "requirements.txt").read_bytes()
(backend_dst / "requirements.txt").write_bytes(req_content)
(EXPORT / "requirements.txt").write_bytes(req_content)
(api_dst / "requirements.txt").write_bytes(req_content)

# 4. Copy Frontend Code
frontend_src = ROOT / "frontend"
frontend_dst = EXPORT / "frontend"

frontend_subdirs = ["src", "public", "dist"]
for sub in frontend_subdirs:
    s_dir = frontend_src / sub
    d_dir = frontend_dst / sub
    if s_dir.exists():
        shutil.copytree(s_dir, d_dir, ignore=shutil.ignore_patterns("node_modules", "*.log", ".DS_Store"))

frontend_root_files = [
    "package.json",
    "package-lock.json",
    "index.html",
    "vite.config.ts",
    "tailwind.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    ".oxlintrc.json",
    ".gitignore",
    "README.md"
]
for ff in frontend_root_files:
    sf = frontend_src / ff
    if sf.exists():
        shutil.copy2(sf, frontend_dst / ff)

# 5. Copy Configuration & Vercel Files
root_files_to_copy = [
    "main.py",
    "package.json",
    "vercel.json",
    "pyproject.toml",
    ".vercelignore",
    "README.md",
    ".env.example",
    ".gitignore",
    "requirements.txt"
]
for rf in root_files_to_copy:
    src_f = ROOT / rf
    if src_f.exists():
        shutil.copy2(src_f, EXPORT / rf)

# Copy dist to export root as well for immediate static hosting
dist_src = ROOT / "dist"
if dist_src.exists():
    dist_dst = EXPORT / "dist"
    if dist_dst.exists():
        shutil.rmtree(dist_dst)
    shutil.copytree(dist_src, dist_dst, ignore=shutil.ignore_patterns("*.log"))

# 6. Clean all __pycache__ and bytecode in export
for root, dirs, files in os.walk(EXPORT, topdown=False):
    for d in dirs:
        if d == '__pycache__':
            shutil.rmtree(Path(root) / d)
    for f in files:
        if f.endswith('.pyc') or f.endswith('.pyo'):
            (Path(root) / f).unlink()

print("Files staged successfully in export folder.")

# 7. Create BrandGuard-AI-Final.zip
if ZIP_PATH.exists():
    ZIP_PATH.unlink()

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(EXPORT):
        for file in files:
            file_path = Path(root) / file
            archive_name = file_path.relative_to(EXPORT.parent)
            zipf.write(file_path, archive_name)

print(f"Successfully created {ZIP_PATH}")
print(f"Zip file size: {ZIP_PATH.stat().st_size / 1024:.1f} KB")
