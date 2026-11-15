from typing import List, Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation, require_roles
from backend.core.security import hash_password, verify_password
from backend.models.all_models import User, Organisation, ActivityLog
from backend.schemas.all_schemas import UserResponse

router = APIRouter(prefix="/settings", tags=["Settings & Administration"])

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "Reviewer"  # Admin, Brand Manager, Reviewer, Creator

@router.put("/profile")
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.full_name:
        current_user.full_name = req.full_name

    if req.new_password:
        if not req.current_password or not verify_password(req.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed."
            )
        current_user.hashed_password = hash_password(req.new_password)

    db.commit()
    db.refresh(current_user)
    return {"message": "User profile updated successfully.", "user": current_user}

@router.get("/users", response_model=List[UserResponse])
def list_organisation_users(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.organisation_id == org.id).all()

@router.post("/users", response_model=UserResponse)
def invite_user(
    req: CreateUserRequest,
    current_user: User = Depends(require_roles(["Admin", "Brand Manager"])),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered.")

    valid_roles = ["Admin", "Brand Manager", "Reviewer", "Creator"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    new_user = User(
        organisation_id=org.id,
        email=req.email.lower(),
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role=req.role
    )
    db.add(new_user)
    db.flush()

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="INVITE_USER",
        entity_type="User",
        entity_id=new_user.id,
        description=f"Created team member '{new_user.full_name}' ({new_user.email}) with role '{new_user.role}'."
    )
    db.add(log)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get("/activity-logs")
def get_activity_logs(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.organisation_id == org.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )
    return logs
