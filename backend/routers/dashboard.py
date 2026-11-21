from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_organisation
from backend.models.all_models import (
    Organisation, UploadedContent, AuditReport, DetectedClaim,
    AudienceFeedback, ReputationIncident, BrandProfile, BrandGuideline
)

router = APIRouter(prefix="/dashboard", tags=["Command Center"])

@router.get("/metrics")
def get_command_center_metrics(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    # 1. Posts Analysed
    posts_analysed_count = (
        db.query(UploadedContent)
        .join(AuditReport)
        .filter(UploadedContent.organisation_id == org.id)
        .distinct()
        .count()
    )

    # 2. Brand Compliance Score (from actual audit reports)
    reports = (
        db.query(AuditReport)
        .join(UploadedContent)
        .filter(UploadedContent.organisation_id == org.id)
        .all()
    )
    if reports:
        avg_compliance = sum(r.brand_consistency_score for r in reports) / len(reports)
        compliance_display = f"{round(avg_compliance, 1)}%"
    else:
        compliance_display = None  # None indicates no data available yet!

    # 3. Positive Audience Feedback
    feedbacks = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id).all()
    if feedbacks:
        positive_count = sum(1 for f in feedbacks if (f.manual_override_sentiment or f.sentiment) == "Positive")
        positive_pct = (positive_count / len(feedbacks)) * 100.0
        positive_display = f"{round(positive_pct, 1)}%"
    else:
        positive_display = None  # None indicates empty state

    # 4. Active Reputation Alerts
    active_incidents_count = db.query(ReputationIncident).filter(
        ReputationIncident.organisation_id == org.id,
        ReputationIncident.status.in_(["Active", "Investigating"])
    ).count()

    # Brand Profile status
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    is_brand_configured = bool(brand and brand.is_configured)
    guidelines_count = db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org.id).count()

    # Actions Required items
    actions_required = []
    
    if not is_brand_configured or guidelines_count == 0:
        actions_required.append({
            "type": "GUIDELINES_MISSING",
            "title": "Brand Guidelines Not Configured",
            "description": "Upload official brand guidelines to enable automated identity and logo verification.",
            "link": "/guidelines",
            "severity": "Medium"
        })

    unverified_claims = (
        db.query(DetectedClaim)
        .join(UploadedContent)
        .filter(
            UploadedContent.organisation_id == org.id,
            DetectedClaim.verification_status.in_(["Not Verified", "Needs Human Review"])
        )
        .count()
    )
    if unverified_claims > 0:
        actions_required.append({
            "type": "UNVERIFIED_CLAIMS",
            "title": f"{unverified_claims} Marketing Claims Require Verification",
            "description": "Unsubstantiated claims detected in submitted content. Upload supporting proof documents.",
            "link": "/approvals",
            "severity": "High"
        })

    pending_approvals = (
        db.query(UploadedContent)
        .filter(
            UploadedContent.organisation_id == org.id,
            UploadedContent.approval_status.in_(["Pending Approval", "Needs Verification", "Pending Evidence"])
        )
        .count()
    )
    if pending_approvals > 0:
        actions_required.append({
            "type": "PENDING_APPROVAL",
            "title": f"{pending_approvals} Creatives Awaiting Human Approval",
            "description": "Marketing materials pending brand manager sign-off prior to scheduled publication.",
            "link": "/approvals",
            "severity": "Medium"
        })

    if active_incidents_count > 0:
        actions_required.append({
            "type": "ACTIVE_INCIDENT",
            "title": f"{active_incidents_count} Emerging Reputation Incident(s)",
            "description": "Repeated audience complaints detected in feedback. Review risk analysis and approve responses.",
            "link": "/reputation-risk",
            "severity": "High"
        })

    # Recent Audit items
    recent_audits = (
        db.query(UploadedContent)
        .filter(UploadedContent.organisation_id == org.id)
        .order_by(UploadedContent.created_at.desc())
        .limit(5)
        .all()
    )

    recent_audits_data = []
    for c in recent_audits:
        latest_report = c.audit_reports[-1] if c.audit_reports else None
        recent_audits_data.append({
            "id": c.id,
            "title": c.title,
            "platform": c.platform,
            "status": c.approval_status,
            "score": latest_report.visual_quality_score if latest_report else None,
            "date": c.created_at.strftime("%b %d, %Y")
        })

    return {
        "kpis": {
            "posts_analysed": posts_analysed_count,
            "brand_compliance": compliance_display,
            "positive_feedback": positive_display,
            "active_alerts": active_incidents_count
        },
        "has_content": posts_analysed_count > 0,
        "has_feedback": len(feedbacks) > 0,
        "is_brand_configured": is_brand_configured,
        "actions_required": actions_required,
        "recent_audits": recent_audits_data
    }
