import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, DetectedClaim, ClaimEvidence, UploadedContent, ActivityLog
)
from backend.schemas.all_schemas import DetectedClaimResponse, ClaimEvidenceResponse
from backend.services.rag_engine import extract_text_from_file, verify_claim_against_knowledge_base

router = APIRouter(prefix="/claims", tags=["Claim Verification"])

@router.get("", response_model=List[DetectedClaimResponse])
def list_claims(
    content_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    query = (
        db.query(DetectedClaim)
        .join(UploadedContent)
        .filter(UploadedContent.organisation_id == org.id)
    )
    if content_id:
        query = query.filter(DetectedClaim.content_id == content_id)
    if status:
        query = query.filter(DetectedClaim.verification_status == status)

    return query.order_by(DetectedClaim.created_at.desc()).all()

@router.post("/{id}/evidence")
async def upload_claim_evidence(
    id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    claim = (
        db.query(DetectedClaim)
        .join(UploadedContent)
        .filter(DetectedClaim.id == id, UploadedContent.organisation_id == org.id)
        .first()
    )
    if not claim:
        raise HTTPException(status_code=404, detail="Detected claim record not found.")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported evidence file format '{ext}'."
        )

    filename = f"evidence_claim_{claim.id}_{file.filename}"
    file_dest = settings.UPLOAD_DIR / "evidence" / filename

    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_dest.stat().st_size

    evidence = ClaimEvidence(
        claim_id=claim.id,
        file_path=str(file_dest),
        file_name=file.filename,
        file_size=file_size,
        description=description or f"Supporting evidence for claim: {claim.statement[:60]}...",
        uploaded_by=current_user.full_name,
        verification_status="Under Review"
    )
    db.add(evidence)
    db.flush()

    # Extract text from uploaded proof and run RAG Verification
    proof_text = extract_text_from_file(str(file_dest), ext)
    rag_result = verify_claim_against_knowledge_base(
        claim_statement=claim.statement,
        org_id=org.id,
        db=db,
        evidence_text=proof_text
    )

    claim.verification_status = rag_result["verification_status"]
    evidence.verification_status = rag_result["verification_status"]
    evidence.verification_notes = f"{rag_result['explanation']} Excerpt: {rag_result.get('matched_excerpt', 'None')}"

    # Check if all claims for the parent content are now supported
    parent_content = db.query(UploadedContent).filter(UploadedContent.id == claim.content_id).first()
    if parent_content:
        all_claims = db.query(DetectedClaim).filter(DetectedClaim.content_id == parent_content.id).all()
        if all(c.verification_status == "Supported" for c in all_claims):
            parent_content.approval_status = "Pending Approval"
        else:
            parent_content.approval_status = "Needs Verification"

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPLOAD_CLAIM_EVIDENCE",
        entity_type="ClaimEvidence",
        entity_id=evidence.id,
        description=f"Uploaded proof '{file.filename}' for claim '{claim.statement[:50]}...'. Verification result: {claim.verification_status}."
    )
    db.add(log)
    db.commit()
    db.refresh(claim)

    return {
        "message": f"Evidence uploaded and verified. Status: {claim.verification_status}.",
        "verification_result": rag_result,
        "claim": claim
    }

@router.post("/{id}/verify")
def verify_claim(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    claim = (
        db.query(DetectedClaim)
        .join(UploadedContent)
        .filter(DetectedClaim.id == id, UploadedContent.organisation_id == org.id)
        .first()
    )
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    rag_result = verify_claim_against_knowledge_base(
        claim_statement=claim.statement,
        org_id=org.id,
        db=db
    )
    claim.verification_status = rag_result["verification_status"]
    db.commit()
    db.refresh(claim)

    return {
        "message": "Claim verification updated.",
        "status": claim.verification_status,
        "details": rag_result
    }
