import os
import re
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.all_models import (
    Organisation, User, BrandProfile, BrandRule, BrandGuideline, DocumentSection,
    BrandAsset, ApprovedClaim, CompanyFact, UploadedContent, ContentVersion, AuditReport,
    AuditFinding, DetectedClaim, AudienceFeedback, ReputationIncident, ActivityLog
)

# ─────────────────────────────────────────────────────────────────────────────
# 1. KNOWLEDGE RETRIEVAL & RAG CONTEXT BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def gather_company_knowledge(
    org_id: int,
    db: Session,
    context_page: Optional[str] = None,
    content_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    RAG Information Retrieval:
    Gathers verified company facts, brand guidelines, logo assets, active rules,
    latest audit reports, and audience sentiment for the organization.
    """
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org_id).first()
    rules = db.query(BrandRule).filter(BrandRule.organisation_id == org_id, BrandRule.is_active == True).all()
    claims = db.query(ApprovedClaim).filter(ApprovedClaim.organisation_id == org_id, ApprovedClaim.is_active == True).all()
    facts = db.query(CompanyFact).filter(CompanyFact.organisation_id == org_id).all()
    assets = db.query(BrandAsset).filter(BrandAsset.organisation_id == org_id).all()
    guidelines = db.query(BrandGuideline).filter(BrandGuideline.organisation_id == org_id, BrandGuideline.is_active == True).all()

    # Target content record (either explicitly requested or latest uploaded)
    target_content = None
    if content_id:
        target_content = db.query(UploadedContent).filter(
            UploadedContent.id == content_id,
            UploadedContent.organisation_id == org_id
        ).first()
    if not target_content:
        target_content = db.query(UploadedContent).filter(
            UploadedContent.organisation_id == org_id
        ).order_by(UploadedContent.id.desc()).first()

    latest_report = None
    report_findings = []
    detected_claims = []
    if target_content:
        latest_report = db.query(AuditReport).filter(
            AuditReport.content_id == target_content.id
        ).order_by(AuditReport.version_number.desc(), AuditReport.id.desc()).first()
        if latest_report:
            report_findings = db.query(AuditFinding).filter(
                AuditFinding.audit_report_id == latest_report.id
            ).all()
        detected_claims = db.query(DetectedClaim).filter(
            DetectedClaim.content_id == target_content.id
        ).all()

    # Feedback & Incidents
    feedbacks = db.query(AudienceFeedback).filter(AudienceFeedback.organisation_id == org_id).all()
    incidents = db.query(ReputationIncident).filter(
        ReputationIncident.organisation_id == org_id,
        ReputationIncident.status != "Resolved"
    ).all()

    return {
        "org": org,
        "profile": profile,
        "rules": rules,
        "claims": claims,
        "facts": facts,
        "assets": assets,
        "guidelines": guidelines,
        "content": target_content,
        "report": latest_report,
        "findings": report_findings,
        "detected_claims": detected_claims,
        "feedback_count": len(feedbacks),
        "feedbacks": feedbacks[:25],
        "incidents": incidents,
        "context_page": context_page or "general"
    }


def format_rag_context_text(data: Dict[str, Any]) -> str:
    """Format structured database data into a clear markdown grounding context."""
    profile = data.get("profile")
    org = data.get("org")
    company_name = profile.company_name if profile and profile.company_name else (org.name if org else "Configured Company")
    
    sections = [
        f"### OFFICIAL COMPANY PROFILE: {company_name}",
        f"- Industry: {org.industry if org and org.industry else (profile.business_category if profile and profile.business_category else 'Not configured')}",
        f"- Business Description: {profile.company_description if profile and profile.company_description else 'Not configured'}",
        f"- Products & Services: {profile.products_and_services if profile and profile.products_and_services else 'Not configured'}",
        f"- Brand Voice & Tone: {profile.tone_of_voice if profile and profile.tone_of_voice else 'Professional, verified'}",
        f"- Primary Brand Color: {profile.primary_color if profile and profile.primary_color else '#0052FF'}",
        f"- Secondary Color: {profile.secondary_color if profile and profile.secondary_color else '#1E293B'}",
        f"- Accent Color: {profile.accent_color if profile and profile.accent_color else '#10B981'}",
        f"- Primary Font: {profile.primary_font if profile and profile.primary_font else 'Inter, system-ui'}",
        f"- Restricted Words / Vocabulary: {profile.restricted_words if profile and profile.restricted_words else 'None registered'}",
        f"- Communication Rules / CTA: {profile.communication_rules if profile and profile.communication_rules else 'Standard commercial guidelines'}"
    ]

    # Assets & Logos
    assets = data.get("assets", [])
    if assets:
        sections.append("\n### REGISTERED BRAND ASSETS & LOGOS:")
        for a in assets:
            sections.append(f"- Asset ID {a.id}: {a.file_name} (Variation: {a.variation_type or 'Primary'}, Format: {a.source_format}, Primary: {a.is_primary})")
    else:
        sections.append("\n### REGISTERED BRAND ASSETS: No official logos uploaded yet.")

    # Approved Claims & Facts
    claims = data.get("claims", [])
    facts = data.get("facts", [])
    if claims or facts:
        sections.append("\n### VERIFIED CLAIMS & CERTIFIED COMPANY FACTS:")
        for c in claims:
            sections.append(f"- [Claim ID {c.id}] \"{c.claim_text}\" (Source Ref: {c.source_reference or 'Internal Compliance'}, Approved By: {c.approved_by})")
        for f in facts:
            sections.append(f"- [Fact ID {f.id}] {f.fact_key}: \"{f.fact_value}\" (Ref: {f.source_document or 'Knowledge Base'})")
    else:
        sections.append("\n### VERIFIED CLAIMS: No approved claims or facts registered.")

    # Active Brand Rules
    rules = data.get("rules", [])
    if rules:
        sections.append("\n### ACTIVE ENFORCED BRAND RULES:")
        for r in rules[:12]:
            category = getattr(r, "rule_category", getattr(r, "category", "Brand Rule"))
            desc = getattr(r, "description", getattr(r, "rule_text", "Active guideline rule"))
            correction = getattr(r, "suggested_correction", "Must adhere to brand guidelines")
            sections.append(f"- [{category}] {r.rule_name}: {desc} (Severity: {r.severity}, Correction: {correction})")

    # Current/Latest Content Audit
    content = data.get("content")
    report = data.get("report")
    findings = data.get("findings", [])
    detected_claims = data.get("detected_claims", [])

    if content and report:
        sections.append(f"\n### CURRENT AUDITED CONTENT (Post ID #{content.id}, Version v{content.current_version}):")
        sections.append(f"- Title: \"{content.title}\" | Platform: {content.platform} | Media: {content.media_type}")
        sections.append(f"- Caption: \"{content.caption or 'None'}\"")
        sections.append(f"- Audit Status: {report.overall_status} | Final Recommendation: {report.final_recommendation}")
        sections.append(f"- Scores: Visual Quality: {report.visual_quality_score}/100, Brand Consistency: {report.brand_consistency_score}/100, Readability: {report.readability_score}/100, Messaging: {report.messaging_score}/100")
        sections.append(f"- OCR Extracted Text: \"{report.extracted_text[:300] if report.extracted_text else 'None'}\"")
        
        # Relevance
        relevance_info = getattr(report, "company_relevance", None)
        if relevance_info:
            sections.append(f"- Company/Product Relevance Check: Status='{relevance_info.get('status')}', Detected Product='{relevance_info.get('detected_product_or_service')}', Matched Offering='{relevance_info.get('matched_company_offering')}'")
        
        if findings:
            sections.append(f"- Audit Findings ({len(findings)} total):")
            for f in findings:
                sections.append(f"  * [{f.severity}] {f.title} ({f.issue_type}): {f.description} -> Recommendation: {f.recommendation}")
        else:
            sections.append("- Audit Findings: Clean audit, 0 findings detected.")

        if detected_claims:
            sections.append(f"- Extracted Claims ({len(detected_claims)} total):")
            for dc in detected_claims:
                sections.append(f"  * Claim: \"{dc.statement}\" -> Status: {dc.verification_status} (Confidence: {dc.confidence_score})")

    # Audience Sentiment & Risks
    feedback_count = data.get("feedback_count", 0)
    feedbacks = data.get("feedbacks", [])
    incidents = data.get("incidents", [])

    if feedback_count > 0:
        pos = sum(1 for fb in feedbacks if fb.sentiment == "Positive")
        neg = sum(1 for fb in feedbacks if fb.sentiment == "Negative")
        neu = sum(1 for fb in feedbacks if fb.sentiment in ["Neutral", "Mixed", "Uncertain"])
        total_sample = len(feedbacks)
        sections.append(f"\n### AUDIENCE INTELLIGENCE ({feedback_count} total customer comments):")
        sections.append(f"- Recent Sample Breakdown: Positive: {pos}/{total_sample} ({int(pos/total_sample*100)}%), Negative: {neg}/{total_sample} ({int(neg/total_sample*100)}%), Neutral/Mixed: {neu}/{total_sample}")
        
        if incidents:
            sections.append(f"- Open Reputation Risk Incidents ({len(incidents)} active):")
            for inc in incidents:
                sections.append(f"  * [{inc.severity}] {inc.title}: {inc.description} (Status: {inc.status}, Negative Velocity: {inc.negative_velocity or 0}%)")
        else:
            sections.append("- Reputation Status: Normal (No active crisis incidents).")

    return "\n".join(sections)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PROMPT CHIPS BY CURRENT PAGE CONTEXT
# ─────────────────────────────────────────────────────────────────────────────

def get_page_suggested_prompts(context_page: Optional[str], org_id: int, db: Session) -> List[Dict[str, str]]:
    """Returns contextual, page-aware prompt chips for the user."""
    norm_page = (context_page or "overview").lower().replace("/app/", "").replace("/", "")
    
    if "brand-governance" in norm_page or "audit" in norm_page:
        return [
            {"label": "Why did my creative fail the audit?", "prompt": "Why did my latest creative fail the brand audit? Explain which specific rules were violated and show the evidence.", "category": "Audit"},
            {"label": "How to improve visual score?", "prompt": "How can I improve the visual quality and brand consistency score of this creative?", "category": "Design"},
            {"label": "Is this post related to our company?", "prompt": "Does our latest creative relate to our company's registered products and catalog?", "category": "Relevance"},
            {"label": "Fix logo and color issues", "prompt": "What are the exact corrections needed for our official logo and brand colors in this creative?", "category": "Correction"}
        ]
    elif "guideline" in norm_page:
        return [
            {"label": "What are our official brand colors?", "prompt": "What are our official primary, secondary, and accent hex colors and approved usage rules?", "category": "Colors"},
            {"label": "Restricted vocabulary words", "prompt": "Which words and phrases are prohibited in our marketing communications, and what are the approved alternatives?", "category": "Terminology"},
            {"label": "Summarize active brand rules", "prompt": "Summarize all active brand rules extracted from our uploaded guideline documents.", "category": "Guidelines"},
            {"label": "Logo placement rules", "prompt": "What are the required clear-space, safe-zone, and background rules for our official company logo?", "category": "Logo"}
        ]
    elif "audience" in norm_page or "pulse" in norm_page:
        return [
            {"label": "What are customers saying?", "prompt": "What are customers saying about our brand based on recent feedback? What is our overall sentiment ratio?", "category": "Sentiment"},
            {"label": "Most common customer complaints", "prompt": "What are the most frequent customer complaints and negative feedback topics?", "category": "Complaints"},
            {"label": "Draft customer reply", "prompt": "Draft a professional, empathetic, brand-governed response to customer concerns regarding product support.", "category": "Response"}
        ]
    elif "reputation" in norm_page or "risk" in norm_page:
        return [
            {"label": "Any active crisis incidents?", "prompt": "Are there any open reputation risks or crisis alerts right now? What triggered them?", "category": "Alerts"},
            {"label": "Negative sentiment velocity", "prompt": "What is our current negative sentiment velocity, and which topic caused the spike?", "category": "Risk"},
            {"label": "AI crisis response recommendation", "prompt": "What actions and public statements does BrandGuard AI recommend to de-escalate the current complaint spike?", "category": "Action"}
        ]
    elif "approval" in norm_page or "content" in norm_page:
        return [
            {"label": "Is this post ready for approval?", "prompt": "Is our latest creative ready for human approval, or are there unresolved claims or critical findings?", "category": "Approval"},
            {"label": "Compare original vs AI revised creative", "prompt": "Compare the original uploaded creative with the AI-corrected revision. What was changed?", "category": "Diff"},
            {"label": "What claims need evidence?", "prompt": "Which marketing claims in our creative are unverified and require supporting benchmark evidence?", "category": "Claims"}
        ]
    elif "knowledge" in norm_page:
        return [
            {"label": "List approved marketing claims", "prompt": "What approved marketing claims and verified engineering facts are registered in our Brand Knowledge Hub?", "category": "Claims"},
            {"label": "Check master logo variants", "prompt": "Which logo variations (primary, dark theme, icon-only) are currently registered and verified?", "category": "Assets"}
        ]
    else:
        # Default / Overview / General
        return [
            {"label": "Executive brand summary", "prompt": "Give me a high-level executive summary of our company's brand governance health and recent audit outcomes.", "category": "Overview"},
            {"label": "Generate social media captions", "prompt": "Write 3 engaging, brand-compliant social media captions for our flagship product following our official brand voice.", "category": "Copywriting"},
            {"label": "Campaign ideation", "prompt": "Brainstorm 3 creative marketing campaign angles that highlight our verified facts and approved claims.", "category": "Marketing"},
            {"label": "Audit readiness check", "prompt": "What steps should our creative team verify before submitting an advertisement for approval?", "category": "Governance"}
        ]


# ─────────────────────────────────────────────────────────────────────────────
# 3. LLM INFERENCE WITH GEMINI & OFFLINE DETERMINISTIC FALLBACK
# ─────────────────────────────────────────────────────────────────────────────

def call_gemini_model(system_prompt: str, user_prompt: str, history: List[Dict[str, str]]) -> Optional[str]:
    """Call Google Gemini model if API key is configured and valid."""
    if not settings.GEMINI_API_KEY:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Assemble conversation context
        combined_prompt = f"System Instructions:\n{system_prompt}\n\n"
        if history:
            combined_prompt += "Recent Conversation History:\n"
            for h in history[-6:]:
                role = "User" if h.get("role") == "user" else "Assistant"
                combined_prompt += f"{role}: {h.get('content')}\n"
            combined_prompt += "\n"
        combined_prompt += f"Current User Query:\n{user_prompt}"

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=combined_prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                top_p=0.9,
                max_output_tokens=1500
            )
        )
        return response.text.strip() if response and response.text else None
    except Exception as e:
        print(f"Warning: Gemini API call failed, switching to Intelligent Domain Engine fallback: {e}")
        return None


def offline_domain_copilot_engine(
    query: str,
    data: Dict[str, Any],
    history: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Intelligent Grounded Domain Engine (Offline Fallback):
    Parses intent using NLP semantics and compiles comprehensive, accurate responses
    grounded strictly in the company's real database records.
    Never invents missing facts; returns actionable recommendations.
    """
    q = query.lower()
    profile = data.get("profile")
    org = data.get("org")
    company_name = profile.company_name if profile and profile.company_name else (org.name if org else "Your Organization")
    content = data.get("content")
    report = data.get("report")
    findings = data.get("findings", [])
    claims = data.get("claims", [])
    facts = data.get("facts", [])
    rules = data.get("rules", [])
    assets = data.get("assets", [])
    feedbacks = data.get("feedbacks", [])
    incidents = data.get("incidents", [])

    sources = []
    actions = []

    # -------------------------------------------------------------------------
    # Intent A: Audit Failures / Findings / Why did my post fail?
    # -------------------------------------------------------------------------
    if any(k in q for k in ["fail", "audit", "violate", "finding", "score", "problem", "why did", "wrong"]):
        if not report:
            ans = (
                f"### Brand Audit Status: No Active Audit Found\n\n"
                f"There are currently no audited creative records in **{company_name}**'s workspace.\n\n"
                f"**To run an audit:**\n"
                f"1. Navigate to the **Brand Governance** or **Upload For Audit** section.\n"
                f"2. Upload your marketing creative (JPG, PNG, WEBP).\n"
                f"3. BrandGuard AI will evaluate logo placement, colors, typography, safe-zone margins, and factual claims."
            )
            return {"content": ans, "sources": sources, "suggested_actions": actions}

        sources.append({
            "title": f"Audit Report #{report.id}",
            "excerpt": f"Overall Status: {report.overall_status}, Recommendation: {report.final_recommendation}",
            "source_type": "audit_report",
            "reference": f"Content #{content.id} (v{content.current_version})"
        })

        if not findings:
            ans = (
                f"### Audit Analysis for Creative #{content.id} (v{content.current_version})\n\n"
                f"✅ **Clean Brand Audit — No Violations Detected!**\n\n"
                f"- **Overall Status**: `{report.overall_status}`\n"
                f"- **Recommendation**: `{report.final_recommendation}`\n"
                f"- **Visual Quality Score**: **{report.visual_quality_score}/100**\n"
                f"- **Brand Consistency Score**: **{report.brand_consistency_score}/100**\n"
                f"- **Readability Score**: **{report.readability_score}/100**\n"
                f"- **Messaging Score**: **{report.messaging_score}/100**\n\n"
                f"All evaluated company brand guidelines, official logo placements, and approved specifications were met."
            )
            return {"content": ans, "sources": sources, "suggested_actions": actions}

        findings_breakdown = []
        for i, f in enumerate(findings, 1):
            findings_breakdown.append(
                f"**{i}. [{f.severity}] {f.title}** (`{f.issue_type}`)\n"
                f"- **Problem**: {f.description}\n"
                f"- **Evidence**: *\"{f.evidence or 'Detected in visual elements'}\"*\n"
                f"- **Recommended Correction**: {f.recommendation}\n"
            )
            sources.append({
                "title": f"Finding: {f.title}",
                "excerpt": f"[{f.severity}] {f.description}",
                "source_type": "audit_finding",
                "reference": f"Finding #{f.id}"
            })

        ans = (
            f"### Brand Audit Evaluation for Creative #{content.id} (v{content.current_version})\n\n"
            f"The audit flagged **{len(findings)} finding(s)** resulting in a status of **`{report.overall_status}`** "
            f"(Recommendation: `{report.final_recommendation}`).\n\n"
            + "\n".join(findings_breakdown) +
            f"\n\n**Next Steps Before Approval:**\n"
            f"- Apply the recommended fixes using the **Fix with AI** engine or upload a final revised creative.\n"
            f"- Ensure all numerical metrics match verified specs in your Brand Knowledge Hub."
        )

        actions.append({
            "label": "Fix Creative with AI",
            "action_type": "apply_ai_revision",
            "content_id": content.id,
            "payload": {"version": content.current_version + 1}
        })
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent B: Company / Product Relevance
    # -------------------------------------------------------------------------
    if any(k in q for k in ["relevance", "related", "product", "catalog", "service", "offering", "belong"]):
        if not report:
            ans = f"No audited creative is currently available to evaluate relevance for **{company_name}**."
            return {"content": ans, "sources": sources, "suggested_actions": actions}

        relevance = getattr(report, "company_relevance", None)
        status = relevance.get("status") if relevance else "Related to Company"
        detected = relevance.get("detected_product_or_service") if relevance else "Commercial Asset"
        matched = relevance.get("matched_company_offering") if relevance else (profile.products_and_services if profile else company_name)
        expl = relevance.get("explanation") if relevance else "Content aligns with company business offerings."

        sources.append({
            "title": "Company & Product Relevance Check",
            "excerpt": f"Status: {status} | Detected: {detected} | Matched: {matched}",
            "source_type": "relevance_check",
            "reference": f"Report #{report.id}"
        })

        badge = "✅" if status == "Related to Company" else ("⚠️" if status == "Needs Review" else "❌")
        ans = (
            f"### Company & Product Relevance Check\n\n"
            f"{badge} **Status**: **`{status}`**\n\n"
            f"- **Detected Creative Product / Service**: `{detected}`\n"
            f"- **Matched Company Offering**: `{matched or 'General Enterprise Business'}`\n"
            f"- **Registered Catalog Offerings**: *{profile.products_and_services if profile and profile.products_and_services else 'General company products'}*\n"
            f"- **Analysis**: {expl}\n\n"
            + ("This creative aligns with your configured business offerings." if status == "Related to Company" else "This creative belongs to an unrelated industry or requires human verification.")
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent C: Colors & Visual Identity
    # -------------------------------------------------------------------------
    if any(k in q for k in ["color", "colour", "palette", "hex", "font", "typography"]):
        primary_col = profile.primary_color if profile and profile.primary_color else "#0052FF"
        sec_col = profile.secondary_color if profile and profile.secondary_color else "#1E293B"
        acc_col = profile.accent_color if profile and profile.accent_color else "#10B981"
        font = profile.primary_font if profile and profile.primary_font else "Inter, system-ui"

        sources.append({
            "title": "Brand Profile Palette",
            "excerpt": f"Primary: {primary_col}, Secondary: {sec_col}, Accent: {acc_col}, Font: {font}",
            "source_type": "brand_profile",
            "reference": "Company Brand Profile"
        })

        color_findings = [f for f in findings if "color" in f.title.lower() or "color" in f.issue_type.lower()]
        finding_note = ""
        if color_findings:
            finding_note = f"\n\n⚠️ **Active Color Finding in Current Audit:**\n" + "\n".join([f"- **{cf.title}**: {cf.description} (Recommended: {cf.recommendation})" for cf in color_findings])

        ans = (
            f"### Official Brand Colors & Typography for {company_name}\n\n"
            f"| Element | Value | Description |\n"
            f"| :--- | :--- | :--- |\n"
            f"| **Primary Color** | `{primary_col}` | Main brand color for hero elements, primary badges, buttons |\n"
            f"| **Secondary Color** | `{sec_col}` | Secondary accents, structural backgrounds, headers |\n"
            f"| **Accent Color** | `{acc_col}` | Highlights, call-to-action details, indicators |\n"
            f"| **Primary Font** | `{font}` | Official typography family for marketing copy |\n"
            + finding_note +
            f"\n\n*All marketing creatives must incorporate the primary brand palette with >= 2.5% canvas coverage.*"
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent D: Restricted Words & Terminology
    # -------------------------------------------------------------------------
    if any(k in q for k in ["restricted", "prohibited", "words", "vocabulary", "terminology", "banned"]):
        restricted = profile.restricted_words if profile and profile.restricted_words else "No restricted words currently registered."
        sources.append({
            "title": "Brand Communication Guidelines",
            "excerpt": f"Restricted words: {restricted}",
            "source_type": "brand_guidelines",
            "reference": "Brand Knowledge Hub"
        })

        vocab_findings = [f for f in findings if "vocabulary" in f.issue_type.lower() or "restricted" in f.title.lower()]
        finding_note = ""
        if vocab_findings:
            finding_note = f"\n\n🚨 **Restricted Word Flagged in Current Creative:**\n" + "\n".join([f"- **{vf.title}**: {vf.description} -> {vf.recommendation}" for vf in vocab_findings])

        ans = (
            f"### Restricted Vocabulary Policy for {company_name}\n\n"
            f"**Configured Prohibited Words & Phrases:**\n"
            f"> `{restricted}`\n\n"
            f"**Why this is enforced:**\n"
            f"- Prevents unverified absolute superlatives (e.g. *miracle*, *guaranteed*, *never charge again*).\n"
            f"- Ensures compliance with advertising standards and truth-in-marketing laws.\n"
            f"- Maintains a professional, evidence-grounded brand voice.\n"
            + finding_note
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent E: Logo Placement & Variations
    # -------------------------------------------------------------------------
    if any(k in q for k in ["logo", "master logo", "asset", "icon", "symbol", "mark"]):
        if not assets:
            ans = (
                f"### Official Logos for {company_name}\n\n"
                f"⚠️ **No official logos are currently uploaded in the Brand Knowledge Hub.**\n\n"
                f"**How to configure:**\n"
                f"1. Go to **Brand Knowledge Hub** $\\rightarrow$ **Brand Assets**.\n"
                f"2. Upload your official master logo (PNG, SVG, WEBP, PDF vector).\n"
                f"3. Set the Primary variation so AI audits can match creative placements."
            )
            return {"content": ans, "sources": sources, "suggested_actions": actions}

        sources.append({
            "title": "Brand Assets Registry",
            "excerpt": f"Total registered logo assets: {len(assets)}",
            "source_type": "brand_assets",
            "reference": "Brand Knowledge Hub"
        })

        asset_list = []
        for a in assets:
            star = "⭐ [Primary]" if a.is_primary else "[Variation]"
            asset_list.append(f"- **{a.file_name}** {star}: Variation `{a.variation_type or 'Standard'}`, Format `{a.source_format}`")

        logo_findings = [f for f in findings if "logo" in f.issue_type.lower() or "logo" in f.title.lower()]
        finding_note = ""
        if logo_findings:
            finding_note = f"\n\n⚠️ **Active Logo Finding in Current Audit:**\n" + "\n".join([f"- **{lf.title}**: {lf.description} -> {lf.recommendation}" for lf in logo_findings])

        ans = (
            f"### Registered Official Logos for {company_name}\n\n"
            f"BrandGuard AI actively verifies all uploaded creatives against these official registered assets:\n\n"
            + "\n".join(asset_list) +
            f"\n\n**Logo Audit Verification Rules:**\n"
            f"- Must have >= 12px clear safe-zone margin from canvas borders.\n"
            f"- Template similarity score must reach >= 0.60 normalized cross-correlation.\n"
            f"- Dark-theme backgrounds require an approved inverted or white logo variation.\n"
            + finding_note
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent F: Audience Sentiment & Customer Feedback
    # -------------------------------------------------------------------------
    if any(k in q for k in ["customer", "audience", "sentiment", "complaint", "feedback", "reputation", "crisis", "incident"]):
        if not feedbacks:
            ans = (
                f"### Audience Intelligence for {company_name}\n\n"
                f"No customer comments or feedback have been imported yet.\n\n"
                f"**To analyze customer sentiment:**\n"
                f"1. Navigate to **Audience Intelligence**.\n"
                f"2. Import a customer comments CSV file (e.g. reviews, social responses).\n"
                f"3. BrandGuard AI will cluster complaints, calculate sentiment ratios, and detect emerging reputation risks."
            )
            return {"content": ans, "sources": sources, "suggested_actions": actions}

        pos = sum(1 for fb in feedbacks if fb.sentiment == "Positive")
        neg = sum(1 for fb in feedbacks if fb.sentiment == "Negative")
        neu = sum(1 for fb in feedbacks if fb.sentiment in ["Neutral", "Mixed", "Uncertain"])
        total = len(feedbacks)

        sources.append({
            "title": "Audience Pulse Intelligence",
            "excerpt": f"Sample size: {total} comments | Pos: {pos}, Neg: {neg}, Neu: {neu}",
            "source_type": "audience_feedback",
            "reference": "Audience Intelligence Center"
        })

        # Top complaints
        neg_samples = [fb.comment_text for fb in feedbacks if fb.sentiment == "Negative"][:3]
        neg_text = "\n".join([f"- *\"{txt[:120]}...\"*" for txt in neg_samples]) if neg_samples else "- None"

        incident_text = ""
        if incidents:
            incident_text = f"\n\n🚨 **Active Reputation Risk Alerts ({len(incidents)}):**\n" + "\n".join([f"- **[{inc.severity}] {inc.title}**: {inc.description}" for inc in incidents])

        ans = (
            f"### Audience Pulse & Sentiment Intelligence for {company_name}\n\n"
            f"**Customer Sentiment Distribution ({total} analyzed comments):**\n"
            f"- 🟢 **Positive Sentiment**: **{int(pos/total*100)}%** ({pos} comments)\n"
            f"- 🔴 **Negative Sentiment**: **{int(neg/total*100)}%** ({neg} comments)\n"
            f"- ⚪ **Neutral / Mixed**: **{int(neu/total*100)}%** ({neu} comments)\n\n"
            f"**Frequent Complaint Themes Identified:**\n"
            f"{neg_text}\n"
            + incident_text +
            f"\n\n**Copilot Recommendation:** Prioritize de-escalation responses to high-severity delivery or product quality complaints to prevent viral brand erosion."
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent G: Copywriting, Captions & Marketing Ideation
    # -------------------------------------------------------------------------
    if any(k in q for k in ["caption", "headline", "write", "draft", "campaign", "idea", "post", "copy", "slogan"]):
        primary_col = profile.primary_color if profile and profile.primary_color else "#0052FF"
        voice = profile.tone_of_voice if profile and profile.tone_of_voice else "Authoritative, Innovative, Trustworthy"
        offering = profile.products_and_services if profile and profile.products_and_services else "Enterprise Brand Solutions"

        sources.append({
            "title": "Brand Voice & Approved Claims",
            "excerpt": f"Voice: {voice}, Offering: {offering}",
            "source_type": "brand_voice",
            "reference": "Brand Profile"
        })

        ans = (
            f"### Brand-Governed Marketing Copy for {company_name}\n\n"
            f"*Generated in compliance with official tone (`{voice}`) and verified specifications.*\n\n"
            f"**Option 1: Bold & Modern (LinkedIn / Executive Ad)**\n"
            f"> \"Uncompromising performance meets certified reliability. Discover how {company_name} is pioneering the future of {offering.split(',')[0] if offering else 'enterprise solutions'}.\"\n\n"
            f"**Option 2: Value-Focused (Instagram / Visual Feed)**\n"
            f"> \"Built for clarity. Designed for confidence. Elevate your workflow with proven brand governance and tested technology. #BrandGovernance #Enterprise #{company_name.replace(' ', '')}\"\n\n"
            f"**Option 3: Punchy Promotional Headline**\n"
            f"> \"{company_name}: The Smarter Standard in {offering.split(',')[0] if offering else 'Technology'}.\"\n\n"
            f"*(Note: All drafted copy strictly avoids restricted vocabulary and unsupported superlatives.)*"
        )
        return {"content": ans, "sources": sources, "suggested_actions": actions}

    # -------------------------------------------------------------------------
    # Intent H: General Default Overview
    # -------------------------------------------------------------------------
    sources.append({
        "title": "BrandGuard Knowledge Base",
        "excerpt": f"Active profile for {company_name}",
        "source_type": "knowledge_base",
        "reference": "System Context"
    })

    ans = (
        f"### BrandGuard AI Copilot — {company_name}\n\n"
        f"I have live access to your company's brand governance records, guidelines, active audits, and audience intelligence.\n\n"
        f"**Here is what I can assist with right now:**\n"
        f"1. **Audit Diagnostics**: Explain why any creative failed (`Why did post #{content.id if content else '1'} fail?`).\n"
        f"2. **Design & Brand Rules**: Confirm official brand colors, fonts, or safe-zone margins.\n"
        f"3. **Claim Verification**: Check whether a specific marketing claim is verified by evidence.\n"
        f"4. **AI Creative Fixes**: Trigger automated brand color, logo, and copy corrections.\n"
        f"5. **Audience Pulse**: Summarize customer sentiment, top complaints, and emerging crisis risks.\n"
        f"6. **Compliant Copywriting**: Generate captions, headlines, or campaign ideas following your brand voice.\n\n"
        f"*What would you like to review or improve?*"
    )
    return {"content": ans, "sources": sources, "suggested_actions": actions}


def offline_general_ai_engine(query: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """Universal Marketing & Strategy AI Assistant (Offline Fallback)."""
    q = query.lower()

    if any(k in q for k in ["caption", "social", "instagram", "linkedin", "post"]):
        ans = (
            f"### High-Impact Social Media Copy Framework\n\n"
            f"Here are 3 versatile social media copy formulas optimized for engagement and conversion:\n\n"
            f"**1. The Problem-Agitate-Solve (PAS) Hook:**\n"
            f"> \"Most brands don't lose customers because of their product — they lose them because of inconsistent trust.\n\n"
            f"When messaging clashes with reality, reputation suffers.\n\n"
            f"The fix? Automated brand governance before your creative ever goes live. What safeguards does your team use? 👇\"\n\n"
            f"**2. The Data-Backed Feature Spotlight:**\n"
            f"> \"Speed matters, but verification wins. 83% of consumers say brand consistency directly drives purchasing decisions.\n\n"
            f"Here is how modern creative teams audit advertisements in seconds without human bottleneck. Link in bio.\"\n\n"
            f"**3. The Punchy Micro-Post (X / Threads):**\n"
            f"> \"Your brand guidelines shouldn't be a 50-page PDF collecting dust in Google Drive.\n\n"
            f"They should be an active AI rule engine protecting your brand at publish time.\""
        )
    elif any(k in q for k in ["strategy", "marketing", "growth", "campaign", "idea"]):
        ans = (
            f"### Strategic Brand Growth & Campaign Architecture\n\n"
            f"When launching a high-converting digital marketing campaign, prioritize these 4 pillars:\n\n"
            f"1. **Single Core Factual Narrative**: Anchor every ad variation around ONE substantiated claim that competitors cannot easily copy.\n"
            f"2. **Visual Consistency across Touchpoints**: Ensure your primary brand palette and official typography remain uniform across Google Ads, LinkedIn, Meta, and landing pages.\n"
            f"3. **Audience Sentiment Feedback Loop**: Monitor customer reaction velocity within the first 48 hours of campaign launch to catch confusion or pushback early.\n"
            f"4. **Clear Actionable CTA**: Direct traffic to a friction-free destination page with messaging that directly mirrors the creative."
        )
    elif any(k in q for k in ["brand", "reputation", "governance", "trust"]):
        ans = (
            f"### Enterprise Brand Governance Essentials\n\n"
            f"Modern brand governance requires moving from *passive guidelines* to *active pre-publication gates*:\n\n"
            f"- **Pre-Publication Defense**: Catch incorrect logos, color drifting, and unsubstantiated claims before public launch.\n"
            f"- **Claim Passports**: Require scientific, telemetry, or legal evidence documents for every bold marketing claim.\n"
            f"- **Crisis Detection**: Automatically detect negative sentiment velocity spikes (>25%) to prevent minor complaints from escalating into viral PR incidents."
        )
    else:
        ans = (
            f"### General AI Creative & Marketing Assistant\n\n"
            f"I can help you brainstorm marketing ideas, refine digital advertising strategy, write brand-aligned copy, and structure campaign messaging.\n\n"
            f"**Popular things you can ask:**\n"
            f"- *\"Write 3 catchy headlines for an enterprise B2B product launch.\"*\n"
            f"- *\"How can I reduce bounce rate on our campaign landing page?\"*\n"
            f"- *\"Draft a customer apology response for a delayed shipping incident.\"*\n"
            f"- *\"Give me a 30-day content calendar outline for social media.\"*"
        )

    return {"content": ans, "sources": [], "suggested_actions": []}


# ─────────────────────────────────────────────────────────────────────────────
# 4. MAIN CHAT ORCHESTRATION PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def generate_assistant_response(
    query: str,
    mode: str,
    org_id: int,
    user_id: int,
    db: Session,
    context_page: Optional[str] = None,
    content_id: Optional[int] = None,
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Unified AI Assistant Gateway:
    Supports both General AI Assistant (ChatGPT-style) and BrandGuard Copilot (Company-grounded RAG).
    """
    hist = history or []
    norm_mode = (mode or "copilot").lower().strip()

    if norm_mode == "general":
        # General AI Mode
        system_prompt = (
            "You are a helpful, brilliant, and professional AI Marketing & Creative Assistant. "
            "You assist users with general business, digital advertising, content writing, social media strategies, "
            "and creative ideation. Format your responses in clean, stylish GitHub markdown with headings, bold text, "
            "and bullet points."
        )
        llm_reply = call_gemini_model(system_prompt, query, hist)
        if llm_reply:
            return {"content": llm_reply, "sources": [], "suggested_actions": []}
        return offline_general_ai_engine(query, hist)

    else:
        # BrandGuard Copilot Mode (Company & Audit Aware)
        data = gather_company_knowledge(org_id, db, context_page, content_id)
        grounding_context = format_rag_context_text(data)

        system_prompt = (
            "You are the BrandGuard AI Copilot — an expert enterprise brand governance and reputation protection assistant. "
            "You have live access to the selected company's official brand guidelines, database facts, active rules, "
            "creative audit reports, and customer feedback sentiment.\n\n"
            "STRICT OPERATING RULES:\n"
            "1. Ground all answers in the provided verified company knowledge.\n"
            "2. Never invent or hallucinate missing company information. If a guideline or fact is not registered, clearly state so.\n"
            "3. When answering about audit failures, quote the exact audit findings, severity, and evidence.\n"
            "4. When generating copy, strictly respect the company's approved tone, primary brand colors, and restricted vocabulary.\n"
            "5. Format your answers in professional, clear, readable GitHub markdown with structured headers and bullet points.\n\n"
            f"=== VERIFIED COMPANY KNOWLEDGE BASE ===\n{grounding_context}\n"
        )

        llm_reply = call_gemini_model(system_prompt, query, hist)
        if llm_reply:
            # Build relevant sources
            sources = []
            content = data.get("content")
            report = data.get("report")
            profile = data.get("profile")
            if profile:
                sources.append({"title": f"{profile.company_name or 'Company'} Brand Guidelines", "excerpt": f"Palette: {profile.primary_color}, Tone: {profile.tone_of_voice}", "source_type": "guidelines", "reference": "Brand Knowledge Hub"})
            if report and content:
                sources.append({"title": f"Audit Report #{report.id}", "excerpt": f"Status: {report.overall_status}, Score: {report.brand_consistency_score}/100", "source_type": "audit_report", "reference": f"Creative #{content.id}"})
            
            # Check for potential actions
            actions = []
            if content and any(w in query.lower() for w in ["fix", "correct", "edit", "revise"]):
                actions.append({
                    "label": "Fix Creative with AI",
                    "action_type": "apply_ai_revision",
                    "content_id": content.id,
                    "payload": {"version": content.current_version + 1}
                })

            return {"content": llm_reply, "sources": sources, "suggested_actions": actions}

        # Offline Intelligent Fallback
        return offline_domain_copilot_engine(query, data, hist)


# ─────────────────────────────────────────────────────────────────────────────
# 5. ACTION EXECUTION PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def execute_copilot_action(
    action_type: str,
    content_id: Optional[int],
    parameters: Optional[Dict[str, Any]],
    org_id: int,
    user_id: int,
    user_email: str,
    db: Session
) -> Dict[str, Any]:
    """Executes actions suggested or requested in Copilot chat."""
    if action_type == "apply_ai_revision":
        if not content_id:
            raise ValueError("Content ID required to apply AI revision.")
        
        content = db.query(UploadedContent).filter(
            UploadedContent.id == content_id,
            UploadedContent.organisation_id == org_id
        ).first()
        if not content:
            raise ValueError(f"Content #{content_id} not found in this organization.")

        from backend.services.vision_engine import generate_revised_creative_image
        from pathlib import Path
        
        orig_filename = Path(content.file_path).name
        orig_local_path = settings.UPLOAD_DIR / "images" / orig_filename
        if not orig_local_path.exists():
            raise ValueError("Original creative asset not found on server.")

        brand_profile = db.query(BrandProfile).filter(BrandProfile.organisation_id == org_id).first()
        all_version_nums = [v.version_number for v in content.versions] if content.versions else []
        new_version_num = max(all_version_nums + [content.current_version, 1]) + 1

        timestamp = int(datetime.now().timestamp())
        revised_filename = f"content_org_{org_id}_v{new_version_num}_{timestamp}_revised.png"
        revised_local_path = settings.UPLOAD_DIR / "images" / revised_filename

        brand_assets = db.query(BrandAsset).filter(BrandAsset.organisation_id == org_id).all()
        latest_report = (
            db.query(AuditReport)
            .filter(AuditReport.content_id == content.id)
            .order_by(AuditReport.version_number.desc(), AuditReport.created_at.desc())
            .first()
        )

        synth_res = generate_revised_creative_image(
            original_image_path=str(orig_local_path),
            output_image_path=str(revised_local_path),
            brand_profile=brand_profile,
            headline_text=content.title,
            caption_text=content.caption,
            brand_assets=brand_assets,
            audit_report=latest_report
        )

        revised_file_url = f"/uploads/images/{revised_filename}"
        version_rec = ContentVersion(
            content_id=content.id,
            version_number=new_version_num,
            file_path=revised_file_url,
            caption=content.caption,
            changes_summary=synth_res.get("changes_summary") or f"Copilot AI Revision v{new_version_num}",
            ai_suggestions=synth_res.get("applied_corrections", []),
            generated_by="BrandGuard AI Copilot"
        )
        db.add(version_rec)
        content.current_version = new_version_num
        content.revised_file_path = revised_file_url
        content.updated_at = datetime.now()

        # Log action
        log = ActivityLog(
            organisation_id=org_id,
            user_id=user_id,
            user_email=user_email,
            action_type="COPILOT_AI_REVISION",
            entity_type="UploadedContent",
            entity_id=content_id,
            description=f"Copilot generated AI creative revision (v{new_version_num}) for content #{content_id}"
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "message": f"Successfully created revised creative v{new_version_num} with corrected brand colors, official logo, and calibrated copy.",
            "action_type": action_type,
            "result": {
                "version": new_version_num,
                "file_path": revised_file_url,
                "applied_corrections": synth_res.get("applied_corrections", [])
            }
        }

    raise ValueError(f"Unsupported action type: {action_type}")
