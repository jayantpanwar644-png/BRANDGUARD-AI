import hashlib
import os
from pathlib import Path

ROOT = Path(r"c:\Users\hp\Downloads\BRANDGUID AI")
EXPORT = ROOT / "BrandGuard-AI-Final"

def hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

# Collect original source files (excluding scratch, node_modules, __pycache__, db, exports, zip)
ignored_dirs = {"scratch", "node_modules", "__pycache__", "BrandGuard-AI-Final", ".git"}
ignored_files = {"brandguard.db", "BrandGuard-AI-Final.zip"}
ignored_extensions = {".pyc", ".pyo", ".log"}

orig_files = {}
for root, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".venv")]
    for file in files:
        if file in ignored_files or any(file.endswith(ext) for ext in ignored_extensions):
            continue
        p = Path(root) / file
        rel = p.relative_to(ROOT)
        # Skip files inside backend/uploads (except .gitkeep)
        rel_str = str(rel).replace("\\", "/")
        if "backend/uploads/" in rel_str and not rel_str.endswith(".gitkeep"):
            continue
        orig_files[rel_str] = hash_file(p)

export_files = {}
for root, dirs, files in os.walk(EXPORT):
    dirs[:] = [d for d in dirs if d not in ignored_dirs]
    for file in files:
        if any(file.endswith(ext) for ext in ignored_extensions):
            continue
        p = Path(root) / file
        rel = p.relative_to(EXPORT)
        rel_str = str(rel).replace("\\", "/")
        export_files[rel_str] = hash_file(p)

print(f"Total Original Tracked Files: {len(orig_files)}")
print(f"Total Exported Files: {len(export_files)}")

# Check missing in export
missing_in_export = []
for k in orig_files:
    if k not in export_files:
        missing_in_export.append(k)

# Check content difference
differing_files = []
for k in orig_files:
    if k in export_files and orig_files[k] != export_files[k]:
        differing_files.append(k)

print(f"\nMissing in export count: {len(missing_in_export)}")
for m in missing_in_export:
    print(f"  MISSING: {m}")

print(f"\nDiffering files count: {len(differing_files)}")
for d in differing_files:
    print(f"  DIFFERING: {d}")

extra_in_export = [k for k in export_files if k not in orig_files]
print(f"\nAdditional clean export files (e.g. .gitkeeps): {len(extra_in_export)}")
for e in extra_in_export:
    print(f"  EXPORT SPECIFIC: {e}")

print("\n--- MANIFEST AUDIT COMPLETE ---")
