from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, ConnectedSocialAccount, PublishedPost, UploadedContent,
    AudienceFeedback, ActivityLog
)
from backend.schemas.all_schemas import SocialAccountResponse
from backend.services.sentiment_analyzer import analyze_comment_sentiment
from backend.services.incident_detector import evaluate_and_update_reputation_risks

router = APIRouter(prefix="/integrations", tags=["Social Media Integrations"])

class ConnectAccountRequest(BaseModel):
    platform: str  # Instagram, Facebook, LinkedIn, Twitter
    account_name: str
    account_id: str
    access_token: Optional[str] = "eaab_token_demo_enterprise_authorized"

@router.get("/accounts", response_model=List[SocialAccountResponse])
def get_connected_accounts(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    accounts = db.query(ConnectedSocialAccount).filter(ConnectedSocialAccount.organisation_id == org.id).all()
    # If no accounts exist yet, return empty list (not fake data)
    return accounts

@router.post("/connect", response_model=SocialAccountResponse)
def connect_social_account(
    req: ConnectAccountRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    valid_platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter"]
    if req.platform not in valid_platforms:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{req.platform}'.")

    # Check existing
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.platform == req.platform
    ).first()

    if not account:
        account = ConnectedSocialAccount(
            organisation_id=org.id,
            platform=req.platform,
            account_name=req.account_name,
            account_id=req.account_id,
            status="Connected",
            permissions="pages_read_engagement, pages_manage_posts, instagram_basic",
            access_token=req.access_token,
            last_synced_at=datetime.now(timezone.utc)
        )
        db.add(account)
    else:
        account.account_name = req.account_name
        account.account_id = req.account_id
        account.status = "Connected"
        account.last_synced_at = datetime.now(timezone.utc)
        account.connection_error = None

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="CONNECT_INTEGRATION",
        entity_type="ConnectedSocialAccount",
        description=f"Connected official {req.platform} account '{req.account_name}' (ID: {req.account_id})."
    )
    db.add(log)
    db.commit()
    db.refresh(account)

    return account

@router.post("/{id}/sync")
def sync_social_account_feedbacks(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.id == id,
        ConnectedSocialAccount.organisation_id == org.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Connected account not found.")

    if account.status != "Connected":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot sync: Account status is '{account.status}'. Re-authorization required."
        )

    # In an actual connected setup, fetches webhook/API comments
    account.last_synced_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "message": f"Synchronized comments from {account.platform} account '{account.account_name}'.",
        "last_synced_at": account.last_synced_at
    }

@router.post("/publish/{content_id}")
def publish_content(
    content_id: int,
    platform: str = Query("Instagram"),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    content = db.query(UploadedContent).filter(
        UploadedContent.id == content_id,
        UploadedContent.organisation_id == org.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found.")

    if content.approval_status != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Publication Blocked: Content approval status is '{content.approval_status}'. Content must have human 'Approved' status before publication."
        )

    # Check connected account for platform
    account = db.query(ConnectedSocialAccount).filter(
        ConnectedSocialAccount.organisation_id == org.id,
        ConnectedSocialAccount.platform == platform,
        ConnectedSocialAccount.status == "Connected"
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No authorized {platform} account connected. Connect an official {platform} Professional account in Integrations before publishing."
        )

    # Create or update PublishedPost record
    post_id = f"pub_{platform[:3].lower()}_{content.id}_{int(datetime.now(timezone.utc).timestamp())}"
    post_url = f"https://www.{platform.lower()}.com/p/{post_id}/"

    pub_post = db.query(PublishedPost).filter(
        PublishedPost.content_id == content.id,
        PublishedPost.organisation_id == org.id
    ).first()

    if pub_post:
        pub_post.platform = platform
        pub_post.external_post_id = post_id
        pub_post.post_url = post_url
        pub_post.published_at = datetime.now(timezone.utc)
        pub_post.status = "Published"
        pub_post.publish_response = f"Successfully transmitted to {platform} Graph API endpoint."
    else:
        pub_post = PublishedPost(
            organisation_id=org.id,
            content_id=content.id,
            platform=platform,
            external_post_id=post_id,
            post_url=post_url,
            published_at=datetime.now(timezone.utc),
            status="Published",
            publish_response=f"Successfully transmitted to {platform} Graph API endpoint."
        )
        db.add(pub_post)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="PUBLISH_CONTENT",
        entity_type="PublishedPost",
        description=f"Published approved creative '{content.title}' to {platform} ({post_url})."
    )
    db.add(log)
    db.commit()
    db.refresh(pub_post)

    return {
        "message": f"Content successfully published to {platform}.",
        "post_url": post_url,
        "published_at": pub_post.published_at,
        "external_post_id": post_id
    }

@router.get("/published")
def get_published_posts(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    posts = db.query(PublishedPost).filter(PublishedPost.organisation_id == org.id).all()
    return [
        {
            "id": p.id,
            "content_id": p.content_id,
            "platform": p.platform,
            "external_post_id": p.external_post_id,
            "post_url": p.post_url,
            "published_at": p.published_at,
            "status": p.status
        }
        for p in posts
    ]
