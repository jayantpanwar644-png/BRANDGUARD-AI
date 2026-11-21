"""
BrandGuard AI — Seed Initial Enterprise Demo Data
Seeds default Nexus Dynamics organization, admin user, and sample brand profile.
"""
from backend.core.database import SessionLocal
from backend.core.security import hash_password
from backend.models.all_models import User, Organisation, BrandProfile

def run_seed():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@nexusdynamics.io").first():
            org = Organisation(
                name="Nexus Dynamics Inc",
                official_email="admin@nexusdynamics.io",
                industry="Enterprise Security / SaaS",
                website="https://nexusdynamics.io",
            )
            db.add(org)
            db.flush()
            profile = BrandProfile(
                organisation_id=org.id,
                company_name="Nexus Dynamics",
                primary_color="#1A56DB",
                secondary_color="#7E3AF2",
                accent_color="#10B981",
                is_configured=True
            )
            db.add(profile)
            user = User(
                organisation_id=org.id,
                email="admin@nexusdynamics.io",
                full_name="Chief Brand Officer",
                hashed_password=hash_password("SecurePassword2026!"),
                role="Admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            print("Successfully seeded Nexus Dynamics demo enterprise tenant!")
        else:
            print("Demo tenant already exists.")
    except Exception as exc:
        db.rollback()
        print(f"Seed error: {exc}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
