export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'Admin' | 'Brand Manager' | 'Reviewer' | 'Creator';
  organisation_id: number;
  is_active: boolean;
  created_at: string;
}

export interface Organisation {
  id: number;
  name: string;
  official_email: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  contact_info?: string;
  created_at: string;
}

export interface BrandProfile {
  id: number;
  organisation_id: number;
  company_name: string;
  industry?: string;
  website?: string;
  company_description?: string;
  business_category?: string;
  products_and_services?: string;
  main_region?: string;
  preferred_language?: string;
  logo_path?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  primary_font: string;
  secondary_font: string;
  tone_of_voice: string;
  brand_personality?: string;
  writing_style?: string;
  approved_vocabulary: string;
  restricted_words: string;
  prohibited_claims?: string;
  preferred_phrases?: string;
  human_review_words?: string;
  approved_messaging_examples?: string;
  communication_dos?: string;
  communication_donts?: string;
  communication_rules?: string;
  mission_statement?: string;
  target_audience: string;
  guidelines_confirmed?: boolean;
  claims_reviewed?: boolean;
  vocabulary_configured?: boolean;
  is_configured: boolean;
  is_setup_complete?: boolean;
  setup_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandSetupStatus {
  is_complete: boolean;
  completion_percentage: number;
  missing_steps: string[];
  steps_completed: Record<string, boolean>;
}

export interface AuditFinding {
  id: number;
  issue_type: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  why_it_matters?: string;
  evidence_found?: string;
  suggested_correction?: string;
  expected_rule?: string;
  comparison_result?: string;
  status: 'Open' | 'Resolved' | 'Ignored';
  created_at: string;
}

export interface ClaimEvidence {
  id: number;
  claim_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  description?: string;
  uploaded_by: string;
  verification_notes?: string;
  verification_status: 'Supported' | 'Insufficient' | 'Contradicted' | 'Needs Human Review' | 'Under Review';
  uploaded_at: string;
}

export interface DetectedClaim {
  id: number;
  content_id: number;
  statement: string;
  category: string;
  verification_status: 'Supported' | 'Contradicted' | 'Not Verified' | 'Needs Human Review';
  confidence_score: number;
  risk_level: 'High' | 'Medium' | 'Low';
  required_action: string;
  location_in_creative?: string;
  related_guideline?: string;
  evidence_requirement?: string;
  created_at: string;
  evidence_list?: ClaimEvidence[];
}

export interface CompanyRelevanceResult {
  status: 'Related to Company' | 'Not Related to Company' | 'Needs Review';
  detected_product_or_service: string;
  matched_company_offering?: string;
  explanation: string;
  evidence: string;
  confidence: number;
  recommended_action: string;
}

export interface AuditReport {
  id: number;
  content_id: number;
  version_number: number;
  overall_status: 'Passed' | 'Needs Review' | 'Needs Verification' | 'Failed' | 'High-Risk Content' | 'Needs Improvement';
  visual_quality_score: number;
  readability_score: number;
  brand_consistency_score: number;
  messaging_score: number;
  extracted_text?: string;
  summary?: string;
  guideline_version?: string;
  final_recommendation?: string;
  extracted_visuals_json?: any;
  raw_analysis_json?: any;
  company_relevance?: CompanyRelevanceResult;
  created_at: string;
  findings: AuditFinding[];
  detected_claims: DetectedClaim[];
}

export interface ContentVersion {
  id: number;
  version_number: number;
  file_path: string;
  caption?: string;
  changes_summary?: string;
  ai_suggestions?: any;
  generated_by?: string;
  audit_id?: number;
  created_at: string;
}

export interface ApprovalRecord {
  id: number;
  content_id: number;
  reviewer_name: string;
  decision: 'Approved' | 'Rejected' | 'Changes Requested' | 'Evidence Requested';
  comments?: string;
  previous_status?: string;
  new_status?: string;
  decision_timestamp: string;
}

export interface ReviewerComment {
  id: number;
  content_id: number;
  user_name: string;
  comment_text: string;
  created_at: string;
}

export interface UploadedContent {
  id: number;
  organisation_id: number;
  title: string;
  caption?: string;
  hashtags?: string;
  platform: string;
  media_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  current_version: number;
  revised_file_path?: string;
  approval_status: 'Draft' | 'Analysing' | 'Needs Verification' | 'Pending Evidence' | 'Pending Approval' | 'Changes Requested' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
  versions?: ContentVersion[];
  audit_reports: AuditReport[];
  claims: DetectedClaim[];
  approval_records: ApprovalRecord[];
  comments: ReviewerComment[];
}

export interface AudienceFeedback {
  id: number;
  source_type: string;
  external_comment_id?: string;
  author_name: string;
  comment_text: string;
  comment_date: string;
  platform: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed' | 'Uncertain';
  sentiment_confidence: number;
  topic: string;
  manual_override_sentiment?: string;
  manual_override_notes?: string;
  imported_at: string;
}

export interface ReputationIncident {
  id: number;
  title: string;
  affected_post_title?: string;
  issue_description: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Investigating' | 'Action Taken' | 'Resolved';
  detected_at: string;
  resolved_at?: string;
  assigned_to: string;
  internal_notes?: string;
  recommended_action?: string;
}

export interface ResponseSuggestion {
  id: number;
  incident_id?: number;
  comment_id?: number;
  suggested_response_text: string;
  tone: string;
  approval_status: 'Pending Approval' | 'Approved' | 'Published' | 'Rejected';
  reviewer_name?: string;
  approved_at?: string;
  published_at?: string;
  created_at: string;
}

export interface BrandGuideline {
  id: number;
  document_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  processing_status: 'Uploaded' | 'Processing' | 'Processed' | 'Verified';
  version: string;
  document_category?: string;
  is_active?: boolean;
  extracted_summary?: string;
  created_at: string;
}

export interface BrandAsset {
  id: number;
  organisation_id: number;
  asset_type: 'Primary Logo' | 'Secondary Logo' | 'Icon-Only Logo' | 'Light-Background Logo' | 'Dark-Background Logo' | 'Alternate Logo' | 'Product Image' | 'Brand Graphic' | string;
  variation_type?: 'Primary Logo' | 'Secondary Logo' | 'Icon-Only Logo' | 'Light-Background Logo' | 'Dark-Background Logo' | string;
  file_name: string;
  file_path: string;
  raster_path?: string;
  source_format?: string;
  width?: number;
  height?: number;
  has_transparency?: boolean;
  file_size: number;
  description?: string;
  is_primary: boolean;
  created_at: string;
}

export interface LogoCandidate {
  candidate_id: string;
  source_name: string;
  page_or_slide: string;
  preview_url: string;
  format: string;
  width: number;
  height: number;
  file_size: number;
  characteristics?: {
    width: number;
    height: number;
    aspect_ratio: number;
    has_transparency: boolean;
    average_luminance: number;
    recommended_variant: string;
    is_icon_proportions: boolean;
    is_low_res: boolean;
  };
}

export interface LogoProcessResult {
  status: 'ready' | 'candidates_found' | 'no_embedded_images';
  file_name: string;
  original_path?: string;
  raster_path?: string;
  source_format?: string;
  file_size?: number;
  characteristics?: {
    width: number;
    height: number;
    aspect_ratio: number;
    has_transparency: boolean;
    average_luminance: number;
    recommended_variant: string;
    is_icon_proportions: boolean;
    is_low_res: boolean;
  };
  candidates?: LogoCandidate[];
}

export interface AudienceSummary {
  has_data?: boolean;
  total_comments?: number;
  sentiment_counts?: Record<string, number>;
  sentiment_percentages?: Record<string, number>;
  daily_trend?: Array<any>;
  topics?: Array<{ topic: string; count: number; negative_count?: number }>;
}

export type ContentItem = UploadedContent;

export interface BrandRule {
  id: number;
  guideline_id?: number;
  rule_category: string;
  rule_name: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  source_document?: string;
  section_reference?: string;
  confidence?: number;
  review_status?: 'Needs Review' | 'Confirmed' | 'Rejected';
  suggested_correction?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ApprovedClaim {
  id: number;
  claim_text: string;
  category: string;
  source_reference?: string;
  supporting_evidence?: string;
  requires_special_approval?: boolean;
  approved_by: string;
  approved_at: string;
  is_active: boolean;
}

export interface CompanyFact {
  id: number;
  fact_title: string;
  fact_detail: string;
  category: string;
  source_document?: string;
  created_at: string;
}

export interface ConnectedSocialAccount {
  id: number;
  platform: string;
  account_name: string;
  account_id: string;
  status: 'Connected' | 'Not Connected' | 'Token Expired' | 'Setup Required';
  permissions: string;
  last_synced_at?: string;
  connection_error?: string;
  created_at: string;
}

export interface GeneratedReport {
  id: number;
  report_type: string;
  title: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export interface ChatSource {
  title: string;
  excerpt: string;
  source_type: string;
  reference?: string;
}

export interface ChatSuggestedAction {
  label: string;
  action_type: string;
  content_id?: number;
  payload?: any;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ChatSource[];
  suggested_actions?: ChatSuggestedAction[];
  created_at: string;
}

export interface ChatConversationSummary {
  id: number;
  title: string;
  mode: 'copilot' | 'general';
  context_page?: string;
  updated_at: string;
  message_count: number;
}

export interface ChatConversation {
  id: number;
  organisation_id: number;
  user_id: number;
  title: string;
  mode: 'copilot' | 'general';
  context_page?: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface PagePromptSuggestion {
  label: string;
  prompt: string;
  category: string;
}
