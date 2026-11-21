import io
import re
import os
import zipfile
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from PIL import Image

try:
    import resvg_py
    HAS_RESVG = True
except ImportError:
    HAS_RESVG = False

try:
    from pypdf import PdfReader
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

from backend.core.config import settings

# Supported format categorizations
IMAGE_FORMATS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.tif'}
VECTOR_FORMATS = {'.svg'}
DOCUMENT_FORMATS = {'.pdf', '.docx', '.pptx'}
ALL_SUPPORTED_FORMATS = IMAGE_FORMATS | VECTOR_FORMATS | DOCUMENT_FORMATS

VARIATION_TYPES = [
    "Primary Logo",
    "Secondary Logo",
    "Icon-Only Logo",
    "Light-Background Logo",
    "Dark-Background Logo"
]

def sanitize_svg(svg_content: str) -> str:
    """
    Remove potentially malicious elements (<script>, event handlers, foreignObject, external references)
    from SVG strings to ensure complete security.
    """
    # Remove script tags
    sanitized = re.sub(r'<\s*script[^>]*>.*?<\s*/\s*script\s*>', '', svg_content, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<\s*script[^>]*/>', '', sanitized, flags=re.IGNORECASE)
    
    # Remove inline JavaScript event handlers (onload, onclick, onerror, etc.)
    sanitized = re.sub(r'\bon[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', '', sanitized, flags=re.IGNORECASE)
    
    # Remove javascript: pseudo-protocols in href/xlink:href/src
    sanitized = re.sub(r'(href|xlink:href|src)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\'|javascript:[^\s>]+)', '', sanitized, flags=re.IGNORECASE)
    
    # Remove <!ENTITY and <!DOCTYPE external entities
    sanitized = re.sub(r'<!DOCTYPE[^>]*\[.*?\]>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<!ENTITY[^>]*>', '', sanitized, flags=re.IGNORECASE)
    
    # Remove foreignObject which can contain arbitrary HTML
    sanitized = re.sub(r'<\s*foreignObject[^>]*>.*?<\s*/\s*foreignObject\s*>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    
    return sanitized.strip()

def analyze_image_characteristics(img: Image.Image) -> Dict[str, Any]:
    """Inspect transparency, dominant luminance, and resolution to guide variation suitability."""
    width, height = img.size
    has_alpha = False
    is_mostly_light = False
    
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        has_alpha = True
        alpha = img.convert('RGBA').split()[-1]
        # check if alpha actually has non-opaque pixels
        min_alpha, max_alpha = alpha.getextrema()
        has_alpha = min_alpha < 250
    
    # Calculate average luminance from RGB conversion
    rgb_img = img.convert('RGB')
    stat_img = rgb_img.resize((50, 50), Image.Resampling.BOX)
    pixels = list(stat_img.getdata())
    total_lum = sum(0.299 * r + 0.587 * g + 0.114 * b for r, g, b in pixels)
    avg_lum = total_lum / len(pixels) if pixels else 128
    
    # Luminance > 160 indicates a bright/white logo best suited for dark backgrounds
    # Luminance < 95 indicates a dark logo best suited for light backgrounds
    recommended_variant = "Primary Logo"
    if avg_lum > 175:
        recommended_variant = "Dark-Background Logo"
    elif avg_lum < 80:
        recommended_variant = "Light-Background Logo"
    
    aspect_ratio = width / max(1, height)
    if 0.85 <= aspect_ratio <= 1.15:
        # Near square suggests an icon-only or badge variant
        is_icon_proportions = True
    else:
        is_icon_proportions = False

    return {
        "width": width,
        "height": height,
        "aspect_ratio": round(aspect_ratio, 2),
        "has_transparency": has_alpha,
        "average_luminance": round(avg_lum, 1),
        "recommended_variant": recommended_variant,
        "is_icon_proportions": is_icon_proportions,
        "is_low_res": width < 80 or height < 80
    }

class LogoProcessor:
    """
    Handles robust extraction, conversion, sanitization, candidate discovery, and rasterization
    across PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, PDF, DOCX, and PPTX.
    """

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.logos_dir = self.upload_dir / "logos"
        self.originals_dir = self.logos_dir / "originals"
        self.rasters_dir = self.logos_dir / "rasters"
        self.candidates_dir = self.logos_dir / "candidates"

        self.logos_dir.mkdir(parents=True, exist_ok=True)
        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.rasters_dir.mkdir(parents=True, exist_ok=True)
        self.candidates_dir.mkdir(parents=True, exist_ok=True)

    def validate_file_format(self, filename: str) -> Tuple[bool, str, str]:
        """Validate extension and determine category."""
        ext = Path(filename).suffix.lower()
        if ext in {'.eps', '.ai', '.psd'}:
            return False, ext, (
                f"Direct conversion for vector '{ext}' requires GhostScript runtime. "
                "Please export and upload as SVG, high-resolution PNG, or embedded PDF."
            )
        
        if ext not in ALL_SUPPORTED_FORMATS:
            allowed_list = ", ".join(sorted(ALL_SUPPORTED_FORMATS))
            return False, ext, f"Unsupported format '{ext}'. Supported formats: {allowed_list}."

        if ext in DOCUMENT_FORMATS:
            category = "document"
        elif ext in VECTOR_FORMATS:
            category = "vector"
        else:
            category = "image"

        return True, ext, category

    def process_direct_image(
        self,
        file_bytes: bytes,
        original_filename: str,
        org_id: int
    ) -> Dict[str, Any]:
        """
        Process standard image or SVG:
        - Sanitizes SVG and rasterizes to PNG via resvg-py.
        - Extracts static frame 0 for GIF.
        - Converts BMP/TIFF to clean RGBA PNG.
        - Saves original and raster assets.
        """
        ext = Path(original_filename).suffix.lower()
        timestamp = int(datetime.now(timezone.utc).timestamp())
        clean_basename = Path(original_filename).stem.replace(" ", "_")
        
        orig_filename = f"orig_{org_id}_{timestamp}_{clean_basename}{ext}"
        orig_file_dest = self.originals_dir / orig_filename
        with open(orig_file_dest, "wb") as f:
            f.write(file_bytes)

        raster_filename = f"raster_{org_id}_{timestamp}_{clean_basename}.png"
        raster_file_dest = self.rasters_dir / raster_filename

        if ext == '.svg':
            # 1. Sanitize SVG
            svg_text = file_bytes.decode('utf-8', errors='ignore')
            safe_svg = sanitize_svg(svg_text)
            
            # Save sanitized version in original destination
            with open(orig_file_dest, "w", encoding="utf-8") as f:
                f.write(safe_svg)

            # 2. Convert to high-resolution PNG using resvg-py
            if HAS_RESVG:
                png_bytes = resvg_py.svg_to_bytes(safe_svg)
                with open(raster_file_dest, "wb") as f:
                    f.write(png_bytes)
                pil_img = Image.open(io.BytesIO(png_bytes))
            else:
                # Fallback simple raster
                pil_img = Image.new("RGBA", (400, 200), (255, 255, 255, 0))
                pil_img.save(raster_file_dest, format="PNG")
        else:
            # Raster image (PNG, JPG, WEBP, GIF, BMP, TIFF)
            pil_img = Image.open(io.BytesIO(file_bytes))
            
            # If animated GIF, extract the first static frame
            if ext == '.gif':
                try:
                    pil_img.seek(0)
                except Exception:
                    pass
            
            # Convert to RGBA for consistent web preview and analysis
            if pil_img.mode != 'RGBA':
                converted_img = pil_img.convert('RGBA')
            else:
                converted_img = pil_img

            converted_img.save(raster_file_dest, format="PNG")
            pil_img = converted_img

        characteristics = analyze_image_characteristics(pil_img)

        return {
            "status": "ready",
            "file_name": original_filename,
            "original_path": f"/uploads/logos/originals/{orig_filename}",
            "raster_path": f"/uploads/logos/rasters/{raster_filename}",
            "local_original_dest": str(orig_file_dest),
            "local_raster_dest": str(raster_file_dest),
            "source_format": ext.replace('.', '').upper(),
            "file_size": len(file_bytes),
            "characteristics": characteristics,
            "candidates": []
        }

    def extract_candidates_from_document(
        self,
        file_bytes: bytes,
        original_filename: str,
        org_id: int
    ) -> Dict[str, Any]:
        """
        Extract embedded logo candidates from PDF, DOCX, or PPTX.
        Returns list of candidate images for user selection.
        """
        ext = Path(original_filename).suffix.lower()
        timestamp = int(datetime.now(timezone.utc).timestamp())
        clean_basename = Path(original_filename).stem.replace(" ", "_")

        # Save original document
        orig_filename = f"doc_{org_id}_{timestamp}_{clean_basename}{ext}"
        orig_file_dest = self.originals_dir / orig_filename
        with open(orig_file_dest, "wb") as f:
            f.write(file_bytes)

        candidates = []

        if ext == '.pdf' and HAS_PYPDF:
            reader = PdfReader(io.BytesIO(file_bytes))
            cand_idx = 0
            for page_num, page in enumerate(reader.pages):
                for img_idx, img_obj in enumerate(page.images):
                    try:
                        cand_bytes = img_obj.data
                        cand_pil = Image.open(io.BytesIO(cand_bytes))
                        w, h = cand_pil.size
                        
                        # Filter out tiny tracking pixels or horizontal line artifacts
                        if w < 24 or h < 24:
                            continue

                        cand_filename = f"cand_{org_id}_{timestamp}_p{page_num+1}_i{cand_idx}_{img_obj.name.replace(' ', '_')}.png"
                        cand_dest = self.candidates_dir / cand_filename
                        cand_pil.convert('RGBA').save(cand_dest, format="PNG")

                        chars = analyze_image_characteristics(cand_pil)
                        candidates.append({
                            "candidate_id": f"p{page_num+1}_img{cand_idx}",
                            "source_name": img_obj.name,
                            "page_or_slide": f"Page {page_num + 1}",
                            "preview_url": f"/uploads/logos/candidates/{cand_filename}",
                            "local_dest": str(cand_dest),
                            "format": cand_pil.format or "PNG",
                            "width": w,
                            "height": h,
                            "file_size": len(cand_bytes),
                            "characteristics": chars
                        })
                        cand_idx += 1
                    except Exception as err:
                        print(f"Skipping PDF image candidate due to: {err}")

        elif ext in ('.docx', '.pptx'):
            # OpenXML documents store images in word/media or ppt/media
            media_prefix = 'word/media/' if ext == '.docx' else 'ppt/media/'
            slide_doc_label = 'Doc Section' if ext == '.docx' else 'Slide'
            cand_idx = 0

            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                for zinfo in z.infolist():
                    if zinfo.filename.startswith(media_prefix) and not zinfo.is_dir():
                        cand_data = z.read(zinfo.filename)
                        try:
                            cand_pil = Image.open(io.BytesIO(cand_data))
                            w, h = cand_pil.size
                            if w < 24 or h < 24:
                                continue

                            cand_clean = Path(zinfo.filename).name
                            cand_filename = f"cand_{org_id}_{timestamp}_{cand_idx}_{cand_clean}.png"
                            cand_dest = self.candidates_dir / cand_filename
                            cand_pil.convert('RGBA').save(cand_dest, format="PNG")

                            chars = analyze_image_characteristics(cand_pil)
                            candidates.append({
                                "candidate_id": f"media_{cand_idx}",
                                "source_name": cand_clean,
                                "page_or_slide": f"{slide_doc_label} Asset #{cand_idx + 1}",
                                "preview_url": f"/uploads/logos/candidates/{cand_filename}",
                                "local_dest": str(cand_dest),
                                "format": cand_pil.format or "PNG",
                                "width": w,
                                "height": h,
                                "file_size": len(cand_data),
                                "characteristics": chars
                            })
                            cand_idx += 1
                        except Exception as err:
                            print(f"Skipping OpenXML media file: {err}")

        return {
            "status": "candidates_found" if candidates else "no_embedded_images",
            "file_name": original_filename,
            "original_path": f"/uploads/logos/originals/{orig_filename}",
            "local_original_dest": str(orig_file_dest),
            "source_format": ext.replace('.', '').upper(),
            "file_size": len(file_bytes),
            "candidates": candidates
        }

    def confirm_logo_candidate(
        self,
        candidate_preview_url: str,
        original_filename: str,
        org_id: int
    ) -> Dict[str, Any]:
        """Promote an extracted document candidate to an official raster logo asset."""
        cand_name = Path(candidate_preview_url).name
        src_path = self.candidates_dir / cand_name
        if not src_path.exists():
            raise FileNotFoundError("Selected logo candidate not found.")

        timestamp = int(datetime.now(timezone.utc).timestamp())
        raster_filename = f"raster_{org_id}_{timestamp}_from_doc.png"
        raster_file_dest = self.rasters_dir / raster_filename
        
        shutil.copyfile(src_path, raster_file_dest)

        pil_img = Image.open(raster_file_dest)
        chars = analyze_image_characteristics(pil_img)

        return {
            "status": "ready",
            "file_name": f"{Path(original_filename).stem}_extracted_logo.png",
            "raster_path": f"/uploads/logos/rasters/{raster_filename}",
            "local_raster_dest": str(raster_file_dest),
            "characteristics": chars
        }

    def crop_logo_region(
        self,
        raster_url: str,
        crop_box: Dict[str, float],
        org_id: int
    ) -> Dict[str, Any]:
        """
        Crop an existing raster or candidate image using normalized coordinates (0..100) or pixels.
        Returns new cropped raster asset.
        """
        filename = Path(raster_url).name
        # Look in rasters or candidates directory
        source_path = self.rasters_dir / filename
        if not source_path.exists():
            source_path = self.candidates_dir / filename
        if not source_path.exists():
            raise FileNotFoundError("Source image for cropping not found.")

        img = Image.open(source_path)
        img_w, img_h = img.size

        # Support normalized percentages (0-100) or pixel coordinates
        x = crop_box.get('x', 0)
        y = crop_box.get('y', 0)
        w = crop_box.get('width', img_w)
        h = crop_box.get('height', img_h)

        if crop_box.get('is_percentage', False) or (x <= 100 and y <= 100 and w <= 100 and h <= 100):
            left = int((x / 100.0) * img_w)
            top = int((y / 100.0) * img_h)
            right = int(((x + w) / 100.0) * img_w)
            bottom = int(((y + h) / 100.0) * img_h)
        else:
            left = int(x)
            top = int(y)
            right = int(x + w)
            bottom = int(y + h)

        # Clamp boundaries
        left = max(0, min(img_w - 1, left))
        top = max(0, min(img_h - 1, top))
        right = max(left + 1, min(img_w, right))
        bottom = max(top + 1, min(img_h, bottom))

        cropped = img.crop((left, top, right, bottom))

        timestamp = int(datetime.now(timezone.utc).timestamp())
        cropped_filename = f"raster_{org_id}_{timestamp}_cropped.png"
        dest_path = self.rasters_dir / cropped_filename
        cropped.convert('RGBA').save(dest_path, format="PNG")

        chars = analyze_image_characteristics(cropped)

        return {
            "status": "ready",
            "file_name": f"cropped_logo_{timestamp}.png",
            "raster_path": f"/uploads/logos/rasters/{cropped_filename}",
            "local_raster_dest": str(dest_path),
            "characteristics": chars
        }

logo_processor = LogoProcessor()
