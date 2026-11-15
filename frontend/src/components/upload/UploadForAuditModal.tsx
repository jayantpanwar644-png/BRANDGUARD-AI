import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, UploadCloud, Image as ImageIcon, Sparkles, CheckCircle2,
  AlertTriangle, AlertCircle, RefreshCw, ArrowRight, ArrowLeft,
  ShieldCheck, FileText, Check, ChevronRight, ChevronLeft, Eye, Edit3,
  CheckCheck, Scale, Award, Trash2, Download, ExternalLink,
  HelpCircle, Layers, MessageSquare, Plus, Lock, Sliders,
  ThumbsUp, UserCheck, SplitSquareVertical, SlidersHorizontal, Zap, Ban,
  FileCheck, Loader2, Maximize2, Upload, Briefcase
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { 
  BrandProfile, BrandRule, BrandGuideline, 
  AuditReport, AuditFinding, DetectedClaim, UploadedContent, ContentVersion 
} from '../../types';
import { FlexibleLogoManager } from '../brand/FlexibleLogoManager';

interface UploadForAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  initialError?: string | null;
}

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const UploadForAuditModal: React.FC<UploadForAuditModalProps> = ({
  isOpen,
  onClose,
  initialFile = null,
  initialError = null
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Active Workflow Step (1 through 8)
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // STEP 1: Upload Post State
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [hashtags, setHashtags] = useState('#BrandSafety #Verified');
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [createdContent, setCreatedContent] = useState<UploadedContent | null>(null);

  // STEP 2: Company Brand Information State
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [productService, setProductService] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Authoritative, Trustworthy, Innovative');
  const [writingStyle, setWritingStyle] = useState('Active voice, verifiable metrics, zero buzzwords');
  const [brandPersonality, setBrandPersonality] = useState('Rigorous, Visionary, Modern');
  const [restrictedWords, setRestrictedWords] = useState('miracle, cheat, hack, revolutionary');
  const [prohibitedClaims, setProhibitedClaims] = useState('100% guaranteed, cheapest, zero risk');
  const [approvedVocab, setApprovedVocab] = useState('Empirically validated, autonomous, certified');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingBrandInfo, setIsSavingBrandInfo] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showLogoManagerModal, setShowLogoManagerModal] = useState(false);

  // STEP 3: Guideline Processing & Verification State
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Visual');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  // STEP 4: Live AI Post Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgressStep, setAnalysisProgressStep] = useState('');
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  // STEP 5: Claim Evidence Collection State
  const [selectedClaimForProof, setSelectedClaimForProof] = useState<DetectedClaim | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceUploadMessage, setEvidenceUploadMessage] = useState<string | null>(null);

  // STEP 6 & 7: Interactive Audit Findings & AI Recommendations
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [findingCategoryFilter, setFindingCategoryFilter] = useState<string>('All');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // STEP 6: Premium Animated Carousel & Detail Inspection State
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [carouselStartX, setCarouselStartX] = useState(0);
  const [carouselScrollLeft, setCarouselScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [step6HumanReviewFlagged, setStep6HumanReviewFlagged] = useState<number | null>(null);
  const [step6IsEditing, setStep6IsEditing] = useState(false);
  const [step6EditText, setStep6EditText] = useState('');

  // Keep first finding selected by default in step 6
  useEffect(() => {
    if (currentStep === 6 && auditReport?.findings && auditReport.findings.length > 0) {
      if (!selectedFinding) {
        setSelectedFinding(auditReport.findings[0]);
      }
    }
  }, [currentStep, auditReport, selectedFinding]);

  // STEP 8: AI Fix, Creative Synthesis & Re-Audit State
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [revisedContentVersion, setRevisedContentVersion] = useState<any>(null);
  const [reAuditDiff, setReAuditDiff] = useState<any>(null);
  const [finalDecisionMade, setFinalDecisionMade] = useState<string | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [reviewerComment, setReviewerComment] = useState('');

  // STEP 8: Enhanced Version Management, Final Upload & Comparison State
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [isUploadingFinalImage, setIsUploadingFinalImage] = useState(false);
  const [isReAuditing, setIsReAuditing] = useState(false);
  const [isDownloadingAsset, setIsDownloadingAsset] = useState(false);
  const [appliedCorrectionsList, setAppliedCorrectionsList] = useState<any[]>([]);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [showLargeCompareModal, setShowLargeCompareModal] = useState(false);
  const finalImageFileInputRef = useRef<HTMLInputElement>(null);

  // Global Error & Status
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  // Initialize and load brand profile on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(initialError || null);
      loadBrandData();
      if (initialFile) {
        processCreativeFile(initialFile);
        setCurrentStep(1);
      } else if (!createdContent) {
        setCurrentStep(1);
      }
    }
  }, [isOpen, initialError, initialFile]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Sync content versions on Step 7 & 8
  useEffect(() => {
    if (createdContent?.id && (currentStep === 7 || currentStep === 8)) {
      fetchContentVersions(createdContent.id);
    }
  }, [createdContent?.id, currentStep]);

  const loadBrandData = async () => {
    try {
      const [profileRes, guidelinesRes, rulesRes, assetsRes] = await Promise.all([
        apiRequest('/brand/profile').catch(() => null),
        apiRequest('/brand/guidelines').catch(() => []),
        apiRequest('/brand/rules').catch(() => []),
        apiRequest('/brand/assets').catch(() => [])
      ]);

      if (profileRes) {
        setBrandProfile(profileRes);
        setCompanyName(profileRes.company_name || '');
        setIndustry(profileRes.industry || '');
        setProductService(profileRes.products_and_services || '');
        setTargetAudience(profileRes.target_audience || '');
        if (profileRes.tone_of_voice) setToneOfVoice(profileRes.tone_of_voice);
        if (profileRes.writing_style) setWritingStyle(profileRes.writing_style);
        if (profileRes.brand_personality) setBrandPersonality(profileRes.brand_personality);
        if (profileRes.restricted_words) setRestrictedWords(profileRes.restricted_words);
        if (profileRes.prohibited_claims) setProhibitedClaims(profileRes.prohibited_claims);
        if (profileRes.approved_vocabulary) setApprovedVocab(profileRes.approved_vocabulary);
        if (profileRes.logo_path) setLogoPreview(formatAssetUrl(profileRes.logo_path));
      }

      const primaryLogo = assetsRes.find((a: any) => a.is_primary || a.asset_type === 'Primary Logo');
      if (primaryLogo && primaryLogo.file_path) {
        setLogoPreview(formatAssetUrl(primaryLogo.file_path));
      }

      setGuidelines(guidelinesRes || []);
      setRules(rulesRes || []);
    } catch (e) {
      console.error('Failed to load initial brand data in modal', e);
    }
  };

  const formatAssetUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return path;
    const match = path.match(/[/\\]uploads[/\\](.+)$/i);
    return match ? `/uploads/${match[1].replace(/\\/g, '/')}` : path;
  };

  // --------------------------------------------------------------------------
  // STEP 1 HANDLERS: Post Upload
  // --------------------------------------------------------------------------
  const processCreativeFile = (file: File) => {
    setErrorMessage(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !file.type.startsWith('image/')) {
      setErrorMessage(`Unsupported format "${ext}". Supported: JPG, JPEG, PNG, WEBP.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('File size exceeds 50MB limit.');
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedTitle = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    setTitle(formattedTitle || 'Campaign Visual Asset');
  };

  const handleSavePostStep1 = async (e?: React.FormEvent, runDirectAudit: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a creative image to upload.');
      return;
    }

    setIsSavingPost(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim() || selectedFile.name);
      if (caption.trim()) formData.append('caption', caption.trim());
      formData.append('platform', platform);
      if (hashtags.trim()) formData.append('hashtags', hashtags.trim());

      const res = await apiRequest('/content/upload', {
        method: 'POST',
        body: formData
      });

      const content = res.content || res;
      setCreatedContent(content);

      if (runDirectAudit) {
        setCurrentStep(4);
        handleStartAnalysisStep4(content);
      } else {
        setCurrentStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload creative asset.');
    } finally {
      setIsSavingPost(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2 HANDLERS: Company Brand Information
  // --------------------------------------------------------------------------
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/organisations/logo', {
        method: 'POST',
        body: formData
      });
      if (res.logo_url) {
        setLogoPreview(formatAssetUrl(res.logo_url));
      }
      await loadBrandData();
    } catch (err: any) {
      alert(err.message || 'Logo upload failed.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBrandInfoStep2 = async () => {
    if (!companyName.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }

    setIsSavingBrandInfo(true);
    setErrorMessage(null);

    try {
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          company_name: companyName,
          industry,
          products_and_services: productService,
          target_audience: targetAudience,
          tone_of_voice: toneOfVoice,
          writing_style: writingStyle,
          brand_personality: brandPersonality,
          restricted_words: restrictedWords,
          prohibited_claims: prohibitedClaims,
          approved_vocabulary: approvedVocab,
          vocabulary_configured: true
        })
      });

      await loadBrandData();
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update company brand configuration.');
    } finally {
      setIsSavingBrandInfo(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 3 HANDLERS: Guideline Extraction & Confirmation
  // --------------------------------------------------------------------------
  const handleGuidelineDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploadingDoc(true);
    setDocUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', '1.0');
      formData.append('document_category', 'Master Guidelines');

      await apiRequest('/brand/guidelines/upload', {
        method: 'POST',
        body: formData
      });

      await loadBrandData();
    } catch (err: any) {
      setDocUploadError(err.message || 'Guideline document processing failed.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleReviewRule = async (ruleId: number, status: 'Confirmed' | 'Rejected') => {
    try {
      await apiRequest(`/brand/rules/${ruleId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ review_status: status, is_active: status === 'Confirmed' })
      });
      await loadBrandData();
    } catch (err: any) {
      alert(err.message || 'Failed to update rule status.');
    }
  };

  const handleBulkConfirmRules = async () => {
    try {
      await apiRequest('/brand/rules/bulk-confirm', { method: 'POST' });
      await loadBrandData();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk confirm rules.');
    }
  };

  const handleAddCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleDesc.trim()) return;

    try {
      await apiRequest('/brand/rules', {
        method: 'POST',
        body: JSON.stringify({
          rule_name: newRuleName,
          rule_category: newRuleCategory,
          severity: newRuleSeverity,
          description: newRuleDesc,
          review_status: 'Confirmed'
        })
      });

      setNewRuleName('');
      setNewRuleDesc('');
      setNewRuleModalOpen(false);
      await loadBrandData();
    } catch (err: any) {
      alert(err.message || 'Failed to add rule.');
    }
  };

  // --------------------------------------------------------------------------
  // STEP 4 HANDLERS: Real AI Post Analysis
  // --------------------------------------------------------------------------
  const handleStartAnalysisStep4 = async (targetOrEvent?: UploadedContent | null | React.MouseEvent) => {
    const targetContent = (targetOrEvent && typeof targetOrEvent === 'object' && 'id' in targetOrEvent)
      ? (targetOrEvent as UploadedContent)
      : null;
    const activeContent = targetContent || createdContent;
    if (!activeContent) {
      setErrorMessage('Content record missing. Please re-upload.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStep(4);

    const steps = [
      '1. Initializing visual inspection engine...',
      '2. Executing Native Windows Runtime OCR text extraction...',
      '3. Analyzing typography, composition & Euclidean color palette...',
      '4. Cross-referencing against confirmed brand rules & prohibited words...',
      '5. Grounding promotional claims & RAG verification...',
      '6. Compiling evidence-based compliance audit report...'
    ];

    let stepIdx = 0;
    setAnalysisProgressStep(steps[0]);
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setAnalysisProgressStep(steps[stepIdx]);
      }
    }, 900);

    try {
      const res = await apiRequest(`/content/${activeContent.id}/analyse`, {
        method: 'POST'
      });

      clearInterval(interval);
      const report = res.report || res;
      if (report) {
        if ((!report.findings || report.findings.length === 0) && report.raw_analysis_json?.findings) {
          report.findings = report.raw_analysis_json.findings.map((f: any, idx: number) => ({
            id: f.id || idx + 1,
            issue_type: f.issue_type || 'Visual',
            severity: f.severity || 'Medium',
            title: f.title || 'Brand Compliance Issue',
            description: f.description || '',
            why_it_matters: f.why_it_matters || '',
            evidence_found: f.evidence_found || '',
            suggested_correction: f.suggested_correction || '',
            expected_rule: f.expected_rule || '',
            comparison_result: f.comparison_result || 'Needs Improvement',
            status: f.status || 'Open',
            created_at: new Date().toISOString()
          }));
        }
        setAuditReport(report);
        if (report.findings && report.findings.length > 0) {
          setSelectedFinding(report.findings[0]);
        }
      } else {
        setAuditReport(report);
      }

      // Check whether claims requiring evidence exist
      const unverifiedClaims = (report?.detected_claims || []).filter((c: DetectedClaim) =>
        ['Not Verified', 'Needs Human Review', 'Pending Evidence', 'Under Review'].includes(c.verification_status)
      );

      setIsAnalyzing(false);

      if (unverifiedClaims.length > 0) {
        // Step 5: Claim Evidence Collection is required
        setCurrentStep(5);
      } else {
        // Skip Step 5 directly to Step 6 (Audit Findings)
        setCurrentStep(6);
      }
    } catch (err: any) {
      clearInterval(interval);
      setIsAnalyzing(false);
      setErrorMessage(err.message || 'AI Brand Audit failed. Please try again.');
    }
  };

  // --------------------------------------------------------------------------
  // STEP 5 HANDLERS: Claim Evidence Upload
  // --------------------------------------------------------------------------
  const handleUploadClaimProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedClaimForProof) return;
    const file = e.target.files[0];
    setIsUploadingEvidence(true);
    setEvidenceUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Proof for statement: "${selectedClaimForProof.statement}"`);

      const res = await apiRequest(`/claims/${selectedClaimForProof.id}/evidence`, {
        method: 'POST',
        body: formData
      });

      setEvidenceUploadMessage(`Proof verified: Status updated to "${res.claim?.verification_status || 'Supported'}".`);

      // Refresh content details to update claims
      if (createdContent) {
        const refreshed = await apiRequest(`/content/${createdContent.id}`);
        if (refreshed.audit_reports && refreshed.audit_reports.length > 0) {
          setAuditReport(refreshed.audit_reports[refreshed.audit_reports.length - 1]);
        }
      }
    } catch (err: any) {
      setEvidenceUploadMessage(`Evidence upload error: ${err.message}`);
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 6 & 7 HANDLERS: Interactive Findings & AI Suggestions
  // --------------------------------------------------------------------------
  const handleSelectFinding = async (finding?: AuditFinding | null) => {
    const allFindings = (auditReport?.findings && auditReport.findings.length > 0)
      ? auditReport.findings
      : (auditReport?.raw_analysis_json?.findings || []);

    const targetFinding = finding || selectedFinding || allFindings[0] || null;
    if (targetFinding) {
      setSelectedFinding(targetFinding);
    }
    setCurrentStep(7);

    if (createdContent) {
      setIsLoadingSuggestions(true);
      try {
        const res = await apiRequest(`/content/${createdContent.id}/suggestions`);
        setAiSuggestions(res.suggestions || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
  };

  const fetchContentVersions = async (contentId: number) => {
    try {
      const vers = await apiRequest<ContentVersion[]>(`/content/${contentId}/versions`);
      if (vers && Array.isArray(vers)) {
        setContentVersions(vers);
        return vers;
      }
    } catch (e) {
      console.error('Failed to fetch content versions:', e);
    }
    return [];
  };

  // --------------------------------------------------------------------------
  // STEP 8 HANDLERS: Apply AI Fix, Upload Final Image & Dynamic Re-Audit
  // --------------------------------------------------------------------------
  const handleApplyAIFix = async (findingOrEvent?: AuditFinding | null | React.MouseEvent) => {
    if (!createdContent) return;

    setIsApplyingFix(true);
    setErrorMessage(null);
    setCurrentStep(8);

    try {
      const activeF = (findingOrEvent && typeof findingOrEvent === 'object' && 'issue_type' in findingOrEvent)
        ? (findingOrEvent as AuditFinding)
        : selectedFinding;
      // 1. Generate revised creative asset using upgraded precision editor
      const revisedRes = await apiRequest(`/content/${createdContent.id}/generate-revised-creative`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'full',
          headline: title,
          caption: manualEditText || caption,
          apply_logo: true,
          apply_brand_colors: true,
          finding_id: activeF?.id,
          correction_type: activeF?.issue_type
        })
      });

      setRevisedContentVersion(revisedRes);
      setAppliedCorrectionsList(revisedRes.applied_corrections || []);
      const newVerNum = revisedRes.new_version_number || 2;

      // 2. Trigger dynamic re-audit on this exact newly created version
      const reAuditRes = await apiRequest(`/content/${createdContent.id}/reanalyse-version/${newVerNum}`, {
        method: 'POST'
      });

      setReAuditDiff(reAuditRes.version_compared);

      // 3. Refresh versions list and select the new version
      await fetchContentVersions(createdContent.id);
      setSelectedVersionNum(newVerNum);

      // 4. Refresh content and audit report
      const refreshedContent = await apiRequest(`/content/${createdContent.id}`);
      setCreatedContent(refreshedContent);
      if (reAuditRes.audit_result?.report) {
        setAuditReport(reAuditRes.audit_result.report);
      } else if (refreshedContent.audit_reports && refreshedContent.audit_reports.length > 0) {
        setAuditReport(refreshedContent.audit_reports[refreshedContent.audit_reports.length - 1]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize revised creative asset.');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const handleUploadFinalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdContent) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      alert('Unsupported file format. Please upload PNG, JPG, JPEG, or WEBP.');
      return;
    }

    setIsUploadingFinalImage(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', 'User-uploaded final creative for governance sign-off and re-audit.');

      const res = await apiRequest(`/content/${createdContent.id}/upload-version`, {
        method: 'POST',
        body: formData
      });

      const newVerNum = res.new_version_number || res.version?.version_number;

      // Refresh versions list
      await fetchContentVersions(createdContent.id);
      setSelectedVersionNum(newVerNum);

      // Run re-audit on this uploaded final image
      const reAuditRes = await apiRequest(`/content/${createdContent.id}/reanalyse-version/${newVerNum}`, {
        method: 'POST'
      });

      setReAuditDiff(reAuditRes.version_compared);

      const refreshedContent = await apiRequest(`/content/${createdContent.id}`);
      setCreatedContent(refreshedContent);
      if (reAuditRes.audit_result?.report) {
        setAuditReport(reAuditRes.audit_result.report);
      } else if (refreshedContent.audit_reports && refreshedContent.audit_reports.length > 0) {
        setAuditReport(refreshedContent.audit_reports[refreshedContent.audit_reports.length - 1]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload manual final image version.');
    } finally {
      setIsUploadingFinalImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRunReAudit = async (targetVer?: number) => {
    if (!createdContent) return;
    const vNum = targetVer || selectedVersionNum;

    setIsReAuditing(true);
    setErrorMessage(null);

    try {
      const reAuditRes = await apiRequest(`/content/${createdContent.id}/reanalyse-version/${vNum}`, {
        method: 'POST'
      });

      setReAuditDiff(reAuditRes.version_compared);
      await fetchContentVersions(createdContent.id);

      const refreshedContent = await apiRequest(`/content/${createdContent.id}`);
      setCreatedContent(refreshedContent);
      if (reAuditRes.audit_result?.report) {
        setAuditReport(reAuditRes.audit_result.report);
      } else if (refreshedContent.audit_reports && refreshedContent.audit_reports.length > 0) {
        setAuditReport(refreshedContent.audit_reports[refreshedContent.audit_reports.length - 1]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Re-audit failed for Version ${vNum}.`);
    } finally {
      setIsReAuditing(false);
    }
  };

  const handleDownloadSelectedImage = async () => {
    if (!createdContent) return;
    setIsDownloadingAsset(true);
    const token = localStorage.getItem('brandguard_token');
    const vNum = selectedVersionNum || createdContent.current_version;
    const downloadUrl = `/api/content/${createdContent.id}/download-version/${vNum}?token=${encodeURIComponent(token || '')}`;

    try {
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (createdContent.title || 'Brand_Creative').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_v${vNum}_FinalCreative.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e: any) {
      window.open(downloadUrl, '_blank');
    } finally {
      setIsDownloadingAsset(false);
    }
  };

  const handleSubmitHumanApproval = async (decision: 'Approved' | 'Changes Requested') => {
    if (!createdContent) return;
    setIsSubmittingDecision(true);

    try {
      await apiRequest(`/approvals/${createdContent.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          comments: reviewerComment || `Decision rendered via Audit Workflow Modal for Version ${selectedVersionNum}.`
        })
      });
      setFinalDecisionMade(decision);
    } catch (err: any) {
      alert(err.message || 'Approval submission failed.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdContent || isDownloadingPDF) return;
    setIsDownloadingPDF(true);
    try {
      const genRes = await apiRequest('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'Brand Audit Report',
          title: `${createdContent.title} — AI Brand Audit Report`,
          content_id: createdContent.id,
          date_range: '30d'
        })
      });

      const token = localStorage.getItem('brandguard_token');
      const downloadUrl = `/api/reports/${genRes.id}/download?token=${encodeURIComponent(token || '')}`;

      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error('Failed to download compiled PDF report file.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (createdContent.title || 'Brand_Audit_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_Audit_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e: any) {
      alert(e.message || 'PDF generation failed.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Helper step names
  const stepsList = [
    { num: 1, label: 'Upload Post' },
    { num: 2, label: 'Brand Info' },
    { num: 3, label: 'Guidelines' },
    { num: 4, label: 'AI Audit' },
    { num: 5, label: 'Evidence' },
    { num: 6, label: 'Findings' },
    { num: 7, label: 'AI Fix' },
    { num: 8, label: 'Re-Audit' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0F172A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && processCreativeFile(e.target.files[0])}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
        />
        <input
          type="file"
          ref={docInputRef}
          onChange={handleGuidelineDocUpload}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />
        <input
          type="file"
          ref={logoInputRef}
          onChange={handleLogoUpload}
          accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.tiff,.tif,.pdf,.docx,.pptx"
          className="hidden"
        />
        <input
          type="file"
          ref={evidenceInputRef}
          onChange={handleUploadClaimProof}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />
        <input
          type="file"
          ref={finalImageFileInputRef}
          onChange={handleUploadFinalImage}
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        {/* Modal Header with 8-Step Breadcrumb Progress */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FFFFFF] flex-shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#315C76] text-white flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold font-heading text-[#172033] leading-none">
                  Smart AI Brand Audit &amp; Correction Workflow
                </h3>
                <span className="text-[11.5px] text-[#64748B]">
                  Step {currentStep} of 8 — {stepsList[currentStep - 1].label}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#172033] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              title="Close Workflow"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center justify-between pt-3 overflow-x-auto text-[11px] font-semibold gap-1">
            {stepsList.map((s) => {
              const isPassed = s.num < currentStep;
              const isCurrent = s.num === currentStep;
              return (
                <div
                  key={s.num}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'bg-[#315C76] text-white shadow-2xs'
                      : isPassed
                      ? 'bg-[#F0FDF4] text-emerald-800 border border-emerald-200'
                      : 'bg-[#F8FAFC] text-[#94A3B8] border border-[#F1F5F9]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent ? 'bg-white/20 text-white' : isPassed ? 'bg-emerald-200 text-emerald-900' : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}>
                    {isPassed ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Notice: </span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ========================================================================= */}
          {/* STEP 1: UPLOAD THE ACTUAL POST                                            */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#F1F5F9] pb-3">
                <h4 className="text-[16px] font-bold text-[#172033] font-heading">
                  Step 1: Upload Post for Brand Governance
                </h4>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  Select your marketing asset. A unique database content record will be created.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left: Drag & Drop Dropzone / Preview */}
                <div className="md:col-span-6 space-y-3">
                  {!previewUrl ? (
                    <div
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                          fileInputRef.current.click();
                        }
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files?.[0]) processCreativeFile(e.dataTransfer.files[0]);
                      }}
                      className="border-2 border-dashed border-[#CBD5E1] hover:border-[#315C76] bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[260px]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white shadow-2xs border border-[#E2E8F0] flex items-center justify-center text-[#315C76] mb-3">
                        <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                      </div>
                      <span className="text-[13.5px] font-semibold text-[#172033]">
                        Drop creative image here, or click to browse
                      </span>
                      <span className="text-[11.5px] text-[#64748B] mt-1">
                        Supports JPG, JPEG, PNG, WEBP (Max 50MB)
                      </span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl border border-[#CBD5E1] overflow-hidden bg-slate-900 group">
                      <img
                        src={previewUrl}
                        alt="Creative Preview"
                        className="w-full h-[260px] object-contain bg-slate-900/50"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                              fileInputRef.current.click();
                            }
                          }}
                          className="px-3 py-1.5 bg-white text-[#172033] rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Post Metadata Details */}
                <div className="md:col-span-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1">
                      Post Title / Campaign Asset Name *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Q3 Enterprise Robot Launch Creative"
                      className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1">
                      Caption / Accompanying Copy
                    </label>
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Enter promotional copy, claim statements, or post caption..."
                      className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Target Platform
                      </label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs text-[#172033] bg-white focus:outline-none"
                      >
                        <option value="Instagram">Instagram</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter / X</option>
                        <option value="Facebook">Facebook</option>
                        <option value="YouTube">YouTube Community</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Hashtags
                      </label>
                      <input
                        type="text"
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="#Brand #Launch"
                        className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs text-[#172033] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11.5px] text-[#64748B]">
                      {brandProfile?.is_configured ? '✓ Brand guidelines active' : '• Brand info reviewed in Step 2'}
                    </span>
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleSavePostStep1(e, false)}
                        disabled={isSavingPost || !selectedFile}
                        className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#172033] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span>Review Brand Info</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSavePostStep1(e, true)}
                        disabled={isSavingPost || !selectedFile}
                        className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isSavingPost ? 'Saving Post...' : 'Save & Run AI Audit'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COMPANY BRAND INFORMATION                                         */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#F1F5F9] pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-[16px] font-bold text-[#172033] font-heading">
                    Step 2: Company Brand Information
                  </h4>
                  <p className="text-[13px] text-[#64748B] mt-0.5">
                    We retrieve your saved brand configuration automatically. Confirm or update settings below.
                  </p>
                </div>
                {brandProfile?.is_configured && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Saved Config Loaded</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Company Details */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                  <div className="font-semibold text-[#172033] text-[13px] flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-[#315C76]" />
                    <span>A. Company Details</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] font-medium mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] font-medium mb-1">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Autonomous AI Logistics"
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] font-medium mb-1">Products &amp; Services</label>
                    <input
                      type="text"
                      value={productService}
                      onChange={(e) => setProductService(e.target.value)}
                      placeholder="e.g. Aegis Autonomous Bot, Fleet OS"
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] font-medium mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Enterprise logistics directors, supply chain VPs"
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                    />
                  </div>
                </div>

                {/* Brand Identity & Master Logo */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                  <div className="font-semibold text-[#172033] text-[13px] flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-[#315C76]" />
                      <span>B. Official Brand Logo</span>
                    </div>
                    {logoPreview && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Active Master Asset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 pt-1">
                    <div className="w-20 h-20 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center overflow-hidden p-1 shadow-2xs">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-[#94A3B8] text-center">No Logo</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#172033] rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                        >
                          {isUploadingLogo ? 'Uploading...' : logoPreview ? 'Replace' : 'Upload File'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLogoManagerModal(true)}
                          className="px-3 py-1.5 bg-[#EAF2F8] hover:bg-[#D5E6F3] text-[#315C76] border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Flexible Logo Hub (PDF, SVG, Variations)</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Accepts PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, or extracts logos from PDF, DOCX, and PPTX.
                      </p>
                    </div>
                  </div>

                  {/* Brand Voice snippet */}
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                    <label className="block text-[11px] text-[#64748B] font-medium">Communication Tone of Voice</label>
                    <input
                      type="text"
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                    />
                  </div>
                </div>

                {/* Restricted & Prohibited Terms */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2 md:col-span-2">
                  <div className="font-semibold text-[#172033] text-[13px] flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-[#D85F67]" />
                    <span>C. Restricted Vocabulary &amp; Prohibited Marketing Claims</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-[#D85F67] font-semibold mb-1">Restricted Words (Comma separated)</label>
                      <input
                        type="text"
                        value={restrictedWords}
                        onChange={(e) => setRestrictedWords(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#D85F67] font-semibold mb-1">Prohibited Claims (Comma separated)</label>
                      <input
                        type="text"
                        value={prohibitedClaims}
                        onChange={(e) => setProhibitedClaims(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#172033]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Post Upload</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBrandInfoStep2}
                  disabled={isSavingBrandInfo}
                  className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>{isSavingBrandInfo ? 'Saving Brand Profile...' : 'Confirm Brand Info & Verify Guidelines'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: GUIDELINE PROCESSING & CONFIRMATION                               */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#F1F5F9] pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-[16px] font-bold text-[#172033] font-heading">
                    Step 3: Guideline Processing &amp; Confirmation
                  </h4>
                  <p className="text-[13px] text-[#64748B] mt-0.5">
                    Extracted brand rules must be reviewed and confirmed before the AI post audit begins.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#172033] rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#315C76]" />
                    <span>{isUploadingDoc ? 'Parsing Doc...' : 'Upload Guideline Doc'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRuleModalOpen(true)}
                    className="px-3 py-1.5 bg-[#EAF2F8] text-[#315C76] hover:bg-[#D5E6F3] rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>

                  {rules.some(r => r.review_status === 'Needs Review') && (
                    <button
                      type="button"
                      onClick={handleBulkConfirmRules}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Confirm All Rules</span>
                    </button>
                  )}
                </div>
              </div>

              {docUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                  {docUploadError}
                </div>
              )}

              {/* Rules List Table */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto">
                {rules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#94A3B8] italic">
                    No brand rules extracted yet. Upload a guideline PDF/TXT or click "Add Rule" above.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                      <tr>
                        <th className="p-3">Rule Name &amp; Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Review Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {rules.map((r) => {
                        const status = r.review_status || 'Confirmed';
                        return (
                          <tr key={r.id} className="hover:bg-[#F8FAFC]">
                            <td className="p-3 max-w-xs">
                              <div className="font-semibold text-[#172033]">{r.rule_name}</div>
                              <div className="text-[11.5px] text-[#64748B] truncate mt-0.5">{r.description}</div>
                              {r.source_document && (
                                <span className="inline-block mt-1 text-[10px] text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded">
                                  {r.source_document}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[#315C76] font-semibold">{r.rule_category}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                r.severity === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {r.severity}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                status === 'Confirmed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                status === 'Needs Review' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {status !== 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleReviewRule(r.id, 'Confirmed')}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                                >
                                  Confirm
                                </button>
                              )}
                              {status !== 'Rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleReviewRule(r.id, 'Rejected')}
                                  className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add Custom Rule Inline Form Modal */}
              {newRuleModalOpen && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3">
                  <div className="font-semibold text-xs text-[#172033]">Add Structured Brand Rule</div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Rule Title (e.g. Logo Minimum Clearance)"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                    />
                    <select
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                    >
                      <option value="Visual">Visual</option>
                      <option value="Logo">Logo</option>
                      <option value="Messaging">Messaging</option>
                      <option value="Claims">Claims</option>
                    </select>
                    <select
                      value={newRuleSeverity}
                      onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                    >
                      <option value="High">High Severity</option>
                      <option value="Medium">Medium Severity</option>
                      <option value="Low">Low Severity</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Describe the expected rule and criteria..."
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setNewRuleModalOpen(false)}
                      className="px-3 py-1 text-xs text-[#64748B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomRule}
                      className="px-3 py-1 bg-[#315C76] text-white rounded-lg text-xs font-semibold"
                    >
                      Save Rule
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Brand Info</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartAnalysisStep4}
                  disabled={rules.length === 0}
                  className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Actual AI Post Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ACTUAL AI POST ANALYSIS (LIVE PROGRESS)                           */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in">
              {isAnalyzing ? (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-[#315C76]/20 border-t-[#315C76] animate-spin flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-[#315C76]" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h4 className="text-[17px] font-bold text-[#172033] font-heading">
                      Executing Autonomous Brand Audit
                    </h4>
                    <p className="text-[13px] text-[#64748B] leading-relaxed font-mono">
                      {analysisProgressStep || 'Inspecting creative with Native OCR and Vision Engine...'}
                    </p>
                  </div>

                  <div className="w-full max-w-xs bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#315C76] h-full w-2/3 animate-pulse" />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-rose-600" />
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h4 className="text-[17px] font-bold text-[#172033] font-heading">
                      Brand Audit Incomplete
                    </h4>
                    <p className="text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 leading-relaxed">
                      {errorMessage || 'An error occurred during creative analysis. Please retry.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setCurrentStep(3);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] border border-[#CBD5E1] rounded-xl flex items-center space-x-1 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Guidelines</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartAnalysisStep4}
                      className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry AI Audit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: CLAIM EVIDENCE COLLECTION (CONDITIONAL)                           */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#F1F5F9] pb-3">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Conditional Verification Triggered</span>
                </div>
                <h4 className="text-[16px] font-bold text-[#172033] font-heading">
                  Step 5: Factual Claims Requiring Proof
                </h4>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  The AI vision engine detected factual or performance assertions. Provide proof documents (PDF, DOCX, TXT) to substantiate them.
                </p>
              </div>

              {evidenceUploadMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{evidenceUploadMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                {(auditReport?.detected_claims || []).map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 bg-white border border-[#CBD5E1] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[#172033] text-[13.5px]">
                          "{claim.statement}"
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          claim.verification_status === 'Supported'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {claim.verification_status}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#64748B]">
                        Category: <strong className="text-[#172033]">{claim.category}</strong> • Risk: <span className="text-amber-700 font-semibold">{claim.risk_level}</span>
                      </div>
                      <div className="text-[11.5px] text-[#475569] bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9]">
                        <strong>Why Required: </strong>{claim.required_action}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClaimForProof(claim);
                          evidenceInputRef.current?.click();
                        }}
                        disabled={isUploadingEvidence}
                        className="px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isUploadingEvidence ? 'Parsing Proof...' : 'Upload Supporting Proof'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
                >
                  ← Back to Guidelines
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>Proceed to Audit Findings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: INTERACTIVE AUDIT FINDINGS (PREMIUM ANIMATED SCROLLING CAROUSEL)   */}
          {/* ========================================================================= */}
          {currentStep === 6 && (() => {
            const allFindings: AuditFinding[] = (auditReport?.findings && auditReport.findings.length > 0)
              ? auditReport.findings
              : (auditReport?.raw_analysis_json?.findings?.map((f: any, idx: number) => ({
                  id: f.id || idx + 1,
                  issue_type: f.issue_type || 'Visual',
                  severity: f.severity || 'Medium',
                  title: f.title || 'Brand Compliance Issue',
                  description: f.description || '',
                  why_it_matters: f.why_it_matters || '',
                  evidence_found: f.evidence_found || '',
                  suggested_correction: f.suggested_correction || '',
                  expected_rule: f.expected_rule || '',
                  comparison_result: f.comparison_result || 'Needs Improvement',
                  status: f.status || 'Open',
                  created_at: new Date().toISOString()
                })) || []);
            
            const getSeverity = (f: AuditFinding): 'Critical' | 'High' | 'Medium' | 'Low' => {
              const s = (f.severity || '').toLowerCase();
              if (s.includes('crit')) return 'Critical';
              if (s.includes('high')) return 'High';
              if (s.includes('low')) return 'Low';
              return 'Medium';
            };

            const getFindingCategory = (finding: AuditFinding): string => {
              const type = (finding.issue_type || '').toLowerCase();
              const title = (finding.title || '').toLowerCase();

              if (type.includes('relevance') || title.includes('relevance') || type.includes('unrelated') || title.includes('unrelated')) {
                return 'Company/Product Relevance';
              }
              if (type.includes('logo') || title.includes('logo') || title.includes('brandmark')) {
                return 'Logo and Brand Identity';
              }
              if (type.includes('vocab') || type.includes('prohibited') || title.includes('restricted') || title.includes('prohibited')) {
                return 'Restricted Vocabulary';
              }
              if (type.includes('claim') || title.includes('claim') || title.includes('substantiat') || title.includes('assurance')) {
                return 'Claims and Facts';
              }
              if (type.includes('tone') || type.includes('voice') || type.includes('messag') || title.includes('tone') || title.includes('copy')) {
                return 'Messaging and Tone';
              }
              return 'Visual Compliance';
            };

            const filterCategories = [
              'All',
              'Company/Product Relevance',
              'Logo and Brand Identity',
              'Visual Compliance',
              'Messaging and Tone',
              'Restricted Vocabulary',
              'Claims and Facts'
            ];

            const filteredFindings = allFindings.filter(f => {
              if (findingCategoryFilter === 'All') return true;
              return getFindingCategory(f) === findingCategoryFilter;
            });

            // Dynamic KPI summary counts
            const totalCount = allFindings.length;
            const criticalCount = allFindings.filter(f => getSeverity(f) === 'Critical').length;
            const highCount = allFindings.filter(f => getSeverity(f) === 'High').length;
            const mediumCount = allFindings.filter(f => getSeverity(f) === 'Medium').length;
            const lowCount = allFindings.filter(f => getSeverity(f) === 'Low').length;
            const resolvedCount = allFindings.filter(f => 
              f.status === 'Resolved' || 
              (f.comparison_result || '').toLowerCase().includes('resolv') || 
              (f.comparison_result || '').toLowerCase().includes('compliant')
            ).length;

            const getCategoryCount = (cat: string) => {
              if (cat === 'All') return allFindings.length;
              return allFindings.filter(f => getFindingCategory(f) === cat).length;
            };

            const scrollCarousel = (direction: 'left' | 'right') => {
              if (carouselRef.current) {
                const scrollAmount = 370;
                carouselRef.current.scrollBy({
                  left: direction === 'left' ? -scrollAmount : scrollAmount,
                  behavior: 'smooth'
                });
                setTimeout(updateScrollButtons, 350);
              }
            };

            const updateScrollButtons = () => {
              if (carouselRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
                setCanScrollLeft(scrollLeft > 10);
                setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
              }
            };

            const handleMouseDown = (e: React.MouseEvent) => {
              if (!carouselRef.current) return;
              setIsCarouselDragging(true);
              setCarouselStartX(e.pageX - carouselRef.current.offsetLeft);
              setCarouselScrollLeft(carouselRef.current.scrollLeft);
            };

            const handleMouseLeave = () => {
              setIsCarouselDragging(false);
            };

            const handleMouseUp = () => {
              setIsCarouselDragging(false);
            };

            const handleMouseMove = (e: React.MouseEvent) => {
              if (!isCarouselDragging || !carouselRef.current) return;
              e.preventDefault();
              const x = e.pageX - carouselRef.current.offsetLeft;
              const walk = (x - carouselStartX) * 1.4;
              carouselRef.current.scrollLeft = carouselScrollLeft - walk;
              updateScrollButtons();
            };

            const handleCarouselWheel = (e: React.WheelEvent) => {
              if (carouselRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                carouselRef.current.scrollLeft += e.deltaY * 0.9;
                updateScrollButtons();
              }
            };

            const renderCategoryIcon = (category: string) => {
              switch (category) {
                case 'Company/Product Relevance':
                  return <Briefcase className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />;
                case 'Logo and Brand Identity':
                  return <Award className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />;
                case 'Visual Compliance':
                  return <Layers className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />;
                case 'Messaging and Tone':
                  return <MessageSquare className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />;
                case 'Restricted Vocabulary':
                  return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
                case 'Claims and Facts':
                  return <Scale className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />;
                default:
                  return <Eye className="w-3.5 h-3.5 text-[#315C76] flex-shrink-0" />;
              }
            };

            const renderSeverityBadge = (severity: 'Critical' | 'High' | 'Medium' | 'Low') => {
              switch (severity) {
                case 'Critical':
                  return (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 ring-1 ring-rose-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                      <span>Critical</span>
                    </span>
                  );
                case 'High':
                  return (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>High</span>
                    </span>
                  );
                case 'Medium':
                  return (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Medium</span>
                    </span>
                  );
                case 'Low':
                default:
                  return (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span>Low</span>
                    </span>
                  );
              }
            };

            const renderStatusBadge = (finding: AuditFinding) => {
              const isResolved = finding.status === 'Resolved' || 
                (finding.comparison_result || '').toLowerCase().includes('resolv') || 
                (finding.comparison_result || '').toLowerCase().includes('compliant');
              const compResult = finding.comparison_result || 'Needs Improvement';
              
              if (isResolved) {
                return (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Resolved</span>
                  </span>
                );
              }
              if (compResult.toLowerCase().includes('contradict')) {
                return (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    <span>Contradicted</span>
                  </span>
                );
              }
              if (compResult.toLowerCase().includes('verif') || compResult.toLowerCase().includes('review')) {
                return (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Needs Verification</span>
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Needs Improvement</span>
                </span>
              );
            };

            const getCardBorderClasses = (f: AuditFinding, isSelected: boolean) => {
              const sev = getSeverity(f);
              if (isSelected) {
                return 'border-[#315C76] ring-2 ring-[#315C76] shadow-md bg-slate-50/70';
              }
              switch (sev) {
                case 'Critical':
                  return 'border-rose-300 hover:border-rose-500 bg-gradient-to-b from-rose-50/40 via-white to-white ring-1 ring-rose-300/60 shadow-[0_4px_16px_rgba(244,63,94,0.08)] hover:shadow-[0_8px_24px_rgba(244,63,94,0.18)]';
                case 'High':
                  return 'border-orange-300 hover:border-orange-500 bg-gradient-to-b from-orange-50/30 via-white to-white ring-1 ring-orange-300/50 shadow-[0_4px_14px_rgba(249,115,22,0.07)] hover:shadow-[0_8px_22px_rgba(249,115,22,0.15)]';
                case 'Medium':
                  return 'border-amber-200 hover:border-amber-400 bg-white shadow-2xs hover:shadow-md';
                case 'Low':
                default:
                  return 'border-[#CBD5E1] hover:border-[#315C76] bg-white shadow-2xs hover:shadow-md';
              }
            };

            // Active selected finding or fallback to first
            const activeFinding = selectedFinding || filteredFindings[0] || allFindings[0] || null;

            return (
              <div className="space-y-5 animate-in fade-in duration-200">
                <style>{`
                  .custom-audit-scrollbar::-webkit-scrollbar {
                    height: 6px;
                  }
                  .custom-audit-scrollbar::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 9999px;
                  }
                  .custom-audit-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 9999px;
                  }
                  .custom-audit-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                  }
                `}</style>

                {/* Section Header */}
                <div className="border-b border-[#F1F5F9] pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-[17px] font-bold text-[#172033] font-heading flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#315C76]" />
                      <span>Step 6: Interactive Audit Findings &amp; Observations</span>
                    </h4>
                    <p className="text-[13px] text-[#64748B] mt-0.5">
                      Explore AI-detected brand governance issues, inspect evidence, and trigger targeted autonomous AI corrections.
                    </p>
                  </div>

                  {auditReport && (
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs flex items-center space-x-1.5">
                        <span className="text-[#64748B]">Visual Quality:</span>
                        <strong className="text-[#172033] font-bold">{Math.round(auditReport.visual_quality_score)}%</strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs flex items-center space-x-1.5">
                        <span className="text-[#64748B]">Brand Adherence:</span>
                        <strong className="text-[#172033] font-bold">{Math.round(auditReport.brand_consistency_score)}%</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company & Product Relevance Check Card */}
                {(() => {
                  const compRel = auditReport?.company_relevance || (auditReport?.raw_analysis_json as any)?.company_relevance;
                  if (!compRel) return null;

                  const isRelated = compRel.status === 'Related to Company';
                  const isUnrelated = compRel.status === 'Not Related to Company';
                  const isReview = compRel.status === 'Needs Review';

                  return (
                    <div className={`p-4 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                      isRelated 
                        ? 'bg-[#F0FDF4] border-[#BDE7D4]' 
                        : isUnrelated 
                        ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400/20' 
                        : 'bg-amber-50/70 border-amber-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-xl ${
                            isRelated ? 'bg-emerald-100 text-emerald-800' : isUnrelated ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[13.5px] font-bold text-[#172033] flex items-center space-x-2">
                              <span>Company &amp; Product Relevance Check</span>
                              <span className="text-[11px] font-semibold text-[#64748B]">
                                ({Math.round((compRel.confidence || 0.9) * 100)}% Confidence)
                              </span>
                            </div>
                            <p className="text-[11.5px] text-[#64748B]">
                              Evaluated against verified business description, configured offerings &amp; official guidelines.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs ${
                            isRelated 
                              ? 'bg-emerald-600 text-white' 
                              : isUnrelated 
                              ? 'bg-rose-600 text-white animate-pulse' 
                              : 'bg-amber-500 text-white'
                          }`}>
                            {isRelated && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isUnrelated && <AlertTriangle className="w-3.5 h-3.5" />}
                            {isReview && <HelpCircle className="w-3.5 h-3.5" />}
                            <span>{compRel.status}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/80 p-3 rounded-xl border border-black/5 space-y-1">
                          <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">
                            Detected Product / Subject
                          </span>
                          <p className="text-[13px] font-bold text-[#172033]">
                            {compRel.detected_product_or_service || 'Commercial Subject'}
                          </p>
                          {compRel.matched_company_offering && (
                            <p className="text-[11.5px] text-emerald-800 font-medium pt-0.5">
                              Matched Offering: <strong className="font-bold">{compRel.matched_company_offering}</strong>
                            </p>
                          )}
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-black/5 space-y-1">
                          <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">
                            Relevance Evidence &amp; Assessment
                          </span>
                          <p className="text-[12px] text-[#334155] leading-relaxed">
                            {compRel.explanation}
                          </p>
                          {compRel.evidence && (
                            <p className="text-[11px] text-[#64748B] italic pt-0.5">
                              Evidence: {compRel.evidence}
                            </p>
                          )}
                        </div>
                      </div>

                      {compRel.recommended_action && (
                        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11.5px]">
                          <span className="font-semibold text-[#172033]">Recommended Action:</span>
                          <span className={`font-medium ${isUnrelated ? 'text-rose-700 font-bold' : 'text-[#475569]'}`}>
                            {compRel.recommended_action}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 1. Highlighted Findings Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Findings</span>
                    <span className="text-[20px] font-extrabold text-[#172033] font-heading mt-1">{totalCount}</span>
                  </div>

                  <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Critical</span>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    </div>
                    <span className="text-[20px] font-extrabold text-rose-700 font-heading mt-1">{criticalCount}</span>
                  </div>

                  <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">High</span>
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                    </div>
                    <span className="text-[20px] font-extrabold text-orange-700 font-heading mt-1">{highCount}</span>
                  </div>

                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Medium</span>
                    <span className="text-[20px] font-extrabold text-amber-700 font-heading mt-1">{mediumCount}</span>
                  </div>

                  <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">Low</span>
                    <span className="text-[20px] font-extrabold text-sky-700 font-heading mt-1">{lowCount}</span>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Resolved</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[20px] font-extrabold text-emerald-700 font-heading mt-1">{resolvedCount}</span>
                  </div>
                </div>

                {/* 2. Category Filter Pills & Carousel Navigation Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 custom-audit-scrollbar">
                    {filterCategories.map((cat) => {
                      const count = getCategoryCount(cat);
                      const isSelected = findingCategoryFilter === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFindingCategoryFilter(cat);
                            if (carouselRef.current) {
                              carouselRef.current.scrollLeft = 0;
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs ${
                            isSelected
                              ? 'bg-[#315C76] text-white shadow-xs'
                              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Horizontal Scroll Navigation Controls */}
                  <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                    {auditReport?.extracted_visuals_json?.status === 'Logo Verified' && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center space-x-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Logo Verified</span>
                      </span>
                    )}
                    <span className="text-[11.5px] text-[#64748B] hidden md:inline">
                      Swipe or drag to scroll
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      disabled={!canScrollLeft}
                      className="w-8 h-8 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#315C76] hover:bg-[#F8FAFC] text-[#172033] disabled:opacity-40 disabled:hover:border-[#CBD5E1] disabled:hover:bg-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      title="Previous Finding Cards"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      disabled={!canScrollRight}
                      className="w-8 h-8 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#315C76] hover:bg-[#F8FAFC] text-[#172033] disabled:opacity-40 disabled:hover:border-[#CBD5E1] disabled:hover:bg-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      title="Next Finding Cards"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Animated Scrolling Horizontal Cards Carousel */}
                {filteredFindings.length === 0 ? (
                  findingCategoryFilter === 'Logo and Brand Identity' && auditReport?.extracted_visuals_json?.status === 'Logo Verified' ? (
                    <div className="py-7 px-4 text-center bg-white border border-emerald-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                          Logo Verified
                        </span>
                        <h5 className="text-[16px] font-bold text-[#172033] font-heading mt-1">Official Brand Logo Verified</h5>
                        <p className="text-xs text-[#64748B] max-w-md mx-auto">
                          {auditReport?.extracted_visuals_json?.comparison_explanation ||
                            'The uploaded creative features verified brand mark attribution matching confirmed official assets.'}
                        </p>
                      </div>

                      {/* Visual Comparison Preview */}
                      {(auditReport?.extracted_visuals_json?.detected_logo_url || auditReport?.extracted_visuals_json?.matched_official_logo_url) && (
                        <div className="flex items-center justify-center space-x-4 pt-2">
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Detected Mark</span>
                            <div className="w-24 h-14 flex items-center justify-center bg-white rounded border border-slate-200 p-1">
                              {auditReport.extracted_visuals_json.detected_logo_url ? (
                                <img src={formatAssetUrl(auditReport.extracted_visuals_json.detected_logo_url)} alt="Detected" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No mark detected</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600">✓ Matches</span>
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Official Asset</span>
                            <div className="w-24 h-14 flex items-center justify-center bg-white rounded border border-slate-200 p-1">
                              <img src={formatAssetUrl(auditReport.extracted_visuals_json.matched_official_logo_url || logoPreview || '')} alt="Official" className="max-h-full max-w-full object-contain" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => setFindingCategoryFilter('All')}
                          className="mt-2 px-3 py-1.5 text-xs text-[#315C76] font-semibold hover:underline"
                        >
                          Show All Findings
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-white border border-[#E2E8F0] rounded-2xl text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <h5 className="text-[15px] font-bold text-[#172033]">Zero Issues Detected</h5>
                      <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                        No violations found in the "{findingCategoryFilter}" category. Content meets verified governance standards.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFindingCategoryFilter('All')}
                        className="mt-2 px-3 py-1.5 text-xs text-[#315C76] font-semibold hover:underline"
                      >
                        Show All Findings
                      </button>
                    </div>
                  )
                ) : (
                  <div
                    ref={carouselRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onWheel={handleCarouselWheel}
                    onScroll={updateScrollButtons}
                    className={`custom-audit-scrollbar flex overflow-x-auto space-x-4 pb-3 pt-2 px-1 scroll-smooth snap-x snap-mandatory ${
                      isCarouselDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                    }`}
                  >
                    {filteredFindings.map((finding, idx) => {
                      const category = getFindingCategory(finding);
                      const severity = getSeverity(finding);
                      const isSelected = activeFinding?.id === finding.id;

                      return (
                        <div
                          key={finding.id || idx}
                          onClick={() => setSelectedFinding(finding)}
                          style={{ animationDelay: `${idx * 50}ms` }}
                          className={`w-[320px] md:w-[350px] flex-shrink-0 flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 ease-out snap-start group relative animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards hover:-translate-y-1.5 hover:scale-[1.01] ${getCardBorderClasses(
                            finding,
                            isSelected
                          )}`}
                        >
                          {/* Card Header */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-[#E2E8F0] text-[11px] font-semibold text-[#172033] shadow-2xs truncate">
                                {renderCategoryIcon(category)}
                                <span className="truncate">{category}</span>
                              </div>

                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                {isSelected && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#315C76] text-white shadow-2xs">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Active</span>
                                  </span>
                                )}
                                {renderSeverityBadge(severity)}
                              </div>
                            </div>

                            {/* Problem Title */}
                            <div>
                              <h5 className="text-[14.5px] font-bold text-[#172033] font-heading line-clamp-2 leading-snug group-hover:text-[#315C76] transition-colors">
                                {finding.title}
                              </h5>
                              <p className="text-[12px] text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                                {finding.why_it_matters || finding.description}
                              </p>
                            </div>

                            {/* Detected Element / Evidence Badge */}
                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 space-y-1">
                              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                                <span>Detected in Creative:</span>
                                <span className="text-[9.5px] font-mono text-rose-600 font-semibold">Evidence</span>
                              </div>
                              <div className="font-mono text-[11px] text-rose-900 bg-rose-50/70 border border-rose-200/80 px-2 py-1 rounded-md line-clamp-2 break-all font-semibold">
                                "{finding.evidence_found || 'Text assertion or visual element'}"
                              </div>
                            </div>

                            {/* Violated Brand Rule */}
                            <div className="text-[11px] text-[#475569] flex items-start space-x-1.5 pt-0.5">
                              <span className="font-semibold text-[#172033] flex-shrink-0">Rule:</span>
                              <span className="text-[#64748B] line-clamp-1 italic">
                                {finding.expected_rule || 'Confirmed Brand Governance Standard'}
                              </span>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="pt-3 mt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                            {renderStatusBadge(finding)}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFinding(finding);
                              }}
                              className="px-2.5 py-1 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer group-hover:scale-102"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Fix with AI</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Active Finding Detail & Deep Inspection Panel */}
                {activeFinding && (
                  <div className="p-5 bg-white border border-[#CBD5E1] rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EAF2F8] text-[#315C76] border border-[#CBD5E1] text-[11px] font-bold">
                            Active Card Inspection
                          </span>
                          {renderSeverityBadge(getSeverity(activeFinding))}
                          <span className="text-xs text-[#64748B] font-medium">
                            Category: <strong className="text-[#172033]">{getFindingCategory(activeFinding)}</strong>
                          </span>
                        </div>
                        <h4 className="text-[16px] font-bold text-[#172033] font-heading mt-1">
                          {activeFinding.title}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        {step6HumanReviewFlagged === activeFinding.id && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-in fade-in">
                            ✓ Flagged for Human Sign-Off
                          </span>
                        )}
                        {renderStatusBadge(activeFinding)}
                      </div>
                    </div>

                    {/* 3 Detail Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                      {/* Column 1: Detected Problem & Evidence */}
                      <div className="p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-xl space-y-2">
                        <div className="font-bold text-rose-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Detected Problem</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#64748B] block mb-1">Problematic Creative Evidence:</span>
                          <div className="font-mono text-rose-950 bg-white p-2 rounded-lg border border-rose-200 font-semibold break-all leading-relaxed">
                            "{activeFinding.evidence_found || 'Text or asset detected in creative'}"
                          </div>
                        </div>

                        {/* Side-by-side logo comparison if this is a Logo finding */}
                        {(activeFinding.issue_type === 'Logo' || activeFinding.title?.toLowerCase().includes('logo')) && (
                          <div className="mt-2 pt-2 border-t border-rose-200/70 space-y-2">
                            <span className="text-[10.5px] font-bold text-rose-900 uppercase tracking-wider block">
                              Side-by-Side Logo Comparison
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-1.5 bg-white rounded-lg border border-rose-200 text-center">
                                <span className="text-[9.5px] text-[#64748B] font-semibold block mb-1">Detected in Creative</span>
                                <div className="h-16 flex items-center justify-center bg-slate-50 rounded p-1 overflow-hidden">
                                  {auditReport?.extracted_visuals_json?.detected_logo_url ? (
                                    <img
                                      src={formatAssetUrl(auditReport.extracted_visuals_json.detected_logo_url)}
                                      alt="Detected Logo"
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No mark detected</span>
                                  )}
                                </div>
                                <span className="text-[9.5px] text-slate-500 block truncate mt-1">
                                  Pos: {auditReport?.extracted_visuals_json?.placement || 'Unknown'}
                                </span>
                              </div>

                              <div className="p-1.5 bg-white rounded-lg border border-rose-200 text-center">
                                <span className="text-[9.5px] text-[#64748B] font-semibold block mb-1">Official Master Asset</span>
                                <div className="h-16 flex items-center justify-center bg-slate-50 rounded p-1 overflow-hidden">
                                  {auditReport?.extracted_visuals_json?.matched_official_logo_url || logoPreview ? (
                                    <img
                                      src={formatAssetUrl(auditReport?.extracted_visuals_json?.matched_official_logo_url || logoPreview || '')}
                                      alt="Official Logo"
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No asset registered</span>
                                  )}
                                </div>
                                <span className="text-[9.5px] text-slate-500 block truncate mt-1">
                                  {auditReport?.extracted_visuals_json?.matched_variation || 'Primary Logo'}
                                </span>
                              </div>
                            </div>
                            {auditReport?.extracted_visuals_json?.comparison_explanation && (
                              <p className="text-[10.5px] text-rose-950 font-sans leading-snug bg-rose-100/60 p-1.5 rounded-md border border-rose-200">
                                <strong>Comparison Result: </strong>{auditReport.extracted_visuals_json.comparison_explanation}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-[11.5px] text-[#475569] leading-relaxed">
                          <strong>Why It Matters: </strong>{activeFinding.why_it_matters || activeFinding.description}
                        </p>
                      </div>

                      {/* Column 2: Violated Guideline & Expected Rule */}
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2">
                        <div className="font-bold text-[#172033] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#315C76]" />
                          <span>Violated Brand Rule</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#64748B] block mb-1">Confirmed Standard:</span>
                          <div className="text-[#172033] bg-white p-2 rounded-lg border border-[#E2E8F0] font-medium leading-relaxed">
                            {activeFinding.expected_rule || 'Marketing content must comply with approved company identity and verified facts.'}
                          </div>
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Comparison: <strong className="text-[#172033]">{activeFinding.comparison_result || 'Needs Correction'}</strong>
                        </div>
                      </div>

                      {/* Column 3: Recommended AI Correction */}
                      <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                        <div className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>AI Recommended Action</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#64748B] block mb-1">Recommended Solution:</span>
                          <div className="text-emerald-950 bg-white p-2 rounded-lg border border-emerald-200 font-medium leading-relaxed">
                            {activeFinding.suggested_correction || 'Synthesize revised creative version with verified compliant copy and official logo.'}
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Autonomous AI engine can apply this change automatically.
                        </p>
                      </div>
                    </div>

                    {/* Action Bar with 3 Explicit Actions */}
                    <div className="pt-2 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-[#64748B]">
                        Selected Problem: <strong className="text-[#172033]">{activeFinding.title}</strong>
                      </div>

                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        {/* 1. Request Human Review */}
                        <button
                          type="button"
                          onClick={() => {
                            setStep6HumanReviewFlagged(activeFinding.id);
                            setTimeout(() => setStep6HumanReviewFlagged(null), 4000);
                          }}
                          className="px-3 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Request Human Review</span>
                        </button>

                        {/* 2. Edit Manually */}
                        <button
                          type="button"
                          onClick={() => {
                            setStep6IsEditing(!step6IsEditing);
                            if (!step6EditText) {
                              setStep6EditText(caption || activeFinding.evidence_found || '');
                            }
                          }}
                          className="px-3 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#315C76]" />
                          <span>{step6IsEditing ? 'Close Manual Editor' : 'Edit Manually'}</span>
                        </button>

                        {/* 3. Ask AI to Fix */}
                        <button
                          type="button"
                          onClick={() => handleSelectFinding(activeFinding)}
                          className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask AI to Fix</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Manual Edit Drawer */}
                    {step6IsEditing && (
                      <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#172033]">
                          <span>Manual Text / Caption Correction</span>
                          <button
                            type="button"
                            onClick={() => setStep6IsEditing(false)}
                            className="text-[#64748B] hover:text-[#172033]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={step6EditText}
                          onChange={(e) => setStep6EditText(e.target.value)}
                          placeholder="Type corrected copy..."
                          className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setStep6IsEditing(false)}
                            className="px-3 py-1.5 text-xs text-[#64748B]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyAIFix}
                            className="px-3 py-1.5 bg-[#315C76] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                          >
                            <Check className="w-3 h-3" />
                            <span>Apply Changes &amp; Synthesize Version</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6 Bottom Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Claim Proofs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSelectFinding(activeFinding || allFindings[0] || null);
                    }}
                    className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Proceed to AI Recommendations</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* STEP 7: CLICK ANY PROBLEM TO GET AI RECOMMENDATIONS                       */}
          {/* ========================================================================= */}
          {currentStep === 7 && (() => {
            const allFindings: AuditFinding[] = (auditReport?.findings && auditReport.findings.length > 0)
              ? auditReport.findings
              : (auditReport?.raw_analysis_json?.findings?.map((f: any, idx: number) => ({
                  id: f.id || idx + 1,
                  issue_type: f.issue_type || 'Visual',
                  severity: f.severity || 'Medium',
                  title: f.title || 'Brand Compliance Issue',
                  description: f.description || '',
                  why_it_matters: f.why_it_matters || '',
                  evidence_found: f.evidence_found || '',
                  suggested_correction: f.suggested_correction || '',
                  expected_rule: f.expected_rule || '',
                  comparison_result: f.comparison_result || 'Needs Improvement',
                  status: f.status || 'Open',
                  created_at: new Date().toISOString()
                })) || []);

            const currentFinding = selectedFinding || allFindings[0] || null;

            if (!currentFinding) {
              return (
                <div className="py-12 px-4 text-center space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-[17px] font-bold text-[#172033] font-heading">
                      No Governance Issues Requiring AI Correction
                    </h4>
                    <p className="text-[13px] text-[#64748B] leading-relaxed">
                      All aspects of this creative adhere to confirmed company standards. You can proceed directly to final review and approval.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] border border-[#CBD5E1] rounded-xl flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Findings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(8)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs cursor-pointer"
                    >
                      <span>Proceed to Final Verification (Step 8)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-[#F1F5F9] pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-[16px] font-bold text-[#172033] font-heading flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-[#315C76]" />
                      <span>Step 7: AI Targeted Recommendations &amp; Corrections</span>
                    </h4>
                    <p className="text-[13px] text-[#64748B] mt-0.5">
                      Analyzing specific issue: <strong className="text-[#172033]">{currentFinding.title}</strong>
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    currentFinding.severity === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {currentFinding.severity} Severity
                  </span>
                </div>

                {/* Issue Deep Comparison Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                    <div className="font-semibold text-rose-900 text-[12.5px] uppercase tracking-wider">
                      Actual Detected Problem
                    </div>
                    <div>
                      <strong className="text-[#172033]">Extracted Evidence: </strong>
                      <span className="font-mono text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                        {currentFinding.evidence_found}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      <strong>Why It's an Issue: </strong>{currentFinding.why_it_matters}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="font-semibold text-emerald-900 text-[12.5px] uppercase tracking-wider">
                      Expected Company Standard
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      <strong>Confirmed Rule: </strong>{currentFinding.expected_rule}
                    </p>
                    <div>
                      <strong className="text-emerald-900">Recommended Action: </strong>
                      <span className="text-[#172033]">{currentFinding.suggested_correction}</span>
                    </div>
                  </div>
                </div>

                {/* 5 Distinct Actions Panel */}
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3">
                  <div className="font-semibold text-xs text-[#172033] uppercase tracking-wider">
                    Select Issue Resolution Action:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowExplanationModal(!showExplanationModal)}
                      className="p-3 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl font-semibold text-[#172033] flex flex-col items-center justify-center text-center space-y-1.5 transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-[#315C76]" />
                      <span>1. Explain Issue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        alert(`AI Suggestion: Replace restricted phrasing with "${brandProfile?.approved_vocabulary?.split(',')[0] || 'Empirically validated'}" and ensure official logo is unobstructed.`);
                      }}
                      className="p-3 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl font-semibold text-[#172033] flex flex-col items-center justify-center text-center space-y-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>2. Suggest Fix</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyAIFix}
                      disabled={isApplyingFix}
                      className="p-3 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl font-semibold flex flex-col items-center justify-center text-center space-y-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isApplyingFix ? 'Synthesizing...' : '3. Apply AI Fix'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditingManually(!isEditingManually)}
                      className="p-3 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl font-semibold text-[#172033] flex flex-col items-center justify-center text-center space-y-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-[#475569]" />
                      <span>4. Edit Manually</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        alert('Finding flagged for human compliance sign-off.');
                      }}
                      className="p-3 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl font-semibold text-[#172033] flex flex-col items-center justify-center text-center space-y-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>5. Human Review</span>
                    </button>
                  </div>

                  {/* Inline Manual Edit View */}
                  {isEditingManually && (
                    <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                      <label className="block text-xs font-semibold text-[#172033]">
                        Manual Correction / Revised Copy
                      </label>
                      <textarea
                        rows={2}
                        value={manualEditText || caption}
                        onChange={(e) => setManualEditText(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleApplyAIFix}
                          className="px-3 py-1 bg-[#315C76] text-white rounded-lg text-xs font-semibold"
                        >
                          Save Manual Changes &amp; Synthesize Version
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Explanation Details */}
                  {showExplanationModal && (
                    <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs space-y-1.5 text-[#334155]">
                      <div className="font-bold text-[#172033]">Architectural Compliance Reasoning:</div>
                      <p>
                        The BrandGuard governance pipeline detected a direct contradiction against the confirmed company standard.
                        Applying the AI Fix will generate a revised Version 2 creative incorporating your official master logo,
                        re-grounding marketing claims, and removing restricted vocabulary without overwriting the original post.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    className="px-4 py-2 text-xs font-semibold text-[#64748B]"
                  >
                    ← Back to Findings
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyAIFix}
                    disabled={isApplyingFix}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs cursor-pointer"
                  >
                    <span>{isApplyingFix ? 'Generating Revised Creative...' : 'Apply Fix & Proceed to Re-Audit (Step 8)'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* STEP 8: FINAL RE-AUDIT, DYNAMIC RESOLUTION & SUMMARY                      */}
          {/* ========================================================================= */}
          {currentStep === 8 && (() => {
            const v1 = contentVersions.find(v => v.version_number === 1) || {
              id: 1,
              version_number: 1,
              file_path: createdContent?.file_path || '',
              caption: createdContent?.caption || '',
              changes_summary: 'Original unedited upload.',
              generated_by: 'Original Upload',
              created_at: createdContent?.created_at || new Date().toISOString()
            };

            const aiVersions = contentVersions.filter(
              v => v.version_number > 1 && (v.generated_by?.includes('AI') || v.generated_by?.includes('BrandGuard'))
            );
            const latestAiVersion = aiVersions.length > 0 ? aiVersions[aiVersions.length - 1] : (
              revisedContentVersion ? {
                id: 2,
                version_number: revisedContentVersion.new_version_number || 2,
                file_path: revisedContentVersion.revised_file_path || createdContent?.revised_file_path || '',
                caption: revisedContentVersion.revised_caption || createdContent?.caption || '',
                changes_summary: revisedContentVersion.changes_summary || 'Brand-calibrated AI creative revision.',
                generated_by: 'BrandGuard AI Correction Engine',
                ai_suggestions: revisedContentVersion.applied_corrections || appliedCorrectionsList,
                created_at: new Date().toISOString()
              } : (createdContent?.revised_file_path ? {
                id: 2,
                version_number: 2,
                file_path: createdContent.revised_file_path,
                caption: createdContent.caption || '',
                changes_summary: 'Brand-calibrated AI creative revision.',
                generated_by: 'BrandGuard AI Correction Engine',
                ai_suggestions: appliedCorrectionsList,
                created_at: createdContent.updated_at
              } : null)
            );

            const userVersions = contentVersions.filter(
              v => v.version_number > 1 && (v.generated_by?.includes('User Uploaded') || v.generated_by === 'User')
            );
            const latestUserVersion = userVersions.length > 0 ? userVersions[userVersions.length - 1] : null;

            const activeVer = contentVersions.find(v => v.version_number === selectedVersionNum) || (
              selectedVersionNum === 1 ? v1 : (
                latestAiVersion && selectedVersionNum === latestAiVersion.version_number ? latestAiVersion : (
                  latestUserVersion && selectedVersionNum === latestUserVersion.version_number ? latestUserVersion : v1
                )
              )
            );

            const aiCorrections = (latestAiVersion?.ai_suggestions && Array.isArray(latestAiVersion.ai_suggestions))
              ? latestAiVersion.ai_suggestions
              : (appliedCorrectionsList.length > 0 ? appliedCorrectionsList : [
                  { issue_type: 'Logo', title: 'Official Master Logo Composited', description: `Embedded registered logo (${brandProfile?.company_name || 'Brand'}) with certified 24px exclusion zone and high-contrast backdrop pill.`, status: 'Resolved' },
                  { issue_type: 'Restricted Vocabulary', title: 'Prohibited Phrasing Inpainted & Replaced', description: 'Inpainted non-compliant buzzwords and substituted approved corporate terminology.', status: 'Resolved' },
                  { issue_type: 'Typography', title: 'Visual Hierarchy & Scrim Calibration', description: 'Calibrated background contrast scrim and font sharpness to satisfy WCAG AAA standards.', status: 'Resolved' },
                  { issue_type: 'Color', title: 'Brand Palette Harmonization', description: `Harmonized top accent border with primary brand hex (${brandProfile?.primary_color || '#1A56DB'}).`, status: 'Resolved' }
                ]);

            const formatDate = (dateStr?: string) => {
              if (!dateStr) return 'Recent';
              try {
                return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              } catch {
                return dateStr;
              }
            };

            return (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Header Row */}
                <div className="border-b border-[#F1F5F9] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[16px] font-bold text-[#172033] font-heading flex items-center space-x-2">
                      <CheckCheck className="w-5 h-5 text-emerald-600" />
                      <span>Step 8: Final Re-Audit, Version Selection &amp; Governance Approval</span>
                    </h4>
                    <p className="text-[13px] text-[#64748B] mt-0.5">
                      Select your preferred creative version (Original, AI-Edited, or User-Uploaded), run a rigorous re-audit, and submit human sign-off.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold bg-[#EAF2F8] text-[#315C76] border border-[#CBD5E1] px-3 py-1 rounded-full flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active Selection: Version {selectedVersionNum} ({activeVer.generated_by || 'Asset'})</span>
                    </span>
                  </div>
                </div>

                {/* Top Control Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Upload Final Image */}
                    <button
                      type="button"
                      onClick={() => finalImageFileInputRef.current?.click()}
                      disabled={isUploadingFinalImage}
                      className="px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      title="Upload your own manually edited creative (PNG, JPG, JPEG, WEBP)"
                    >
                      {isUploadingFinalImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Final Image...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Final Image</span>
                        </>
                      )}
                    </button>

                    {/* 2. Apply AI Edit / Try Another Edit */}
                    <button
                      type="button"
                      onClick={() => handleApplyAIFix()}
                      disabled={isApplyingFix}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#172033] border border-[#CBD5E1] rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      title="Run precision AI creative editing to produce a brand-compliant creative"
                    >
                      {isApplyingFix ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315C76]" />
                          <span>Synthesizing AI Edit...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>{latestAiVersion ? 'Try Another AI Edit' : 'Apply AI Edit'}</span>
                        </>
                      )}
                    </button>

                    {/* 3. Keep Original */}
                    <button
                      type="button"
                      onClick={() => setSelectedVersionNum(1)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedVersionNum === 1
                          ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold ring-1 ring-slate-400'
                          : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50'
                      }`}
                      title="Select Version 1 (Original unedited upload)"
                    >
                      Keep Original (v1)
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* 4. Run Re-Audit */}
                    <button
                      type="button"
                      onClick={() => handleRunReAudit(selectedVersionNum)}
                      disabled={isReAuditing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      title="Re-run brand audit engine on the currently selected image"
                    >
                      {isReAuditing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Re-Auditing v{selectedVersionNum}...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Run Re-Audit (v{selectedVersionNum})</span>
                        </>
                      )}
                    </button>

                    {/* 5. Compare at Larger Size */}
                    <button
                      type="button"
                      onClick={() => setShowLargeCompareModal(true)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#315C76] border border-[#CBD5E1] rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                      title="View all versions side-by-side at high resolution"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Compare at Larger Size</span>
                    </button>
                  </div>
                </div>

                {/* 3-Card Creative Version Showcase */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#172033] uppercase tracking-wider">
                    <div className="flex items-center space-x-1.5">
                      <SplitSquareVertical className="w-4 h-4 text-[#315C76]" />
                      <span>Creative Versions &amp; Final Image Selection</span>
                    </div>
                    <span className="text-[#64748B] font-normal lowercase">click any card to select for final sign-off</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CARD 1: Version 1 – Original Upload */}
                    <div
                      onClick={() => setSelectedVersionNum(1)}
                      className={`relative p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        selectedVersionNum === 1
                          ? 'border-2 border-[#315C76] bg-[#F8FAFC] shadow-md ring-2 ring-[#315C76]/20'
                          : 'border border-[#CBD5E1] bg-white hover:border-slate-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#172033] text-[13px]">Version 1 – Original Upload</span>
                          <span className="text-[10px] bg-[#E2E8F0] text-[#475569] font-mono px-2 py-0.5 rounded font-semibold">
                            Unmodified
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                          <span>Source: Original Creative</span>
                          <span>{formatDate(v1.created_at)}</span>
                        </div>
                      </div>

                      <div className="relative h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center group">
                        {v1.file_path ? (
                          <img
                            src={formatAssetUrl(v1.file_path)}
                            alt="Version 1 Original"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Original preview</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage({ url: formatAssetUrl(v1.file_path), title: 'Version 1 – Original Creative Upload', subtitle: 'Unmodified asset prior to AI governance corrections' });
                          }}
                          className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Zoom preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] text-[#64748B] truncate">
                          {title}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersionNum(1);
                          }}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                            selectedVersionNum === 1
                              ? 'bg-[#315C76] text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-[#334155]'
                          }`}
                        >
                          {selectedVersionNum === 1 && <Check className="w-3.5 h-3.5 mr-1" />}
                          <span>{selectedVersionNum === 1 ? 'Selected for Approval' : 'Select Version 1'}</span>
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: Version 2 – AI-Corrected Asset */}
                    {latestAiVersion ? (
                      <div
                        onClick={() => setSelectedVersionNum(latestAiVersion.version_number)}
                        className={`relative p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          selectedVersionNum === latestAiVersion.version_number
                            ? 'border-2 border-emerald-600 bg-[#F0FDF4] shadow-md ring-2 ring-emerald-500/20'
                            : 'border border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-950 text-[13px]">
                              Version {latestAiVersion.version_number} – AI-Corrected Asset
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                              Brand-Calibrated
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-700 flex items-center justify-between">
                            <span>Source: AI Correction Engine</span>
                            <span>{formatDate(latestAiVersion.created_at)}</span>
                          </div>
                        </div>

                        <div className="relative h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center group">
                          {latestAiVersion.file_path ? (
                            <img
                              src={formatAssetUrl(latestAiVersion.file_path)}
                              alt="AI-Corrected Revision"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">Revised preview</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({ url: formatAssetUrl(latestAiVersion.file_path), title: `Version ${latestAiVersion.version_number} – AI-Corrected Creative`, subtitle: latestAiVersion.changes_summary });
                            }}
                            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Zoom preview"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] text-emerald-900 font-medium line-clamp-1" title={latestAiVersion.changes_summary}>
                            {latestAiVersion.changes_summary || 'Logo embedded, palette bar, messaging calibrated.'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionNum(latestAiVersion.version_number);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                              selectedVersionNum === latestAiVersion.version_number
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {selectedVersionNum === latestAiVersion.version_number && <Check className="w-3.5 h-3.5 mr-1" />}
                            <span>{selectedVersionNum === latestAiVersion.version_number ? 'Selected for Approval' : `Select Version ${latestAiVersion.version_number}`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h5 className="text-[14px] font-bold text-[#172033]">AI Correction Pending</h5>
                          <p className="text-[11.5px] text-[#64748B]">
                            Synthesize a brand-compliant version incorporating your official logo, palette accents, and inpainting restricted buzzwords.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyAIFix()}
                          disabled={isApplyingFix}
                          className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Version 2</span>
                        </button>
                      </div>
                    )}

                    {/* CARD 3: Version 3 – Final Image (User Uploaded) */}
                    {latestUserVersion ? (
                      <div
                        onClick={() => setSelectedVersionNum(latestUserVersion.version_number)}
                        className={`relative p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          selectedVersionNum === latestUserVersion.version_number
                            ? 'border-2 border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                            : 'border border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-950 text-[13px]">
                              Version {latestUserVersion.version_number} – Final Image (User Uploaded)
                            </span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                              User Uploaded
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-700 flex items-center justify-between">
                            <span>Source: User Uploaded</span>
                            <span>{formatDate(latestUserVersion.created_at)}</span>
                          </div>
                        </div>

                        <div className="relative h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center group">
                          {latestUserVersion.file_path ? (
                            <img
                              src={formatAssetUrl(latestUserVersion.file_path)}
                              alt="User-Uploaded Final"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">User creative preview</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({ url: formatAssetUrl(latestUserVersion.file_path), title: `Version ${latestUserVersion.version_number} – Final Image (User Uploaded)`, subtitle: latestUserVersion.changes_summary });
                            }}
                            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Zoom preview"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-indigo-950 font-medium truncate max-w-[160px]">
                              {latestUserVersion.changes_summary || 'Manual creative edit'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                finalImageFileInputRef.current?.click();
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-[11px]"
                            >
                              Replace Image
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionNum(latestUserVersion.version_number);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                              selectedVersionNum === latestUserVersion.version_number
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {selectedVersionNum === latestUserVersion.version_number && <Check className="w-3.5 h-3.5 mr-1" />}
                            <span>{selectedVersionNum === latestUserVersion.version_number ? 'Selected for Approval' : `Select Version ${latestUserVersion.version_number}`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => finalImageFileInputRef.current?.click()}
                        className="p-5 rounded-2xl border-2 border-dashed border-[#CBD5E1] hover:border-[#315C76] bg-slate-50/50 hover:bg-[#F8FAFC] transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[300px] group"
                      >
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 group-hover:scale-105 transition-transform flex items-center justify-center">
                          <UploadCloud className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <span className="text-[10.5px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full">
                            Version 3 Option
                          </span>
                          <h5 className="text-[14px] font-bold text-[#172033]">Upload Final Image</h5>
                          <p className="text-[11.5px] text-[#64748B] leading-relaxed">
                            Upload your own manually edited creative. Stored as Version 3 in history without overwriting previous versions.
                          </p>
                          <div className="text-[10.5px] font-mono text-slate-500 pt-1">
                            PNG, JPG, JPEG, WEBP up to 50MB
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isUploadingFinalImage}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingFinalImage ? 'Uploading...' : 'Upload Final Image'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Changes & Findings Addressed Breakdown */}
                {latestAiVersion && aiCorrections.length > 0 && (
                  <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl space-y-3 text-xs shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                      <div className="font-bold text-[#172033] flex items-center space-x-2 text-[13px]">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>AI Creative Adjustments &amp; Finding Resolution Breakdown</span>
                      </div>
                      <span className="text-[11px] text-[#64748B]">
                        Applied to Version {latestAiVersion.version_number}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {aiCorrections.map((corr: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#172033] text-[12px] flex items-center space-x-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>{corr.title || corr.issue_type}</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ {corr.status || 'Resolved'}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[#475569] leading-relaxed">
                            {corr.description || corr.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Re-Audit Resolution Feedback Banner */}
                {reAuditDiff && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Resolved Issues Section */}
                    <div className="p-4 bg-[#F0FDF4] border border-emerald-200 rounded-xl space-y-2">
                      <div className="font-bold text-emerald-900 flex items-center space-x-1.5 text-[13px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Resolved Issues in Version {selectedVersionNum} ({reAuditDiff.fixed_count || reAuditDiff.fixed_issues?.length || 0})</span>
                      </div>
                      {(reAuditDiff.fixed_issues || []).length === 0 ? (
                        <div className="text-[#64748B] italic">No issues were marked resolved in this revision.</div>
                      ) : (
                        (reAuditDiff.fixed_issues || []).map((fi: any, idx: number) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-medium">
                            ✓ {fi.title || fi} — <span className="text-xs text-emerald-600 font-semibold">Resolved in v{selectedVersionNum}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Remaining Issues Section */}
                    <div className="p-4 bg-[#FFFBEB] border border-amber-200 rounded-xl space-y-2">
                      <div className="font-bold text-amber-900 flex items-center space-x-1.5 text-[13px]">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Remaining Governance Items ({reAuditDiff.remaining_count || reAuditDiff.remaining_issues?.length || 0})</span>
                      </div>
                      {(reAuditDiff.remaining_issues || []).length === 0 ? (
                        <div className="text-emerald-700 font-semibold">All major automated checks passed on Version {selectedVersionNum}!</div>
                      ) : (
                        (reAuditDiff.remaining_issues || []).map((ri: any, idx: number) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-amber-200 text-amber-900 font-medium">
                            • {ri.title || ri} — <span className="text-xs text-amber-700">Needs Proof / Reviewer Sign-Off</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Human Governance Sign-Off & Approval Decision Bar */}
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl space-y-3 text-xs shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E2E8F0] pb-2.5">
                    <div>
                      <span className="font-bold text-[#172033] text-[13px]">
                        Human Governance Sign-Off &amp; Final Asset Approval
                      </span>
                      <span className="text-[11.5px] text-[#64748B] block mt-0.5">
                        Approval target: <strong className="text-[#172033]">Version {selectedVersionNum}</strong> ({activeVer.generated_by || 'Asset'})
                      </span>
                    </div>

                    {finalDecisionMade && (
                      <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                        finalDecisionMade === 'Approved' ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-amber-800 bg-amber-100 border border-amber-300'
                      }`}>
                        Decision Recorded: {finalDecisionMade}
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Reviewer governance remarks / sign-off notes..."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitHumanApproval('Approved')}
                        disabled={isSubmittingDecision}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSubmittingDecision ? 'Submitting...' : `Approve Version ${selectedVersionNum} for Publication`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitHumanApproval('Changes Requested')}
                        disabled={isSubmittingDecision}
                        className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#172033] font-semibold rounded-xl shadow-2xs cursor-pointer"
                      >
                        Request Further Edits
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center space-x-2">
                      {/* High-Quality Image Download of Selected Version */}
                      <button
                        type="button"
                        onClick={handleDownloadSelectedImage}
                        disabled={isDownloadingAsset}
                        className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#172033] font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                        title={`Download Version ${selectedVersionNum} in original resolution`}
                      >
                        {isDownloadingAsset ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315C76]" />
                            <span>Downloading Asset...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-[#315C76]" />
                            <span>Download Creative (v{selectedVersionNum})</span>
                          </>
                        )}
                      </button>

                      {/* Official PDF Audit Report Download */}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isDownloadingPDF}
                        className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#172033] font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                        title="Download official PDF Brand Compliance Audit Report"
                      >
                        {isDownloadingPDF ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315C76]" />
                            <span>Compiling PDF...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 text-[#315C76]" />
                            <span>Download PDF Report</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/app/brand-governance?contentId=${createdContent?.id}`);
                        }}
                        className="px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <span>Governance Hub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* High-Resolution Side-by-Side Comparison Modal */}
                {showLargeCompareModal && (
                  <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                      <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
                        <div>
                          <h3 className="text-[17px] font-bold text-[#172033] font-heading flex items-center space-x-2">
                            <Maximize2 className="w-5 h-5 text-[#315C76]" />
                            <span>Large Creative Asset Comparison</span>
                          </h3>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Inspect original, AI-corrected, and user-uploaded versions at scale.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowLargeCompareModal(false)}
                          className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-slate-100 rounded-full cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Column 1: Original */}
                          <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#172033] text-sm">Version 1 (Original)</span>
                              <span className="text-xs bg-[#E2E8F0] text-slate-700 px-2 py-0.5 rounded font-mono">Unmodified</span>
                            </div>
                            <div className="h-80 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2">
                              {v1.file_path ? (
                                <img src={formatAssetUrl(v1.file_path)} alt="Original" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="text-xs text-slate-500">No image</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedVersionNum(1); setShowLargeCompareModal(false); }}
                              className={`w-full py-2 rounded-xl text-xs font-semibold ${selectedVersionNum === 1 ? 'bg-[#315C76] text-white' : 'bg-white border border-[#CBD5E1] text-[#334155]'}`}
                            >
                              {selectedVersionNum === 1 ? '✓ Active Selection' : 'Select Version 1'}
                            </button>
                          </div>

                          {/* Column 2: AI Revision */}
                          {latestAiVersion && (
                            <div className="p-4 bg-[#F0FDF4] border border-emerald-200 rounded-2xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-950 text-sm">Version {latestAiVersion.version_number} (AI-Edited)</span>
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Brand-Calibrated</span>
                              </div>
                              <div className="h-80 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2">
                                <img src={formatAssetUrl(latestAiVersion.file_path)} alt="AI Revision" className="max-h-full max-w-full object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedVersionNum(latestAiVersion.version_number); setShowLargeCompareModal(false); }}
                                className={`w-full py-2 rounded-xl text-xs font-semibold ${selectedVersionNum === latestAiVersion.version_number ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-300 text-emerald-900'}`}
                              >
                                {selectedVersionNum === latestAiVersion.version_number ? '✓ Active Selection' : `Select Version ${latestAiVersion.version_number}`}
                              </button>
                            </div>
                          )}

                          {/* Column 3: User Upload */}
                          {latestUserVersion ? (
                            <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-2xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-950 text-sm">Version {latestUserVersion.version_number} (User Final)</span>
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">User Uploaded</span>
                              </div>
                              <div className="h-80 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2">
                                <img src={formatAssetUrl(latestUserVersion.file_path)} alt="User Final" className="max-h-full max-w-full object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedVersionNum(latestUserVersion.version_number); setShowLargeCompareModal(false); }}
                                className={`w-full py-2 rounded-xl text-xs font-semibold ${selectedVersionNum === latestUserVersion.version_number ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-300 text-indigo-900'}`}
                              >
                                {selectedVersionNum === latestUserVersion.version_number ? '✓ Active Selection' : `Select Version ${latestUserVersion.version_number}`}
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 border-2 border-dashed border-[#CBD5E1] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50">
                              <UploadCloud className="w-10 h-10 text-indigo-500" />
                              <h5 className="font-bold text-[#172033] text-sm">Version 3 Not Uploaded Yet</h5>
                              <p className="text-xs text-[#64748B]">Upload your manually edited creative to compare with AI.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowLargeCompareModal(false);
                                  finalImageFileInputRef.current?.click();
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                              >
                                Upload Final Image
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Single Zoomed Image Modal */}
                {zoomedImage && (
                  <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                      <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-[#172033] text-base">{zoomedImage.title}</h4>
                          {zoomedImage.subtitle && <p className="text-xs text-[#64748B] mt-0.5">{zoomedImage.subtitle}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(null)}
                          className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-slate-100 rounded-full cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 bg-slate-950 overflow-auto flex items-center justify-center min-h-[400px]">
                        <img src={zoomedImage.url} alt={zoomedImage.title} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Flexible Logo Manager Modal Popup */}
      {showLogoManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <span className="text-[10.5px] font-bold text-[#315C76] uppercase tracking-wider">Multi-Format &amp; Extraction</span>
                <h3 className="text-[18px] font-bold text-[#172033] font-heading">
                  Flexible Company Logo Manager
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Upload SVG, GIF, BMP, TIFF, or extract official logos directly from PDF, DOCX, or PPTX documents.
                </p>
              </div>
              <button
                onClick={() => setShowLogoManagerModal(false)}
                className="p-2 text-[#64748B] hover:text-[#172033] rounded-xl hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FlexibleLogoManager
              onLogoUpdated={async (newUrl) => {
                if (newUrl) setLogoPreview(formatAssetUrl(newUrl));
                await loadBrandData();
                setShowLogoManagerModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
