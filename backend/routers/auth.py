from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import hash_password, verify_password, create_access_token
from backend.core.deps import get_current_user
from backend.models.all_models import User, Organisation, BrandProfile, ActivityLog
from backend.schemas.all_schemas import UserLogin, UserRegister, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == req.official_email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create Organisation
    org = Organisation(
        name=req.company_name,
        official_email=req.official_email.lower(),
        industry=req.industry,
        website=req.website,
        contact_info=req.contact_info
    )
    db.add(org)
    db.flush()

    # Create Default Brand Profile
    brand_profile = BrandProfile(
        organisation_id=org.id,
        company_name=req.company_name,
        primary_color="#1A56DB",
        secondary_color="#7E3AF2",
        accent_color="#10B981",
        is_configured=False
    )
    db.add(brand_profile)

    # Create Admin User
    user = User(
        organisation_id=org.id,
        email=req.official_email.lower(),
        full_name=req.full_name or "Brand Administrator",
        hashed_password=hash_password(req.password),
        role="Admin"
    )
    db.add(user)
    db.flush()

    # Log activity
    log = ActivityLog(
        organisation_id=org.id,
        user_id=user.id,
        user_email=user.email,
        action_type="REGISTER",
        entity_type="Organisation",
        entity_id=org.id,
        description=f"Organisation '{org.name}' registered by {user.email}."
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    db.refresh(org)

    token = create_access_token({"sub": str(user.id), "org_id": org.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "organisation": org
    }

@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()

    # Auto-provision demo accounts if ephemeral database container was recycled
    if not user:
        demo_accounts = {
            "admin@nexusdynamics.io": ("SecurePassword2026!", "Nexus Dynamics Inc", "Enterprise Security / SaaS"),
            "admin@acmecorp.com": ("SecurePassword123!", "Acme Corp", "Technology / SaaS"),
        }
        if req.email.lower() in demo_accounts:
            expected_pass, org_name, industry = demo_accounts[req.email.lower()]
            if req.password == expected_pass:
                org = Organisation(
                    name=org_name,
                    official_email=req.email.lower(),
                    industry=industry,
                    website="https://" + req.email.lower().split("@")[1]
                )
                db.add(org)
                db.flush()
                profile = BrandProfile(
                    organisation_id=org.id,
                    company_name=org_name,
                    primary_color="#1A56DB",
                    secondary_color="#7E3AF2",
                    accent_color="#10B981",
                    is_configured=True
                )
                db.add(profile)
                user = User(
                    organisation_id=org.id,
                    email=req.email.lower(),
                    full_name="Brand Administrator",
                    hashed_password=hash_password(req.password),
                    role="Admin",
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact organisation admin."
        )

    org = db.query(Organisation).filter(Organisation.id == user.organisation_id).first()
    token = create_access_token({"sub": str(user.id), "org_id": user.organisation_id, "role": user.role})

    # Log activity
    log = ActivityLog(
        organisation_id=user.organisation_id,
        user_id=user.id,
        user_email=user.email,
        action_type="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description=f"User {user.email} successfully logged in."
    )
    db.add(log)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "organisation": org
    }

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == current_user.organisation_id).first()
    return {
        "user": current_user,
        "organisation": org,
        "brand_profile": brand
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully."}
