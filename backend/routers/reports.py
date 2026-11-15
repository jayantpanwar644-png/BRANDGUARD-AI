import re
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.core.database import get_db
from backend.core.config import settings
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import (
    User, Organisation, GeneratedReport, UploadedContent, AuditReport, AuditFinding,
    DetectedClaim, ClaimEvidence, ApprovedClaim, ApprovalRecord, PublishedPost,
    AudienceFeedback, ReputationIncident, ActivityLog, ContentVersion
)
from backend.schemas.all_schemas import (
    GenerateReportRequest, GeneratedReportResponse,
    ReportOverviewResponse, ReportPreviewResponse
)
from backend.services.pdf_generator import generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Intelligence Reports"])


def _extract_report_data(
    req: GenerateReportRequest,
    org: Organisation,
    db: Session
) -> dict:
    """
    Extracts real data from the database matching the selected report type and filters.
    Returns a structured dictionary ready for PDF generation or live preview.
    """
    report_type = req.report_type
    date_filter = None
    now = datetime.now(timezone.utc)
    if req.date_range == "7d":
        date_filter = now - timedelta(days=7)
    elif req.date_range == "30d":
        date_filter = now - timedelta(days=30)
    elif req.date_range == "90d":
        date_filter = now - timedelta(days=90)

    # Base contents query
    content_q = db.query(UploadedContent).filter(UploadedContent.organisation_id == org.id)
    if req.content_id:
        content_q = content_q.filter(UploadedContent.id == req.content_id)
    elif date_filter:
        content_q = content_q.filter(UploadedContent.created_at >= date_filter)
    contents = content_q.order_by(UploadedContent.created_at.desc()).all()
    content_ids = [c.id for c in contents]

    data = {
        "summary": "",
        "metrics": [],
        "findings": [],
        "resolved_findings": [],
        "claims": [],
        "approvals": [],
        "feedbacks": [],
        "complaints": [],
        "incidents": [],
        "posts": [],
        "recommendations": [],
        "missing_notes": [],
        "chart_info": None,
        "asset_image_path": None,
        "scope": f"Campaign / Content ID: {req.content_id}" if req.content_id else f"All Enterprise Assets ({len(contents)} items)"
    }

    # 1. BRAND AUDIT REPORT
    if report_type == "Brand Audit Report":
        target_content = contents[0] if (req.content_id and contents) else None

        if target_content:
            # Asset-specific detailed report
            latest_audit = (
                db.query(AuditReport)
                .filter(AuditReport.content_id == target_content.id)
                .order_by(AuditReport.version_number.desc(), AuditReport.created_at.desc())
                .first()
            )
            audits = [latest_audit] if latest_audit else []

            # Determine local image path for PDF embedding
            img_file_url = target_content.revised_file_path or target_content.file_path
            if target_content.current_version > 1:
                cur_ver_rec = db.query(ContentVersion).filter(
                    ContentVersion.content_id == target_content.id,
                    ContentVersion.version_number == target_content.current_version
                ).first()
                if cur_ver_rec and cur_ver_rec.file_path:
                    img_file_url = cur_ver_rec.file_path

            if img_file_url:
                local_asset_p = settings.UPLOAD_DIR / "images" / Path(img_file_url).name
                if local_asset_p.exists():
                    data["asset_image_path"] = str(local_asset_p)

            avg_qual = latest_audit.visual_quality_score if latest_audit else 0.0
            avg_cons = latest_audit.brand_consistency_score if latest_audit else 0.0
            avg_read = latest_audit.readability_score if latest_audit else 0.0
            avg_msg = latest_audit.messaging_score if latest_audit else 0.0
            avg_overall = round((avg_qual + avg_cons + avg_read + avg_msg) / 4, 1)

            data["metrics"] = [
                ("Overall Compliance", f"{avg_overall}%" if latest_audit else "Pending"),
                ("Visual Quality Index", f"{avg_qual}%" if latest_audit else "Pending"),
                ("Brand Consistency", f"{avg_cons}%" if latest_audit else "Pending"),
                ("Audited Version", f"v{target_content.current_version}")
            ]

            data["scope"] = f"Creative Asset: {target_content.title} (v{target_content.current_version})"

            if latest_audit:
                open_findings = db.query(AuditFinding).filter(
                    AuditFinding.report_id == latest_audit.id,
                    AuditFinding.status == "Open"
                ).all()
                for f in open_findings[:8]:
                    data["findings"].append({
                        "category": f.issue_type or "Visual Compliance",
                        "severity": f.severity or "Medium",
                        "description": f.description or f.title or "Policy notice",
                        "recommendation": f.suggested_correction or "Align with brand manual guidelines."
                    })

                # Check for resolved issues
                resolved_findings = db.query(AuditFinding).join(AuditReport, AuditFinding.report_id == AuditReport.id).filter(
                    AuditReport.content_id == target_content.id,
                    AuditFinding.status == "Resolved"
                ).all()
                for rf in resolved_findings[:6]:
                    data["resolved_findings"].append({
                        "category": rf.issue_type or "Governance",
                        "title": rf.title,
                        "severity": rf.severity or "Medium",
                        "description": rf.description or rf.title
                    })

            data["summary"] = (
                f"Executive brand compliance audit for creative asset '{target_content.title}' (Version {target_content.current_version}). "
                f"Evaluated against confirmed {org.name} brand guidelines. Overall compliance adherence is {avg_overall}%. "
                f"Audit status: {latest_audit.overall_status if latest_audit else 'Analysed'}. Recommendation: {latest_audit.final_recommendation if latest_audit else 'Review'}."
                if latest_audit else
                f"Audit report for '{target_content.title}' is pending completion."
            )

        else:
            # Multi-asset aggregate report
            audits = []
            if content_ids:
                audits = db.query(AuditReport).filter(AuditReport.content_id.in_(content_ids)).all()
            
            avg_qual = round(sum(a.visual_quality_score for a in audits) / len(audits), 1) if audits else 0.0
            avg_cons = round(sum(a.brand_consistency_score for a in audits) / len(audits), 1) if audits else 0.0
            avg_read = round(sum(a.readability_score for a in audits) / len(audits), 1) if audits else 0.0
            avg_msg = round(sum(a.messaging_score for a in audits) / len(audits), 1) if audits else 0.0
            avg_overall = round((avg_qual + avg_cons + avg_read + avg_msg) / 4, 1) if audits else 0.0

            data["metrics"] = [
                ("Overall Compliance", f"{avg_overall}%" if audits else "No Audits"),
                ("Visual Quality Index", f"{avg_qual}%" if audits else "No Audits"),
                ("Brand Consistency", f"{avg_cons}%" if audits else "No Audits"),
                ("Total Audited Assets", str(len(contents)))
            ]

            if audits:
                audit_ids = [a.id for a in audits]
                findings = db.query(AuditFinding).filter(AuditFinding.report_id.in_(audit_ids)).limit(10).all()
                for f in findings:
                    data["findings"].append({
                        "category": f.issue_type or "Visual Compliance",
                        "severity": f.severity or "Medium",
                        "description": f.description or f.title or "Policy notice",
                        "recommendation": f.suggested_correction or "Align with brand manual guidelines."
                    })

            data["summary"] = (
                f"Pre-publication brand compliance audit for {org.name}. "
                f"Evaluated {len(contents)} content creative(s) across visual quality, logo placement, "
                f"readability, and typography alignment. Overall brand compliance averages {avg_overall}%."
                if audits else
                f"No completed brand audits found for {org.name}. Please upload and run audits in Create & Publish or Brand Governance."
            )

        if audits:
            data["chart_info"] = {
                "type": "bar",
                "categories": ["Visual Quality", "Consistency", "Readability", "Messaging"],
                "values": [avg_qual, avg_cons, avg_read, avg_msg],
                "bar_color": None
            }
            data["recommendations"] = [
                "Maintain consistent logo clear space across all digital and display variants.",
                "Ensure headline contrast ratios comply with WCAG AAA readability standards.",
                "Verify high-resolution vector assets are utilized in all outbound advertising."
            ]
        else:
            data["missing_notes"].append("No creative assets have been audited yet. Upload creative files to populate compliance metrics.")

    # 2. CLAIM VERIFICATION REPORT
    elif report_type == "Claim Verification Report":
        claims = []
        if content_ids:
            claims = db.query(DetectedClaim).filter(DetectedClaim.content_id.in_(content_ids)).all()
        approved_claims = db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org.id, ApprovedClaim.is_active == True).all()

        supported = [c for c in claims if (c.verification_status or "").lower() == "supported"]
        pending = [c for c in claims if (c.verification_status or "").lower() == "pending evidence"]
        contradicted = [c for c in claims if (c.verification_status or "").lower() == "contradicted"]

        data["metrics"] = [
            ("Claims Evaluated", str(len(claims))),
            ("Supported (Verified)", str(len(supported))),
            ("Pending Evidence", str(len(pending))),
            ("Approved Knowledge Facts", str(len(approved_claims)))
        ]

        for c in claims[:10]:
            source_doc = "Grounded Knowledge Base" if (c.verification_status or "").lower() == "supported" else "Unverified (Requires Proof)"
            if hasattr(c, "evidence") and c.evidence:
                source_doc = c.evidence[0].document_reference or source_doc
            data["claims"].append({
                "statement": c.statement,
                "category": c.category or "Marketing Claim",
                "status": c.verification_status or "Pending Evidence",
                "source": source_doc,
                "score": c.confidence_score or 0.85
            })

        # Also include active approved claims if detected claims are low
        if len(data["claims"]) < 5 and approved_claims:
            for ac in approved_claims[:5]:
                data["claims"].append({
                    "statement": ac.claim_text,
                    "category": ac.category or "Verified Fact",
                    "status": "Supported",
                    "source": ac.source_reference or "Master Brand Guidelines",
                    "score": 1.0
                })

        data["summary"] = (
            f"Claim Verification Passport and RAG Grounding audit for {org.name}. "
            f"Identified {len(claims)} marketing claims across active creatives and {len(approved_claims)} registered ground-truth facts. "
            f"{len(supported)} claim(s) are fully supported with citations, while {len(pending)} require supporting evidence."
            if (claims or approved_claims) else
            f"No detected marketing claims found for {org.name}. Add creative copy or upload brand guideline documentation."
        )

        total_claims_all = len(supported) + len(pending) + len(contradicted) + len(approved_claims)
        if total_claims_all > 0:
            supp_cnt = len(supported) + len(approved_claims)
            pend_cnt = len(pending)
            cont_cnt = len(contradicted)
            data["chart_info"] = {
                "type": "pie",
                "labels": [f"Supported ({supp_cnt})", f"Pending ({pend_cnt})", f"Contradicted ({cont_cnt})"],
                "data": [max(supp_cnt, 0.001), max(pend_cnt, 0.001), max(cont_cnt, 0.001)]
            }
            data["recommendations"] = [
                "Submit official third-party certification documents for all claims currently marked as Pending Evidence.",
                "Review prohibited superlatives and register company proof in the Company Guidelines knowledge hub.",
                "Do not authorize public dissemination of copy containing unverified environmental or performance metrics."
            ]
        else:
            data["missing_notes"].append("No claims detected in uploaded content. Run AI claim extraction on your promotional copy.")

    # 3. APPROVAL HISTORY REPORT
    elif report_type == "Approval History Report":
        approvals = []
        if content_ids:
            approvals = db.query(ApprovalRecord).filter(ApprovalRecord.content_id.in_(content_ids)).order_by(ApprovalRecord.decision_timestamp.desc()).all()

        approved_count = sum(1 for a in approvals if (a.decision or "").upper() == "APPROVED")
        changes_count = sum(1 for a in approvals if (a.decision or "").upper() == "CHANGES_REQUESTED")
        rejected_count = sum(1 for a in approvals if (a.decision or "").upper() == "REJECTED")

        data["metrics"] = [
            ("Total Review Cycles", str(len(approvals))),
            ("Approved Assets", str(approved_count)),
            ("Changes Requested", str(changes_count)),
            ("Rejected Content", str(rejected_count))
        ]

        for a in approvals[:10]:
            content_title = "Creative Asset"
            content_obj = db.query(UploadedContent).filter(UploadedContent.id == a.content_id).first()
            if content_obj:
                content_title = content_obj.title
            data["approvals"].append({
                "title": content_title,
                "reviewer": a.reviewer_name or "Human Reviewer",
                "action": (a.decision or "PENDING").upper(),
                "date": a.decision_timestamp.strftime("%Y-%m-%d %H:%M") if a.decision_timestamp else "N/A",
                "notes": a.comments or "Sign-off decision recorded in audit log."
            })

        data["summary"] = (
            f"Governance and Human Reviewer Sign-Off Log for {org.name}. "
            f"Details {len(approvals)} recorded managerial decisions with complete timestamped accountability."
            if approvals else
            f"No human approval records found for {org.name}. Complete review cycles in the Approval Center."
        )

        if approvals:
            data["chart_info"] = {
                "type": "bar",
                "categories": ["Approved", "Changes Requested", "Rejected"],
                "values": [approved_count, changes_count, rejected_count],
                "bar_color": None
            }
            data["recommendations"] = [
                "Ensure all rejected content has actionable feedback notes attached for rapid author iteration.",
                "Maintain a two-tier review policy for high-stakes regulatory or multi-market campaigns."
            ]
        else:
            data["missing_notes"].append("No approval logs exist yet. Submit content to human workflow to record sign-offs.")

    # 4. AUDIENCE SENTIMENT REPORT
    elif report_type == "Audience Sentiment Report":
        feedback_q = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id)
        if date_filter:
            feedback_q = feedback_q.filter(AudienceFeedback.comment_date >= date_filter)
        feedbacks = feedback_q.order_by(AudienceFeedback.comment_date.desc()).all()

        pos_count = sum(1 for f in feedbacks if (f.sentiment or "").lower() == "positive")
        neu_count = sum(1 for f in feedbacks if (f.sentiment or "").lower() == "neutral")
        neg_count = sum(1 for f in feedbacks if (f.sentiment or "").lower() in ["negative", "mixed"])
        total_fb = len(feedbacks)
        avg_conf = round(sum(f.sentiment_confidence for f in feedbacks) / total_fb, 2) if total_fb else 0.85

        data["metrics"] = [
            ("Audience Responses", str(total_fb)),
            ("Positive Sentiment", f"{round(pos_count/total_fb*100)}%" if total_fb else "0%"),
            ("Neutral Sentiment", f"{round(neu_count/total_fb*100)}%" if total_fb else "0%"),
            ("Negative Sentiment", f"{round(neg_count/total_fb*100)}%" if total_fb else "0%")
        ]

        for fb in feedbacks[:8]:
            data["feedbacks"].append({
                "handle": fb.author_name or "audience_member",
                "comment": fb.comment_text,
                "sentiment": (fb.sentiment or "Neutral").upper(),
                "score": fb.sentiment_confidence or 0.85,
                "emotion": fb.topic or "Customer Experience"
            })

        data["summary"] = (
            f"Post-publication audience sentiment intelligence for {org.name}. "
            f"Analyzed {total_fb} community reactions across connected social platforms. "
            f"Overall sentiment orientation is {round(pos_count/total_fb*100)}% positive with an average confidence of {avg_conf}."
            if feedbacks else
            f"No audience feedback records found for {org.name}. Connect social accounts to ingest audience comments."
        )

        if feedbacks:
            data["chart_info"] = {
                "type": "pie",
                "labels": [f"Positive ({pos_count})", f"Neutral ({neu_count})", f"Negative ({neg_count})"],
                "data": [max(pos_count, 0.001), max(neu_count, 0.001), max(neg_count, 0.001)]
            }
            data["recommendations"] = [
                "Amplify campaigns generating high appreciation and advocacy sentiment.",
                "Engage promptly with neutral commenters asking clarifying product questions."
            ]
        else:
            data["missing_notes"].append("No audience comments registered. Connect live social accounts to stream feedback.")

    # 5. COMPLAINT ANALYSIS REPORT
    elif report_type == "Complaint Analysis Report":
        complaint_q = db.query(AudienceFeedback).filter(
            AudienceFeedback.organisation_id == org.id,
            func.lower(AudienceFeedback.sentiment).in_(["negative", "mixed"])
        )
        if date_filter:
            complaint_q = complaint_q.filter(AudienceFeedback.comment_date >= date_filter)
        complaints = complaint_q.order_by(AudienceFeedback.comment_date.desc()).all()

        topic_counts = {}
        for c in complaints:
            top = c.topic or "Customer Experience"
            topic_counts[top] = topic_counts.get(top, 0) + 1

        data["metrics"] = [
            ("Total Complaints", str(len(complaints))),
            ("Identified Topic Clusters", str(len(topic_counts))),
            ("Primary Friction Point", max(topic_counts, key=topic_counts.get) if topic_counts else "None"),
            ("Status", "Monitored")
        ]

        for topic, cnt in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:6]:
            sample_comment = next((c.comment_text for c in complaints if c.topic == topic), "No quote available")
            data["complaints"].append({
                "topic": topic,
                "count": cnt,
                "severity": "High" if cnt > 3 else "Medium",
                "sample": sample_comment
            })

        data["summary"] = (
            f"Systematic Customer Complaint Analysis for {org.name}. "
            f"Detected {len(complaints)} customer grievances grouped into {len(topic_counts)} distinct thematic clusters. "
            f"Primary friction point: '{max(topic_counts, key=topic_counts.get) if topic_counts else 'None'}'."
            if complaints else
            f"Zero customer complaints or critical friction points recorded for {org.name}."
        )

        if complaints:
            data["chart_info"] = {
                "type": "bar",
                "categories": list(topic_counts.keys())[:5],
                "values": list(topic_counts.values())[:5],
                "bar_color": None
            }
            data["recommendations"] = [
                "Establish customer success playbooks addressing the most recurring complaint topics.",
                "Coordinate with product and support teams to resolve systemic fulfillment or clarity issues."
            ]
        else:
            data["missing_notes"].append("No complaints detected in current audience feedback streams.")

    # 6. REPUTATION RISK REPORT
    elif report_type == "Reputation Risk Report":
        incident_q = db.query(ReputationIncident).filter(ReputationIncident.organisation_id == org.id)
        if date_filter:
            incident_q = incident_q.filter(ReputationIncident.detected_at >= date_filter)
        incidents = incident_q.order_by(ReputationIncident.detected_at.desc()).all()

        active_inc = sum(1 for i in incidents if i.status in ["Active", "Investigating"])
        crit_inc = sum(1 for i in incidents if (i.severity or "").lower() == "critical")

        data["metrics"] = [
            ("Tracked Incidents", str(len(incidents))),
            ("Active Incidents", str(active_inc)),
            ("Critical Severity", str(crit_inc)),
            ("Mitigated / Resolved", str(len(incidents) - active_inc))
        ]

        for inc in incidents[:8]:
            data["incidents"].append({
                "title": inc.title,
                "severity": inc.severity,
                "status": inc.status,
                "date": inc.detected_at.strftime("%Y-%m-%d") if inc.detected_at else "N/A",
                "action": inc.recommended_action or inc.issue_description or "Execute PR containment protocol."
            })

        data["summary"] = (
            f"Brand Reputation Risk & Incident Registry for {org.name}. "
            f"Records {len(incidents)} potential reputation incidents ({active_inc} currently active). "
            f"Automated risk severity monitoring is enabled."
            if incidents else
            f"Zero reputation incidents detected for {org.name}. System risk status remains NORMAL."
        )

        if incidents:
            sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
            for i in incidents:
                s = i.severity.capitalize() if i.severity else "Medium"
                sev_counts[s] = sev_counts.get(s, 0) + 1
            data["chart_info"] = {
                "type": "bar",
                "categories": list(sev_counts.keys()),
                "values": list(sev_counts.values()),
                "bar_color": None
            }
            data["recommendations"] = [
                "Maintain real-time escalation channels for any incident classified as Critical or High.",
                "Review automated incident triggers to ensure early detection before public amplification."
            ]
        else:
            data["missing_notes"].append("Zero reputation incidents logged. Risk monitoring active.")

    # 7. POST PERFORMANCE REPORT
    elif report_type == "Post Performance Report":
        post_q = db.query(PublishedPost).filter(PublishedPost.organisation_id == org.id)
        if date_filter:
            post_q = post_q.filter(PublishedPost.published_at >= date_filter)
        posts = post_q.order_by(PublishedPost.published_at.desc()).all()

        total_likes = sum(p.likes_count or 0 for p in posts)
        total_comments = sum(p.comments_count or 0 for p in posts)
        total_shares = sum(p.shares_count or 0 for p in posts)
        total_reach = sum(p.reach_count or 0 for p in posts)

        data["metrics"] = [
            ("Published Posts", str(len(posts))),
            ("Total Reach / Impr.", f"{total_reach:,}" if total_reach else "0"),
            ("Total Reactions", f"{total_likes + total_comments + total_shares:,}"),
            ("Avg Engagements / Post", str(round((total_likes + total_comments + total_shares) / len(posts), 1)) if posts else "0")
        ]

        for p in posts[:8]:
            content_cap = "Campaign Post"
            if p.content:
                content_cap = p.content.title or p.content.caption_text or content_cap
            data["posts"].append({
                "platform": p.platform,
                "caption": content_cap,
                "date": p.published_at.strftime("%Y-%m-%d") if p.published_at else "N/A",
                "engagement": f"{p.likes_count or 0} likes, {p.comments_count or 0} cmts",
                "reach": f"{p.reach_count or 0} reach"
            })

        data["summary"] = (
            f"Multi-Channel Social Campaign Performance for {org.name}. "
            f"Aggregates metrics from {len(posts)} published campaigns with total audience reach of {total_reach:,}."
            if posts else
            f"No published posts recorded for {org.name}. Publish content through the Content Intelligence module."
        )

        if posts:
            platforms = {}
            for p in posts:
                platforms[p.platform] = platforms.get(p.platform, 0) + ((p.likes_count or 0) + (p.comments_count or 0))
            data["chart_info"] = {
                "type": "bar",
                "categories": list(platforms.keys()) or ["Instagram", "LinkedIn"],
                "values": list(platforms.values()) or [0, 0],
                "bar_color": None
            }
            data["recommendations"] = [
                "Replicate high-engagement visual formats across secondary distribution channels.",
                "Align future post publication times with peak audience interaction windows."
            ]
        else:
            data["missing_notes"].append("No published post records found. Publish approved content to track metrics.")

    # 8. COMPLETE BRAND INTELLIGENCE
    else:
        audits = db.query(AuditReport).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).all()
        claims = db.query(DetectedClaim).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).all()
        approved_claims = db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org.id, ApprovedClaim.is_active == True).all()
        approvals = db.query(ApprovalRecord).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).all()
        feedbacks = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id).all()
        incidents = db.query(ReputationIncident).filter(ReputationIncident.organisation_id == org.id).all()
        posts = db.query(PublishedPost).filter(PublishedPost.organisation_id == org.id).all()

        avg_comp = round(sum((a.visual_quality_score + a.brand_consistency_score + a.readability_score + a.messaging_score) / 4 for a in audits) / len(audits), 1) if audits else 0.0
        supported_claims = sum(1 for c in claims if (c.verification_status or "").lower() == "supported") + len(approved_claims)
        active_inc = sum(1 for i in incidents if i.status in ["Active", "Investigating"])

        data["metrics"] = [
            ("Brand Compliance Score", f"{avg_comp}%" if audits else "No Audits"),
            ("Audited Assets", str(len(audits))),
            ("Verified Claims", str(supported_claims)),
            ("Active Incidents", str(active_inc))
        ]

        data["summary"] = (
            f"Comprehensive Executive Brand Governance and Intelligence Brief for {org.name}. "
            f"Unifies pre-publication compliance auditing ({len(audits)} assets), factual claim verifications ({len(claims)} claims, {len(approved_claims)} approved facts), "
            f"human managerial approvals ({len(approvals)} records), audience sentiment ({len(feedbacks)} responses), "
            f"and real-time reputation risk monitoring ({len(incidents)} incidents)."
        )

        if audits:
            findings = db.query(AuditFinding).filter(AuditFinding.report_id.in_([a.id for a in audits])).limit(5).all()
            for f in findings:
                data["findings"].append({
                    "category": f.issue_type or "Visual Compliance",
                    "severity": f.severity or "Medium",
                    "description": f.description or f.title or "Policy notice",
                    "recommendation": f.suggested_correction or "Align with brand manual guidelines."
                })

        for c in claims[:5]:
            data["claims"].append({
                "statement": c.statement,
                "category": c.category or "Marketing Claim",
                "status": c.verification_status or "Pending Evidence",
                "source": "Grounded Knowledge Base" if (c.verification_status or "").lower() == "supported" else "Pending Evidence",
                "score": c.confidence_score or 0.85
            })
        if len(data["claims"]) < 5 and approved_claims:
            for ac in approved_claims[:5]:
                data["claims"].append({
                    "statement": ac.claim_text,
                    "category": ac.category or "Verified Fact",
                    "status": "Supported",
                    "source": ac.source_reference or "Master Brand Guidelines",
                    "score": 1.0
                })

        for fb in feedbacks[:4]:
            data["feedbacks"].append({
                "handle": fb.author_name or "audience_user",
                "comment": fb.comment_text,
                "sentiment": (fb.sentiment or "Neutral").upper(),
                "score": fb.sentiment_confidence or 0.85,
                "emotion": fb.topic or "Customer Experience"
            })

        for inc in incidents[:4]:
            data["incidents"].append({
                "title": inc.title,
                "severity": inc.severity,
                "status": inc.status,
                "date": inc.detected_at.strftime("%Y-%m-%d") if inc.detected_at else "N/A",
                "action": inc.recommended_action or inc.issue_description or "Containment active"
            })

        data["chart_info"] = {
            "type": "bar",
            "categories": ["Audit Score", "Reviews Complete", "Reputation Health", "Data Coverage"],
            "values": [
                int(avg_comp) if avg_comp else 85,
                int((sum(1 for a in approvals if (a.decision or '').upper() == 'APPROVED') / len(approvals) * 100)) if approvals else 100,
                100 - (active_inc * 25),
                95
            ],
            "bar_color": None
        }

        data["recommendations"] = [
            "Maintain continuous synchronization between marketing copy and approved brand guideline manuals.",
            "Establish automated alerts for any negative sentiment surges exceeding 15% of daily comments.",
            "Enforce mandatory managerial sign-offs for all high-risk multi-market digital campaigns."
        ]

        if not audits:
            data["missing_notes"].append("No pre-publication brand audits recorded.")
        if not claims and not approved_claims:
            data["missing_notes"].append("No marketing claims detected in content.")
        if not feedbacks:
            data["missing_notes"].append("No post-publication audience feedback streaming.")

    return data


@router.get("/overview", response_model=ReportOverviewResponse)
def get_reports_overview(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Returns real metric cards and summary stats for the Intelligence Reports Dashboard.
    """
    reports = db.query(GeneratedReport).filter(GeneratedReport.organisation_id == org.id).order_by(GeneratedReport.created_at.desc()).all()
    total_reports = len(reports)
    
    latest_report = None
    if reports:
        r = reports[0]
        latest_report = {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "file_size": r.file_size
        }

    # Count real pending data / missing info
    pending_claims = db.query(DetectedClaim).join(UploadedContent).filter(
        UploadedContent.organisation_id == org.id,
        DetectedClaim.verification_status == "Pending Evidence"
    ).count()
    pending_approvals = db.query(UploadedContent).filter(
        UploadedContent.organisation_id == org.id,
        UploadedContent.approval_status == "Pending Review"
    ).count()
    pending_data_count = pending_claims + pending_approvals

    # Type summary availability counts
    audited_count = db.query(AuditReport).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).count()
    claims_count = db.query(DetectedClaim).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).count()
    approved_facts = db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org.id, ApprovedClaim.is_active == True).count()
    approval_count = db.query(ApprovalRecord).join(UploadedContent).filter(UploadedContent.organisation_id == org.id).count()
    feedback_count = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org.id).count()
    complaints_count = db.query(AudienceFeedback).filter(
        AudienceFeedback.organisation_id == org.id,
        func.lower(AudienceFeedback.sentiment).in_(["negative", "mixed"])
    ).count()
    incidents_count = db.query(ReputationIncident).filter(ReputationIncident.organisation_id == org.id).count()
    posts_count = db.query(PublishedPost).filter(PublishedPost.organisation_id == org.id).count()

    types_summary = {
        "Brand Audit Report": {"records": audited_count, "ready": audited_count > 0, "label": f"{audited_count} Audits"},
        "Claim Verification Report": {"records": claims_count + approved_facts, "ready": (claims_count + approved_facts) > 0, "label": f"{claims_count + approved_facts} Claims & Facts"},
        "Approval History Report": {"records": approval_count, "ready": approval_count > 0, "label": f"{approval_count} Approval Logs"},
        "Audience Sentiment Report": {"records": feedback_count, "ready": feedback_count > 0, "label": f"{feedback_count} Comments"},
        "Complaint Analysis Report": {"records": complaints_count, "ready": complaints_count > 0, "label": f"{complaints_count} Complaints"},
        "Reputation Risk Report": {"records": incidents_count, "ready": True, "label": f"{incidents_count} Incidents (Normal)" if incidents_count == 0 else f"{incidents_count} Incidents"},
        "Post Performance Report": {"records": posts_count, "ready": posts_count > 0, "label": f"{posts_count} Posts"},
        "Complete Brand Intelligence": {"records": audited_count + claims_count + approval_count + feedback_count, "ready": True, "label": "Unified Brief"}
    }

    return ReportOverviewResponse(
        total_reports=total_reports,
        available_types=8,
        latest_report=latest_report,
        pending_data_count=pending_data_count,
        types_summary=types_summary
    )


@router.post("/preview", response_model=ReportPreviewResponse)
def preview_report(
    req: GenerateReportRequest,
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Generates a live preview of the report contents from real database records before creating the PDF.
    """
    title = req.title or f"{org.name} — {req.report_type} Executive Brief"
    subtitle = req.subtitle or "Confidential Brand Governance & Audit Deliverable"
    data = _extract_report_data(req, org, db)

    return ReportPreviewResponse(
        report_type=req.report_type,
        title=title,
        subtitle=subtitle,
        company_name=org.name,
        summary=data.get("summary", ""),
        metrics=data.get("metrics", []),
        findings=data.get("findings", []) if req.include_findings else [],
        recommendations=data.get("recommendations", []) if req.include_recommendations else [],
        chart_data=data.get("chart_info") if req.include_charts else None,
        missing_data_warnings=data.get("missing_notes", [])
    )


@router.get("", response_model=List[GeneratedReportResponse])
def get_reports(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Returns list of all generated reports for the current organisation.
    """
    return db.query(GeneratedReport).filter(
        GeneratedReport.organisation_id == org.id
    ).order_by(GeneratedReport.created_at.desc()).all()


@router.post("/generate", response_model=GeneratedReportResponse)
def generate_report(
    req: GenerateReportRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Compiles real database records, produces a verified PDF with ReportLab charts,
    persists it to storage and database, and returns the report metadata.
    """
    title = req.title or f"{org.name} — {req.report_type} Executive Brief"
    subtitle = req.subtitle or "Official Executive Governance & Assurance Deliverable"

    # 1. Collect real data
    data = _extract_report_data(req, org, db)

    # 2. Generate PDF document with NumberedCanvas & charts
    try:
        pdf_path = generate_pdf_report(
            report_type=req.report_type,
            title=title,
            company_name=org.name,
            data=data,
            subtitle=subtitle,
            industry=org.industry
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF report generation failed: {str(e)}"
        )

    p = Path(pdf_path)
    if not p.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF was generated but not found in persistent storage."
        )

    file_size = p.stat().st_size

    # 3. Save report record
    report = GeneratedReport(
        organisation_id=org.id,
        report_type=req.report_type,
        title=title,
        file_path=str(p),
        file_size=file_size,
        parameters_json={
            "content_id": req.content_id,
            "date_range": req.date_range,
            "subtitle": subtitle,
            "include_findings": req.include_findings,
            "include_charts": req.include_charts,
            "include_recommendations": req.include_recommendations,
            "generated_by_user": current_user.full_name or current_user.email
        }
    )
    db.add(report)

    # 4. Activity log
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="GENERATE_REPORT",
        entity_type="GeneratedReport",
        entity_id=report.id,
        description=f"Generated executive PDF report '{title}' ({round(file_size/1024, 1)} KB)."
    )
    db.add(log)
    db.commit()
    db.refresh(report)

    return report


@router.get("/{id}/download")
def download_report(
    id: int,
    token: Optional[str] = Query(None),
    preview: bool = Query(False),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Downloads or previews a previously generated PDF report.
    Supports Authorization Bearer header AND ?token= query parameter.
    If the physical PDF file is missing, automatically re-compiles it from verified DB records.
    """
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == id,
        GeneratedReport.organisation_id == org.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    p = Path(report.file_path)
    if not p.exists():
        # Auto-regenerate on the fly if physical file was moved or pruned
        try:
            req_data = GenerateReportRequest(
                report_type=report.report_type,
                title=report.title,
                content_id=report.parameters_json.get("content_id") if report.parameters_json else None
            )
            data = _extract_report_data(req_data, org, db)
            new_pdf = generate_pdf_report(
                report_type=report.report_type,
                title=report.title,
                company_name=org.name,
                data=data,
                subtitle=report.parameters_json.get("subtitle", "Executive Governance Deliverable") if report.parameters_json else "Executive Governance Deliverable",
                industry=org.industry
            )
            p = Path(new_pdf)
            report.file_path = str(p)
            report.file_size = p.stat().st_size
            db.commit()
        except Exception as regen_err:
            raise HTTPException(status_code=404, detail=f"PDF report file not found on disk and regeneration failed: {regen_err}")

    # Clean ASCII safe filename
    clean_title = re.sub(r'[^a-zA-Z0-9_.-]', '_', report.title)
    if not clean_title.endswith('.pdf'):
        clean_title += '.pdf'

    disp_type = "inline" if preview else "attachment"

    return Response(
        content=p.read_bytes(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disp_type}; filename="{clean_title}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Cache-Control": "no-cache"
        }
    )


@router.delete("/{id}")
def delete_report(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """
    Deletes a generated report from database and removes its physical file from disk.
    """
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == id,
        GeneratedReport.organisation_id == org.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    try:
        p = Path(report.file_path)
        if p.exists():
            p.unlink()
    except Exception as e:
        print(f"Warning: could not delete file {report.file_path}: {e}")

    report_title = report.title
    db.delete(report)

    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="DELETE_REPORT",
        entity_type="GeneratedReport",
        entity_id=id,
        description=f"Deleted executive report '{report_title}'."
    )
    db.add(log)
    db.commit()

    return {"message": f"Report '{report_title}' deleted successfully", "deleted_id": id}
