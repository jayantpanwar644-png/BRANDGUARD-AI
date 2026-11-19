import sys
from backend.core.database import SessionLocal
from backend.models.all_models import User, Organisation, UploadedContent, DetectedClaim
from backend.routers.approvals import make_approval_decision
from backend.schemas.all_schemas import ApprovalDecisionRequest

def test_approval():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        org = db.query(Organisation).first()
        content = db.query(UploadedContent).first()

        if not content:
            print("No content found in DB.")
            return

        print(f"Testing with User: {user.email} (Role: {user.role}), Content ID: {content.id}")

        # Check existing claims or add a test claim
        claim = db.query(DetectedClaim).filter(DetectedClaim.content_id == content.id).first()
        if not claim:
            claim = DetectedClaim(
                content_id=content.id,
                claim_text="Test unverified claim for verification test",
                category="Performance",
                verification_status="Needs Human Review",
                confidence=0.88,
                evidence_status="Missing"
            )
            db.add(claim)
            db.commit()
            db.refresh(claim)
        else:
            claim.verification_status = "Needs Human Review"
            db.commit()

        print(f"Claim ID {claim.id} verification_status set to: {claim.verification_status}")

        req = ApprovalDecisionRequest(
            decision="Approved",
            comments="Signed off by Executive Chief Brand Officer",
            override_unverified_claims=True,
            version_number=content.current_version or 2
        )

        res = make_approval_decision(
            id=content.id,
            req=req,
            current_user=user,
            org=org,
            db=db
        )

        print("make_approval_decision Result:", res)
        db.refresh(claim)
        db.refresh(content)
        print(f"Updated Content approval_status: {content.approval_status}")
        print(f"Updated Claim verification_status: {claim.verification_status}")
        print(f"Updated Claim required_action: {claim.required_action}")

        assert content.approval_status == "Approved"
        assert claim.verification_status == "Supported"
        print(">>> SUCCESS: Approval passed without any blocking!")
    finally:
        db.close()

if __name__ == "__main__":
    test_approval()
