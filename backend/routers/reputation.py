from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, ReputationIncident, ResponseSuggestion, ActivityLog
)
from backend.schemas.all_schemas import (
    ReputationIncidentResponse, UpdateIncidentRequest,
    ResponseSuggestionResponse, ApproveResponseRequest
)
from backend.services.incident_detector import evaluate_and_update_reputation_risks

router = APIRouter(prefix="/reputation", tags=["Reputation Risk Center"])

@router.get("/incidents", response_model=List[ReputationIncidentResponse])
def get_incidents(
    status_filter: Optional[str] = Query(None),
    severity_filter: Optional[str] = Query(None),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    query = db.query(ReputationIncident).filter(ReputationIncident.organisation_id == org.id)
    if status_filter:
        query = query.filter(ReputationIncident.status == status_filter)
    if severity_filter:
        query = query.filter(ReputationIncident.severity == severity_filter)

    return query.order_by(ReputationIncident.detected_at.desc()).all()

@router.post("/evaluate")
def trigger_reputation_evaluation(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    incidents = evaluate_and_update_reputation_risks(org.id, db)
    return {
        "message": f"Evaluated feedback. Detected {len(incidents)} new reputation incidents.",
        "incidents_created": len(incidents)
    }

@router.put("/incidents/{id}", response_model=ReputationIncidentResponse)
def update_incident(
    id: int,
    req: UpdateIncidentRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    incident = db.query(ReputationIncident).filter(
        ReputationIncident.id == id,
        ReputationIncident.organisation_id == org.id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if req.status:
        incident.status = req.status
        if req.status == "Resolved":
            incident.resolved_at = datetime.now(timezone.utc)
    if req.assigned_to:
        incident.assigned_to = req.assigned_to
    if req.internal_notes:
        incident.internal_notes = req.internal_notes

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPDATE_INCIDENT",
        entity_type="ReputationIncident",
        entity_id=incident.id,
        description=f"Incident #{incident.id} status changed to '{incident.status}' by {current_user.full_name}."
    )
    db.add(log)
    db.commit()
    db.refresh(incident)

    return incident

@router.get("/suggestions", response_model=List[ResponseSuggestionResponse])
def get_suggestions(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return (
        db.query(ResponseSuggestion)
        .join(ReputationIncident)
        .filter(ReputationIncident.organisation_id == org.id)
        .order_by(ResponseSuggestion.created_at.desc())
        .all()
    )

@router.post("/suggestions/{id}/action")
def action_response_suggestion(
    id: int,
    req: ApproveResponseRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    suggestion = (
        db.query(ResponseSuggestion)
        .join(ReputationIncident)
        .filter(ResponseSuggestion.id == id, ReputationIncident.organisation_id == org.id)
        .first()
    )
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found.")

    if req.edited_text:
        suggestion.suggested_response_text = req.edited_text

    if req.action == "Approved":
        suggestion.approval_status = "Approved"
        suggestion.reviewer_name = current_user.full_name
        suggestion.approved_at = datetime.now(timezone.utc)
    elif req.action == "Published":
        if suggestion.approval_status != "Approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compliance Rule: Human approval is mandatory before publishing any AI response draft."
            )
        suggestion.approval_status = "Published"
        suggestion.published_at = datetime.now(timezone.utc)
    elif req.action == "Rejected":
        suggestion.approval_status = "Rejected"
        suggestion.reviewer_name = current_user.full_name

    db.commit()
    db.refresh(suggestion)

    return {
        "message": f"Response draft status updated to '{suggestion.approval_status}'.",
        "suggestion": suggestion
    }
