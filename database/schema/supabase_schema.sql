-- ============================================================================
-- BRANDGUARD AI — SUPABASE PRODUCTION DATABASE SCHEMA & STORAGE CONFIGURATION
-- Complete PostgreSQL DDL: 27 Tables, Foreign Keys, Indexes, Constraints, RLS
-- ============================================================================

-- Enable PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Table: organisations
-- ------------------------------------------------------------
CREATE TABLE organisations (
	id SERIAL NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	official_email VARCHAR(255) NOT NULL, 
	industry VARCHAR(100), 
	website VARCHAR(255), 
	logo_url VARCHAR(500), 
	contact_info VARCHAR(255), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_organisations_name ON organisations (name);

CREATE INDEX ix_organisations_id ON organisations (id);

CREATE UNIQUE INDEX ix_organisations_official_email ON organisations (official_email);

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
CREATE TABLE users (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	full_name VARCHAR(255) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	role VARCHAR(50), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_users_id ON users (id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_organisation_id ON users (organisation_id);

-- ------------------------------------------------------------
-- Table: brand_profiles
-- ------------------------------------------------------------
CREATE TABLE brand_profiles (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	company_name VARCHAR(255) NOT NULL, 
	logo_path VARCHAR(500), 
	primary_color VARCHAR(50), 
	secondary_color VARCHAR(50), 
	accent_color VARCHAR(50), 
	primary_font VARCHAR(100), 
	secondary_font VARCHAR(100), 
	tone_of_voice VARCHAR(255), 
	approved_vocabulary TEXT, 
	restricted_words TEXT, 
	communication_rules TEXT, 
	mission_statement TEXT, 
	target_audience VARCHAR(255), 
	website VARCHAR(255), 
	business_category VARCHAR(100), 
	products_and_services TEXT, 
	main_region VARCHAR(100), 
	preferred_language VARCHAR(50), 
	brand_personality VARCHAR(255), 
	writing_style TEXT, 
	alternate_logo_path VARCHAR(500), 
	company_description TEXT, 
	prohibited_claims TEXT, 
	preferred_phrases TEXT, 
	human_review_words TEXT, 
	approved_messaging_examples JSON, 
	communication_dos JSON, 
	communication_donts JSON, 
	guidelines_confirmed BOOLEAN, 
	claims_reviewed BOOLEAN, 
	vocabulary_configured BOOLEAN, 
	is_configured BOOLEAN, 
	is_setup_complete BOOLEAN, 
	setup_confirmed_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (organisation_id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_brand_profiles_id ON brand_profiles (id);

-- ------------------------------------------------------------
-- Table: brand_guidelines
-- ------------------------------------------------------------
CREATE TABLE brand_guidelines (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	document_name VARCHAR(255) NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	file_size INTEGER NOT NULL, 
	file_type VARCHAR(50) NOT NULL, 
	processing_status VARCHAR(50), 
	version VARCHAR(20), 
	document_category VARCHAR(100), 
	is_active BOOLEAN, 
	extracted_summary TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_brand_guidelines_id ON brand_guidelines (id);

CREATE INDEX ix_brand_guidelines_organisation_id ON brand_guidelines (organisation_id);

-- ------------------------------------------------------------
-- Table: document_sections
-- ------------------------------------------------------------
CREATE TABLE document_sections (
	id SERIAL NOT NULL, 
	guideline_id INTEGER NOT NULL, 
	section_index INTEGER, 
	title VARCHAR(255), 
	content_text TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(guideline_id) REFERENCES brand_guidelines (id) ON DELETE CASCADE
);

CREATE INDEX ix_document_sections_id ON document_sections (id);

CREATE INDEX ix_document_sections_guideline_id ON document_sections (guideline_id);

-- ------------------------------------------------------------
-- Table: brand_assets
-- ------------------------------------------------------------
CREATE TABLE brand_assets (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	asset_type VARCHAR(50), 
	file_name VARCHAR(255) NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	raster_path VARCHAR(500), 
	file_size INTEGER, 
	description VARCHAR(255), 
	variation_type VARCHAR(50), 
	source_format VARCHAR(20), 
	width INTEGER, 
	height INTEGER, 
	has_transparency BOOLEAN, 
	is_primary BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_brand_assets_organisation_id ON brand_assets (organisation_id);

CREATE INDEX ix_brand_assets_id ON brand_assets (id);

-- ------------------------------------------------------------
-- Table: brand_rules
-- ------------------------------------------------------------
CREATE TABLE brand_rules (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	guideline_id INTEGER, 
	rule_category VARCHAR(50), 
	rule_name VARCHAR(255) NOT NULL, 
	description TEXT NOT NULL, 
	severity VARCHAR(20), 
	source_document VARCHAR(255), 
	section_reference VARCHAR(100), 
	confidence FLOAT, 
	review_status VARCHAR(50), 
	suggested_correction TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	FOREIGN KEY(guideline_id) REFERENCES brand_guidelines (id) ON DELETE SET NULL
);

CREATE INDEX ix_brand_rules_organisation_id ON brand_rules (organisation_id);

CREATE INDEX ix_brand_rules_id ON brand_rules (id);

-- ------------------------------------------------------------
-- Table: approved_claims
-- ------------------------------------------------------------
CREATE TABLE approved_claims (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	claim_text TEXT NOT NULL, 
	category VARCHAR(100), 
	source_reference VARCHAR(255), 
	source_document_path VARCHAR(500), 
	approved_by VARCHAR(100), 
	approved_at TIMESTAMP WITHOUT TIME ZONE, 
	review_date TIMESTAMP WITHOUT TIME ZONE, 
	supporting_evidence TEXT, 
	requires_special_approval BOOLEAN, 
	is_active BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_approved_claims_id ON approved_claims (id);

CREATE INDEX ix_approved_claims_organisation_id ON approved_claims (organisation_id);

-- ------------------------------------------------------------
-- Table: company_facts
-- ------------------------------------------------------------
CREATE TABLE company_facts (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	fact_title VARCHAR(255) NOT NULL, 
	fact_detail TEXT NOT NULL, 
	category VARCHAR(100), 
	source_document VARCHAR(255), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_company_facts_id ON company_facts (id);

CREATE INDEX ix_company_facts_organisation_id ON company_facts (organisation_id);

-- ------------------------------------------------------------
-- Table: uploaded_contents
-- ------------------------------------------------------------
CREATE TABLE uploaded_contents (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	user_id INTEGER, 
	title VARCHAR(255) NOT NULL, 
	caption TEXT, 
	hashtags VARCHAR(255), 
	platform VARCHAR(50), 
	media_type VARCHAR(20), 
	file_path VARCHAR(500) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_size INTEGER, 
	current_version INTEGER, 
	revised_file_path VARCHAR(500), 
	revised_caption TEXT, 
	ai_suggestions JSON, 
	approval_status VARCHAR(50), 
	context_score FLOAT, 
	context_status VARCHAR(50), 
	context_verification JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_uploaded_contents_id ON uploaded_contents (id);

CREATE INDEX ix_uploaded_contents_organisation_id ON uploaded_contents (organisation_id);

-- ------------------------------------------------------------
-- Table: content_versions
-- ------------------------------------------------------------
CREATE TABLE content_versions (
	id SERIAL NOT NULL, 
	content_id INTEGER NOT NULL, 
	version_number INTEGER, 
	file_path VARCHAR(500) NOT NULL, 
	caption TEXT, 
	changes_summary TEXT, 
	ai_suggestions JSON, 
	generated_by VARCHAR(100), 
	audit_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE
);

CREATE INDEX ix_content_versions_content_id ON content_versions (content_id);

CREATE INDEX ix_content_versions_id ON content_versions (id);

-- ------------------------------------------------------------
-- Table: audit_reports
-- ------------------------------------------------------------
CREATE TABLE audit_reports (
	id SERIAL NOT NULL, 
	content_id INTEGER NOT NULL, 
	version_number INTEGER, 
	guideline_version VARCHAR(50), 
	overall_status VARCHAR(50), 
	final_recommendation VARCHAR(50), 
	visual_quality_score FLOAT, 
	readability_score FLOAT, 
	brand_consistency_score FLOAT, 
	messaging_score FLOAT, 
	extracted_text TEXT, 
	extracted_visuals_json JSON, 
	summary TEXT, 
	raw_analysis_json JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE
);

CREATE INDEX ix_audit_reports_content_id ON audit_reports (content_id);

CREATE INDEX ix_audit_reports_id ON audit_reports (id);

-- ------------------------------------------------------------
-- Table: audit_findings
-- ------------------------------------------------------------
CREATE TABLE audit_findings (
	id SERIAL NOT NULL, 
	report_id INTEGER NOT NULL, 
	issue_type VARCHAR(50) NOT NULL, 
	severity VARCHAR(20), 
	title VARCHAR(255) NOT NULL, 
	description TEXT NOT NULL, 
	why_it_matters TEXT, 
	evidence_found TEXT, 
	expected_rule TEXT, 
	comparison_result VARCHAR(50), 
	suggested_correction TEXT, 
	status VARCHAR(20), 
	resolved_in_version INTEGER, 
	is_resolved BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(report_id) REFERENCES audit_reports (id) ON DELETE CASCADE
);

CREATE INDEX ix_audit_findings_id ON audit_findings (id);

CREATE INDEX ix_audit_findings_report_id ON audit_findings (report_id);

-- ------------------------------------------------------------
-- Table: detected_claims
-- ------------------------------------------------------------
CREATE TABLE detected_claims (
	id SERIAL NOT NULL, 
	content_id INTEGER NOT NULL, 
	report_id INTEGER, 
	statement TEXT NOT NULL, 
	category VARCHAR(100), 
	location_in_creative VARCHAR(100), 
	related_guideline VARCHAR(255), 
	evidence_requirement VARCHAR(255), 
	verification_status VARCHAR(50), 
	confidence_score FLOAT, 
	risk_level VARCHAR(20), 
	required_action VARCHAR(255), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE, 
	FOREIGN KEY(report_id) REFERENCES audit_reports (id) ON DELETE CASCADE
);

CREATE INDEX ix_detected_claims_content_id ON detected_claims (content_id);

CREATE INDEX ix_detected_claims_report_id ON detected_claims (report_id);

CREATE INDEX ix_detected_claims_id ON detected_claims (id);

-- ------------------------------------------------------------
-- Table: claim_evidence
-- ------------------------------------------------------------
CREATE TABLE claim_evidence (
	id SERIAL NOT NULL, 
	claim_id INTEGER NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_size INTEGER, 
	description TEXT, 
	uploaded_by VARCHAR(100), 
	verification_notes TEXT, 
	verification_status VARCHAR(50), 
	uploaded_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(claim_id) REFERENCES detected_claims (id) ON DELETE CASCADE
);

CREATE INDEX ix_claim_evidence_id ON claim_evidence (id);

CREATE INDEX ix_claim_evidence_claim_id ON claim_evidence (claim_id);

-- ------------------------------------------------------------
-- Table: approval_records
-- ------------------------------------------------------------
CREATE TABLE approval_records (
	id SERIAL NOT NULL, 
	content_id INTEGER NOT NULL, 
	reviewer_id INTEGER, 
	reviewer_name VARCHAR(100) NOT NULL, 
	decision VARCHAR(50) NOT NULL, 
	previous_status VARCHAR(50), 
	new_status VARCHAR(50), 
	comments TEXT, 
	decision_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE, 
	FOREIGN KEY(reviewer_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_approval_records_id ON approval_records (id);

CREATE INDEX ix_approval_records_content_id ON approval_records (content_id);

-- ------------------------------------------------------------
-- Table: reviewer_comments
-- ------------------------------------------------------------
CREATE TABLE reviewer_comments (
	id SERIAL NOT NULL, 
	content_id INTEGER NOT NULL, 
	user_id INTEGER, 
	user_name VARCHAR(100) NOT NULL, 
	comment_text TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_reviewer_comments_id ON reviewer_comments (id);

CREATE INDEX ix_reviewer_comments_content_id ON reviewer_comments (content_id);

-- ------------------------------------------------------------
-- Table: connected_social_accounts
-- ------------------------------------------------------------
CREATE TABLE connected_social_accounts (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	platform VARCHAR(50) NOT NULL, 
	account_name VARCHAR(255) NOT NULL, 
	account_id VARCHAR(100) NOT NULL, 
	status VARCHAR(50), 
	permissions TEXT, 
	access_token TEXT, 
	refresh_token TEXT, 
	token_expires_at TIMESTAMP WITHOUT TIME ZONE, 
	last_synced_at TIMESTAMP WITHOUT TIME ZONE, 
	profile_picture_url VARCHAR(500), 
	connection_error TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_connected_social_accounts_organisation_id ON connected_social_accounts (organisation_id);

CREATE INDEX ix_connected_social_accounts_id ON connected_social_accounts (id);

-- ------------------------------------------------------------
-- Table: published_posts
-- ------------------------------------------------------------
CREATE TABLE published_posts (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	content_id INTEGER NOT NULL, 
	platform VARCHAR(50) NOT NULL, 
	external_post_id VARCHAR(100), 
	post_url VARCHAR(500), 
	published_at TIMESTAMP WITHOUT TIME ZONE, 
	likes_count INTEGER, 
	comments_count INTEGER, 
	shares_count INTEGER, 
	reach_count INTEGER, 
	status VARCHAR(50), 
	publish_response TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	UNIQUE (content_id), 
	FOREIGN KEY(content_id) REFERENCES uploaded_contents (id) ON DELETE CASCADE
);

CREATE INDEX ix_published_posts_id ON published_posts (id);

CREATE INDEX ix_published_posts_organisation_id ON published_posts (organisation_id);

-- ------------------------------------------------------------
-- Table: audience_feedbacks
-- ------------------------------------------------------------
CREATE TABLE audience_feedbacks (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	post_id INTEGER, 
	source_type VARCHAR(50), 
	external_comment_id VARCHAR(100), 
	author_name VARCHAR(100), 
	comment_text TEXT NOT NULL, 
	comment_date TIMESTAMP WITHOUT TIME ZONE, 
	platform VARCHAR(50), 
	sentiment VARCHAR(20), 
	sentiment_confidence FLOAT, 
	topic VARCHAR(100), 
	manual_override_sentiment VARCHAR(20), 
	manual_override_notes TEXT, 
	imported_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	FOREIGN KEY(post_id) REFERENCES published_posts (id) ON DELETE SET NULL
);

CREATE INDEX ix_audience_feedbacks_post_id ON audience_feedbacks (post_id);

CREATE INDEX ix_audience_feedbacks_id ON audience_feedbacks (id);

CREATE INDEX ix_audience_feedbacks_organisation_id ON audience_feedbacks (organisation_id);

-- ------------------------------------------------------------
-- Table: reputation_incidents
-- ------------------------------------------------------------
CREATE TABLE reputation_incidents (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	affected_post_title VARCHAR(255), 
	issue_description TEXT NOT NULL, 
	severity VARCHAR(20), 
	status VARCHAR(50), 
	detected_at TIMESTAMP WITHOUT TIME ZONE, 
	resolved_at TIMESTAMP WITHOUT TIME ZONE, 
	assigned_to VARCHAR(100), 
	internal_notes TEXT, 
	recommended_action TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_reputation_incidents_id ON reputation_incidents (id);

CREATE INDEX ix_reputation_incidents_organisation_id ON reputation_incidents (organisation_id);

-- ------------------------------------------------------------
-- Table: response_suggestions
-- ------------------------------------------------------------
CREATE TABLE response_suggestions (
	id SERIAL NOT NULL, 
	incident_id INTEGER, 
	comment_id INTEGER, 
	suggested_response_text TEXT NOT NULL, 
	tone VARCHAR(50), 
	approval_status VARCHAR(50), 
	reviewer_name VARCHAR(100), 
	approved_at TIMESTAMP WITHOUT TIME ZONE, 
	published_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(incident_id) REFERENCES reputation_incidents (id) ON DELETE CASCADE, 
	FOREIGN KEY(comment_id) REFERENCES audience_feedbacks (id) ON DELETE CASCADE
);

CREATE INDEX ix_response_suggestions_comment_id ON response_suggestions (comment_id);

CREATE INDEX ix_response_suggestions_id ON response_suggestions (id);

CREATE INDEX ix_response_suggestions_incident_id ON response_suggestions (incident_id);

-- ------------------------------------------------------------
-- Table: generated_reports
-- ------------------------------------------------------------
CREATE TABLE generated_reports (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	report_type VARCHAR(100) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	file_size INTEGER, 
	parameters_json JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_generated_reports_id ON generated_reports (id);

CREATE INDEX ix_generated_reports_organisation_id ON generated_reports (organisation_id);

-- ------------------------------------------------------------
-- Table: activity_logs
-- ------------------------------------------------------------
CREATE TABLE activity_logs (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	user_id INTEGER, 
	user_email VARCHAR(255), 
	action_type VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(100) NOT NULL, 
	entity_id INTEGER, 
	description TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE
);

CREATE INDEX ix_activity_logs_organisation_id ON activity_logs (organisation_id);

CREATE INDEX ix_activity_logs_id ON activity_logs (id);

-- ------------------------------------------------------------
-- Table: chat_conversations
-- ------------------------------------------------------------
CREATE TABLE chat_conversations (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	mode VARCHAR(50), 
	context_page VARCHAR(100), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_chat_conversations_id ON chat_conversations (id);

CREATE INDEX ix_chat_conversations_organisation_id ON chat_conversations (organisation_id);

CREATE INDEX ix_chat_conversations_user_id ON chat_conversations (user_id);

-- ------------------------------------------------------------
-- Table: chat_messages
-- ------------------------------------------------------------
CREATE TABLE chat_messages (
	id SERIAL NOT NULL, 
	conversation_id INTEGER NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	content TEXT NOT NULL, 
	sources JSON, 
	suggested_actions JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE
);

CREATE INDEX ix_chat_messages_id ON chat_messages (id);

CREATE INDEX ix_chat_messages_conversation_id ON chat_messages (conversation_id);

-- ------------------------------------------------------------
-- Table: social_comments
-- ------------------------------------------------------------
CREATE TABLE social_comments (
	id SERIAL NOT NULL, 
	organisation_id INTEGER NOT NULL, 
	social_account_id INTEGER, 
	platform VARCHAR(50) NOT NULL, 
	external_comment_id VARCHAR(255) NOT NULL, 
	external_post_id VARCHAR(255), 
	author_name VARCHAR(255), 
	author_id VARCHAR(255), 
	comment_text TEXT NOT NULL, 
	parent_comment_id VARCHAR(255), 
	is_reply BOOLEAN, 
	like_count INTEGER, 
	sentiment VARCHAR(50), 
	sentiment_confidence FLOAT, 
	topic VARCHAR(100), 
	is_spam BOOLEAN, 
	urgency_level VARCHAR(20), 
	ai_analyzed BOOLEAN, 
	reply_text TEXT, 
	reply_status VARCHAR(50), 
	reply_approved_by VARCHAR(100), 
	replied_at TIMESTAMP WITHOUT TIME ZONE, 
	comment_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	synced_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_social_comment UNIQUE (platform, external_comment_id), 
	FOREIGN KEY(organisation_id) REFERENCES organisations (id) ON DELETE CASCADE, 
	FOREIGN KEY(social_account_id) REFERENCES connected_social_accounts (id) ON DELETE CASCADE
);

CREATE INDEX ix_social_comments_organisation_id ON social_comments (organisation_id);

CREATE INDEX ix_social_comments_id ON social_comments (id);


-- ============================================================================
-- SUPABASE STORAGE BUCKETS & ACCESS POLICIES
-- ============================================================================
-- 1. Create storage buckets for BrandGuard AI assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('creatives', 'creatives', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('guidelines', 'guidelines', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv']),
  ('evidence', 'evidence', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']),
  ('logos', 'logos', true, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('reports', 'reports', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for Public Buckets (creatives, logos)
CREATE POLICY "Public Access for Brand Creatives"
ON storage.objects FOR SELECT
USING (bucket_id = 'creatives');

CREATE POLICY "Public Access for Brand Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- 3. Storage Policies for Authenticated Operations
CREATE POLICY "Allow authenticated users to upload creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('creatives', 'guidelines', 'evidence', 'logos', 'reports'));

CREATE POLICY "Allow authenticated users to read secure assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('guidelines', 'evidence', 'reports'));
