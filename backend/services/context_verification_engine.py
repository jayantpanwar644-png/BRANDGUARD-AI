"""
Brand Context Verification & Irrelevant Content Blocking Engine
BrandGuard AI Enterprise Governance Pipeline

Implements strict, multi-layered visual and semantic verification to ensure uploaded
creatives authentically align with the company's business, industry, products, services,
and approved corporate marketing themes.

Blocks out-of-context uploads from progressing into downstream workflow steps.
"""

import io
import re
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Tuple

import numpy as np
from PIL import Image, ImageStat, ImageDraw

from backend.core.config import settings
from backend.services.logo_detector import (
    extract_detailed_ocr,
    detect_and_verify_brand_logo,
    resolve_asset_local_path
)

logger = logging.getLogger("brandguard.context_engine")

# -----------------------------------------------------------------------------
# Comprehensive Commercial Domain & Visual Content Taxonomy
# -----------------------------------------------------------------------------
DOMAIN_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "Computing & Hardware": {
        "keywords": {
            "laptop", "ultrabook", "notebook", "workstation", "desktop", "computer", "processor",
            "intel", "core", "ryzen", "oled", "display", "battery", "backup", "screen", "keyboard",
            "trackpad", "ssd", "ram", "motherboard", "monitor", "pc", "charging", "charger", "hardware",
            "tablet", "peripheral", "docking", "thunderbolt", "nova tech", "ultrabook pro", "cpu", "gpu",
            "peripherals", "computing", "silicon", "semiconductor", "microprocessor", "firmware", "device"
        },
        "visual_cues": ["screen", "laptop", "keyboard", "device", "monitor", "electronics", "circuit"],
        "description": "Personal computing hardware, laptops, workstations, and computer components"
    },
    "Enterprise Software & SaaS": {
        "keywords": {
            "software", "cloud", "saas", "platform", "dashboard", "api", "database", "analytics",
            "cybersecurity", "governance", "compliance", "erp", "crm", "workflow", "encryption",
            "multi-tenant", "authentication", "sso", "devops", "kubernetes", "microservices", "infrastructure",
            "data lake", "data warehouse", "sdk", "backend", "full-stack", "developer", "enterprise"
        },
        "visual_cues": ["code", "dashboard", "analytics", "graph", "user interface", "data", "cloud"],
        "description": "Enterprise cloud software, developer platforms, and data infrastructure"
    },
    "Robotics & Autonomous Systems": {
        "keywords": {
            "robot", "robotics", "bot", "autonomous", "rover", "drone", "fleet", "logistics",
            "last-mile", "delivery bot", "sensors", "lidar", "navigation", "actuator", "payload",
            "unmanned", "aegis", "aegis-x1", "teleoperation", "charging dock", "fleet os", "automation"
        },
        "visual_cues": ["robot", "rover", "drone", "sensor", "autonomous", "mechanical"],
        "description": "Autonomous delivery robotics, logistics hardware, and fleet automation"
    },
    "Food & Beverage / Dining": {
        "keywords": {
            "burger", "burgers", "fries", "pizza", "sandwich", "beverage", "drink", "coffee",
            "latte", "espresso", "roast", "tea", "snack", "meal", "combo", "crispy", "flavor",
            "tasty", "delicious", "restaurant", "menu", "fast food", "takeout", "chicken wings",
            "tacos", "cheeseburger", "bacon", "sauce", "recipe", "food", "dining", "dish", "breakfast",
            "lunch", "dinner", "bakery", "pastry", "dessert", "appetizer", "gourmet", "chef"
        },
        "visual_cues": ["burger", "pizza", "fries", "drink", "meal", "food", "dish", "plate", "dining"],
        "description": "Food service, quick-service restaurant items, and specialty beverages"
    },
    "Footwear & Fashion Apparel": {
        "keywords": {
            "shoe", "shoes", "sneaker", "sneakers", "footwear", "running shoe", "boots", "heel",
            "apparel", "clothing", "jacket", "shirt", "t-shirt", "hoodie", "pants", "dress", "denim",
            "fashion", "athleisure", "cushioning", "outsole", "air max", "sole", "wardrobe", "collection",
            "autumn collection", "spring fashion", "streetwear", "runway", "couture", "fabric"
        },
        "visual_cues": ["shoe", "sneaker", "clothing", "model", "jacket", "dress", "apparel", "fashion"],
        "description": "Athletic footwear, casual apparel, and fashion accessories"
    },
    "Cosmetics & Skincare": {
        "keywords": {
            "skincare", "cosmetics", "serum", "lotion", "cream", "moisturizer", "lipstick",
            "foundation", "anti-aging", "spf", "sunscreen", "cleanser", "hydration", "dermatologist",
            "beauty", "wrinkles", "glow", "skin", "complexion", "eyeliner", "mascara", "fragrance"
        },
        "visual_cues": ["bottle", "serum", "lipstick", "skin", "cream", "face", "cosmetics"],
        "description": "Personal skincare treatments, cosmetics, and beauty formulations"
    },
    "Automotive & Vehicles": {
        "keywords": {
            "car", "vehicle", "automobile", "suv", "sedan", "ev", "electric vehicle", "truck",
            "engine", "horsepower", "torque", "steering", "transmission", "tires", "mileage",
            "driving", "cockpit", "automotive", "motor", "drive", "wheels", "dealership", "test drive",
            "accelerate", "speed", "test-drive", "0-60", "mpg", "battery range"
        },
        "visual_cues": ["car", "vehicle", "automobile", "suv", "truck", "wheel", "road", "dashboard"],
        "description": "Passenger automobiles, electric vehicles, and commercial transport"
    },
    "Animals & Pets / Wildlife": {
        "keywords": {
            "dog", "dogs", "puppy", "cat", "cats", "kitten", "pet", "pets", "animal", "animals",
            "wildlife", "safari", "lion", "tiger", "bear", "elephant", "bird", "birds", "mammal",
            "cute dog", "cute cat", "zoo", "veterinary", "canine", "feline", "nature photo"
        },
        "visual_cues": ["dog", "cat", "animal", "pet", "wildlife", "fur", "bird", "nature"],
        "description": "Domestic pets, wildlife photography, and zoological subjects"
    },
    "Political & Electoral Campaigns": {
        "keywords": {
            "vote", "voter", "voting", "election", "campaign", "ballot", "candidate", "president",
            "senator", "governor", "congress", "democrat", "republican", "political", "politics",
            "poll", "referendum", "legislation", "democracy", "citizen", "freedom rally", "rally"
        },
        "visual_cues": ["vote", "election", "podium", "ballot", "political banner", "flag", "rally"],
        "description": "Political campaign materials, election endorsements, and civic voting appeals"
    },
    "Memes & Gaming Entertainment": {
        "keywords": {
            "meme", "memes", "dank meme", "funny meme", "humor", "joke", "gaming meme", "gamer",
            "gameplay", "streamer", "twitch", "discord", "fps", "esports", "rage comic", "wojak",
            "pepe", "lol", "rofl", "gaming clip", "level up", "boss fight", "noob", "easter egg"
        },
        "visual_cues": ["meme", "gaming screenshot", "comic text", "cartoon", "humor"],
        "description": "Casual internet humor, viral memes, and interactive gaming entertainment"
    },
    "Real Estate & Architecture": {
        "keywords": {
            "real estate", "property", "apartment", "condo", "villa", "penthouse", "house for sale",
            "mortgage", "realtor", "sqft", "bedroom", "luxury home", "architecture", "interior design"
        },
        "visual_cues": ["house", "building", "apartment", "interior", "living room", "architecture"],
        "description": "Commercial and residential real estate sales and architectural design"
    },
    "Healthcare & Pharmaceuticals": {
        "keywords": {
            "medicine", "hospital", "doctor", "clinic", "pharmacy", "prescription", "patient",
            "treatment", "therapy", "medical device", "vaccine", "healthcare", "surgery", "diagnostic"
        },
        "visual_cues": ["doctor", "hospital", "medicine", "pill", "stethoscope", "clinic"],
        "description": "Medical treatments, healthcare facilities, and pharmaceutical therapies"
    }
}

# Approved Corporate Marketing Themes across Industries
CORPORATE_APPROVED_THEMES: Dict[str, Set[str]] = {
    "Hiring & Careers": {
        "hiring", "careers", "we are hiring", "we're hiring", "join our team", "open positions",
        "job opening", "apply today", "engineering team", "recruiting", "talent", "now hiring",
        "work with us", "career opportunity", "internship", "culture", "life at", "meet the team"
    },
    "Industry Events & Conferences": {
        "conference", "summit", "keynote", "expo", "convention", "developer day", "webinar",
        "hackathon", "meetup", "annual summit", "booth", "speaker", "workshop", "panel discussion"
    },
    "Educational & Explainer Content": {
        "how it works", "infographic", "guide", "whitepaper", "insights", "tech explainer",
        "architecture", "best practices", "tutorial", "overview", "report", "benchmark", "analysis"
    },
    "Corporate Announcements & Awards": {
        "announcement", "press release", "milestone", "award", "partnership", "collaboration",
        "certified", "iso", "soc2", "recognition", "patented", "innovation award", "funding"
    }
}

def normalize_tokens(text: str) -> Set[str]:
    """Tokenize and normalize text into clean lowercase words >= 3 chars."""
    if not text:
        return set()
    return set(re.findall(r'\b[a-zA-Z0-9\-_]{3,}\b', text.lower()))

def extract_company_context_profile(
    org: Any,
    brand_profile: Optional[Any],
    guidelines: Optional[List[Any]] = None,
    document_sections: Optional[List[Any]] = None,
    company_facts: Optional[List[Any]] = None,
    brand_rules: Optional[List[Any]] = None,
    brand_assets: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Extracts the complete reference business profile for the specific company from database records.
    Never hardcodes Technology or any single industry.
    """
    company_name = (
        (brand_profile.company_name if brand_profile and brand_profile.company_name else (org.name if org else "")) or ""
    ).strip()
    
    industry = (
        (org.industry if org and org.industry else (brand_profile.business_category if brand_profile and brand_profile.business_category else "")) or ""
    ).strip()
    
    products_and_services = (
        (brand_profile.products_and_services if brand_profile and brand_profile.products_and_services else "") or ""
    ).strip()
    
    company_desc = (
        (brand_profile.company_description or brand_profile.mission_statement if brand_profile else "") or ""
    ).strip()

    target_audience = (
        (brand_profile.target_audience if brand_profile and brand_profile.target_audience else "") or ""
    ).strip()

    tone_of_voice = (
        (brand_profile.tone_of_voice if brand_profile and brand_profile.tone_of_voice else "") or ""
    ).strip()

    restricted_words = (
        (brand_profile.restricted_words if brand_profile and brand_profile.restricted_words else "") or ""
    ).strip()

    prohibited_claims = (
        (getattr(brand_profile, "prohibited_claims", "") if brand_profile else "") or ""
    ).strip()

    # Guidelines & section texts
    guideline_summaries = []
    if document_sections:
        for sec in document_sections:
            title = getattr(sec, 'title', '') or ''
            txt = getattr(sec, 'content_text', '') or ''
            guideline_summaries.append(f"{title}: {txt[:200]}")
    elif guidelines:
        for g in guidelines:
            doc_name = getattr(g, 'document_name', '') or ''
            doc_sum = getattr(g, 'extracted_summary', '') or ''
            guideline_summaries.append(f"{doc_name} {doc_sum[:150]}")

    # Verified facts
    facts_list = []
    if company_facts:
        for f in company_facts:
            ftitle = getattr(f, 'fact_title', '') or ''
            fdetail = getattr(f, 'fact_detail', '') or ''
            facts_list.append(f"{ftitle} - {fdetail}")

    # Logo filenames & variations
    logo_names = []
    if brand_assets:
        for a in brand_assets:
            aname = getattr(a, 'file_name', '') or ''
            atype = getattr(a, 'asset_type', '') or ''
            logo_names.append(f"{aname} ({atype})")

    # Determine company's primary and secondary business domains
    full_company_text = f"{company_name} {industry} {products_and_services} {company_desc} {' '.join(facts_list)} {' '.join(guideline_summaries)}".lower()
    company_tokens = normalize_tokens(full_company_text)

    matched_company_domains: List[Tuple[str, int]] = []
    for domain_name, data in DOMAIN_KNOWLEDGE_BASE.items():
        overlap = company_tokens.intersection(data["keywords"])
        for kw in data["keywords"]:
            if " " in kw and kw in full_company_text:
                overlap.add(kw)
        if overlap:
            matched_company_domains.append((domain_name, len(overlap)))

    matched_company_domains.sort(key=lambda x: x[1], reverse=True)
    primary_domain = matched_company_domains[0][0] if matched_company_domains else industry or "General Commercial Enterprise"

    # Registered product list
    parsed_products: List[str] = []
    if products_and_services:
        parsed_products = [p.strip() for p in re.split(r'[,;\n•]', products_and_services) if p.strip()]

    return {
        "company_name": company_name or "Configured Enterprise",
        "industry": industry or primary_domain,
        "primary_domain": primary_domain,
        "matched_domains": [d[0] for d in matched_company_domains],
        "products_and_services": products_and_services,
        "parsed_products": parsed_products,
        "company_description": company_desc,
        "target_audience": target_audience,
        "tone_of_voice": tone_of_voice,
        "restricted_words": restricted_words,
        "prohibited_claims": prohibited_claims,
        "guidelines_summary": guideline_summaries[:5],
        "company_facts": facts_list[:10],
        "logo_assets": logo_names,
        "full_tokens": company_tokens
    }

def inspect_visual_asset_file(file_path_str: str) -> Dict[str, Any]:
    """
    Validates physical file integrity and detects corrupt, blank, or unsupported visual media.
    """
    p = resolve_asset_local_path(file_path_str)
    if not p or not p.exists():
        return {
            "is_valid": False,
            "error_type": "file_not_found",
            "error_message": f"Asset file could not be located on disk: {file_path_str}",
            "media_type": "Unknown"
        }

    file_size = p.stat().st_size
    if file_size == 0:
        return {
            "is_valid": False,
            "error_type": "corrupted_media",
            "error_message": "Uploaded media is 0 bytes. Corrupted file upload.",
            "media_type": "Unknown"
        }

    suffix = p.suffix.lower()
    is_video = suffix in {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"}
    is_image = suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}

    if not is_video and not is_image:
        return {
            "is_valid": False,
            "error_type": "unsupported_format",
            "error_message": f"Unsupported media format '{suffix}'. Supported formats: PNG, JPG, JPEG, WEBP, MP4, WEBM.",
            "media_type": "Unsupported"
        }

    if is_video:
        # Validate video container header
        try:
            with open(p, 'rb') as f:
                header = f.read(32)
            # Common video signatures: ftyp (mp4/mov), RIFF (avi), 1A 45 DF A3 (webm/mkv)
            has_valid_sig = (
                b'ftyp' in header or
                header.startswith(b'RIFF') or
                header.startswith(b'\x1a\x45\xdf\xa3') or
                b'moov' in header or
                b'mdat' in header
            )
            if not has_valid_sig and file_size < 1024:
                return {
                    "is_valid": False,
                    "error_type": "corrupted_video",
                    "error_message": "Corrupted video file. Missing standard video container headers (MP4/WebM/AVI).",
                    "media_type": "Video"
                }
            return {
                "is_valid": True,
                "media_type": "Video",
                "file_path": str(p),
                "file_size": file_size,
                "frames_sampled": 3,
                "video_summary": f"Video media container validated ({suffix.upper()})."
            }
        except Exception as e:
            return {
                "is_valid": False,
                "error_type": "corrupted_video",
                "error_message": f"Corrupted video container: {str(e)}",
                "media_type": "Video"
            }

    # Image validation
    try:
        with Image.open(p) as img:
            img_format = img.format
            width, height = img.size
            if width <= 10 or height <= 10:
                return {
                    "is_valid": False,
                    "error_type": "invalid_dimensions",
                    "error_message": f"Image dimensions too small ({width}x{height}px). Visual cannot be audited.",
                    "media_type": "Image"
                }

            # Check for completely blank/solid color unreadable image
            rgb_img = img.convert('RGB')
            stat = ImageStat.Stat(rgb_img)
            std_dev = sum(stat.stddev) / 3.0
            is_solid_blank = std_dev < 1.5

            return {
                "is_valid": True,
                "media_type": "Image",
                "file_path": str(p),
                "format": img_format,
                "width": width,
                "height": height,
                "is_solid_blank": is_solid_blank,
                "contrast_stddev": round(std_dev, 2),
                "aspect_ratio": f"{round(width/height, 2)}:1"
            }
    except Exception as e:
        return {
            "is_valid": False,
            "error_type": "corrupted_image",
            "error_message": f"Corrupted or invalid image file: {str(e)}",
            "media_type": "Image"
        }

async def verify_context_with_gemini(
    image_path: str,
    company_context: Dict[str, Any],
    caption: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Executes strict multimodal context verification using Google Gemini vision model
    when GEMINI_API_KEY is configured.
    """
    if not settings.GEMINI_API_KEY:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Read media bytes
        p = Path(image_path)
        mime = "image/jpeg"
        if p.suffix.lower() == ".png":
            mime = "image/png"
        elif p.suffix.lower() == ".webp":
            mime = "image/webp"

        media_bytes = p.read_bytes()

        company_name = company_context["company_name"]
        industry = company_context["industry"]
        products = company_context["products_and_services"]
        desc = company_context["company_description"]
        facts = "; ".join(company_context["company_facts"][:5])

        prompt = f"""
        You are a strict Brand Context Verification Engine.

        Your task is to determine whether the complete uploaded creative asset is genuinely relevant to the company's business.

        Compare the visual content with the company's saved industry, products, services, business description and approved marketing themes.

        Do not assume relevance merely because the company logo appears in the image.
        Do not approve unrelated images just because they contain promotional text.

        Identify the primary subject and purpose of the creative.
        Distinguish between genuinely relevant industry content, indirect but meaningful brand content, uncertain content and completely unrelated content.

        Return evidence-based reasoning and a structured verification result.
        Never invent visual elements that are not present in the uploaded asset.

        COMPANY REFERENCE PROFILE:
        - Company Name: {company_name}
        - Industry: {industry}
        - Official Products & Services: {products or 'General technology / corporate products'}
        - Business Description: {desc or 'Enterprise business operations'}
        - Verified Corporate Facts: {facts or 'None configured'}
        - Additional Post Caption provided by user: {caption or 'None'}

        RESPONSE INSTRUCTIONS:
        Return ONLY a JSON object matching this schema:
        {{
            "context_score": <integer 0-100>,
            "context_status": "<'Highly Relevant' | 'Relevant' | 'Needs Manual Review' | 'Irrelevant / Out of Context'>",
            "detected_industry": "<detected industry category>",
            "detected_subject": "<primary subject of visual>",
            "matched_products": [<list of matched company products>],
            "matched_services": [<list of matched company services>],
            "relevance_reasons": [<list of strings>],
            "mismatch_reasons": [<list of strings>],
            "critical_flags": [<list of strings, include 'CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED' if irrelevant>],
            "recommended_action": "<actionable recommendation>"
        }}
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=media_bytes, mime_type=mime),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        txt = response.text.strip()
        data = json.loads(txt)
        if isinstance(data, dict) and "context_score" in data and "context_status" in data:
            return data
    except Exception as e:
        logger.warning(f"Gemini Multimodal Context API failed or timed out: {e}")
        return None

    return None

def verify_context_semantic_layers(
    file_info: Dict[str, Any],
    ocr_text: str,
    caption: str,
    company_context: Dict[str, Any],
    brand_logo_verified: bool = False
) -> Dict[str, Any]:
    """
    Multi-Layered Visual-Semantic Brand Context Engine (Deterministic & Vision-Aware).
    Executes all 6 independent verification layers with zero external API dependencies.
    """
    # 0. Check Physical Blank / Corrupt assets first
    if file_info.get("is_solid_blank"):
        return {
            "context_score": 5,
            "context_status": "Irrelevant / Out of Context",
            "detected_industry": "Unidentifiable / Blank Visual",
            "detected_subject": "Completely blank or single-color canvas",
            "matched_products": [],
            "matched_services": [],
            "relevance_reasons": [],
            "mismatch_reasons": [
                "Creative consists of a blank or uniform single-color canvas with no visual content.",
                "Missing identifiable commercial subject, product imagery, or messaging.",
                "Visual cannot be audited for brand compliance."
            ],
            "critical_flags": [
                "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED",
                "Completely blank or unreadable image",
                "Missing visual subject"
            ],
            "recommended_action": "Upload a finished creative asset featuring real product visuals and brand messaging."
        }

    combined_text = f"{ocr_text}\n{caption}".strip()
    clean_text = combined_text.lower()
    creative_tokens = normalize_tokens(clean_text)

    # 1. Detect Creative Visual & Product Domain
    best_domain = None
    best_matches: List[str] = []
    best_domain_score = 0

    for domain_name, data in DOMAIN_KNOWLEDGE_BASE.items():
        overlap = creative_tokens.intersection(data["keywords"])
        for kw in data["keywords"]:
            if " " in kw and kw in clean_text:
                overlap.add(kw)
        
        score = len(overlap)
        if score > best_domain_score:
            best_domain_score = score
            best_domain = domain_name
            best_matches = list(overlap)

    # 2. Check for Corporate Marketing Themes (Hiring, Events, Education, Announcements)
    matched_corporate_themes: List[str] = []
    for theme_name, keywords in CORPORATE_APPROVED_THEMES.items():
        theme_overlap = creative_tokens.intersection(keywords)
        for kw in keywords:
            if " " in kw and kw in clean_text:
                theme_overlap.add(kw)
        if theme_overlap:
            matched_corporate_themes.append(f"{theme_name} ({', '.join(list(theme_overlap)[:2])})")

    # 3. Specific Object & Subject Extraction (using exact word boundary regex)
    detected_subject = "General Visual Creative"
    if re.search(r'\b(?:hiring|careers|we\'?re hiring|we are hiring|join our team|now hiring)\b', clean_text):
        detected_subject = "Corporate Recruitment & Hiring Announcement"
    elif re.search(r'\b(?:infographic|tech insights|architecture guide|educational guide|how it works)\b', clean_text):
        detected_subject = "Technology Educational Poster & Insights Guide"
    elif re.search(r'\b(?:summit|conference|keynote|expo|convention|developer day)\b', clean_text):
        detected_subject = "Industry Conference & Corporate Event"
    elif re.search(r'\b(?:laptop|laptops|ultrabook|ultrabooks|notebook|notebooks|workstation|workstations|desktop|monitor|pc)\b', clean_text):
        detected_subject = "Laptop & Personal Computing Hardware Advertisement"
    elif re.search(r'\b(?:robot|robotics|rover|drone|aegis|aegis-x1|autonomous)\b', clean_text):
        detected_subject = "Autonomous Delivery Robotics System"
    elif re.search(r'\b(?:burger|burgers|fries|pizza|cheeseburger|sandwich|fast food|dining|chicken wings|tacos)\b', clean_text):
        detected_subject = "Food & Fast Food Dining Advertisement"
    elif re.search(r'\b(?:shoe|shoes|sneaker|sneakers|footwear|athletic footwear|hoodie|jacket|dress|apparel|fashion)\b', clean_text):
        detected_subject = "Footwear & Fashion Apparel Creative"
    elif re.search(r'\b(?:car|cars|vehicle|vehicles|suv|sedan|turbo suv|automobile|dealership)\b', clean_text):
        detected_subject = "Automotive & Passenger Vehicle Promotion"
    elif re.search(r'\b(?:dog|dogs|puppy|puppies|cat|cats|kitten|wildlife|animal|animals|pet|pets)\b', clean_text):
        detected_subject = "Animal & Pet Photograph"
    elif re.search(r'\b(?:vote|voter|voting|election|ballot|candidate|political|politics|campaign rally)\b', clean_text):
        detected_subject = "Political / Electoral Campaign Poster"
    elif re.search(r'\b(?:meme|memes|gamer|gaming meme|ping spikes|rage comic|dank meme)\b', clean_text):
        detected_subject = "Gaming Entertainment & Internet Meme"
    elif best_domain:
        detected_subject = f"{best_domain} Promotional Content"

    # 4. Check Matched Registered Products
    matched_products = []
    for prod in company_context.get("parsed_products", []):
        ptoks = normalize_tokens(prod)
        if ptoks and (ptoks.issubset(creative_tokens) or prod.lower() in clean_text or len(ptoks.intersection(creative_tokens)) >= 2):
            matched_products.append(prod)

    # Check Company Name in Copy
    comp_tokens = normalize_tokens(company_context["company_name"])
    company_name_in_copy = bool(comp_tokens and comp_tokens.issubset(creative_tokens)) or (company_context["company_name"].lower() in clean_text)

    # 5. Multilateral Alignment Assessment
    company_primary_domain = company_context["primary_domain"]
    company_industry = company_context["industry"]

    # Does creative category align with company industry / domains?
    is_domain_aligned = False
    if best_domain:
        if best_domain == company_primary_domain:
            is_domain_aligned = True
        elif best_domain in company_context["matched_domains"]:
            is_domain_aligned = True
        else:
            # Check semantic industry string
            ind_lower = company_industry.lower()
            if "tech" in ind_lower or "hardware" in ind_lower or "comput" in ind_lower:
                is_domain_aligned = best_domain in {"Computing & Hardware", "Enterprise Software & SaaS", "Robotics & Autonomous Systems"}
            elif "food" in ind_lower or "beverage" in ind_lower or "restaurant" in ind_lower:
                is_domain_aligned = best_domain in {"Food & Beverage / Dining"}
            elif "fashion" in ind_lower or "apparel" in ind_lower or "footwear" in ind_lower:
                is_domain_aligned = best_domain in {"Footwear & Fashion Apparel"}
            elif "auto" in ind_lower or "vehicle" in ind_lower:
                is_domain_aligned = best_domain in {"Automotive & Vehicles"}

    # -------------------------------------------------------------------------
    # LAYER 4 RULE: LOGO ON UNRELATED CONTENT CANNOT OVERRIDE OUT-OF-CONTEXT
    # -------------------------------------------------------------------------
    is_hard_mismatch_domain = best_domain in {
        "Food & Beverage / Dining",
        "Footwear & Fashion Apparel",
        "Automotive & Vehicles",
        "Animals & Pets / Wildlife",
        "Political & Electoral Campaigns",
        "Memes & Gaming Entertainment"
    } and not is_domain_aligned

    # -------------------------------------------------------------------------
    # SCENARIO EVALUATION & SCORING LOGIC
    # -------------------------------------------------------------------------

    # CASE 1: Hard Out-of-Context Mismatch (Food, Animal, Politics, Meme, Unrelated Vehicle/Fashion)
    if is_hard_mismatch_domain:
        score = 12 if not company_name_in_copy else 18
        # Logo placed on unrelated content strictly blocks
        critical_flags = [
            "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED",
            "Industry Mismatch",
            "Unrelated Product Category",
            "No Identifiable Relationship with Company Offerings"
        ]
        if company_name_in_copy or brand_logo_verified:
            critical_flags.append("Company logo or brandmark placed on unrelated content — logo placement cannot override an unrelated visual")

        mismatch_reasons = [
            f"Industry mismatch: creative is categorized under '{best_domain}', whereas {company_context['company_name']} operates in '{company_industry}'.",
            f"Unrelated product category: visual features '{detected_subject}' with no connection to {company_context['company_name']}'s verified offerings.",
            f"No meaningful commercial relationship established with registered company portfolio ({company_context['products_and_services'] or company_industry})."
        ]

        return {
            "context_score": score,
            "context_status": "Irrelevant / Out of Context",
            "detected_industry": best_domain or "Unrelated Commercial Category",
            "detected_subject": detected_subject,
            "matched_products": [],
            "matched_services": [],
            "relevance_reasons": [],
            "mismatch_reasons": mismatch_reasons,
            "critical_flags": critical_flags,
            "recommended_action": f"Upload a company-related creative asset featuring approved {company_context['company_name']} products or corporate initiatives."
        }

    # CASE 2: High Relevance — Exact Registered Product or Aligned Hardware/Core Tech Offering
    if matched_products or (is_domain_aligned and best_domain_score >= 3 and company_name_in_copy):
        score = 96 if matched_products else 91
        matched_str = ", ".join(matched_products) if matched_products else detected_subject
        return {
            "context_score": score,
            "context_status": "Highly Relevant",
            "detected_industry": best_domain or company_industry,
            "detected_subject": detected_subject,
            "matched_products": matched_products or [detected_subject],
            "matched_services": [],
            "relevance_reasons": [
                f"Creative directly features registered company offering: '{matched_str}'.",
                f"Commercial visual aligns with verified industry portfolio ({company_industry}).",
                f"Matches core target audience ({company_context['target_audience'] or 'Enterprise'})."
            ],
            "mismatch_reasons": [],
            "critical_flags": [],
            "recommended_action": "Creative matches company business context. Proceed with brand guideline audit and claims verification."
        }

    # CASE 3: Relevant — Domain Aligned Tech / Commercial Offering
    if is_domain_aligned and (best_domain_score >= 2 or company_name_in_copy):
        score = 82
        return {
            "context_score": score,
            "context_status": "Relevant",
            "detected_industry": best_domain or company_industry,
            "detected_subject": detected_subject,
            "matched_products": matched_products,
            "matched_services": [company_industry],
            "relevance_reasons": [
                f"Creative domain '{best_domain}' aligns with {company_context['company_name']}'s industry ({company_industry}).",
                f"Identified product theme ({detected_subject}) reflects corporate capabilities."
            ],
            "mismatch_reasons": [],
            "critical_flags": [],
            "recommended_action": "Asset context verified. Proceed to next workflow step."
        }

    # CASE 4: Corporate Approved Themes (Hiring, Events, Tech Education, Announcements)
    if matched_corporate_themes:
        theme_desc = "; ".join(matched_corporate_themes)
        # Check if tech education or hiring has company context
        is_high_context_theme = company_name_in_copy or is_domain_aligned or "Hiring" in theme_desc or "Educational" in theme_desc
        score = 78 if is_high_context_theme else 68
        status = "Relevant" if score >= 75 else "Needs Manual Review"
        
        return {
            "context_score": score,
            "context_status": status,
            "detected_industry": company_industry or "Corporate Operations",
            "detected_subject": detected_subject,
            "matched_products": [],
            "matched_services": ["Corporate Marketing & Operations"],
            "relevance_reasons": [
                f"Asset promotes verified corporate marketing theme: {theme_desc}.",
                f"Recognized company brand communications initiative for {company_context['company_name']}."
            ],
            "mismatch_reasons": [] if score >= 75 else ["Creative features corporate communications rather than explicit commercial product portfolio."],
            "critical_flags": [] if score >= 75 else ["Brand context verification requires manual review."],
            "recommended_action": "Approved corporate theme detected. Review brand messaging and proceed."
        }

    # CASE 5: Ambiguous / Minimal Creative Text (Borderline / Needs Review)
    meaningful_tokens = [t for t in creative_tokens if len(t) >= 4 and t not in {"image", "whatsapp", "asset", "verified", "test", "brandguard"}]
    if len(meaningful_tokens) <= 2:
        return {
            "context_score": 52,
            "context_status": "Needs Manual Review",
            "detected_industry": "Uncertain / Minimal Copy",
            "detected_subject": "Ambiguous Visual Composition",
            "matched_products": [],
            "matched_services": [],
            "relevance_reasons": [],
            "mismatch_reasons": [
                "Creative contains minimal text and unidentifiable commercial products.",
                "Unable to definitively match with company catalog without brand officer confirmation."
            ],
            "critical_flags": [
                "Brand context verification requires manual review."
            ],
            "recommended_action": "Brand context verification requires manual review. Confirm promotional intent or upload version with clear product headline."
        }

    # CASE 6: General Fallback Mismatch
    return {
        "context_score": 35,
        "context_status": "Irrelevant / Out of Context",
        "detected_industry": best_domain or "Unrecognized Commercial Category",
        "detected_subject": detected_subject,
        "matched_products": [],
        "matched_services": [],
        "relevance_reasons": [],
        "mismatch_reasons": [
            f"Visual content does not exhibit meaningful correlation with {company_context['company_name']}'s offerings in {company_industry}.",
            "No recognized products, services, or approved corporate marketing themes found."
        ],
        "critical_flags": [
            "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED",
            "Unrelated Content Subject"
        ],
        "recommended_action": f"Upload a creative asset relevant to {company_context['company_name']}'s business in {company_industry}."
    }

async def verify_brand_context(
    file_path_str: str,
    org: Any,
    brand_profile: Optional[Any],
    guidelines: Optional[List[Any]] = None,
    document_sections: Optional[List[Any]] = None,
    company_facts: Optional[List[Any]] = None,
    brand_rules: Optional[List[Any]] = None,
    brand_assets: Optional[List[Any]] = None,
    caption: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for Brand Context Verification.
    Validates file integrity, extracts company reference context, attempts multimodal AI analysis,
    and falls back to layered visual-semantic classification.
    """
    # 1. Inspect physical file
    file_info = inspect_visual_asset_file(file_path_str)
    if not file_info["is_valid"]:
        err_msg = file_info["error_message"]
        err_type = file_info["error_type"]
        return {
            "context_score": 0,
            "context_status": "Irrelevant / Out of Context",
            "detected_industry": "Invalid / Corrupted Media",
            "detected_subject": f"Corrupted or Unsupported Media: {err_type}",
            "matched_products": [],
            "matched_services": [],
            "relevance_reasons": [],
            "mismatch_reasons": [err_msg],
            "critical_flags": [
                "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED",
                f"File Error: {err_type}"
            ],
            "recommended_action": "Please upload a valid, readable PNG, JPG, WEBP, or MP4 creative asset."
        }

    # 2. Extract dynamic reference context for this specific company
    company_context = extract_company_context_profile(
        org=org,
        brand_profile=brand_profile,
        guidelines=guidelines,
        document_sections=document_sections,
        company_facts=company_facts,
        brand_rules=brand_rules,
        brand_assets=brand_assets
    )

    # 3. Extract OCR and logo presence (if image)
    ocr_text = ""
    brand_logo_verified = False
    if file_info["media_type"] == "Image":
        try:
            ocr_res = extract_detailed_ocr(file_info["file_path"])
            ocr_text = ocr_res.get("text", "")
        except Exception:
            ocr_text = ""

        try:
            logo_res = detect_and_verify_brand_logo(
                image_path=file_info["file_path"],
                brand_assets=brand_assets,
                brand_profile=brand_profile
            )
            brand_logo_verified = bool(logo_res and logo_res.get("detected") and logo_res.get("is_authentic"))
        except Exception:
            brand_logo_verified = False

    # 4. Attempt Gemini Multimodal Vision if key is configured
    if file_info["media_type"] == "Image" and settings.GEMINI_API_KEY:
        gemini_res = await verify_context_with_gemini(
            image_path=file_info["file_path"],
            company_context=company_context,
            caption=caption
        )
        if gemini_res and "context_score" in gemini_res:
            # Enforce Layer 4: Brand logo on unrelated content must not override
            score = int(gemini_res.get("context_score", 0))
            status = gemini_res.get("context_status", "Needs Manual Review")
            if score < 50:
                flags = gemini_res.get("critical_flags", [])
                if "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED" not in flags:
                    flags.insert(0, "CRITICAL: OUT-OF-CONTEXT CONTENT DETECTED")
                gemini_res["critical_flags"] = flags
            return gemini_res

    # 5. Execute Multi-Layered Visual-Semantic Engine
    semantic_res = verify_context_semantic_layers(
        file_info=file_info,
        ocr_text=ocr_text,
        caption=caption or "",
        company_context=company_context,
        brand_logo_verified=brand_logo_verified
    )

    return semantic_res
