from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models.all_models import AudienceFeedback, ReputationIncident, ResponseSuggestion, BrandProfile

def evaluate_and_update_reputation_risks(org_id: int, db: Session) -> List[ReputationIncident]:
    """
    Evaluate all feedback for the organisation and create/update reputation incidents
    based on objective, configurable risk thresholds.
    """
    feedbacks = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org_id).all()
    if not feedbacks:
        return []
    
    total = len(feedbacks)
    negative_comments = [f for f in feedbacks if (f.manual_override_sentiment or f.sentiment) == "Negative"]
    neg_ratio = (len(negative_comments) / total) * 100.0 if total > 0 else 0.0
    
    # Group negatives by topic
    topic_counts: Dict[str, List[AudienceFeedback]] = {}
    for f in negative_comments:
        topic_counts.setdefault(f.topic, []).append(f)
        
    created_incidents = []
    
    # Threshold 1: Topic-specific complaint cluster (>= 3 negative comments on the same topic)
    for topic, items in topic_counts.items():
        if len(items) >= 3:
            existing = db.query(ReputationIncident).filter(
                ReputationIncident.organisation_id == org_id,
                ReputationIncident.title.like(f"%{topic}%"),
                ReputationIncident.status.in_(["Active", "Investigating"])
            ).first()
            
            if not existing:
                severity = "High" if len(items) >= 5 or topic in ["Pricing", "Product Quality"] else "Medium"
                sample_texts = " | ".join([f"'{item.comment_text}'" for item in items[:2]])
                
                incident = ReputationIncident(
                    organisation_id=org_id,
                    title=f"Recurring Negative Feedback Cluster: {topic}",
                    affected_post_title=items[0].platform + " Campaign Post",
                    issue_description=f"Detected {len(items)} repeated complaints regarding {topic}. Sample feedback: {sample_texts}",
                    severity=severity,
                    status="Active",
                    detected_at=datetime.now(timezone.utc),
                    assigned_to="Brand Risk Officer",
                    internal_notes=f"Automated risk detection triggered: {len(items)} critical comments concentrated in '{topic}' cluster.",
                    recommended_action=f"Review verified facts regarding {topic}. Issue an approved public clarification and engage affected customers directly."
                )
                db.add(incident)
                db.flush()
                
                # Generate AI Response Suggestion for the first complaint in cluster
                brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org_id).first()
                tone = brand.tone_of_voice if brand else "Empathetic, Transparent, Professional"
                
                response_text = (
                    f"Hello, thank you for sharing your feedback regarding {topic.lower()}. "
                    f"We take customer experience very seriously and are actively looking into this matter. "
                    f"Please contact our support team at support@brandguard.ai with your details so we can resolve this directly."
                )
                
                suggestion = ResponseSuggestion(
                    incident_id=incident.id,
                    comment_id=items[0].id,
                    suggested_response_text=response_text,
                    tone=tone,
                    approval_status="Pending Approval"
                )
                db.add(suggestion)
                created_incidents.append(incident)

    # Threshold 2: Overall high negative ratio (> 25% negative comments)
    if neg_ratio > 25.0 and total >= 8:
        existing_spike = db.query(ReputationIncident).filter(
            ReputationIncident.organisation_id == org_id,
            ReputationIncident.title.like("%Negative Sentiment Spike%"),
            ReputationIncident.status.in_(["Active", "Investigating"])
        ).first()
        
        if not existing_spike:
            incident = ReputationIncident(
                organisation_id=org_id,
                title="Critical Negative Sentiment Spike (>25%)",
                affected_post_title="Multi-Channel Public Feedback",
                issue_description=f"Negative sentiment reached {round(neg_ratio, 1)}% across {total} analyzed audience responses.",
                severity="High",
                status="Active",
                detected_at=datetime.now(timezone.utc),
                assigned_to="Senior Communications Director",
                internal_notes=f"High risk threshold breached: {len(negative_comments)} out of {total} comments are negative.",
                recommended_action="Initiate crisis response protocol. Audit recent advertising claims and coordinate messaging with PR team."
            )
            db.add(incident)
            db.flush()
            created_incidents.append(incident)

    db.commit()
    return created_incidents
