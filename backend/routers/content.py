import re
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, BrandProfile, BrandGuideline, DocumentSection, BrandRule, UploadedContent,
    ContentVersion, AuditReport, AuditFinding, DetectedClaim, ActivityLog, BrandAsset,
    CompanyFact, ApprovedClaim
)
from backend.schemas.all_schemas import (
    UploadedContentResponse, ContentVersionResponse,
    AISuggestionsResponse, AISuggestionItem,
    RewriteCopyRequest, RewriteCopyResponse,
    GenerateRevisedCreativeRequest, GenerateRevisedCreativeResponse,
    AuditReportResponse
)
from backend.services.vision_engine import (
    analyze_image_deterministic, analyze_image_with_gemini,
    generate_ai_suggestions_for_audit, rewrite_copy_content,
    generate_revised_creative_image
)
from backend.services.rag_engine import verify_claim_against_knowledge_base
from backend.routers.brand_knowledge import check_brand_setup_complete

router = APIRouter(prefix="/content", tags=["Content Intelligence"])

@router.post("/upload")
async def upload_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    caption: Optional[str] = Form(None),
    hashtags: Optional[str] = Form(None),
    platform: str = Form("Instagram"),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Only {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)} are supported."
        )

    # Use unique timestamped naming to prevent collisions and repeated cache
    timestamp = int(datetime.now(timezone.utc).timestamp())
    clean_name = Path(file.filename).name.replace(" ", "_")
    filename = f"content_org_{org.id}_{timestamp}_{clean_name}"
    file_dest = settings.UPLOAD_DIR / "images" / filename

    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_dest.stat().st_size
    if file_size > settings.MAX_FILE_SIZE_BYTES:
        file_dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB."
        )

    file_url = f"/uploads/images/{filename}"

    content = UploadedContent(
        organisation_id=org.id,
        user_id=current_user.id,
        title=title,
        caption=caption,
        hashtags=hashtags,
        platform=platform,
        media_type="Image",
        file_path=file_url,
        file_name=file.filename,
        file_size=file_size,
        current_version=1,
        approval_status="Draft"
    )
    db.add(content)
    db.flush()

    # Initial Version Record
    v1 = ContentVersion(
        content_id=content.id,
        version_number=1,
        file_path=file_url,
        caption=caption,
        changes_summary="Initial creative submission.",
        generated_by="User"
    )
    db.add(v1)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPLOAD_CONTENT",
        entity_type="UploadedContent",
        entity_id=content.id,
        description=f"Creative '{title}' ({file.filename}) uploaded under version 1."
    )
    db.add(log)
    db.commit()
    db.refresh(content)

    return {
        "message": "Content uploaded successfully. Ready for AI Brand Audit.",
        "content": content
    }

@router.get("", response_model=List[UploadedContentResponse])
def list_contents(
    status: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    query = db.query(UploadedContent).filter(UploadedContent.organisation_id == org.id)
    if status:
        query = query.filter(UploadedContent.approval_status == status)
    if platform:
        query = query.filter(UploadedContent.platform == platform)
    if search:
        query = query.filter(UploadedContent.title.ilike(f"%{search}%"))

    return query.order_by(UploadedContent.created_at.desc()).all()

@router.get("/{id}", response_model=UploadedContentResponse)
def get_content_detail(
    id: int,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found.")
    return content

@router.delete("/{id}")
def delete_content(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found.")

    # Remove physical file if local
    try:
        filename = Path(content.file_path).name
        local_path = settings.UPLOAD_DIR / "images" / filename
        if local_path.exists():
            local_path.unlink()
        if content.revised_file_path:
            revised_filename = Path(content.revised_file_path).name
            rev_path = settings.UPLOAD_DIR / "images" / revised_filename
            if rev_path.exists():
                rev_path.unlink()
    except Exception:
        pass

    db.delete(content)
    db.commit()
    return {"message": "Content record and associated analysis versions deleted."}

@router.post("/{id}/analyse")
async def analyse_content(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    # Phase 4 Enforcement: Strictly verify brand setup is complete before analysis
    check_brand_setup_complete(org, db)

    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    # Check which file to analyze based on current version
    current_version_rec = db.query(ContentVersion).filter(
        ContentVersion.content_id == content.id,
        ContentVersion.version_number == content.current_version
    ).first()

    target_file_path = current_version_rec.file_path if current_version_rec else content.file_path
    filename = Path(target_file_path).name
    local_path = settings.UPLOAD_DIR / "images" / filename
    if not local_path.exists():
        raise HTTPException(status_code=400, detail="Image file not found on server.")

    brand_profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    guidelines = db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org.id, BrandGuideline.is_active == True).all()
    document_sections = (
        db.query(DocumentSection)
        .join(BrandGuideline)
        .filter(BrandGuideline.organisation_id == org.id)
        .all()
    )
    brand_rules = db.query(BrandRule).filter(BrandRule.organisation_id == org.id, BrandRule.is_active == True).all()
    brand_assets = db.query(BrandAsset).filter(BrandAsset.organisation_id == org.id).all()
    company_facts = db.query(CompanyFact).filter(CompanyFact.organisation_id == org.id).all()
    approved_claims = db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org.id, ApprovedClaim.is_active == True).all()

    # Active guideline version string
    active_version_str = guidelines[0].version if guidelines else "1.0"
    is_revised = (content.current_version > 1)
    caption_text = current_version_rec.caption if current_version_rec else content.caption
    combined_cap = f"{content.title}. {caption_text or ''} {content.hashtags or ''}".strip()

    # Try Gemini Vision first if key configured, otherwise use deterministic vision engine
    analysis_data = await analyze_image_with_gemini(
        str(local_path),
        brand_profile=brand_profile,
        guidelines=guidelines,
        brand_rules=brand_rules,
        brand_assets=brand_assets,
        org=org,
        document_sections=document_sections,
        company_facts=company_facts,
        approved_claims=approved_claims,
        caption=combined_cap
    )
    if not analysis_data:
        analysis_data = analyze_image_deterministic(
            str(local_path),
            caption=combined_cap,
            brand_profile=brand_profile,
            org=org,
            guidelines=guidelines,
            document_sections=document_sections,
            brand_rules=brand_rules,
            brand_assets=brand_assets,
            company_facts=company_facts,
            approved_claims=approved_claims,
            is_revised_version=is_revised,
            db=db
        )

    # Create Audit Report with guideline version & final recommendation
    report = AuditReport(
        content_id=content.id,
        version_number=content.current_version,
        guideline_version=active_version_str,
        overall_status=analysis_data.get("overall_status", "Needs Review"),
        final_recommendation=analysis_data.get("final_recommendation", "Needs Review"),
        visual_quality_score=analysis_data.get("scores", {}).get("visual_quality", 80.0),
        readability_score=analysis_data.get("scores", {}).get("readability", 80.0),
        brand_consistency_score=analysis_data.get("scores", {}).get("brand_consistency", 0.0),
        messaging_score=analysis_data.get("scores", {}).get("messaging_quality", 80.0),
        extracted_text=analysis_data.get("extracted_text", ""),
        extracted_visuals_json=analysis_data.get("logo_detection"),
        summary=analysis_data.get("summary", ""),
        raw_analysis_json=analysis_data
    )
    db.add(report)
    db.flush()

    # Add Findings with expected rule and comparison result
    for f in analysis_data.get("findings", []):
        finding = AuditFinding(
            report_id=report.id,
            issue_type=f.get("issue_type", "General"),
            severity=f.get("severity", "Medium"),
            title=f.get("title", "Governance Observation"),
            description=f.get("description", ""),
            why_it_matters=f.get("why_it_matters", ""),
            evidence_found=f.get("evidence_found", ""),
            expected_rule=f.get("expected_rule", ""),
            comparison_result=f.get("comparison_result", "Needs Improvement"),
            suggested_correction=f.get("suggested_correction", ""),
            status="Open"
        )
        db.add(finding)

    # Phase 8 / Step 4: Stale Finding Handling
    # If the fresh verification confirms the official logo, resolve any open false-positive logo findings from prior reports
    logo_info = analysis_data.get("logo_detection", {})
    if logo_info.get("detected") or logo_info.get("status") == "Logo Verified":
        stale_logo_findings = (
            db.query(AuditFinding)
            .join(AuditReport, AuditFinding.report_id == AuditReport.id)
            .filter(
                AuditReport.content_id == content.id,
                AuditReport.id != report.id,
                AuditFinding.issue_type == "Logo",
                AuditFinding.status == "Open"
            )
            .all()
        )
        for old_f in stale_logo_findings:
            old_f.status = "Resolved"
            old_f.is_resolved = True
            old_f.resolved_in_version = content.current_version

    # Add Claims & Run RAG Grounded Verification
    created_claims = []
    for c in analysis_data.get("claims", []):
        rag_res = verify_claim_against_knowledge_base(
            claim_statement=c.get("statement", ""),
            org_id=org.id,
            db=db
        )
        claim = DetectedClaim(
            content_id=content.id,
            report_id=report.id,
            statement=c.get("statement", ""),
            category=c.get("category", "Marketing Claim"),
            location_in_creative=c.get("location_in_creative", "Headline / Body"),
            related_guideline=c.get("related_guideline", "Claim Substantiation Policy"),
            evidence_requirement=c.get("evidence_requirement", "Supporting verification proof"),
            verification_status=rag_res.get("verification_status", "Not Verified"),
            confidence_score=c.get("confidence_score", 0.90),
            risk_level=c.get("risk_level", "Medium"),
            required_action=c.get("required_action", "Upload proof documentation.")
        )
        db.add(claim)
        created_claims.append(claim)

    # Determine Content Approval Status
    if any(f.get("severity") == "Critical" for f in analysis_data.get("findings", [])):
        content.approval_status = "Needs Improvement"
    elif created_claims:
        unverified_claims = [cl for cl in created_claims if cl.verification_status in ["Not Verified", "Needs Human Review"]]
        content.approval_status = "Needs Verification" if unverified_claims else "Pending Approval"
    elif any(f.get("severity") == "High" for f in analysis_data.get("findings", [])):
        content.approval_status = "Needs Review"
    else:
        content.approval_status = "Pending Approval"

    # Pre-generate AI suggestions and attach to content
    suggestions = generate_ai_suggestions_for_audit(report, brand_profile, content)
    content.ai_suggestions = suggestions

    # Log Activity
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="ANALYSE_CONTENT",
        entity_type="AuditReport",
        entity_id=report.id,
        description=f"AI brand audit completed for '{content.title}' (v{content.current_version}). Status: {content.approval_status}."
    )
    db.add(log)
    db.commit()
    db.refresh(content)
    db.refresh(report)

    return {
        "message": "AI Brand Audit completed successfully.",
        "content_id": content.id,
        "report_id": report.id,
        "approval_status": content.approval_status,
        "report": AuditReportResponse.model_validate(report)
    }

@router.post("/{id}/reanalyse")
async def reanalyse_content(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    check_brand_setup_complete(org, db)

    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    # When reanalysing existing audited content, bump version so historical reports are preserved
    existing_reports_count = db.query(AuditReport).filter(AuditReport.content_id == content.id).count()
    if existing_reports_count > 0:
        new_v = (content.current_version or 1) + 1
        content.current_version = new_v
        
        existing_cv = db.query(ContentVersion).filter(
            ContentVersion.content_id == content.id,
            ContentVersion.version_number == new_v
        ).first()
        if not existing_cv:
            target_path = content.revised_file_path or content.file_path
            new_cv = ContentVersion(
                content_id=content.id,
                version_number=new_v,
                file_path=target_path,
                caption=content.caption,
                changes_summary=f"Reanalysis snapshot v{new_v}",
                generated_by="User"
            )
            db.add(new_cv)
        db.commit()

    return await analyse_content(id=id, current_user=current_user, org=org, db=db)

# ─── PHASE 9: AI SUGGESTIONS & CONTENT CORRECTION ─────────────────────────────

@router.get("/{id}/suggestions", response_model=AISuggestionsResponse)
@router.post("/{id}/suggest-corrections", response_model=AISuggestionsResponse)
def get_ai_suggestions(
    id: int,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Retrieve actionable AI correction suggestions for the latest audit findings."""
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found.")

    latest_report = (
        db.query(AuditReport)
        .filter(AuditReport.content_id == content.id)
        .order_by(AuditReport.created_at.desc())
        .first()
    )
    if not latest_report:
        raise HTTPException(status_code=400, detail="Content has not been audited yet.")

    brand_profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    suggestions = generate_ai_suggestions_for_audit(latest_report, brand_profile, content)

    return {
        "content_id": content.id,
        "version": content.current_version,
        "suggestions": suggestions,
        "overall_recommendation": latest_report.final_recommendation or "Needs Review"
    }

@router.post("/{id}/rewrite-copy", response_model=RewriteCopyResponse)
def rewrite_copy(
    id: int,
    req: RewriteCopyRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Rewrite headline, caption, CTA, removing restricted words and aligning with brand voice."""
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    brand_profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    rewritten = rewrite_copy_content(
        original_headline=content.title,
        original_caption=content.caption or content.title,
        brand_profile=brand_profile,
        mode=req.mode
    )
    return rewritten

@router.post("/{id}/generate-revised-creative", response_model=GenerateRevisedCreativeResponse)
async def generate_revised_creative(
    id: int,
    req: GenerateRevisedCreativeRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Generate an updated, brand-compliant revised creative version.
    Saves as a new version, NEVER overwriting the original uploaded creative.
    """
    check_brand_setup_complete(org, db)

    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    # Original local path
    orig_filename = Path(content.file_path).name
    orig_local_path = settings.UPLOAD_DIR / "images" / orig_filename
    if not orig_local_path.exists():
        raise HTTPException(status_code=400, detail="Original creative asset not found.")

    brand_profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()

    # Determine new version number (strictly increment beyond any existing version)
    all_version_nums = [v.version_number for v in content.versions] if content.versions else []
    new_version_num = max(all_version_nums + [content.current_version, 1]) + 1

    # Revised file name
    timestamp = int(datetime.now(timezone.utc).timestamp())
    revised_filename = f"content_org_{org.id}_v{new_version_num}_{timestamp}_revised.png"
    revised_local_path = settings.UPLOAD_DIR / "images" / revised_filename

    brand_assets = db.query(BrandAsset).filter(BrandAsset.organisation_id == org.id).all()
    latest_report = (
        db.query(AuditReport)
        .filter(AuditReport.content_id == content.id)
        .order_by(AuditReport.version_number.desc(), AuditReport.created_at.desc())
        .first()
    )

    # Execute precision AI creative synthesis
    synth_res = generate_revised_creative_image(
        original_image_path=str(orig_local_path),
        output_image_path=str(revised_local_path),
        brand_profile=brand_profile,
        headline_text=req.headline or content.title,
        caption_text=req.caption or content.caption,
        brand_assets=brand_assets,
        audit_report=latest_report,
        finding_id=req.finding_id,
        correction_type=req.correction_type,
        mode=req.mode
    )

    revised_file_url = f"/uploads/images/{revised_filename}"
    revised_caption = req.caption or content.caption
    applied_corrections = synth_res.get("applied_corrections", [])
    changes_summary = synth_res.get("changes_summary") or f"AI-Generated Revision v{new_version_num}: Embedded official brand logo, applied brand palette bar, calibrated headline and messaging."

    # Create new ContentVersion record
    version_rec = ContentVersion(
        content_id=content.id,
        version_number=new_version_num,
        file_path=revised_file_url,
        caption=revised_caption,
        changes_summary=changes_summary,
        ai_suggestions=applied_corrections,
        generated_by="BrandGuard AI Correction Engine"
    )
    db.add(version_rec)

    # Update content record pointers without touching original file!
    content.current_version = new_version_num
    content.revised_file_path = revised_file_url
    content.revised_caption = revised_caption
    content.updated_at = datetime.now(timezone.utc)

    # Activity Log
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="GENERATE_REVISED_CREATIVE",
        entity_type="ContentVersion",
        entity_id=version_rec.id,
        description=f"Generated revised creative v{new_version_num} for '{content.title}'."
    )
    db.add(log)
    db.commit()
    db.refresh(content)

    design_spec = synth_res.get("design_spec", {
        "applied_logo": bool(brand_profile and brand_profile.logo_path),
        "primary_color_hex": brand_profile.primary_color if brand_profile else "#1A56DB",
        "typography": brand_profile.primary_font if brand_profile else "Inter",
        "tone_applied": brand_profile.tone_of_voice if brand_profile else "Professional",
        "layout_mode": req.mode
    })

    return {
        "content_id": content.id,
        "new_version_number": new_version_num,
        "original_file_path": content.file_path,
        "revised_file_path": revised_file_url,
        "revised_caption": revised_caption or "",
        "changes_summary": changes_summary,
        "design_spec": design_spec,
        "applied_corrections": applied_corrections
    }

@router.post("/{id}/upload-version")
async def upload_content_version(
    id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Upload a user-edited final creative image as a new version.
    Supports PNG, JPG, JPEG, and WEBP.
    Never overwrites original or previous versions.
    Stores upload date, version number, and source: 'User Uploaded'.
    """
    check_brand_setup_complete(org, db)

    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Only PNG, JPG, JPEG, and WEBP are supported."
        )

    # Read and validate image
    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size ({settings.MAX_FILE_SIZE_BYTES / (1024*1024):.0f}MB)."
        )

    # Verify readable image using PIL
    try:
        from io import BytesIO
        from PIL import Image as PILTestImage
        with PILTestImage.open(BytesIO(content_bytes)) as test_img:
            test_img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid or readable image."
        )

    # Calculate new version number
    all_version_nums = [v.version_number for v in content.versions] if content.versions else []
    new_version_num = max(all_version_nums + [content.current_version, 1]) + 1

    # Unique filename
    timestamp = int(datetime.now(timezone.utc).timestamp())
    clean_stem = re.sub(r'[^a-zA-Z0-9_-]', '_', Path(file.filename).stem)
    filename = f"content_org_{org.id}_v{new_version_num}_{timestamp}_{clean_stem}{ext}"
    local_path = settings.UPLOAD_DIR / "images" / filename

    with open(local_path, "wb") as f:
        f.write(content_bytes)

    file_url = f"/uploads/images/{filename}"
    summary_text = notes.strip() if notes and notes.strip() else f"User-uploaded manual final creative (Version {new_version_num})."

    # Create new ContentVersion record
    version_rec = ContentVersion(
        content_id=content.id,
        version_number=new_version_num,
        file_path=file_url,
        caption=content.caption,
        changes_summary=summary_text,
        generated_by="User Uploaded",
        created_at=datetime.now(timezone.utc)
    )
    db.add(version_rec)

    # Update content pointers
    content.current_version = new_version_num
    content.revised_file_path = file_url
    content.updated_at = datetime.now(timezone.utc)

    # Activity Log
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPLOAD_FINAL_VERSION",
        entity_type="ContentVersion",
        entity_id=version_rec.id,
        description=f"User uploaded final creative v{new_version_num} ({file.filename}) for '{content.title}'."
    )
    db.add(log)
    db.commit()
    db.refresh(content)
    db.refresh(version_rec)

    return {
        "message": f"Final image uploaded as Version {new_version_num}.",
        "version": {
            "id": version_rec.id,
            "version_number": version_rec.version_number,
            "file_path": version_rec.file_path,
            "caption": version_rec.caption,
            "changes_summary": version_rec.changes_summary,
            "generated_by": version_rec.generated_by,
            "audit_id": version_rec.audit_id,
            "created_at": version_rec.created_at
        },
        "content_id": content.id,
        "current_version": content.current_version,
        "revised_file_path": content.revised_file_path
    }

@router.get("/{id}/download-version/{version_num}")
def download_specific_version(
    id: int,
    version_num: int,
    token: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Download the exact selected image version in high quality.
    Ensures downloaded asset is the exact selected version, never an older version.
    """
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    target_ver = db.query(ContentVersion).filter(
        ContentVersion.content_id == content.id,
        ContentVersion.version_number == version_num
    ).first()

    file_url = target_ver.file_path if target_ver else (content.file_path if version_num == 1 else content.revised_file_path)
    if not file_url:
        raise HTTPException(status_code=404, detail=f"Image for version {version_num} not found.")

    filename = Path(file_url).name
    local_path = settings.UPLOAD_DIR / "images" / filename
    if not local_path.exists():
        raise HTTPException(status_code=404, detail="Physical creative file not found on disk.")

    source_tag = (target_ver.generated_by if target_ver else "Asset").replace(" ", "_")
    clean_title = re.sub(r'[^a-zA-Z0-9_-]', '_', content.title)
    download_filename = f"{clean_title}_v{version_num}_{source_tag}{local_path.suffix}"

    media_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(local_path.suffix.lower(), "application/octet-stream")

    return Response(
        content=local_path.read_bytes(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Cache-Control": "no-cache"
        }
    )

# ─── PHASE 10: RE-AUDIT & VERSION COMPARISON ─────────────────────────────────

@router.get("/{id}/versions", response_model=List[ContentVersionResponse])
def get_content_versions(
    id: int,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Retrieve full version history of an asset for side-by-side comparison."""
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    return db.query(ContentVersion).filter(ContentVersion.content_id == content.id).order_by(ContentVersion.version_number.asc()).all()

@router.post("/{id}/reanalyse-version/{version_num}")
async def reanalyse_specific_version(
    id: int,
    version_num: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Re-audit a specific version (original, AI-edited, or user-uploaded) using the real audit pipeline.
    Compares findings with the base version (reports fixed issues and remaining issues).
    """
    check_brand_setup_complete(org, db)

    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    target_version = db.query(ContentVersion).filter(
        ContentVersion.content_id == content.id,
        ContentVersion.version_number == version_num
    ).first()
    if not target_version:
        raise HTTPException(status_code=404, detail=f"Version {version_num} not found.")

    # Set current version to target
    content.current_version = version_num
    db.commit()

    # Run real analysis on this exact version
    audit_res = await analyse_content(id=id, current_user=current_user, org=org, db=db)

    # Link the fresh AuditReport to target_version.audit_id
    latest_report = (
        db.query(AuditReport)
        .filter(AuditReport.content_id == content.id, AuditReport.version_number == version_num)
        .order_by(AuditReport.created_at.desc())
        .first()
    )
    if latest_report:
        target_version.audit_id = latest_report.id
        db.commit()

    # Compare findings between v1 and new version
    v1_report = (
        db.query(AuditReport)
        .filter(AuditReport.content_id == content.id, AuditReport.version_number == 1)
        .order_by(AuditReport.created_at.desc())
        .first()
    )
    new_report = latest_report

    fixed_issues = []
    remaining_issues = []

    if v1_report and new_report and v1_report.id != new_report.id:
        v1_findings = {f.title: f for f in v1_report.findings}
        new_findings = {f.title: f for f in new_report.findings}

        for title, f in v1_findings.items():
            if title not in new_findings:
                f.status = "Resolved"
                fixed_issues.append({"title": title, "severity": f.severity, "status": "Resolved", "id": f.id})
            else:
                remaining_issues.append({"title": title, "severity": f.severity, "status": "Still Present", "id": f.id})

        for title, f in new_findings.items():
            if title not in v1_findings and not any(r["title"] == title for r in remaining_issues):
                remaining_issues.append({"title": title, "severity": f.severity, "status": "Open", "id": f.id})

        db.commit()
    elif new_report:
        for f in new_report.findings:
            if f.status == "Resolved" or getattr(f, 'is_resolved', False):
                fixed_issues.append({"title": f.title, "severity": f.severity, "status": "Resolved", "id": f.id})
            else:
                remaining_issues.append({"title": f.title, "severity": f.severity, "status": "Open", "id": f.id})

    return {
        "audit_result": audit_res,
        "version_compared": {
            "base_version": 1,
            "target_version": version_num,
            "fixed_issues": fixed_issues,
            "remaining_issues": remaining_issues,
            "fixed_count": len(fixed_issues),
            "remaining_count": len(remaining_issues)
        }
    }
