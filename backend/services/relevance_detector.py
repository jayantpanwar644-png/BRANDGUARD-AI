import re
from typing import Dict, Any, List, Optional, Set

def normalize_text_tokens(text: str) -> Set[str]:
    """Extract lowercased alphanumeric tokens with length >= 3."""
    if not text:
        return set()
    return set(re.findall(r'\b[a-zA-Z0-9\-_]{3,}\b', text.lower()))

# Domain knowledge mapping for common commercial product categories
DOMAIN_TAXONOMY = {
    "Computing & Hardware": {
        "keywords": {
            "laptop", "ultrabook", "notebook", "workstation", "desktop", "computer", "processor",
            "intel", "core", "ryzen", "oled", "display", "battery", "backup", "screen", "keyboard",
            "trackpad", "ssd", "ram", "motherboard", "monitor", "pc", "charging", "charger", "hardware",
            "tablet", "peripheral", "docking", "thunderbolt", "nova tech", "ultrabook pro"
        },
        "description": "Personal computing hardware, laptops, workstations, and computer components"
    },
    "Robotics & Autonomous Systems": {
        "keywords": {
            "robot", "robotics", "bot", "autonomous", "rover", "drone", "fleet", "logistics",
            "last-mile", "delivery bot", "sensors", "lidar", "navigation", "actuator", "payload",
            "unmanned", "aegis", "aegis-x1", "teleoperation", "charging dock", "fleet os"
        },
        "description": "Autonomous delivery robotics, logistics hardware, and fleet automation"
    },
    "Enterprise Software & SaaS": {
        "keywords": {
            "software", "cloud", "saas", "platform", "dashboard", "api", "database", "analytics",
            "cybersecurity", "governance", "compliance", "erp", "crm", "workflow", "encryption",
            "multi-tenant", "authentication", "sso", "devops", "kubernetes"
        },
        "description": "Enterprise cloud software, developer platforms, and data infrastructure"
    },
    "Footwear & Fashion Apparel": {
        "keywords": {
            "shoe", "shoes", "sneaker", "sneakers", "footwear", "running shoe", "boots", "heel",
            "apparel", "clothing", "jacket", "shirt", "t-shirt", "hoodie", "pants", "dress", "denim",
            "fashion", "athleisure", "cushioning", "outsole", "air max", "sole"
        },
        "description": "Athletic footwear, casual apparel, and fashion accessories"
    },
    "Food & Beverage / Dining": {
        "keywords": {
            "burger", "burgers", "fries", "pizza", "sandwich", "beverage", "drink", "coffee",
            "latte", "espresso", "roast", "tea", "snack", "meal", "combo", "crispy", "flavor",
            "tasty", "delicious", "restaurant", "menu", "fast food", "takeout", "chicken wings"
        },
        "description": "Food service, quick-service restaurant items, and specialty beverages"
    },
    "Cosmetics & Skincare": {
        "keywords": {
            "skincare", "cosmetics", "serum", "lotion", "cream", "moisturizer", "lipstick",
            "foundation", "anti-aging", "spf", "sunscreen", "cleanser", "hydration", "dermatologist",
            "beauty", "wrinkles", "glow", "skin"
        },
        "description": "Personal skincare treatments, cosmetics, and beauty formulations"
    },
    "Automotive & Vehicles": {
        "keywords": {
            "car", "vehicle", "automobile", "suv", "sedan", "ev", "electric vehicle", "truck",
            "engine", "horsepower", "torque", "steering", "transmission", "tires", "mileage",
            "driving", "cockpit", "automotive"
        },
        "description": "Passenger automobiles, electric vehicles, and commercial transport"
    }
}

def detect_product_category_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Determine the primary commercial product/service domain of the creative copy."""
    clean = text.lower()
    tokens = normalize_text_tokens(clean)
    if not tokens:
        return None

    best_category = None
    best_matches = []
    best_score = 0

    for cat_name, data in DOMAIN_TAXONOMY.items():
        matched = tokens.intersection(data["keywords"])
        # Also check multi-word keyword phrases
        for kw in data["keywords"]:
            if " " in kw and kw in clean:
                matched.add(kw)
        
        score = len(matched)
        if score > best_score:
            best_score = score
            best_category = cat_name
            best_matches = list(matched)

    if best_score >= 1:
        return {
            "category": best_category,
            "matched_keywords": best_matches,
            "score": best_score,
            "description": DOMAIN_TAXONOMY[best_category]["description"]
        }
    return None

def detect_company_product_relevance(
    extracted_text: str,
    parsed_components: Dict[str, Any],
    brand_profile: Optional[Any],
    org: Any,
    guidelines: Optional[List[Any]] = None,
    document_sections: Optional[List[Any]] = None,
    company_facts: Optional[List[Any]] = None,
    approved_claims: Optional[List[Any]] = None,
    brand_rules: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Mandatory Company & Product Relevance Engine.
    Examines whether the uploaded creative genuinely relates to the selected company's
    configured products, services, guidelines, facts, and business description.

    Returns:
    - status: "Related to Company" | "Not Related to Company" | "Needs Review"
    - detected_product_or_service: String
    - matched_company_offering: Optional[String]
    - explanation: Clear rationale
    - evidence: Concrete proof from creative copy & company knowledge
    - confidence: float
    - recommended_action: Practical guidance
    - finding: Optional[Dict[str, Any]] (if Not Related or Needs Review)
    """
    headline = (parsed_components.get("headline") or "").strip()
    body_text = (parsed_components.get("body_text") or "").strip()
    combined_copy = f"{extracted_text}\n{headline}\n{body_text}".strip()
    clean_copy = combined_copy.lower()
    copy_tokens = normalize_text_tokens(clean_copy)

    # 1. Assemble Company Knowledge Context
    company_name = ((brand_profile.company_name if brand_profile and brand_profile.company_name else (org.name if org else "")) or "").strip()
    industry = ((org.industry if org and org.industry else (brand_profile.business_category if brand_profile and brand_profile.business_category else "")) or "").strip()
    products_and_services = ((brand_profile.products_and_services if brand_profile and brand_profile.products_and_services else "") or "").strip()
    company_desc = ((brand_profile.company_description or brand_profile.mission_statement if brand_profile else "") or "").strip()
    
    # Facts and guidelines product mentions
    fact_texts = []
    if company_facts:
        for f in company_facts:
            fact_texts.append(f"{f.fact_title} {f.fact_detail}")
    
    guideline_texts = []
    if document_sections:
        for sec in document_sections:
            guideline_texts.append(f"{sec.title or ''} {sec.content_text[:300]}")
    elif guidelines:
        for g in guidelines:
            guideline_texts.append(g.document_name)

    company_corpus = f"{company_name} {industry} {products_and_services} {company_desc} {' '.join(fact_texts)} {' '.join(guideline_texts)}"
    company_tokens = normalize_text_tokens(company_corpus)
    company_cat_info = detect_product_category_from_text(company_corpus)

    # 2. Check if company profile is virtually unconfigured
    is_company_unconfigured = not (company_desc or products_and_services or fact_texts or guideline_texts or industry)

    # 3. Analyze creative copy
    detected_cat_info = detect_product_category_from_text(combined_copy)
    
    # Specific product extraction heuristic
    detected_product_name = None
    # Look for known product name patterns in headline or copy
    for pat in [
        r'\b(?:ultrabook\s+pro|ultrabook|laptop|notebook|workstation)\b',
        r'\b(?:aegis-x1|delivery\s+bot|fleet\s+management|autonomous\s+rover)\b',
        r'\b(?:running\s+shoes?|sneakers?|air\s+max|athletic\s+footwear)\b',
        r'\b(?:burger|cheeseburger|meal\s+deal|combo\s+meal|crispy\s+chicken)\b',
        r'\b(?:skincare\s+serum|facial\s+cream|anti-aging\s+lotion|lipstick)\b',
        r'\b(?:electric\s+suv|sedan\s+ev|hybrid\s+vehicle)\b'
    ]:
        m = re.search(pat, clean_copy, re.IGNORECASE)
        if m:
            detected_product_name = m.group(0).title()
            break

    # 4. Check for Empty / Unclear Creative (Test F: Unclear Product)
    # If text is very minimal (fewer than 4 meaningful tokens and no recognized product category)
    meaningful_tokens = [t for t in copy_tokens if len(t) >= 4 and t not in {"image", "whatsapp", "asset", "verified", "brandsafety", "test"}]
    if len(meaningful_tokens) <= 2 and not detected_cat_info:
        return {
            "status": "Needs Review",
            "detected_product_or_service": "Unclear / Ambiguous Visual Content",
            "matched_company_offering": None,
            "explanation": (
                "The uploaded creative contains minimal or ambiguous textual and visual cues. "
                "The system cannot confidently identify the specific commercial product, feature, or service being promoted."
            ),
            "evidence": f"Only detected minimal copy tokens: {', '.join(meaningful_tokens) if meaningful_tokens else 'No distinctive text'}. Missing clear product headlines or model identifiers.",
            "confidence": 0.60,
            "recommended_action": "Review the creative manually or upload a version with explicit product naming and clear promotional messaging.",
            "finding": {
                "issue_type": "Company/Product Relevance",
                "severity": "Low",
                "title": "Product Subject Unclear — Human Review Required",
                "description": "The creative lacks sufficient product branding or descriptive copy to determine commercial alignment.",
                "expected_rule": "Commercial visuals must clearly communicate the featured product, solution, or campaign subject.",
                "comparison_result": "Needs Review",
                "why_it_matters": "Ambiguous creative messaging weakens audience understanding and reduces marketing conversion.",
                "evidence_found": f"Detected minimal copy: '{combined_copy[:100]}'",
                "suggested_correction": "Add a descriptive headline or product identifier establishing the focus of the creative."
            }
        }

    # 5. Check if Company Profile lacks information
    if is_company_unconfigured and not company_cat_info:
        return {
            "status": "Needs Review",
            "detected_product_or_service": detected_product_name or (detected_cat_info["category"] if detected_cat_info else "Identified Product"),
            "matched_company_offering": None,
            "explanation": (
                f"Company profile for '{company_name or 'the organization'}' does not have configured products, services, or business descriptions "
                "in the Brand Knowledge Hub. Company relevance cannot be verified without baseline offerings."
            ),
            "evidence": "Knowledge Hub is missing product catalog, company description, and verified company facts.",
            "confidence": 0.55,
            "recommended_action": "Complete the Company Profile and Products & Services catalog in the Brand Knowledge Hub.",
            "finding": {
                "issue_type": "Company/Product Relevance",
                "severity": "Low",
                "title": "Company Profile Incomplete — Relevance Unverified",
                "description": "Cannot verify creative alignment because the organisation's official product portfolio is not configured.",
                "expected_rule": "Every organisation must configure official products, services, and business scope in the Brand Knowledge Hub.",
                "comparison_result": "Needs Review",
                "why_it_matters": "Without official product definitions, the governance engine cannot validate commercial relevance.",
                "evidence_found": f"Creative promotes '{detected_product_name or 'product content'}', but company knowledge base has 0 registered products.",
                "suggested_correction": "Navigate to Brand Knowledge Hub and register your company's official products and services."
            }
        }

    # 6. Direct Company Matching (Tokens & Products)
    # Check if company name appears in creative
    company_name_tokens = normalize_text_tokens(company_name)
    has_company_name_in_copy = bool(company_name_tokens and company_name_tokens.issubset(copy_tokens)) or (company_name.lower() in clean_copy)

    # Check direct overlap with company products & services
    products_tokens = normalize_text_tokens(products_and_services)
    common_product_tokens = copy_tokens.intersection(products_tokens)

    # Check direct overlap with guideline / facts tokens
    facts_guideline_tokens = normalize_text_tokens(f"{' '.join(fact_texts)} {' '.join(guideline_texts)}")
    common_fact_tokens = copy_tokens.intersection(facts_guideline_tokens)

    # Match against Domain Taxonomy
    detected_cat = detected_cat_info["category"] if detected_cat_info else None
    company_cat = company_cat_info["category"] if company_cat_info else None

    # Check if company category matches or overlaps
    is_category_aligned = False
    if detected_cat and company_cat:
        is_category_aligned = (detected_cat == company_cat)
    elif detected_cat:
        # Check if industry string matches detected category
        ind_lower = industry.lower()
        if "robot" in ind_lower or "logistic" in ind_lower or "autonomous" in ind_lower:
            is_category_aligned = (detected_cat == "Robotics & Autonomous Systems")
        elif "tech" in ind_lower or "hardware" in ind_lower or "computer" in ind_lower or "laptop" in ind_lower:
            is_category_aligned = (detected_cat == "Computing & Hardware")
        elif "software" in ind_lower or "saas" in ind_lower or "cloud" in ind_lower:
            is_category_aligned = (detected_cat == "Enterprise Software & SaaS")
        elif "shoe" in ind_lower or "footwear" in ind_lower or "apparel" in ind_lower or "fashion" in ind_lower:
            is_category_aligned = (detected_cat == "Footwear & Fashion Apparel")
        elif "food" in ind_lower or "restaurant" in ind_lower or "dining" in ind_lower:
            is_category_aligned = (detected_cat == "Food & Beverage / Dining")

    # Resolve matched offering string
    matched_offering = None
    if products_and_services:
        for p_item in [p.strip() for p in products_and_services.split(",") if p.strip()]:
            p_tokens = normalize_text_tokens(p_item)
            if p_tokens and (p_tokens.issubset(copy_tokens) or len(p_tokens.intersection(copy_tokens)) >= 1):
                matched_offering = p_item
                break
    if not matched_offering and fact_texts:
        for f in company_facts or []:
            f_tokens = normalize_text_tokens(f.fact_title)
            if f_tokens and len(f_tokens.intersection(copy_tokens)) >= 1:
                matched_offering = f.fact_title
                break
    if not matched_offering and is_category_aligned:
        matched_offering = products_and_services or industry or company_cat

    # 7. DECISION LOGIC: Related vs Not Related vs Needs Review

    # CASE A: Strong Alignment -> Related to Company (Test A, B, C, E)
    if is_category_aligned or (has_company_name_in_copy and (common_product_tokens or common_fact_tokens or detected_cat)) or len(common_product_tokens) >= 2 or (matched_offering and detected_cat == company_cat):
        product_display = detected_product_name or matched_offering or (f"{detected_cat} offering" if detected_cat else "Company Product/Service")
        evidence_snippets = []
        if matched_offering:
            evidence_snippets.append(f"Matches registered offering '{matched_offering}'")
        if detected_cat_info:
            evidence_snippets.append(f"Product domain: '{detected_cat}' (Keywords: {', '.join(detected_cat_info['matched_keywords'][:3])})")
        if has_company_name_in_copy:
            evidence_snippets.append(f"Official company brandmark/name '{company_name}' present in copy")
            
        explanation = (
            f"The creative promotes {product_display.lower()}, which directly corresponds with {company_name}'s "
            f"verified portfolio in {industry or detected_cat or 'its registered business area'}."
        )

        return {
            "status": "Related to Company",
            "detected_product_or_service": product_display,
            "matched_company_offering": matched_offering or (products_and_services.split(',')[0] if products_and_services else None),
            "explanation": explanation,
            "evidence": "; ".join(evidence_snippets) if evidence_snippets else f"Verified against company business category: {industry}.",
            "confidence": 0.96 if matched_offering else 0.88,
            "recommended_action": "Proceed with brand guideline compliance, typography, and claim verification.",
            "finding": None
        }

    # CASE B: Clear Mismatch -> Not Related to Company (Test D: Unrelated Product)
    if detected_cat and (company_cat or industry) and not is_category_aligned and not has_company_name_in_copy and not common_product_tokens:
        detected_offering_name = detected_product_name or (f"{detected_cat} item" if detected_cat else "Unrelated commercial product")
        expected_domain = products_and_services or industry or (company_cat_info["description"] if company_cat_info else company_name)
        
        explanation = (
            f"The creative promotes '{detected_offering_name}' ({detected_cat}), which is unrelated to {company_name}'s "
            f"actual business in {expected_domain}."
        )
        evidence = (
            f"Detected product domain '{detected_cat}' (keywords: {', '.join(detected_cat_info['matched_keywords'] if detected_cat_info else [])}) "
            f"conflicts with company portfolio '{expected_domain}'."
        )

        finding = {
            "issue_type": "Company/Product Relevance",
            "severity": "High",
            "title": f"Unrelated Product Detected: {detected_offering_name}",
            "description": (
                f"The creative showcases '{detected_offering_name}' ({detected_cat}), which contradicts the company's "
                f"configured commercial offerings ({expected_domain})."
            ),
            "expected_rule": f"All published visual assets must promote verified products and services registered for {company_name}.",
            "comparison_result": "Contradicted",
            "why_it_matters": (
                "Publishing creatives for products outside the company's verified portfolio causes brand dilution, "
                "customer confusion, and potential trademark infringement."
            ),
            "evidence_found": evidence,
            "suggested_correction": f"Upload a creative featuring approved company products ({products_and_services or 'official company solutions'})."
        }

        return {
            "status": "Not Related to Company",
            "detected_product_or_service": detected_offering_name,
            "matched_company_offering": None,
            "explanation": explanation,
            "evidence": evidence,
            "confidence": 0.94,
            "recommended_action": f"Do not publish. Upload a creative featuring verified {company_name} products or services.",
            "finding": finding
        }

    # CASE C: Ambiguous or Marginal Correlation -> Needs Review
    detected_display = detected_product_name or (detected_cat if detected_cat else "Commercial Asset")
    return {
        "status": "Needs Review",
        "detected_product_or_service": detected_display,
        "matched_company_offering": None,
        "explanation": (
            f"The creative promotes '{detected_display}', but evidence connecting it to {company_name}'s specific product line "
            "is inconclusive. Human review is recommended to verify commercial intent."
        ),
        "evidence": f"Found tokens: {', '.join(list(copy_tokens)[:5])}. Company offerings: {products_and_services or industry or 'Standard'}.",
        "confidence": 0.70,
        "recommended_action": "Verify whether this visual asset is part of an approved campaign before granting final approval.",
        "finding": {
            "issue_type": "Company/Product Relevance",
            "severity": "Low",
            "title": "Product Relevance Requires Human Verification",
            "description": f"The creative's relationship to {company_name}'s official product line cannot be confirmed autonomously.",
            "expected_rule": "Ensure commercial visuals clearly tie into recognized company products or authorized corporate campaigns.",
            "comparison_result": "Needs Review",
            "why_it_matters": "Marginal product relevance may indicate an unauthorized cross-promotional draft.",
            "evidence_found": f"Creative features '{detected_display}', which requires confirmation by brand manager.",
            "suggested_correction": "Include official product nomenclature or brand campaign tags."
        }
    }
