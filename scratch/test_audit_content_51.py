import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from backend.core.database import SessionLocal
from backend.models.all_models import (
    UploadedContent, Organisation, User, AuditReport, AuditFinding, BrandProfile, BrandAsset
)
from backend.routers.content import analyse_content

async def main():
    db = SessionLocal()
    try:
        content = db.query(UploadedContent).filter(UploadedContent.id == 51).first()
        if not content:
            print("ERROR: Content 51 not found!")
            return
        
        org = db.query(Organisation).filter(Organisation.id == content.organisation_id).first()
        user = db.query(User).filter(User.organisation_id == org.id).first()
        
        print(f"Content ID: {content.id}, Title: {content.title}, Org: {org.name} (ID: {org.id})")
        print(f"File Path: {content.file_path}")
        
        # Check prior report & findings before re-audit
        prior_reports = db.query(AuditReport).filter(AuditReport.content_id == content.id).all()
        print(f"Prior Reports Count: {len(prior_reports)}")
        for r in prior_reports:
            print(f"  Report {r.id}: Status={r.overall_status}, Visuals={r.extracted_visuals_json}")
            findings = db.query(AuditFinding).filter(AuditFinding.report_id == r.id).all()
            for f in findings:
                if f.issue_type == "Logo":
                    print(f"    Logo Finding {f.id}: Title='{f.title}', Status={f.status}, Severity={f.severity}, Result={f.comparison_result}")
        
        # Execute actual analyse_content
        print("\n--- Running analyse_content(51) ---")
        res = await analyse_content(id=51, current_user=user, org=org, db=db)
        print("analyse_content finished successfully!")
        
        # Query newest report
        new_report = (
            db.query(AuditReport)
            .filter(AuditReport.content_id == content.id)
            .order_by(AuditReport.id.desc())
            .first()
        )
        print(f"\n[NEW AUDIT REPORT ID: {new_report.id}]")
        print(f"Overall Status: {new_report.overall_status}")
        print(f"Extracted Visuals (Logo Detection): {new_report.extracted_visuals_json}")
        
        new_findings = db.query(AuditFinding).filter(AuditFinding.report_id == new_report.id).all()
        logo_findings_new = [f for f in new_findings if f.issue_type == "Logo"]
        print(f"New Report Total Findings: {len(new_findings)}")
        print(f"New Report Logo Findings: {len(logo_findings_new)}")
        for lf in logo_findings_new:
            print(f"  Finding {lf.id}: {lf.title} | Severity: {lf.severity} | Result: {lf.comparison_result}")

        # Check prior findings to verify stale resolution
        print("\n[CHECKING STALE FINDING RESOLUTION]")
        for r in prior_reports:
            if r.id == new_report.id: continue
            findings = db.query(AuditFinding).filter(AuditFinding.report_id == r.id, AuditFinding.issue_type == "Logo").all()
            for f in findings:
                print(f"  Prior Finding {f.id} (Report {r.id}): Status='{f.status}', IsResolved={f.is_resolved}")
                assert f.status == "Resolved", f"Expected 'Resolved', got {f.status}"
                assert f.is_resolved is True, f"Expected is_resolved True"

        # Verification assertions
        assert new_report.extracted_visuals_json.get("status") == "Logo Verified", f"Expected 'Logo Verified', got {new_report.extracted_visuals_json.get('status')}"
        assert new_report.extracted_visuals_json.get("detected") is True, "Expected detected=True"
        assert len(logo_findings_new) == 0, f"Expected 0 logo findings, got {len(logo_findings_new)}"
        print("\n✓ SUCCESS: Content 51 re-audit completely verified! False finding eliminated and stale findings marked Resolved.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
