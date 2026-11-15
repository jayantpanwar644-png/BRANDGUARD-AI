import io
import csv
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, AudienceFeedback, ActivityLog
)
from backend.schemas.all_schemas import (
    AudienceFeedbackResponse, ManualSentimentOverrideRequest
)
from backend.services.sentiment_analyzer import analyze_comment_sentiment
from backend.services.incident_detector import evaluate_and_update_reputation_risks

router = APIRouter(prefix="/audience", tags=["Audience Intelligence"])

@router.post("/import")
@router.post("/import-csv")
async def import_feedback_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a structured .CSV file."
        )

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig", errors="replace")
        csv_file = io.StringIO(text_content)
        reader = list(csv.DictReader(csv_file))
        if not reader:
            raise ValueError("CSV file is empty or missing headers.")
        fieldnames = list(reader[0].keys())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    # Detect comment column
    comment_col = None
    for candidate in ["comment", "text", "feedback", "review", "content", "body"]:
        for col in fieldnames:
            if col and candidate in col.lower():
                comment_col = col
                break
        if comment_col:
            break

    if not comment_col:
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing comment column. Available columns: {fieldnames}. Expected 'comment', 'text', or 'feedback'."
        )

    platform_col = next((c for c in fieldnames if c and "platform" in c.lower()), None)
    author_col = next((c for c in fieldnames if c and any(k in c.lower() for k in ["author", "user", "name"])), None)
    id_col = next((c for c in fieldnames if c and "id" in c.lower()), None)

    imported_count = 0
    duplicate_count = 0

    for row in reader:
        comment_text = str(row.get(comment_col, "")).strip()
        if not comment_text or comment_text.lower() == "nan":
            continue

        # Check duplicate
        existing = db.query(AudienceFeedback).filter(
            AudienceFeedback.organisation_id == org.id,
            AudienceFeedback.comment_text == comment_text
        ).first()

        if existing:
            duplicate_count += 1
            continue

        # AI Sentiment Analysis
        res = analyze_comment_sentiment(comment_text)

        platform_val = str(row.get(platform_col, "")).strip() if platform_col and row.get(platform_col) else "Instagram"
        author_val = str(row.get(author_col, "")).strip() if author_col and row.get(author_col) else "Audience Member"
        ext_id = str(row.get(id_col, "")).strip() if id_col and row.get(id_col) else None

        fb = AudienceFeedback(
            organisation_id=org.id,
            source_type="CSV Import",
            external_comment_id=ext_id,
            author_name=author_val,
            comment_text=comment_text,
            platform=platform_val,
            sentiment=res["sentiment"],
            sentiment_confidence=res["sentiment_confidence"],
            topic=res["topic"],
            comment_date=datetime.now(timezone.utc)
        )
        db.add(fb)
        imported_count += 1

    db.commit()

    # Trigger Incident Risk Detection
    created_incidents = evaluate_and_update_reputation_risks(org.id, db)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="IMPORT_CSV_FEEDBACK",
        entity_type="AudienceFeedback",
        description=f"Imported {imported_count} feedback records from '{file.filename}'. Detected {len(created_incidents)} potential reputation incidents."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Successfully imported {imported_count} audience feedback comments ({duplicate_count} duplicates skipped).",
        "imported_count": imported_count,
        "duplicate_count": duplicate_count,
        "new_incidents_count": len(created_incidents)
    }

@router.get("/feedback", response_model=List[AudienceFeedbackResponse])
def get_feedback_list(
    sentiment: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    query = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id)
    if sentiment:
        query = query.filter(AudienceFeedback.sentiment == sentiment)
    if topic:
        query = query.filter(AudienceFeedback.topic == topic)
    if platform:
        query = query.filter(AudienceFeedback.platform == platform)
    if search:
        query = query.filter(AudienceFeedback.comment_text.ilike(f"%{search}%"))

    return query.order_by(AudienceFeedback.imported_at.desc()).limit(limit).all()

@router.get("/sentiment-summary")
def get_sentiment_summary(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    feedbacks = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id).all()
    if not feedbacks:
        return {
            "has_data": False,
            "total_count": 0,
            "sentiment_counts": {"Positive": 0, "Neutral": 0, "Negative": 0, "Mixed": 0, "Uncertain": 0},
            "sentiment_percentages": {"Positive": 0, "Neutral": 0, "Negative": 0, "Mixed": 0, "Uncertain": 0},
            "topics": [],
            "daily_trend": []
        }

    total = len(feedbacks)
    counts = {"Positive": 0, "Neutral": 0, "Negative": 0, "Mixed": 0, "Uncertain": 0}
    topics_map = {}
    daily_map = {}

    for f in feedbacks:
        effective_sentiment = f.manual_override_sentiment or f.sentiment
        counts[effective_sentiment] = counts.get(effective_sentiment, 0) + 1
        topics_map[f.topic] = topics_map.get(f.topic, 0) + 1
        
        date_key = f.comment_date.strftime("%Y-%m-%d")
        if date_key not in daily_map:
            daily_map[date_key] = {"date": date_key, "Positive": 0, "Negative": 0, "Neutral": 0}
        if effective_sentiment in ["Positive", "Negative", "Neutral"]:
            daily_map[date_key][effective_sentiment] += 1

    percentages = {k: round((v / total) * 100.0, 1) for k, v in counts.items()}
    topics_list = [{"topic": k, "count": v} for k, v in sorted(topics_map.items(), key=lambda x: x[1], reverse=True)]
    daily_trend = list(sorted(daily_map.values(), key=lambda x: x["date"]))

    return {
        "has_data": True,
        "total_count": total,
        "sentiment_counts": counts,
        "sentiment_percentages": percentages,
        "topics": topics_list,
        "daily_trend": daily_trend
    }

@router.post("/feedback/{id}/override")
def override_sentiment(
    id: int,
    req: ManualSentimentOverrideRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    feedback = db.query(AudienceFeedback).filter(
        AudienceFeedback.id == id,
        AudienceFeedback.organisation_id == org.id
    ).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback comment not found.")

    old_sentiment = feedback.sentiment
    feedback.manual_override_sentiment = req.sentiment
    feedback.manual_override_notes = req.notes or f"Corrected by {current_user.full_name} from {old_sentiment} to {req.sentiment}."

    # Re-evaluate reputation risks
    evaluate_and_update_reputation_risks(org.id, db)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="OVERRIDE_SENTIMENT",
        entity_type="AudienceFeedback",
        entity_id=feedback.id,
        description=f"User {current_user.full_name} corrected sentiment of #{feedback.id} from '{old_sentiment}' to '{req.sentiment}'."
    )
    db.add(log)
    db.commit()
    db.refresh(feedback)

    return {
        "message": f"Sentiment updated to {req.sentiment}.",
        "feedback": feedback
    }
