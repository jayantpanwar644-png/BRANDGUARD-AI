from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, UploadedContent, ApprovalRecord, ReviewerComment, DetectedClaim, ActivityLog
)
from backend.schemas.all_schemas import (
    UploadedContentResponse, ApprovalDecisionRequest, AddCommentRequest,
    ApprovalRecordResponse, ReviewerCommentResponse
)

router = APIRouter(prefix="/approvals", tags=["Approval & Workflow"])

@router.get("", response_model=List[UploadedContentResponse])
def get_approvals(
    status_filter: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    query = db.query(UploadedContent).filter(UploadedContent.organisation_id == org.id)
    if status_filter:
        query = query.filter(UploadedContent.approval_status == status_filter)
    else:
        # By default show items that require human action
        query = query.filter(UploadedContent.approval_status.in_([
            "Needs Verification", "Pending Evidence", "Pending Approval", "Changes Requested"
        ]))

    return query.order_by(UploadedContent.updated_at.desc()).all()

@router.post("/{id}/decision")
def make_approval_decision(
    id: int,
    req: ApprovalDecisionRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    valid_decisions = ["Approved", "Rejected", "Changes Requested", "Evidence Requested"]
    if req.decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{req.decision}'. Allowed: {', '.join(valid_decisions)}"
        )

    # Check approval rules
    if req.decision == "Approved":
        unverified_claims = db.query(DetectedClaim).filter(
            DetectedClaim.content_id == content.id,
            DetectedClaim.verification_status.in_(["Not Verified", "Needs Human Review", "Pending Evidence"])
        ).all()

        # Human executive or compliance reviewer sign-off: certify all pending claims
        if unverified_claims:
            reviewer_desc = f"{current_user.full_name or 'Brand Officer'} ({current_user.role or 'Reviewer'})"
            for claim in unverified_claims:
                claim.verification_status = "Supported"
                claim.required_action = f"Manual sign-off certified by {reviewer_desc}."
            db.commit()

        content.approval_status = "Approved"
    elif req.decision == "Rejected":
        content.approval_status = "Rejected"
    elif req.decision == "Changes Requested":
        content.approval_status = "Changes Requested"
    elif req.decision == "Evidence Requested":
        content.approval_status = "Pending Evidence"

    content.updated_at = datetime.now(timezone.utc)

    # Record permanent approval history
    approval_rec = ApprovalRecord(
        content_id=content.id,
        reviewer_id=current_user.id,
        reviewer_name=current_user.full_name,
        decision=req.decision,
        comments=req.comments or f"Decision rendered by {current_user.full_name} ({current_user.role}).",
        decision_timestamp=datetime.now(timezone.utc)
    )
    db.add(approval_rec)

    # Log in activity
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="APPROVAL_DECISION",
        entity_type="UploadedContent",
        entity_id=content.id,
        description=f"Reviewer {current_user.full_name} set decision to '{req.decision}' for '{content.title}'."
    )
    db.add(log)
    db.commit()
    db.refresh(content)

    return {
        "message": f"Content decision '{req.decision}' recorded successfully.",
        "approval_status": content.approval_status,
        "record": approval_rec
    }

@router.post("/{id}/comments", response_model=ReviewerCommentResponse)
def add_reviewer_comment(
    id: int,
    req: AddCommentRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    comment = ReviewerComment(
        content_id=content.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        comment_text=req.comment_text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
