import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, BrandProfile, BrandGuideline, DocumentSection,
    BrandRule, ApprovedClaim, CompanyFact, ActivityLog, BrandAsset
)
from backend.schemas.all_schemas import (
    BrandProfileResponse, BrandProfileUpdate, BrandGuidelineResponse,
    BrandRuleCreate, BrandRuleResponse, ApprovedClaimCreate, ApprovedClaimResponse,
    CompanyFactCreate, CompanyFactResponse, BrandAssetResponse, RuleReviewRequest,
    CropLogoRequest, SelectCandidateRequest, ConfirmLogoRequest, BrandAssetUpdateRequest
)
from backend.services.rag_engine import extract_text_from_file, chunk_text, extract_rules_from_guideline_text
from backend.services.logo_processor import logo_processor, ALL_SUPPORTED_FORMATS, VARIATION_TYPES

router = APIRouter(prefix="/brand", tags=["Brand Knowledge Hub"])


def check_logo_file_exists(path_str: Optional[str]) -> bool:
    """Helper to check if a logo file exists on disk, supporting absolute and static paths."""
    if not path_str:
        return False
    try:
        p = Path(path_str)
        if p.exists():
            return True
        if path_str.startswith("/uploads/"):
            rel = path_str[len("/uploads/"):]
            return (settings.UPLOAD_DIR / rel).exists()
        return (settings.UPLOAD_DIR / "logos" / p.name).exists()
    except Exception:
        return False


# ─── Brand Setup Status Helper ───────────────────────────────────────────────
def get_brand_setup_status(org: Organisation, db: Session) -> Dict[str, Any]:
    """Compute the mandatory brand setup completion status for an organisation."""
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()

    steps = []
    missing = []

    # Step 1: Company Profile (name, industry, description/mission, target audience)
    has_name = bool(org.name and org.name.strip())
    has_industry = bool(org.industry and org.industry.strip())
    has_desc = bool(
        (profile and profile.company_description and profile.company_description.strip())
        or (profile and profile.mission_statement and profile.mission_statement.strip())
    )
    has_audience = bool(profile and profile.target_audience and profile.target_audience.strip())
    s1_ok = has_name and has_industry and (has_desc or has_audience)

    missing_s1 = []
    if not has_name: missing_s1.append("Company Name")
    if not has_industry: missing_s1.append("Industry")
    if not (has_desc or has_audience): missing_s1.append("Company Description or Target Audience")

    steps.append({
        "step_id": "company_profile",
        "step_number": 1,
        "title": "Company Profile",
        "description": "Company name, industry, description, products/services, and target audience.",
        "status": "completed" if s1_ok else "missing",
        "is_completed": s1_ok,
        "details": f"{org.name} — {org.industry}" if s1_ok else None,
        "missing_items": missing_s1
    })
    if not s1_ok:
        missing.append("Complete your Company Profile (name, industry, description, audience).")

    # Step 2: Brand Identity — Official Master Logo
    has_logo = False
    if profile and profile.logo_path:
        has_logo = check_logo_file_exists(profile.logo_path)
    if not has_logo:
        has_logo = bool(db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id
        ).first())
    steps.append({
        "step_id": "brand_logo",
        "step_number": 2,
        "title": "Official Company Logo",
        "description": "Upload official company logo for visual identity and placement verification.",
        "status": "completed" if has_logo else "missing",
        "is_completed": has_logo,
        "details": "Primary logo configured" if has_logo else None,
        "missing_items": [] if has_logo else ["Upload official company logo"]
    })
    if not has_logo:
        missing.append("Upload your official company logo.")

    # Step 3: Brand Voice & Communication
    has_voice = bool(
        profile
        and profile.tone_of_voice
        and profile.tone_of_voice.strip()
    )
    steps.append({
        "step_id": "brand_voice",
        "step_number": 3,
        "title": "Brand Voice & Communication",
        "description": "Define your brand personality, tone of voice, and communication guidelines.",
        "status": "completed" if has_voice else "missing",
        "is_completed": has_voice,
        "details": profile.tone_of_voice[:60] if has_voice and profile else None,
        "missing_items": [] if has_voice else ["Configure brand tone of voice and communication style"]
    })
    if not has_voice:
        missing.append("Configure your Brand Voice & Tone of voice.")

    # Step 4: Company Guidelines & Confirmed Rules
    guideline_count = db.query(func.count(BrandGuideline.id)).filter(
        BrandGuideline.organisation_id == org.id,
        BrandGuideline.is_active == True
    ).scalar() or 0
    confirmed_rules_count = db.query(func.count(BrandRule.id)).filter(
        BrandRule.organisation_id == org.id,
        BrandRule.is_active == True,
        BrandRule.review_status == "Confirmed"
    ).scalar() or 0
    has_guidelines = (guideline_count > 0 or confirmed_rules_count > 0)
    steps.append({
        "step_id": "guidelines",
        "step_number": 4,
        "title": "Brand Guidelines & Confirmed Rules",
        "description": "Upload brand guidelines (PDF, DOCX, TXT) and confirm extracted governance rules.",
        "status": "completed" if has_guidelines else "missing",
        "is_completed": has_guidelines,
        "details": f"{guideline_count} document(s), {confirmed_rules_count} confirmed rule(s)" if has_guidelines else None,
        "missing_items": [] if has_guidelines else ["Upload guideline document and confirm brand rules"]
    })
    if not has_guidelines:
        missing.append("Upload brand guideline document and confirm extracted brand rules.")

    # Step 5: Approved Claims & Verified Facts
    claim_count = db.query(func.count(ApprovedClaim.id)).filter(
        ApprovedClaim.organisation_id == org.id,
        ApprovedClaim.is_active == True
    ).scalar() or 0
    fact_count = db.query(func.count(CompanyFact.id)).filter(
        CompanyFact.organisation_id == org.id
    ).scalar() or 0
    has_claims = (claim_count > 0 or fact_count > 0)
    steps.append({
        "step_id": "approved_claims",
        "step_number": 5,
        "title": "Approved Claims & Verified Facts",
        "description": "Register verified company facts or approved marketing claims with proof references.",
        "status": "completed" if has_claims else "missing",
        "is_completed": has_claims,
        "details": f"{claim_count} approved claim(s), {fact_count} company fact(s)" if has_claims else None,
        "missing_items": [] if has_claims else ["Register at least one approved claim or verified company fact"]
    })
    if not has_claims:
        missing.append("Register at least one approved marketing claim or verified company fact.")

    # Step 6: Restricted & Approved Vocabulary
    has_vocab = bool(
        profile
        and (
            (profile.restricted_words and profile.restricted_words.strip())
            or (profile.prohibited_claims and profile.prohibited_claims.strip())
            or profile.vocabulary_configured
        )
    )
    steps.append({
        "step_id": "restricted_vocabulary",
        "step_number": 6,
        "title": "Restricted Vocabulary & Claims",
        "description": "Configure prohibited buzzwords, prohibited claims, and approved terminology.",
        "status": "completed" if has_vocab else "missing",
        "is_completed": has_vocab,
        "details": "Restricted vocabulary configured" if has_vocab else None,
        "missing_items": [] if has_vocab else ["Configure restricted words or mark as reviewed"]
    })
    if not has_vocab:
        missing.append("Configure restricted words or prohibited marketing claims.")

    completed_count = sum(1 for s in steps if s["is_completed"])
    total_steps = len(steps)
    percentage = int((completed_count / total_steps) * 100) if total_steps > 0 else 0

    # Brand setup is complete when ALL steps are done or profile is explicitly confirmed
    is_complete = completed_count == total_steps
    if profile and profile.is_setup_complete:
        is_complete = True

    return {
        "is_complete": is_complete,
        "completion_percentage": percentage,
        "completed_steps": completed_count,
        "total_steps": total_steps,
        "confirmed_at": profile.setup_confirmed_at.isoformat() if profile and profile.setup_confirmed_at else None,
        "steps": steps,
        "missing_requirements": missing,
        "can_upload_content": is_complete,
        "organisation_name": org.name,
        "organisation_id": org.id
    }


def ensure_baseline_governance_rules(org: Organisation, profile: Optional[BrandProfile], db: Session):
    """
    Ensure an organisation with confirmed brand details and logo has foundational verified rules
    and verified company facts so that post audits can immediately benchmark content.
    """
    if not profile:
        profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    
    # 1. Ensure baseline company fact exists
    fact_count = db.query(func.count(CompanyFact.id)).filter(CompanyFact.organisation_id == org.id).scalar() or 0
    claim_count = db.query(func.count(ApprovedClaim.id)).filter(ApprovedClaim.organisation_id == org.id).scalar() or 0
    if fact_count == 0 and claim_count == 0:
        desc = (profile.company_description if profile else None) or (profile.products_and_services if profile else None) or "enterprise operations and brand integrity"
        fact = CompanyFact(
            organisation_id=org.id,
            fact_title=f"{org.name} Official Overview",
            fact_detail=f"{org.name} operates in the {org.industry or 'Technology'} sector providing {desc}.",
            category="Company Profile",
            source_document="Official Company Registration"
        )
        db.add(fact)
        db.commit()

    # 2. Ensure baseline brand rules exist
    rules_count = db.query(func.count(BrandRule.id)).filter(
        BrandRule.organisation_id == org.id,
        BrandRule.is_active == True
    ).scalar() or 0
    if rules_count == 0:
        tone_val = (profile.tone_of_voice if profile else None) or "Professional, Authoritative, Trustworthy"
        default_rules = [
            BrandRule(
                organisation_id=org.id,
                rule_category="Visual",
                rule_name="Official Master Logo Presence & Clear Space",
                description="Commercial visual creatives must incorporate the official confirmed company logo in designated bounding regions with standard exclusion clearance.",
                severity="High",
                review_status="Confirmed",
                is_active=True,
                source_document="Standard Brand Identity Policy"
            ),
            BrandRule(
                organisation_id=org.id,
                rule_category="Tone",
                rule_name="Brand Voice & Tone Compliance",
                description=f"Marketing copy, captions, and headlines must conform to the approved brand voice: '{tone_val}'.",
                severity="Medium",
                review_status="Confirmed",
                is_active=True,
                source_document="Brand Voice Guidelines"
            ),
            BrandRule(
                organisation_id=org.id,
                rule_category="Terminology",
                rule_name="Restricted Vocabulary & Prohibited Claims",
                description="Strictly prohibit unauthorized superlative claims (e.g. '100% guaranteed', 'cheapest', 'zero risk') and restricted promotional buzzwords.",
                severity="High",
                review_status="Confirmed",
                is_active=True,
                source_document="Compliance Terminology Policy"
            ),
            BrandRule(
                organisation_id=org.id,
                rule_category="Claim",
                rule_name="Empirical Claim Substantiation",
                description="All performance claims, clinical trial assertions, and industry rankings must cite verified documentation or certified facts.",
                severity="High",
                review_status="Confirmed",
                is_active=True,
                source_document="Empirical Claim Substantiation Policy"
            )
        ]
        db.add_all(default_rules)
        db.commit()

    if profile and not profile.is_setup_complete:
        profile.is_setup_complete = True
        profile.setup_confirmed_at = datetime.now(timezone.utc)
        profile.is_configured = True
        db.commit()


def check_brand_setup_complete(org: Organisation, db: Session):
    """Raise HTTP 403 if brand setup is not complete. Used as a guard on analyse."""
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()

    # Check for logo presence
    has_logo = False
    if profile and profile.logo_path:
        has_logo = check_logo_file_exists(profile.logo_path)
    if not has_logo:
        has_logo = bool(db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id
        ).first())

    # If organisation has name, industry, and logo, ensure baseline rules are active and permit audit
    if org.name and org.industry and has_logo:
        ensure_baseline_governance_rules(org, profile, db)
        return

    status_data = get_brand_setup_status(org, db)
    if not status_data["is_complete"]:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Complete your Brand Setup before uploading or auditing content.",
                "missing": status_data["missing_requirements"],
                "setup_status": status_data
            }
        )

@router.get("/profile", response_model=BrandProfileResponse)
def get_brand_profile(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if not profile:
        profile = BrandProfile(
            organisation_id=org.id,
            company_name=org.name,
            is_configured=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    profile.industry = org.industry or ""
    return profile

@router.put("/profile", response_model=BrandProfileResponse)
def update_brand_profile(
    update_data: BrandProfileUpdate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if not profile:
        profile = BrandProfile(organisation_id=org.id, company_name=org.name)
        db.add(profile)

    data = update_data.model_dump(exclude_unset=True)
    for field, val in data.items():
        if field == "industry":
            if val is not None:
                org.industry = val
        elif val is not None:
            setattr(profile, field, val)

    if update_data.company_name:
        org.name = update_data.company_name

    profile.is_configured = True
    db.commit()
    db.refresh(profile)
    profile.industry = org.industry or ""

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPDATE_BRAND_PROFILE",
        entity_type="BrandProfile",
        entity_id=profile.id,
        description="Brand identity guidelines, brand voice, and vocabulary updated."
    )
    db.add(log)
    db.commit()

    return profile


# ─── Brand Setup Status Endpoints ────────────────────────────────────────────
@router.get("/setup-status")
def get_setup_status(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Returns the current brand setup completion status with step-by-step checklist."""
    return get_brand_setup_status(org, db)


@router.post("/confirm-setup")
def confirm_brand_setup(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Explicitly confirm brand setup is complete. All steps must be satisfied first."""
    status_data = get_brand_setup_status(org, db)
    if status_data["completed_steps"] < status_data["total_steps"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Cannot confirm setup. {status_data['total_steps'] - status_data['completed_steps']} step(s) still incomplete.",
                "missing": status_data["missing_requirements"],
                "setup_status": status_data
            }
        )

    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if profile:
        profile.is_setup_complete = True
        profile.setup_confirmed_at = datetime.now(timezone.utc)
        db.commit()

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="CONFIRM_BRAND_SETUP",
        entity_type="BrandProfile",
        entity_id=profile.id if profile else 0,
        description=f"Brand setup confirmed by {current_user.full_name}. All {status_data['total_steps']} mandatory steps completed."
    )
    db.add(log)
    db.commit()

    return {
        "message": "Brand setup confirmed successfully. You can now upload content for AI audit.",
        "setup_status": get_brand_setup_status(org, db)
    }


@router.post("/reset-onboarding")
def reset_onboarding(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Reset onboarding state so user can re-complete company profile and guidelines."""
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if profile:
        profile.is_configured = False
        profile.is_setup_complete = False
        profile.setup_confirmed_at = None
        db.commit()

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="RESET_ONBOARDING",
        entity_type="BrandProfile",
        entity_id=profile.id if profile else 0,
        description=f"Brand onboarding was reset by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    return {
        "message": "Onboarding reset successfully. User will be redirected to complete brand setup.",
        "is_configured": False
    }


@router.post("/guidelines")
@router.post("/guidelines/upload")
async def upload_guideline_document(
    file: UploadFile = File(...),
    version: str = Form("1.0"),
    category: str = Form("Master Guidelines"),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document format '{ext}'. Allowed: {', '.join(settings.ALLOWED_DOC_EXTENSIONS)}"
        )

    filename = f"guideline_org_{org.id}_{file.filename}"
    file_dest = settings.UPLOAD_DIR / "guidelines" / filename

    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_dest.stat().st_size

    # Create Guideline record
    guideline = BrandGuideline(
        organisation_id=org.id,
        document_name=file.filename,
        file_path=str(file_dest),
        file_size=file_size,
        file_type=ext,
        processing_status="Processing",
        version=version,
        document_category=category,
        is_active=True
    )
    db.add(guideline)
    db.flush()

    # RAG Extraction & Chunking
    extracted_text = extract_text_from_file(str(file_dest), ext)
    extracted_rules = []
    if extracted_text:
        chunks = chunk_text(extracted_text, chunk_size=600)
        for idx, chunk in enumerate(chunks):
            sec = DocumentSection(
                guideline_id=guideline.id,
                section_index=idx,
                title=f"Section {idx+1}",
                content_text=chunk
            )
            db.add(sec)
        
        # Knowledge Extraction: Extract structured rules from guideline
        try:
            extracted_rules = extract_rules_from_guideline_text(
                text=extracted_text,
                org_id=org.id,
                source_doc=file.filename,
                db=db,
                guideline_id=guideline.id
            )
        except Exception as e:
            print(f"Rule extraction error: {e}")

        guideline.processing_status = "Verified"
        guideline.extracted_summary = f"Processed {len(chunks)} sections and extracted {len(extracted_rules)} brand rules from {file.filename}."
    else:
        guideline.processing_status = "Processed"
        guideline.extracted_summary = "Document indexed. Visual or binary content recorded."

    # Mark brand profile configured
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if brand:
        brand.is_configured = True

    # Log activity
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPLOAD_GUIDELINE",
        entity_type="BrandGuideline",
        entity_id=guideline.id,
        description=f"Uploaded and indexed brand guideline '{file.filename}' v{version} into Brand Knowledge Base."
    )
    db.add(log)
    db.commit()
    db.refresh(guideline)

    return {
        "message": "Brand guideline uploaded and indexed successfully into Brand Knowledge Base.",
        "guideline": guideline
    }

@router.get("/guidelines", response_model=List[BrandGuidelineResponse])
def list_guidelines(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org.id).order_by(BrandGuideline.created_at.desc()).all()

@router.delete("/guidelines/{id}")
def delete_guideline(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    guideline = db.query(BrandGuideline).filter(BrandGuideline.id == id, BrandGuideline.organisation_id == org.id).first()
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline document not found.")

    # Remove file on disk if exists
    try:
        p = Path(guideline.file_path)
        if p.exists():
            p.unlink()
    except Exception:
        pass

    db.delete(guideline)
    db.commit()
    return {"message": "Brand guideline deleted successfully."}

@router.patch("/guidelines/{id}/toggle-active")
def toggle_guideline_active(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    guideline = db.query(BrandGuideline).filter(BrandGuideline.id == id, BrandGuideline.organisation_id == org.id).first()
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline document not found.")
    guideline.is_active = not guideline.is_active
    db.commit()
    return {"message": "Guideline status updated.", "is_active": guideline.is_active}

# Brand Rules Management
@router.get("/rules", response_model=List[BrandRuleResponse])
def get_brand_rules(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    rules = db.query(BrandRule).filter(BrandRule.organisation_id == org.id).all()
    if not rules:
        profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
        if profile and (profile.is_configured or profile.is_setup_complete):
            ensure_baseline_governance_rules(org, profile, db)
            rules = db.query(BrandRule).filter(BrandRule.organisation_id == org.id).all()
    return rules

@router.post("/rules/seed-defaults")
def seed_default_rules(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    ensure_baseline_governance_rules(org, profile, db)
    rules = db.query(BrandRule).filter(BrandRule.organisation_id == org.id, BrandRule.is_active == True).all()
    return {"message": "Baseline brand governance rules verified.", "rules": rules}

@router.post("/rules", response_model=BrandRuleResponse)
def create_brand_rule(
    req: BrandRuleCreate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    rule = BrandRule(
        organisation_id=org.id,
        rule_category=req.rule_category,
        rule_name=req.rule_name,
        description=req.description,
        severity=req.severity,
        guideline_id=req.guideline_id,
        source_document=req.source_document or "Manual Configuration",
        section_reference=req.section_reference,
        confidence=req.confidence or 1.0,
        review_status=req.review_status or "Confirmed",
        suggested_correction=req.suggested_correction
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/rules/{id}/review", response_model=BrandRuleResponse)
def review_brand_rule(
    id: int,
    req: RuleReviewRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Review an extracted brand rule: confirm, reject, or edit details."""
    rule = db.query(BrandRule).filter(BrandRule.id == id, BrandRule.organisation_id == org.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Brand rule not found.")
    
    valid_statuses = ["Confirmed", "Rejected", "Needs Review"]
    if req.review_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid review status. Allowed: {valid_statuses}")
    
    rule.review_status = req.review_status
    if req.rule_name:
        rule.rule_name = req.rule_name
    if req.description:
        rule.description = req.description
    if req.severity:
        rule.severity = req.severity
    if req.suggested_correction is not None:
        rule.suggested_correction = req.suggested_correction
    
    rule.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rule)
    return rule

@router.post("/rules/bulk-confirm")
def bulk_confirm_brand_rules(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Bulk confirm all pending extracted brand rules."""
    rules = db.query(BrandRule).filter(
        BrandRule.organisation_id == org.id,
        BrandRule.review_status == "Needs Review"
    ).all()
    for r in rules:
        r.review_status = "Confirmed"
        r.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": f"Confirmed {len(rules)} brand rule(s).", "count": len(rules)}

@router.delete("/rules/{id}")
def delete_brand_rule(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    rule = db.query(BrandRule).filter(BrandRule.id == id, BrandRule.organisation_id == org.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Brand rule not found.")
    db.delete(rule)
    db.commit()
    return {"message": "Brand rule removed."}

# Approved Claims Management
@router.get("/approved-claims", response_model=List[ApprovedClaimResponse])
def get_approved_claims(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org.id).all()

@router.post("/approved-claims", response_model=ApprovedClaimResponse)
def create_approved_claim(
    req: ApprovedClaimCreate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    claim = ApprovedClaim(
        organisation_id=org.id,
        claim_text=req.claim_text,
        category=req.category,
        source_reference=req.source_reference,
        approved_by=current_user.full_name
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim

@router.delete("/approved-claims/{id}")
def delete_approved_claim(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    claim = db.query(ApprovedClaim).filter(ApprovedClaim.id == id, ApprovedClaim.organisation_id == org.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")
    db.delete(claim)
    db.commit()
    return {"message": "Approved claim removed."}

# Company Facts Management
@router.get("/facts", response_model=List[CompanyFactResponse])
def get_company_facts(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return db.query(CompanyFact).filter(CompanyFact.organisation_id == org.id).all()

@router.post("/facts", response_model=CompanyFactResponse)
def create_company_fact(
    req: CompanyFactCreate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    fact = CompanyFact(
        organisation_id=org.id,
        fact_title=req.fact_title,
        fact_detail=req.fact_detail,
        category=req.category,
        source_document=req.source_document
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)
    return fact

@router.delete("/facts/{id}")
def delete_company_fact(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    fact = db.query(CompanyFact).filter(CompanyFact.id == id, CompanyFact.organisation_id == org.id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Company fact not found.")
    db.delete(fact)
    db.commit()
    return {"message": "Company fact removed."}

# Brand Assets & Flexible Logo Management
@router.get("/assets", response_model=List[BrandAssetResponse])
def get_brand_assets(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return db.query(BrandAsset).filter(BrandAsset.organisation_id == org.id).order_by(BrandAsset.is_primary.desc(), BrandAsset.created_at.desc()).all()

@router.post("/logos/process")
async def process_logo_upload(
    file: UploadFile = File(...),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Accept multiple image, vector, and document formats:
    - Images: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF
    - Vectors: SVG (sanitized & converted to high-res PNG)
    - Documents: PDF, DOCX, PPTX (extracts embedded logo candidates)
    """
    is_valid, ext, category_or_msg = logo_processor.validate_file_format(file.filename)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=category_or_msg)

    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB."
        )

    if category_or_msg == "document":
        result = logo_processor.extract_candidates_from_document(content_bytes, file.filename, org.id)
    else:
        result = logo_processor.process_direct_image(content_bytes, file.filename, org.id)

    return result

@router.post("/logos/select-candidate")
def select_logo_candidate(
    req: SelectCandidateRequest,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Promote an extracted document candidate to a ready raster asset."""
    try:
        return logo_processor.confirm_logo_candidate(req.candidate_preview_url, req.original_filename, org.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logos/crop")
def crop_logo_region(
    req: CropLogoRequest,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Crop an existing raster or candidate image."""
    try:
        box = {
            "x": req.x,
            "y": req.y,
            "width": req.width,
            "height": req.height,
            "is_percentage": req.is_percentage
        }
        return logo_processor.crop_logo_region(req.raster_url, box, org.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logos/confirm", response_model=BrandAssetResponse)
def confirm_official_logo(
    req: ConfirmLogoRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Save the confirmed logo as an official brand asset.
    Preserves original file, supports variations (Primary, Secondary, Icon-Only, Light-BG, Dark-BG),
    and updates brand configuration without silently replacing existing assets.
    """
    is_primary = req.is_primary or (req.variation_type == "Primary Logo")

    # If setting as primary, demote existing primary logos
    if is_primary:
        db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id,
            BrandAsset.is_primary == True
        ).update({"is_primary": False})

    # Read dimensions and properties from raster file
    raster_name = Path(req.raster_path).name
    local_raster = settings.UPLOAD_DIR / "logos" / "rasters" / raster_name
    width, height, has_transparency = None, None, False
    file_size = 0
    if local_raster.exists():
        try:
            with Image.open(local_raster) as img:
                width, height = img.size
                has_transparency = img.mode in ('RGBA', 'LA') or 'transparency' in img.info
            file_size = local_raster.stat().st_size
        except Exception:
            pass

    source_fmt = Path(req.original_path).suffix.replace('.', '').upper() or "PNG"

    asset = BrandAsset(
        organisation_id=org.id,
        asset_type=req.asset_type or req.variation_type or "Primary Logo",
        variation_type=req.variation_type or req.asset_type or "Primary Logo",
        file_name=req.file_name,
        file_path=req.original_path,
        raster_path=req.raster_path,
        source_format=source_fmt,
        file_size=file_size,
        width=width,
        height=height,
        has_transparency=has_transparency,
        description=req.description or f"{req.variation_type} for {org.name}",
        is_primary=is_primary
    )
    db.add(asset)

    if is_primary:
        org.logo_url = req.raster_path or req.original_path
        brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
        if brand:
            brand.logo_path = str(local_raster)
            brand.is_configured = True

    # Audit trail
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="CONFIRM_BRAND_LOGO",
        entity_type="BrandAsset",
        description=f"Confirmed official {req.variation_type}: '{req.file_name}' ({source_fmt})."
    )
    db.add(log)
    db.commit()
    db.refresh(asset)
    return asset

@router.post("/assets/{id}/set-primary", response_model=BrandAssetResponse)
def set_asset_as_primary(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Set an existing asset as the official primary logo."""
    asset = db.query(BrandAsset).filter(BrandAsset.id == id, BrandAsset.organisation_id == org.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Brand asset not found.")

    # Demote others
    db.query(BrandAsset).filter(
        BrandAsset.organisation_id == org.id,
        BrandAsset.is_primary == True
    ).update({"is_primary": False})

    asset.is_primary = True
    asset.variation_type = "Primary Logo"
    asset.asset_type = "Primary Logo"

    # Update org and profile
    org.logo_url = asset.raster_path or asset.file_path
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if brand:
        raster_file = settings.UPLOAD_DIR / "logos" / "rasters" / Path(asset.raster_path).name if asset.raster_path else None
        if raster_file and raster_file.exists():
            brand.logo_path = str(raster_file)
        else:
            brand.logo_path = asset.file_path
        brand.is_configured = True

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="SET_PRIMARY_LOGO",
        entity_type="BrandAsset",
        entity_id=asset.id,
        description=f"Designated '{asset.file_name}' as official Primary Logo."
    )
    db.add(log)
    db.commit()
    db.refresh(asset)
    return asset

@router.patch("/assets/{id}", response_model=BrandAssetResponse)
def update_brand_asset(
    id: int,
    req: BrandAssetUpdateRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Rename or update asset variation type / description."""
    asset = db.query(BrandAsset).filter(BrandAsset.id == id, BrandAsset.organisation_id == org.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Brand asset not found.")

    if req.file_name is not None:
        asset.file_name = req.file_name.strip()
    if req.description is not None:
        asset.description = req.description.strip()
    if req.variation_type is not None:
        asset.variation_type = req.variation_type.strip()
        asset.asset_type = req.variation_type.strip()

    if req.is_primary is True:
        db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id,
            BrandAsset.is_primary == True
        ).update({"is_primary": False})
        asset.is_primary = True
        org.logo_url = asset.raster_path or asset.file_path

    db.commit()
    db.refresh(asset)
    return asset

@router.post("/assets")
async def upload_brand_asset(
    file: UploadFile = File(...),
    asset_type: str = Form("Primary Logo"),
    description: str = Form(""),
    is_primary: bool = Form(False),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    is_valid, ext, category_or_msg = logo_processor.validate_file_format(file.filename)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=category_or_msg
        )

    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB."
        )

    if category_or_msg == "document":
        doc_result = logo_processor.extract_candidates_from_document(content_bytes, file.filename, org.id)
        if not doc_result.get("candidates"):
            raise HTTPException(status_code=400, detail="No embedded logo or image found in uploaded document.")
        # Promote first candidate by default for direct form
        cand = doc_result["candidates"][0]
        proc_result = logo_processor.confirm_logo_candidate(cand["preview_url"], file.filename, org.id)
        orig_path = doc_result["original_path"]
        raster_path = proc_result["raster_path"]
        file_size = cand["file_size"]
        w = cand["width"]
        h = cand["height"]
        has_alpha = cand["characteristics"]["has_transparency"]
    else:
        proc_result = logo_processor.process_direct_image(content_bytes, file.filename, org.id)
        orig_path = proc_result["original_path"]
        raster_path = proc_result["raster_path"]
        file_size = proc_result["file_size"]
        w = proc_result["characteristics"]["width"]
        h = proc_result["characteristics"]["height"]
        has_alpha = proc_result["characteristics"]["has_transparency"]

    primary_flag = is_primary or (asset_type == "Primary Logo")

    if primary_flag:
        db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id,
            BrandAsset.is_primary == True
        ).update({"is_primary": False})

    asset = BrandAsset(
        organisation_id=org.id,
        asset_type=asset_type,
        variation_type=asset_type,
        file_name=file.filename,
        file_path=orig_path,
        raster_path=raster_path,
        source_format=ext.replace('.', '').upper(),
        file_size=file_size,
        width=w,
        height=h,
        has_transparency=has_alpha,
        description=description or f"{asset_type} asset for {org.name}",
        is_primary=primary_flag
    )
    db.add(asset)

    if primary_flag:
        org.logo_url = raster_path or orig_path
        brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
        if brand:
            brand.logo_path = proc_result["local_raster_dest"]
            brand.is_configured = True

    db.commit()
    db.refresh(asset)
    return {"message": f"{asset_type} uploaded successfully.", "asset": asset}

@router.delete("/assets/{id}")
def delete_brand_asset(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    asset = db.query(BrandAsset).filter(BrandAsset.id == id, BrandAsset.organisation_id == org.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Brand asset not found.")

    was_primary = asset.is_primary

    # Clean up local files
    try:
        if asset.file_path:
            p = settings.UPLOAD_DIR / "logos" / "originals" / Path(asset.file_path).name
            p.unlink(missing_ok=True)
        if asset.raster_path:
            rp = settings.UPLOAD_DIR / "logos" / "rasters" / Path(asset.raster_path).name
            rp.unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(asset)
    db.commit()

    # If the deleted asset was primary, promote next available logo
    if was_primary:
        next_asset = db.query(BrandAsset).filter(
            BrandAsset.organisation_id == org.id
        ).order_by(BrandAsset.created_at.desc()).first()

        brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
        if next_asset:
            next_asset.is_primary = True
            next_asset.variation_type = "Primary Logo"
            org.logo_url = next_asset.raster_path or next_asset.file_path
            if brand:
                raster_local = settings.UPLOAD_DIR / "logos" / "rasters" / Path(next_asset.raster_path).name if next_asset.raster_path else None
                brand.logo_path = str(raster_local) if raster_local and raster_local.exists() else next_asset.file_path
        else:
            org.logo_url = None
            if brand:
                brand.logo_path = None
        db.commit()

    return {"message": "Brand asset deleted successfully."}

@router.patch("/approved-claims/{id}/toggle-active")
def toggle_approved_claim(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    claim = db.query(ApprovedClaim).filter(ApprovedClaim.id == id, ApprovedClaim.organisation_id == org.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")
    claim.is_active = not claim.is_active
    db.commit()
    return {"message": "Claim status updated.", "is_active": claim.is_active}
