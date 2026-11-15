from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, computed_field

# Auth Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    company_name: str
    official_email: EmailStr
    password: str
    industry: Optional[str] = "Technology / SaaS"
    website: Optional[str] = None
    contact_info: Optional[str] = None
    full_name: Optional[str] = "Brand Administrator"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organisation_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class OrganisationResponse(BaseModel):
    id: int
    name: str
    official_email: str
    industry: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    contact_info: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    organisation: OrganisationResponse

class BrandProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    company_description: Optional[str] = None
    business_category: Optional[str] = None
    products_and_services: Optional[str] = None
    main_region: Optional[str] = None
    preferred_language: Optional[str] = None
    brand_personality: Optional[str] = None
    writing_style: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    primary_font: Optional[str] = None
    secondary_font: Optional[str] = None
    tone_of_voice: Optional[str] = None
    approved_vocabulary: Optional[str] = None
    restricted_words: Optional[str] = None
    prohibited_claims: Optional[str] = None
    preferred_phrases: Optional[str] = None
    human_review_words: Optional[str] = None
    approved_messaging_examples: Optional[Any] = None
    communication_dos: Optional[Any] = None
    communication_donts: Optional[Any] = None
    communication_rules: Optional[str] = None
    mission_statement: Optional[str] = None
    target_audience: Optional[str] = None
    alternate_logo_path: Optional[str] = None
    guidelines_confirmed: Optional[bool] = None
    claims_reviewed: Optional[bool] = None
    vocabulary_configured: Optional[bool] = None

class BrandProfileResponse(BaseModel):
    id: int
    organisation_id: int
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    company_description: Optional[str] = None
    business_category: Optional[str] = None
    products_and_services: Optional[str] = None
    main_region: Optional[str] = None
    preferred_language: Optional[str] = None
    brand_personality: Optional[str] = None
    writing_style: Optional[str] = None
    logo_path: Optional[str] = None
    alternate_logo_path: Optional[str] = None
    primary_color: str
    secondary_color: str
    accent_color: str
    primary_font: str
    secondary_font: str
    tone_of_voice: str
    approved_vocabulary: str
    restricted_words: str
    prohibited_claims: Optional[str] = None
    preferred_phrases: Optional[str] = None
    human_review_words: Optional[str] = None
    approved_messaging_examples: Optional[Any] = None
    communication_dos: Optional[Any] = None
    communication_donts: Optional[Any] = None
    communication_rules: Optional[str] = None
    mission_statement: Optional[str] = None
    target_audience: str
    guidelines_confirmed: Optional[bool] = False
    claims_reviewed: Optional[bool] = False
    vocabulary_configured: Optional[bool] = False
    is_configured: bool
    is_setup_complete: Optional[bool] = False
    setup_confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Brand Setup Status Schemas
class BrandSetupStep(BaseModel):
    step_id: str
    step_number: int
    title: str
    description: str
    status: str  # "completed", "missing"
    is_completed: bool
    details: Optional[str] = None
    missing_items: List[str] = []

class BrandSetupStatusResponse(BaseModel):
    is_complete: bool
    completion_percentage: int
    confirmed_at: Optional[datetime] = None
    steps: List[BrandSetupStep]
    missing_requirements: List[str]
    can_upload_content: bool

# Guideline & Rules Schemas
class BrandGuidelineResponse(BaseModel):
    id: int
    document_name: str
    file_path: str
    file_size: int
    file_type: str
    processing_status: str
    version: str
    document_category: Optional[str] = "Master Guidelines"
    is_active: Optional[bool] = True
    extracted_summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class BrandAssetResponse(BaseModel):
    id: int
    organisation_id: int
    asset_type: str
    file_name: str
    file_path: str
    raster_path: Optional[str] = None
    file_size: int
    description: Optional[str] = None
    variation_type: Optional[str] = "Primary"
    source_format: Optional[str] = "PNG"
    width: Optional[int] = None
    height: Optional[int] = None
    has_transparency: Optional[bool] = False
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BrandAssetUpdateRequest(BaseModel):
    file_name: Optional[str] = None
    description: Optional[str] = None
    variation_type: Optional[str] = None
    is_primary: Optional[bool] = None

class CropLogoRequest(BaseModel):
    raster_url: str
    x: float
    y: float
    width: float
    height: float
    is_percentage: Optional[bool] = True

class SelectCandidateRequest(BaseModel):
    candidate_preview_url: str
    original_filename: str

class ConfirmLogoRequest(BaseModel):
    original_path: str
    raster_path: str
    file_name: str
    asset_type: Optional[str] = "Primary Logo"
    variation_type: Optional[str] = "Primary Logo"
    description: Optional[str] = None
    is_primary: Optional[bool] = False

class BrandRuleCreate(BaseModel):
    rule_category: str = "Visual"
    rule_name: str
    description: str
    severity: str = "Medium"
    guideline_id: Optional[int] = None
    source_document: Optional[str] = None
    section_reference: Optional[str] = None
    confidence: Optional[float] = 0.90
    review_status: Optional[str] = "Confirmed"
    suggested_correction: Optional[str] = None

class BrandRuleResponse(BaseModel):
    id: int
    rule_category: str
    rule_name: str
    description: str
    severity: str
    guideline_id: Optional[int] = None
    source_document: Optional[str] = None
    section_reference: Optional[str] = None
    confidence: Optional[float] = 0.90
    review_status: Optional[str] = "Confirmed"
    suggested_correction: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApprovedClaimCreate(BaseModel):
    claim_text: str
    category: str = "Product Performance"
    source_reference: Optional[str] = None
    source_document_path: Optional[str] = None
    supporting_evidence: Optional[str] = None
    requires_special_approval: Optional[bool] = False

class ApprovedClaimResponse(BaseModel):
    id: int
    claim_text: str
    category: str
    source_reference: Optional[str] = None
    source_document_path: Optional[str] = None
    supporting_evidence: Optional[str] = None
    requires_special_approval: Optional[bool] = False
    approved_by: str
    approved_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class CompanyFactCreate(BaseModel):
    fact_title: str
    fact_detail: str
    category: str = "Product"
    source_document: Optional[str] = None

class CompanyFactResponse(BaseModel):
    id: int
    fact_title: str
    fact_detail: str
    category: str
    source_document: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Company Relevance Schema
class CompanyRelevanceResponse(BaseModel):
    status: str  # "Related to Company" | "Not Related to Company" | "Needs Review"
    detected_product_or_service: str
    matched_company_offering: Optional[str] = None
    explanation: str
    evidence: str
    confidence: float
    recommended_action: str

# Content & Audit Schemas
class AuditFindingResponse(BaseModel):
    id: int
    issue_type: str
    severity: str
    title: str
    description: str
    why_it_matters: Optional[str] = None
    evidence_found: Optional[str] = None
    expected_rule: Optional[str] = None
    comparison_result: Optional[str] = "Needs Improvement"
    suggested_correction: Optional[str] = None
    status: str
    resolved_in_version: Optional[int] = None
    is_resolved: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class ClaimEvidenceResponse(BaseModel):
    id: int
    claim_id: int
    file_path: str
    file_name: str
    file_size: int
    description: Optional[str]
    uploaded_by: str
    verification_notes: Optional[str]
    verification_status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DetectedClaimResponse(BaseModel):
    id: int
    content_id: int
    statement: str
    category: str
    location_in_creative: Optional[str] = None
    related_guideline: Optional[str] = None
    evidence_requirement: Optional[str] = None
    verification_status: str
    confidence_score: float
    risk_level: str
    required_action: str
    created_at: datetime
    evidence_list: List[ClaimEvidenceResponse] = []

    class Config:
        from_attributes = True

class AuditReportResponse(BaseModel):
    id: int
    content_id: int
    version_number: int
    guideline_version: Optional[str] = "1.0"
    overall_status: str
    final_recommendation: Optional[str] = "Needs Review"
    visual_quality_score: float
    readability_score: float
    brand_consistency_score: float
    messaging_score: float
    extracted_text: Optional[str] = None
    extracted_visuals_json: Optional[Any] = None
    summary: Optional[str] = None
    raw_analysis_json: Optional[Any] = None
    created_at: datetime
    findings: List[AuditFindingResponse] = []
    detected_claims: List[DetectedClaimResponse] = []

    @computed_field
    def company_relevance(self) -> Optional[CompanyRelevanceResponse]:
        if self.raw_analysis_json and isinstance(self.raw_analysis_json, dict):
            cr = self.raw_analysis_json.get("company_relevance")
            if cr and isinstance(cr, dict):
                return CompanyRelevanceResponse(
                    status=cr.get("status", "Needs Review"),
                    detected_product_or_service=cr.get("detected_product_or_service", "Unknown Subject"),
                    matched_company_offering=cr.get("matched_company_offering"),
                    explanation=cr.get("explanation", ""),
                    evidence=cr.get("evidence", ""),
                    confidence=float(cr.get("confidence", 0.85)),
                    recommended_action=cr.get("recommended_action", "")
                )
        return None

    class Config:
        from_attributes = True

class ReviewerCommentResponse(BaseModel):
    id: int
    content_id: int
    user_name: str
    comment_text: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalRecordResponse(BaseModel):
    id: int
    content_id: int
    reviewer_name: str
    decision: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comments: Optional[str]
    decision_timestamp: datetime

    class Config:
        from_attributes = True

class ContentVersionResponse(BaseModel):
    id: int
    version_number: int
    file_path: str
    caption: Optional[str] = None
    changes_summary: Optional[str] = None
    ai_suggestions: Optional[Any] = None
    generated_by: Optional[str] = "User"
    audit_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UploadedContentResponse(BaseModel):
    id: int
    organisation_id: int
    title: str
    caption: Optional[str] = None
    hashtags: Optional[str] = None
    platform: str
    media_type: str
    file_path: str
    file_name: str
    file_size: int
    current_version: int
    revised_file_path: Optional[str] = None
    revised_caption: Optional[str] = None
    ai_suggestions: Optional[Any] = None
    approval_status: str
    created_at: datetime
    updated_at: datetime
    versions: List[ContentVersionResponse] = []
    audit_reports: List[AuditReportResponse] = []
    claims: List[DetectedClaimResponse] = []
    approval_records: List[ApprovalRecordResponse] = []
    comments: List[ReviewerCommentResponse] = []

    class Config:
        from_attributes = True

# AI Correction & Suggestion Schemas
class AISuggestionItem(BaseModel):
    action_type: str  # Fix Brand Messaging, Improve Headline, Rewrite Caption, Replace Restricted Words, Improve CTA, Correct Unsupported Claims, Align with Brand Voice, Improve Visual Layout, Add Official Logo
    title: str
    original_text: Optional[str] = None
    suggested_text: Optional[str] = None
    explanation: str
    severity: str = "Medium"
    confidence: float = 0.92

class AISuggestionsResponse(BaseModel):
    content_id: int
    version: int
    suggestions: List[AISuggestionItem]
    overall_recommendation: str

class RewriteCopyRequest(BaseModel):
    mode: str = "balanced"  # executive, bold, concise, balanced
    custom_instructions: Optional[str] = None

class RewriteCopyResponse(BaseModel):
    original_headline: str
    suggested_headline: str
    original_caption: str
    suggested_caption: str
    original_cta: str
    suggested_cta: str
    suggested_hashtags: str
    changes_summary: str
    replaced_restricted_words: List[str] = []
    brand_voice_alignment: str

class GenerateRevisedCreativeRequest(BaseModel):
    mode: str = "full"  # full, text_only, visual_badge
    headline: Optional[str] = None
    caption: Optional[str] = None
    cta: Optional[str] = None
    apply_logo: bool = True
    apply_brand_colors: bool = True
    finding_id: Optional[int] = None
    correction_type: Optional[str] = None
    custom_instructions: Optional[str] = None

class GenerateRevisedCreativeResponse(BaseModel):
    content_id: int
    new_version_number: int
    original_file_path: str
    revised_file_path: str
    revised_caption: str
    changes_summary: str
    design_spec: Dict[str, Any] = {}
    applied_corrections: List[Dict[str, Any]] = []

class RuleReviewRequest(BaseModel):
    review_status: str  # Confirmed, Rejected, Needs Review
    rule_name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    suggested_correction: Optional[str] = None

    class Config:
        from_attributes = True

# Approval actions
class ApprovalDecisionRequest(BaseModel):
    decision: str  # Approved, Rejected, Changes Requested, Evidence Requested
    comments: Optional[str] = None

class AddCommentRequest(BaseModel):
    comment_text: str

# Audience & Sentiment
class AudienceFeedbackResponse(BaseModel):
    id: int
    source_type: str
    external_comment_id: Optional[str]
    author_name: str
    comment_text: str
    comment_date: datetime
    platform: str
    sentiment: str
    sentiment_confidence: float
    topic: str
    manual_override_sentiment: Optional[str]
    manual_override_notes: Optional[str]
    imported_at: datetime

    class Config:
        from_attributes = True

class ManualSentimentOverrideRequest(BaseModel):
    sentiment: str
    notes: Optional[str] = None

# Reputation
class ReputationIncidentResponse(BaseModel):
    id: int
    title: str
    affected_post_title: Optional[str]
    issue_description: str
    severity: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime]
    assigned_to: str
    internal_notes: Optional[str]
    recommended_action: Optional[str]

    class Config:
        from_attributes = True

class UpdateIncidentRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    internal_notes: Optional[str] = None

class ResponseSuggestionResponse(BaseModel):
    id: int
    incident_id: Optional[int]
    comment_id: Optional[int]
    suggested_response_text: str
    tone: str
    approval_status: str
    reviewer_name: Optional[str]
    approved_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class ApproveResponseRequest(BaseModel):
    action: str  # Approved, Rejected
    edited_text: Optional[str] = None

# Social Accounts
class SocialAccountResponse(BaseModel):
    id: int
    platform: str
    account_name: str
    account_id: str
    status: str
    permissions: str
    last_synced_at: Optional[datetime]
    connection_error: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class PublishPostRequest(BaseModel):
    platform: str = "Instagram"

# Reports
class GenerateReportRequest(BaseModel):
    report_type: str  # Brand Audit, Claim Verification, Approval History, Audience Sentiment, Complaint Analysis, Reputation Risk, Post Performance, Complete Brand Intelligence
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content_id: Optional[int] = None
    date_range: Optional[str] = "all"
    include_findings: Optional[bool] = True
    include_charts: Optional[bool] = True
    include_recommendations: Optional[bool] = True

class GeneratedReportResponse(BaseModel):
    id: int
    report_type: str
    title: str
    file_path: str
    file_size: int
    created_at: datetime
    parameters_json: Optional[dict] = None

    class Config:
        from_attributes = True

class ReportOverviewResponse(BaseModel):
    total_reports: int
    available_types: int
    latest_report: Optional[dict] = None
    pending_data_count: int
    types_summary: dict

class ReportPreviewResponse(BaseModel):
    report_type: str
    title: str
    subtitle: str
    company_name: str
    summary: str
    metrics: list
    findings: list
    recommendations: list
    chart_data: Optional[dict] = None
    missing_data_warnings: list

# ─── CHAT ASSISTANT & COPILOT SCHEMAS ──────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    content: str
    context_page: Optional[str] = None
    content_id: Optional[int] = None
    mode: Optional[str] = "copilot"  # copilot | general

class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    suggested_actions: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    mode: Optional[str] = "copilot"
    context_page: Optional[str] = None

class ChatConversationUpdate(BaseModel):
    title: str

class ChatConversationResponse(BaseModel):
    id: int
    organisation_id: int
    user_id: int
    title: str
    mode: str
    context_page: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True

class ChatConversationSummary(BaseModel):
    id: int
    title: str
    mode: str
    context_page: Optional[str]
    updated_at: datetime
    message_count: int

    class Config:
        from_attributes = True

class PagePromptSuggestion(BaseModel):
    label: str
    prompt: str
    category: str

class QuickSuggestRequest(BaseModel):
    context_page: Optional[str] = "overview"
    content_id: Optional[int] = None
    mode: Optional[str] = "copilot"

class ExecuteActionRequest(BaseModel):
    action_type: str
    content_id: Optional[int] = None
    parameters: Optional[Dict[str, Any]] = None

class ExecuteActionResponse(BaseModel):
    success: bool
    message: str
    action_type: str
    result: Optional[Dict[str, Any]] = None
