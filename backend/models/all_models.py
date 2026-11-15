from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from backend.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    official_email = Column(String(255), unique=True, index=True, nullable=False)
    industry = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    contact_info = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")
    brand_profile = relationship("BrandProfile", back_populates="organisation", uselist=False, cascade="all, delete-orphan")
    guidelines = relationship("BrandGuideline", back_populates="organisation", cascade="all, delete-orphan")
    assets = relationship("BrandAsset", back_populates="organisation", cascade="all, delete-orphan")
    rules = relationship("BrandRule", back_populates="organisation", cascade="all, delete-orphan")
    claims = relationship("ApprovedClaim", back_populates="organisation", cascade="all, delete-orphan")
    facts = relationship("CompanyFact", back_populates="organisation", cascade="all, delete-orphan")
    contents = relationship("UploadedContent", back_populates="organisation", cascade="all, delete-orphan")
    feedback = relationship("AudienceFeedback", back_populates="organisation", cascade="all, delete-orphan")
    incidents = relationship("ReputationIncident", back_populates="organisation", cascade="all, delete-orphan")
    social_accounts = relationship("ConnectedSocialAccount", back_populates="organisation", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="organisation", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="organisation", cascade="all, delete-orphan")
    conversations = relationship("ChatConversation", back_populates="organisation", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Brand Manager")  # Admin, Brand Manager, Reviewer, Creator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    conversations = relationship("ChatConversation", back_populates="user", cascade="all, delete-orphan")

    organisation = relationship("Organisation", back_populates="users")
    uploaded_contents = relationship("UploadedContent", back_populates="author")


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    logo_path = Column(String(500), nullable=True)
    primary_color = Column(String(50), default="#1A56DB")
    secondary_color = Column(String(50), default="#7E3AF2")
    accent_color = Column(String(50), default="#10B981")
    primary_font = Column(String(100), default="Inter")
    secondary_font = Column(String(100), default="Manrope")
    tone_of_voice = Column(String(255), default="Professional, Authoritative, Trustworthy, Innovative")
    approved_vocabulary = Column(Text, default="enterprise-grade, verified, compliant, secure, intelligent")
    restricted_words = Column(Text, default="guaranteed 100%, miracle, cure-all, cheapest, hack, unverified")
    communication_rules = Column(Text, nullable=True)
    mission_statement = Column(Text, nullable=True)
    target_audience = Column(String(255), default="Enterprise Business Leaders & Security Teams")
    website = Column(String(255), nullable=True)
    business_category = Column(String(100), nullable=True)
    products_and_services = Column(Text, nullable=True)
    main_region = Column(String(100), nullable=True)
    preferred_language = Column(String(50), default="English (Global / US)")
    brand_personality = Column(String(255), nullable=True)
    writing_style = Column(Text, nullable=True)
    alternate_logo_path = Column(String(500), nullable=True)
    company_description = Column(Text, nullable=True)
    prohibited_claims = Column(Text, nullable=True)
    preferred_phrases = Column(Text, nullable=True)
    human_review_words = Column(Text, nullable=True)
    approved_messaging_examples = Column(JSON, nullable=True)
    communication_dos = Column(JSON, nullable=True)
    communication_donts = Column(JSON, nullable=True)
    guidelines_confirmed = Column(Boolean, default=False)
    claims_reviewed = Column(Boolean, default=False)
    vocabulary_configured = Column(Boolean, default=False)
    is_configured = Column(Boolean, default=False)
    is_setup_complete = Column(Boolean, default=False)
    setup_confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="brand_profile")


class BrandGuideline(Base):
    __tablename__ = "brand_guidelines"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    processing_status = Column(String(50), default="Uploaded")  # Uploaded, Processing, Processed, Verified
    version = Column(String(20), default="1.0")
    document_category = Column(String(100), default="Master Guidelines", nullable=True)
    is_active = Column(Boolean, default=True)
    extracted_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="guidelines")
    sections = relationship("DocumentSection", back_populates="guideline", cascade="all, delete-orphan")


class DocumentSection(Base):
    __tablename__ = "document_sections"

    id = Column(Integer, primary_key=True, index=True)
    guideline_id = Column(Integer, ForeignKey("brand_guidelines.id", ondelete="CASCADE"), nullable=False, index=True)
    section_index = Column(Integer, default=0)
    title = Column(String(255), nullable=True)
    content_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    guideline = relationship("BrandGuideline", back_populates="sections")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type = Column(String(50), default="Logo")  # Primary Logo, Secondary Logo, Icon-Only Logo, Light-Background Logo, Dark-Background Logo
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    raster_path = Column(String(500), nullable=True)  # Analysis & web preview raster PNG
    file_size = Column(Integer, default=0)
    description = Column(String(255), nullable=True)
    variation_type = Column(String(50), default="Primary")  # Primary, Secondary, Icon-Only, Light-Background, Dark-Background
    source_format = Column(String(20), default="PNG")  # SVG, PDF, DOCX, PPTX, PNG, etc.
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    has_transparency = Column(Boolean, default=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="assets")


class BrandRule(Base):
    __tablename__ = "brand_rules"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    guideline_id = Column(Integer, ForeignKey("brand_guidelines.id", ondelete="SET NULL"), nullable=True)
    rule_category = Column(String(50), default="Visual")  # Visual, Terminology, Claim, Tone, Formatting
    rule_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium")  # High, Medium, Low
    source_document = Column(String(255), nullable=True)
    section_reference = Column(String(100), nullable=True)
    confidence = Column(Float, default=0.90)
    review_status = Column(String(50), default="Confirmed")  # Needs Review, Confirmed, Rejected
    suggested_correction = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="rules")


class ApprovedClaim(Base):
    __tablename__ = "approved_claims"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    category = Column(String(100), default="Product Performance")
    source_reference = Column(String(255), nullable=True)
    source_document_path = Column(String(500), nullable=True)
    approved_by = Column(String(100), default="Compliance Officer")
    approved_at = Column(DateTime, default=utc_now)
    review_date = Column(DateTime, nullable=True)
    supporting_evidence = Column(Text, nullable=True)
    requires_special_approval = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    organisation = relationship("Organisation", back_populates="claims")


class CompanyFact(Base):
    __tablename__ = "company_facts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    fact_title = Column(String(255), nullable=False)
    fact_detail = Column(Text, nullable=False)
    category = Column(String(100), default="Product")  # Product, Pricing, Certification, Policy, Legal
    source_document = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="facts")


class UploadedContent(Base):
    __tablename__ = "uploaded_contents"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    caption = Column(Text, nullable=True)
    hashtags = Column(String(255), nullable=True)
    platform = Column(String(50), default="Instagram")
    media_type = Column(String(20), default="Image")
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    current_version = Column(Integer, default=1)
    revised_file_path = Column(String(500), nullable=True)
    revised_caption = Column(Text, nullable=True)
    ai_suggestions = Column(JSON, nullable=True)
    approval_status = Column(String(50), default="Draft")  # Draft, Analysing, Needs Verification, Pending Evidence, Pending Approval, Changes Requested, Approved, Rejected
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="contents")
    author = relationship("User", back_populates="uploaded_contents")
    versions = relationship("ContentVersion", back_populates="content", cascade="all, delete-orphan")
    audit_reports = relationship("AuditReport", back_populates="content", cascade="all, delete-orphan")
    claims = relationship("DetectedClaim", back_populates="content", cascade="all, delete-orphan")
    approval_records = relationship("ApprovalRecord", back_populates="content", cascade="all, delete-orphan")
    comments = relationship("ReviewerComment", back_populates="content", cascade="all, delete-orphan")
    published_post = relationship("PublishedPost", back_populates="content", uselist=False)


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    file_path = Column(String(500), nullable=False)
    caption = Column(Text, nullable=True)
    changes_summary = Column(Text, nullable=True)
    ai_suggestions = Column(JSON, nullable=True)
    generated_by = Column(String(100), default="User")
    audit_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    content = relationship("UploadedContent", back_populates="versions")


class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    guideline_version = Column(String(50), default="1.0")
    overall_status = Column(String(50), default="Needs Review")  # Passed, Needs Improvement, Needs Verification, Failed, High-Risk Content
    final_recommendation = Column(String(50), default="Needs Review")
    visual_quality_score = Column(Float, default=0.0)
    readability_score = Column(Float, default=0.0)
    brand_consistency_score = Column(Float, default=0.0)
    messaging_score = Column(Float, default=0.0)
    extracted_text = Column(Text, nullable=True)
    extracted_visuals_json = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    raw_analysis_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    content = relationship("UploadedContent", back_populates="audit_reports")
    findings = relationship("AuditFinding", back_populates="report", cascade="all, delete-orphan")
    detected_claims = relationship("DetectedClaim", back_populates="report", cascade="all, delete-orphan")


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("audit_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_type = Column(String(50), nullable=False)  # Logo, Color, Typography, Claim, Tone, Readability, Misleading
    severity = Column(String(20), default="Medium")  # Critical, High, Medium, Low, Informational
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=True)
    evidence_found = Column(Text, nullable=True)
    expected_rule = Column(Text, nullable=True)
    comparison_result = Column(String(50), default="Needs Improvement")
    suggested_correction = Column(Text, nullable=True)
    status = Column(String(20), default="Open")  # Open, Resolved, Ignored
    resolved_in_version = Column(Integer, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    report = relationship("AuditReport", back_populates="findings")


class DetectedClaim(Base):
    __tablename__ = "detected_claims"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id = Column(Integer, ForeignKey("audit_reports.id", ondelete="CASCADE"), nullable=True, index=True)
    statement = Column(Text, nullable=False)
    category = Column(String(100), default="Marketing Claim")
    location_in_creative = Column(String(100), nullable=True)
    related_guideline = Column(String(255), nullable=True)
    evidence_requirement = Column(String(255), nullable=True)
    verification_status = Column(String(50), default="Not Verified")  # Supported, Contradicted, Not Verified, Needs Human Review
    confidence_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="Medium")  # High, Medium, Low
    required_action = Column(String(255), default="Upload supporting verification documentation.")
    created_at = Column(DateTime, default=utc_now)

    content = relationship("UploadedContent", back_populates="claims")
    report = relationship("AuditReport", back_populates="detected_claims")
    evidence_list = relationship("ClaimEvidence", back_populates="claim", cascade="all, delete-orphan")


class ClaimEvidence(Base):
    __tablename__ = "claim_evidence"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("detected_claims.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    uploaded_by = Column(String(100), default="User")
    verification_notes = Column(Text, nullable=True)
    verification_status = Column(String(50), default="Under Review")  # Supported, Insufficient, Contradicted, Needs Human Review
    uploaded_at = Column(DateTime, default=utc_now)

    claim = relationship("DetectedClaim", back_populates="evidence_list")


class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_name = Column(String(100), nullable=False)
    decision = Column(String(50), nullable=False)  # Approved, Rejected, Changes Requested, Evidence Requested
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comments = Column(Text, nullable=True)
    decision_timestamp = Column(DateTime, default=utc_now)

    content = relationship("UploadedContent", back_populates="approval_records")


class ReviewerComment(Base):
    __tablename__ = "reviewer_comments"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(100), nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    content = relationship("UploadedContent", back_populates="comments")


class ConnectedSocialAccount(Base):
    __tablename__ = "connected_social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)  # Instagram, Facebook, LinkedIn, Twitter
    account_name = Column(String(255), nullable=False)
    account_id = Column(String(100), nullable=False)
    status = Column(String(50), default="Not Connected")  # Connected, Not Connected, Token Expired, Setup Required
    permissions = Column(String(255), default="pages_read_engagement, pages_manage_posts, instagram_basic")
    access_token = Column(String(500), nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    connection_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="social_accounts")


class PublishedPost(Base):
    __tablename__ = "published_posts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    content_id = Column(Integer, ForeignKey("uploaded_contents.id", ondelete="CASCADE"), nullable=False, unique=True)
    platform = Column(String(50), nullable=False)
    external_post_id = Column(String(100), nullable=True)
    post_url = Column(String(500), nullable=True)
    published_at = Column(DateTime, default=utc_now)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    reach_count = Column(Integer, default=0)
    status = Column(String(50), default="Published")  # Published, Failed
    publish_response = Column(Text, nullable=True)

    content = relationship("UploadedContent", back_populates="published_post")
    feedback = relationship("AudienceFeedback", back_populates="post")


class AudienceFeedback(Base):
    __tablename__ = "audience_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    post_id = Column(Integer, ForeignKey("published_posts.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type = Column(String(50), default="CSV Import")  # CSV Import, Social Sync
    external_comment_id = Column(String(100), nullable=True)
    author_name = Column(String(100), default="Audience Member")
    comment_text = Column(Text, nullable=False)
    comment_date = Column(DateTime, default=utc_now)
    platform = Column(String(50), default="Instagram")
    sentiment = Column(String(20), default="Neutral")  # Positive, Neutral, Negative, Mixed, Uncertain
    sentiment_confidence = Column(Float, default=0.85)
    topic = Column(String(100), default="Customer Experience")
    manual_override_sentiment = Column(String(20), nullable=True)
    manual_override_notes = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="feedback")
    post = relationship("PublishedPost", back_populates="feedback")
    response_suggestions = relationship("ResponseSuggestion", back_populates="feedback")


class ReputationIncident(Base):
    __tablename__ = "reputation_incidents"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    affected_post_title = Column(String(255), nullable=True)
    issue_description = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium")  # High, Medium, Low
    status = Column(String(50), default="Active")  # Active, Investigating, Action Taken, Resolved
    detected_at = Column(DateTime, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)
    assigned_to = Column(String(100), default="Brand Manager")
    internal_notes = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)

    organisation = relationship("Organisation", back_populates="incidents")
    response_suggestions = relationship("ResponseSuggestion", back_populates="incident")


class ResponseSuggestion(Base):
    __tablename__ = "response_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("reputation_incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    comment_id = Column(Integer, ForeignKey("audience_feedbacks.id", ondelete="CASCADE"), nullable=True, index=True)
    suggested_response_text = Column(Text, nullable=False)
    tone = Column(String(50), default="Empathetic, Professional, Solution-Oriented")
    approval_status = Column(String(50), default="Pending Approval")  # Pending Approval, Approved, Published, Rejected
    reviewer_name = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    incident = relationship("ReputationIncident", back_populates="response_suggestions")
    feedback = relationship("AudienceFeedback", back_populates="response_suggestions")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    parameters_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="reports")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    action_type = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    organisation = relationship("Organisation", back_populates="activity_logs")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    mode = Column(String(50), default="copilot")  # copilot | general
    context_page = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="conversations")
    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant | system
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # [{title, excerpt, source_type, reference}]
    suggested_actions = Column(JSON, nullable=True)  # [{label, action_type, content_id, payload}]
    created_at = Column(DateTime, default=utc_now)

    conversation = relationship("ChatConversation", back_populates="messages")
