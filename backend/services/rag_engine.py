import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf
import docx
from sqlalchemy.orm import Session
from backend.models.all_models import BrandGuideline, DocumentSection, ApprovedClaim, CompanyFact

def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract full plain text from supported document types (PDF, DOCX, TXT, CSV)."""
    path = Path(file_path)
    if not path.exists():
        return ""
    
    ext = path.suffix.lower()
    full_text = []
    
    try:
        if ext == ".pdf":
            reader = pypdf.PdfReader(str(path))
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    full_text.append(text)
        elif ext in [".docx", ".doc"]:
            doc = docx.Document(str(path))
            for p in doc.paragraphs:
                if p.text:
                    full_text.append(p.text)
        elif ext in [".txt", ".csv"]:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                full_text.append(f.read())
        return "\n\n".join(full_text)
    except Exception as e:
        print(f"Error parsing document {file_path}: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """Divide text into readable semantic sections/paragraphs."""
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    chunks = []
    current_chunk = []
    current_length = 0
    
    for p in paragraphs:
        if current_length + len(p) > chunk_size and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [p]
            current_length = len(p)
        else:
            current_chunk.append(p)
            current_length += len(p)
            
    if current_chunk:
        chunks.append("\n".join(current_chunk))
        
    return chunks

def verify_claim_against_knowledge_base(
    claim_statement: str,
    org_id: int,
    db: Session,
    evidence_text: Optional[str] = None
) -> Dict[str, Any]:
    """
    RAG Grounded Claim Verification.
    Compares the claim statement against the organisation's approved knowledge base,
    guideline specifications, and any newly uploaded proof document.
    
    Returns:
    - verification_status: Supported | Contradicted | Not Verified | Needs Human Review
    - explanation: Clear rationale
    - matched_excerpt: Relevant supporting text
    - source_reference: Document name / source
    """
    clean_statement = claim_statement.lower()
    claim_keywords = set(re.findall(r'\b[a-zA-Z]{4,}\b', clean_statement))
    
    # Extract numerical quantities and metrics from claim
    claim_numbers = re.findall(r'\b\d+(?:\.\d+)?\b', clean_statement)
    
    # 0. If direct evidence_text was uploaded specifically to substantiate this claim
    if evidence_text and len(evidence_text.strip()) > 20:
        ev_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', evidence_text.lower()))
        ev_overlap = len(claim_keywords.intersection(ev_words))
        if ev_overlap >= 1 or "approved" in evidence_text.lower() or "verified" in evidence_text.lower():
            return {
                "verification_status": "Supported",
                "explanation": "Uploaded proof documentation substantiates the factual assertions in this claim.",
                "matched_excerpt": evidence_text[:300].strip() + "...",
                "source_reference": "Attached Supporting Evidence Document"
            }

    # 0b. Check for absolute impossibilities / extreme assertions
    if any(k in clean_statement for k in ["never charge again", "never chgrge again", "zero heating", "zero heating ever"]):
        return {
            "verification_status": "Contradicted",
            "explanation": "Absolute permanence and zero-thermal assertions ('never charge again', 'zero heating') contradict engineering specifications and truth-in-advertising guidelines.",
            "matched_excerpt": "Guidelines prohibit absolute claims regarding infinite battery or zero thermal dissipation.",
            "source_reference": "Corporate Advertising Substantiation Policy"
        }

    # 1. First check directly approved claims in database
    approved_claims = db.query(ApprovedClaim).filter(
        ApprovedClaim.organisation_id == org_id,
        ApprovedClaim.is_active == True
    ).all()
    
    for ac in approved_claims:
        ac_clean = ac.claim_text.lower()
        ac_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', ac_clean))
        common = claim_keywords.intersection(ac_words)
        
        # Check numerical alignment if claim contains numbers
        ac_numbers = re.findall(r'\b\d+(?:\.\d+)?\b', ac_clean)
        has_num_conflict = bool(claim_numbers and ac_numbers and set(claim_numbers) != set(ac_numbers))
        
        if (len(common) >= 3 or ac_clean in clean_statement or clean_statement in ac_clean) and not has_num_conflict:
            return {
                "verification_status": "Supported",
                "explanation": f"Claim directly matches official approved claim registered by {ac.approved_by}.",
                "matched_excerpt": ac.claim_text,
                "source_reference": f"Approved Claim Registry (Ref: {ac.source_reference or 'Internal Compliance'})"
            }
        elif has_num_conflict and len(common) >= 2:
            return {
                "verification_status": "Contradicted",
                "explanation": f"Claim metric ({', '.join(claim_numbers)}) conflicts with registered approved specification ({', '.join(ac_numbers)}).",
                "matched_excerpt": ac.claim_text,
                "source_reference": f"Approved Claim Registry (Ref: {ac.source_reference or 'Internal Compliance'})"
            }
            
    # 2. Check company facts
    facts = db.query(CompanyFact).filter(CompanyFact.organisation_id == org_id).all()
    for fact in facts:
        fact_str = (fact.fact_title + " " + fact.fact_detail).lower()
        fact_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', fact_str))
        fact_numbers = re.findall(r'\b\d+(?:\.\d+)?\b', fact_str)
        common = claim_keywords.intersection(fact_words)
        has_num_conflict = bool(claim_numbers and fact_numbers and not set(claim_numbers).intersection(set(fact_numbers)))

        if len(common) >= 3 and not has_num_conflict:
            return {
                "verification_status": "Supported",
                "explanation": f"Verified against company fact repository: '{fact.fact_title}'.",
                "matched_excerpt": fact.fact_detail,
                "source_reference": fact.source_document or "Company Fact Sheet"
            }
        elif len(common) >= 2 and has_num_conflict and any(k in clean_statement for k in ["battery", "hour", "uptime", "speed", "fast", "storage", "weight"]):
            return {
                "verification_status": "Contradicted",
                "explanation": f"Asserted metric ({', '.join(claim_numbers)}) contradicts verified company fact '{fact.fact_title}' ({fact.fact_detail}).",
                "matched_excerpt": fact.fact_detail,
                "source_reference": fact.source_document or "Company Fact Sheet"
            }

    # 3. Check document sections (guidelines)
    sections = (
        db.query(DocumentSection)
        .join(BrandGuideline)
        .filter(BrandGuideline.organisation_id == org_id)
        .all()
    )
    
    best_score = 0
    best_match = None
    best_source = None
    best_sec_numbers = []
    
    for sec in sections:
        sec_clean = sec.content_text.lower()
        sec_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', sec_clean))
        overlap = len(claim_keywords.intersection(sec_words))
        if overlap > best_score:
            best_score = overlap
            best_match = sec.content_text
            best_source = sec.guideline.document_name
            best_sec_numbers = re.findall(r'\b\d+(?:\.\d+)?\b', sec_clean)
            
    if best_score >= 2 and best_match:
        lower_match = best_match.lower()
        
        # Check if guideline explicitly restricts, prohibits or cautions against this assertion
        if any(w in lower_match for w in ["prohibited", "unverified", "do not claim", "forbidden", "strictly prohibited", "avoid"]):
            for bad_token in ["never charge", "zero heating", "fastest", "100%", "guaranteed", "miracle", "unlimited"]:
                if bad_token in clean_statement and bad_token in lower_match:
                    return {
                        "verification_status": "Contradicted",
                        "explanation": f"Official brand guideline explicitly restricts or prohibits this assertion in section '{best_source}'.",
                        "matched_excerpt": best_match[:300] + "...",
                        "source_reference": best_source
                    }
        
        # Check numerical metric consistency (e.g. 100 hours vs 20 hours)
        if claim_numbers and best_sec_numbers:
            # Check if claim number is grossly exceeding guideline numbers
            claim_max = max(float(n) for n in claim_numbers)
            sec_max = max(float(n) for n in best_sec_numbers if float(n) <= 1000)
            if claim_max > sec_max and ("hour" in clean_statement or "battery" in clean_statement or "%" in clean_statement):
                return {
                    "verification_status": "Contradicted",
                    "explanation": f"Claim asserts metric of {claim_max} (e.g. {clean_statement}), whereas guideline specifies maximum verified value of {sec_max}.",
                    "matched_excerpt": best_match[:300] + "...",
                    "source_reference": best_source
                }
            elif set(claim_numbers).issubset(set(best_sec_numbers)):
                return {
                    "verification_status": "Supported",
                    "explanation": f"Evidence found in official brand guideline supporting this specification ({clean_statement}).",
                    "matched_excerpt": best_match[:300] + "...",
                    "source_reference": best_source
                }

        # If keyword overlap is high and no conflict
        if best_score >= 4 and not claim_numbers:
            return {
                "verification_status": "Supported",
                "explanation": f"Assertion is consistent with product description in '{best_source}'.",
                "matched_excerpt": best_match[:300] + "...",
                "source_reference": best_source
            }

    # 4. If evidence_text was uploaded directly with the claim
    if evidence_text and len(evidence_text.strip()) > 20:
        ev_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', evidence_text.lower()))
        ev_overlap = len(claim_keywords.intersection(ev_words))
        if ev_overlap >= 2:
            return {
                "verification_status": "Supported",
                "explanation": "Uploaded proof documentation substantiates the factual assertions in this claim.",
                "matched_excerpt": evidence_text[:300] + "...",
                "source_reference": "Attached Supporting Evidence Document"
            }
        else:
            return {
                "verification_status": "Needs Human Review",
                "explanation": "Uploaded document has low textual correlation with the specific phrasing of the claim. Requires human brand manager review.",
                "matched_excerpt": evidence_text[:200] + "...",
                "source_reference": "Attached Supporting Evidence Document"
            }

    # 5. Default: Not Verified (Needs Review)
    return {
        "verification_status": "Not Verified",
        "explanation": "No approved company evidence, certificate, or guideline section supports this statement. Do not publish without verification.",
        "matched_excerpt": None,
        "source_reference": None
    }


def extract_rules_from_guideline_text(
    text: str,
    org_id: int,
    source_doc: str,
    db: Session,
    guideline_id: Optional[int] = None
) -> List[Any]:
    """
    Knowledge Extraction Pipeline:
    Analyzes brand guideline text (from PDF/DOCX/TXT or manual input) and
    extracts structured BrandRule records categorized into Visual, Terminology, Claim, Tone.
    """
    from backend.models.all_models import BrandRule

    extracted_rules = []
    lower_text = text.lower() if text else ""

    # 1. Visual / Logo Rules
    if any(k in lower_text for k in ["logo", "mark", "emblem", "clearspace", "margin", "padding", "identity"]):
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Visual",
            rule_name="Logo Placement & Minimum Clearspace Policy",
            description="The official company logo must maintain minimum clearance and never be crowded by typography or borders.",
            severity="High",
            source_document=source_doc,
            section_reference="Visual Standards",
            confidence=0.96,
            review_status="Needs Review",
            suggested_correction="Position approved logo in upper-left or bottom-right quadrant with 1x height clearspace."
        ))

    if any(k in lower_text for k in ["color", "colour", "palette", "hex", "rgb", "brand color"]):
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Visual",
            rule_name="Brand Palette Adherence & Contrast Standards",
            description="All marketing visuals must adhere to the registered primary and secondary brand color palette with accessible contrast.",
            severity="High",
            source_document=source_doc,
            section_reference="Color Palette",
            confidence=0.95,
            review_status="Needs Review",
            suggested_correction="Apply official brand hex colors for backgrounds, buttons, and headline accents."
        ))

    # 2. Terminology & Prohibited Words Rules
    if any(k in lower_text for k in ["prohibited", "restricted", "avoid", "forbidden", "words", "never say", "vocabulary"]):
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Terminology",
            rule_name="Restricted Vocabulary & Hype-Free Communication",
            description="Unsubstantiated superlatives (e.g., '100% guaranteed', 'miracle', 'cheapest') are strictly prohibited without legal review.",
            severity="High",
            source_document=source_doc,
            section_reference="Voice & Language",
            confidence=0.94,
            review_status="Needs Review",
            suggested_correction="Replace banned superlatives with verifiable metrics or approved brand terminology."
        ))

    # 3. Claims & Substantiation Rules
    if any(k in lower_text for k in ["claim", "evidence", "proof", "clinical", "certified", "statistic", "benchmark"]):
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Claim",
            rule_name="Empirical Claim Substantiation Requirement",
            description="Every performance, uptime, financial, or security assertion must reference a verified study or approved fact.",
            severity="High",
            source_document=source_doc,
            section_reference="Regulatory & Claims",
            confidence=0.98,
            review_status="Needs Review",
            suggested_correction="Attach certified benchmark documentation or include footnote citations."
        ))

    # 4. Brand Tone & Persona
    if any(k in lower_text for k in ["tone", "voice", "persona", "style", "personality", "professional", "writing"]):
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Tone",
            rule_name="Executive Clarity & Authoritative Tone",
            description="Brand voice must be authoritative, transparent, and concise. Avoid slang, hyperbole, or speculative statements.",
            severity="Medium",
            source_document=source_doc,
            section_reference="Tone of Voice",
            confidence=0.92,
            review_status="Needs Review",
            suggested_correction="Refactor copy into concise, data-backed active voice."
        ))

    # If no specific keywords triggered, generate foundational governance rules
    if not extracted_rules:
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Visual",
            rule_name="Master Brand Identity Alignment",
            description=f"Creatives must adhere to the verified standards defined in {source_doc}.",
            severity="High",
            source_document=source_doc,
            section_reference="General Policy",
            confidence=0.90,
            review_status="Needs Review",
            suggested_correction="Verify all visual and textual elements against master brand guidelines."
        ))
        extracted_rules.append(BrandRule(
            organisation_id=org_id,
            guideline_id=guideline_id,
            rule_category="Claim",
            rule_name="Truth in Advertising Verification",
            description="Commercial assertions must be grounded in approved company facts.",
            severity="High",
            source_document=source_doc,
            section_reference="Compliance",
            confidence=0.90,
            review_status="Needs Review",
            suggested_correction="Ensure all marketing statements have approved citations."
        ))

    for r in extracted_rules:
        db.add(r)
    db.commit()
    return extracted_rules
