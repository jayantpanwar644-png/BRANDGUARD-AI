import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, 
  XCircle, ChevronDown, ChevronUp, RotateCcw, 
  FileText, ArrowRight, Eye, ShieldAlert, Palette, 
  Type, Check, Copy, UploadCloud, SlidersHorizontal, 
  Layers, ExternalLink, Lock, AlertCircle, HelpCircle, 
  Lightbulb, FileCheck2, Building2, CheckSquare, Upload,
  Scale, Tag, RefreshCw, Wand2, SplitSquareVertical,
  Download, Loader2, Briefcase
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { ContentItem, BrandProfile } from '../types';

export const BrandGovernance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { brandProfile: authProfile } = useAuth();
  
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [contentDetail, setContentDetail] = useState<any>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(authProfile || null);
  const [loading, setLoading] = useState(true);
  const [reanalysing, setReanalysing] = useState(false);

  // Version management
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [contentVersions, setContentVersions] = useState<any[]>([]);

  // AI Correction Mode: 'suggestions' | 'rewrite' | 'revised_image'
  const [activeCorrectionTab, setActiveCorrectionTab] = useState<'suggestions' | 'rewrite' | 'revised_image'>('suggestions');
  
  // AI Rewrite State
  const [rewriteMode, setRewriteMode] = useState<string>('balanced');
  const [rewrittenCopy, setRewrittenCopy] = useState<any>(null);
  const [isRewriting, setIsRewriting] = useState(false);

  // AI Revised Image Generation State
  const [isGeneratingRevised, setIsGeneratingRevised] = useState(false);
  const [revisedHeadlineInput, setRevisedHeadlineInput] = useState('');
  const [revisedResult, setRevisedResult] = useState<any>(null);

  // Re-audit & Version Diff Comparison
  const [reanalysingVersion, setReanalysingVersion] = useState(false);
  const [versionDiff, setVersionDiff] = useState<any>(null);
  
  // UI interactive states
  const [findingFilter, setFindingFilter] = useState<'all' | 'high' | 'medium' | 'identity' | 'claims' | 'relevance'>('all');
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isDownloadingAuditPDF, setIsDownloadingAuditPDF] = useState(false);

  const handleDownloadAuditPDF = async () => {
    if (!contentDetail || isDownloadingAuditPDF) return;
    setIsDownloadingAuditPDF(true);
    try {
      const genRes = await apiRequest('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'Brand Audit Report',
          title: `${contentDetail.title} — AI Brand Audit Report`,
          content_id: contentDetail.id,
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
      const cleanTitle = (contentDetail.title || 'Brand_Audit_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_Audit_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e: any) {
      alert(e.message || 'PDF report generation failed.');
    } finally {
      setIsDownloadingAuditPDF(false);
    }
  };

  // Evidence upload modal state for claims
  const [selectedClaimForEvidence, setSelectedClaimForEvidence] = useState<any | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceSuccess, setEvidenceSuccess] = useState('');

  useEffect(() => {
    fetchContents();
    fetchBrandProfile();
  }, []);

  const fetchBrandProfile = async () => {
    try {
      const profile = await apiRequest('/brand/profile');
      if (profile) setBrandProfile(profile);
    } catch (e) {
      // fallback to auth profile if available
    }
  };

  const fetchContents = async () => {
    try {
      const data = await apiRequest('/content');
      setContents(data);
      if (data.length > 0) {
        const queryParamId = searchParams.get('contentId');
        let initialItem = data[0];
        if (queryParamId) {
          const matched = data.find((c: any) => c.id === Number(queryParamId));
          if (matched) initialItem = matched;
        }
        setSelectedId(initialItem.id);
        await fetchContentDetail(initialItem.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchContentDetail = async (id: number) => {
    try {
      const detail = await apiRequest(`/content/${id}`);
      setContentDetail(detail);
      setSelectedVersion(detail.current_version || 1);
      setRevisedHeadlineInput(detail.title || '');

      // Fetch version history
      try {
        const versions = await apiRequest(`/content/${id}/versions`);
        setContentVersions(versions || []);
      } catch (err) {
        setContentVersions([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectContent = (id: number) => {
    setSelectedId(id);
    fetchContentDetail(id);
    setRewrittenCopy(null);
    setVersionDiff(null);
  };

  const handleReanalyse = async () => {
    if (!selectedId) return;
    setReanalysing(true);
    try {
      await apiRequest(`/content/${selectedId}/analyse`, { method: 'POST' });
      await fetchContentDetail(selectedId);
      await fetchContents();
    } catch (e: any) {
      alert(e.message || 'Audit execution failed');
    } finally {
      setReanalysing(false);
    }
  };

  // ─── PHASE 9: AI REWRITE HANDLER ──────────────────────────────────────────
  const handleTriggerRewrite = async () => {
    if (!selectedId) return;
    setIsRewriting(true);
    try {
      const res = await apiRequest(`/content/${selectedId}/rewrite-copy`, {
        method: 'POST',
        body: JSON.stringify({ mode: rewriteMode })
      });
      setRewrittenCopy(res);
    } catch (err: any) {
      alert(err.message || 'Copy rewrite failed');
    } finally {
      setIsRewriting(false);
    }
  };

  // ─── PHASE 9: REVISED CREATIVE SYNTHESIS ──────────────────────────────────
  const handleGenerateRevised = async () => {
    if (!selectedId) return;
    setIsGeneratingRevised(true);
    try {
      const res = await apiRequest(`/content/${selectedId}/generate-revised-creative`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'full',
          headline: revisedHeadlineInput,
          caption: rewrittenCopy?.suggested_caption || contentDetail?.caption,
          apply_logo: true,
          apply_brand_colors: true
        })
      });
      setRevisedResult(res);
      await fetchContentDetail(selectedId);
      await fetchContents();
      alert(`Revised Creative v${res.new_version_number} generated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Revised creative generation failed');
    } finally {
      setIsGeneratingRevised(false);
    }
  };

  // ─── PHASE 10: RE-AUDIT REVISED CREATIVE ──────────────────────────────────
  const handleReanalyseSpecificVersion = async (vNum: number) => {
    if (!selectedId) return;
    setReanalysingVersion(true);
    try {
      const res = await apiRequest(`/content/${selectedId}/reanalyse-version/${vNum}`, {
        method: 'POST'
      });
      setVersionDiff(res.version_compared);
      await fetchContentDetail(selectedId);
      await fetchContents();
    } catch (err: any) {
      alert(err.message || 'Re-analysis failed');
    } finally {
      setReanalysingVersion(false);
    }
  };

  const toggleFindingDetails = (id: number) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleUploadEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForEvidence || !evidenceFile) return;

    setUploadingEvidence(true);
    setEvidenceError('');
    setEvidenceSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      if (evidenceDescription) {
        formData.append('description', evidenceDescription);
      }

      await apiRequest(`/claims/${selectedClaimForEvidence.id}/evidence`, {
        method: 'POST',
        body: formData,
      });

      setEvidenceSuccess('Verification proof attached successfully! Claim grounded.');
      if (selectedId) {
        await fetchContentDetail(selectedId);
      }
      setTimeout(() => {
        setSelectedClaimForEvidence(null);
        setEvidenceFile(null);
        setEvidenceDescription('');
        setEvidenceSuccess('');
      }, 1200);
    } catch (err: any) {
      setEvidenceError(err.message || 'Evidence upload failed.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[13.5px] text-[#64748B] font-medium">
        Loading active brand governance registry...
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <Card className="p-10 text-center max-w-lg mx-auto bg-[#FFFFFF] border-[#E2E8F0] space-y-4 my-12 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF2F8] text-[#315C76] flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 stroke-[2]" />
        </div>
        <h2 className="text-[20px] font-bold font-heading text-[#172033]">No Brand Audits Performed Yet</h2>
        <p className="text-[13.5px] text-[#64748B] leading-relaxed">
          Upload an advertisement or creative asset in the Overview tab to generate an evidence-backed brand audit report.
        </p>
        <button
          onClick={() => navigate('/app/overview')}
          className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[13px] font-semibold cursor-pointer"
        >
          Go to Create &amp; Publish
        </button>
      </Card>
    );
  }

  // Active Report
  const latestReport = contentDetail?.audit_reports?.[contentDetail.audit_reports.length - 1];
  const findings: any[] = latestReport?.findings || [];
  const claims: any[] = contentDetail?.claims || [];
  const aiSuggestions: any[] = contentDetail?.ai_suggestions || [];

  // Expected Palette
  const expectedPrimary = brandProfile?.primary_color || '#1A56DB';
  const expectedSecondary = brandProfile?.secondary_color || '#7E3AF2';
  const expectedAccent = brandProfile?.accent_color || '#10B981';

  const detectedColors: string[] = latestReport?.raw_analysis_json?.dominant_colors || [
    '#FFFFFF', '#FAFBFD', '#F8F9FD', '#F0F5F5', '#C2B7A5'
  ];

  const colorFinding = findings.find((f: any) => 
    f.issue_type?.toLowerCase() === 'color' || 
    f.title?.toLowerCase().includes('color')
  );

  const logoFinding = findings.find((f: any) => 
    f.issue_type?.toLowerCase() === 'logo' || 
    f.title?.toLowerCase().includes('logo')
  );
  const logoDetected = !logoFinding || !logoFinding.title.toLowerCase().includes('not detected');

  const unverifiedClaims = claims.filter((c: any) => c.verification_status !== 'Supported');

  // Overall status helper
  const overallStatus = latestReport?.overall_status || contentDetail?.approval_status || 'Needs Review';
  const isPassed = overallStatus === 'Passed' || overallStatus === 'Approved';
  const isFailed = overallStatus === 'Failed' || overallStatus === 'High-Risk Content';

  // Filtered Findings
  const filteredFindings = findings.filter((f: any) => {
    if (findingFilter === 'all') return true;
    if (findingFilter === 'high') return f.severity === 'High' || f.severity === 'Critical';
    if (findingFilter === 'medium') return f.severity === 'Medium' || f.severity === 'Low';
    if (findingFilter === 'identity') return ['color', 'logo', 'typography', 'visual'].includes(f.issue_type?.toLowerCase());
    if (findingFilter === 'claims') return ['claim', 'restricted vocabulary'].includes(f.issue_type?.toLowerCase());
    if (findingFilter === 'relevance') return f.issue_type?.toLowerCase().includes('relevance') || f.title?.toLowerCase().includes('relevance');
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 select-none animate-in fade-in duration-200">
      
      {/* 1. Header & Asset Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EAF2F8] border border-[#CBD5E1] text-[11px] font-semibold uppercase tracking-wider text-[#315C76] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pillar 1 • Pre-Publication Brand Governance &amp; AI Audit</span>
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-bold font-heading text-[#172033] tracking-tight leading-tight">
            Brand Governance &amp; Audit
          </h1>
          <p className="text-[13.5px] sm:text-[14.5px] text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Automated visual compliance audit, logo validation, color swatch matching, and RAG claim verification.
          </p>
        </div>

        {/* Content Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedId || ''}
              onChange={(e) => handleSelectContent(Number(e.target.value))}
              className="bg-[#FFFFFF] border border-[#CBD5E1] text-[13px] font-semibold text-[#172033] rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-[#315C76] shadow-2xs appearance-none cursor-pointer"
            >
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} (v{c.current_version}) • {c.approval_status}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleReanalyse}
            disabled={reanalysing}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#172033] text-[13px] font-semibold rounded-xl border border-[#CBD5E1] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Re-run brand audit against latest guidelines"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#315C76] ${reanalysing ? 'animate-spin' : ''}`} />
            <span>{reanalysing ? 'Auditing...' : 'Re-analyse'}</span>
          </button>

          <button
            onClick={() => navigate('/app/approvals')}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#172333] hover:bg-[#253244] text-white text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Approval Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Version Selector Tabs (Phase 10) */}
      {contentVersions.length > 1 && (
        <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
          <span className="text-[12px] font-bold text-slate-700 px-2">Asset Versions:</span>
          {contentVersions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVersion(v.version_number)}
              className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                selectedVersion === v.version_number
                  ? 'bg-[#315C76] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Version {v.version_number} {v.version_number === 1 ? '(Original)' : '(AI Revised)'}
            </button>
          ))}

          <button
            onClick={() => handleReanalyseSpecificVersion(selectedVersion)}
            disabled={reanalysingVersion}
            className="ml-auto px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-[12px] font-semibold text-[#315C76] rounded-lg cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          >
            <RotateCcw className={`w-3 h-3 ${reanalysingVersion ? 'animate-spin' : ''}`} />
            <span>Re-Audit Version {selectedVersion}</span>
          </button>
        </div>
      )}

      {/* Version Diff Comparison Banner if available */}
      {versionDiff && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[13px] font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Version Re-Audit Comparison Complete</span>
            </div>
            <span className="text-[11.5px] font-semibold text-emerald-800">
              {versionDiff.fixed_count} Fixed • {versionDiff.remaining_count} Remaining
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2 rounded-lg bg-white border border-emerald-100">
              <span className="font-bold text-emerald-700 block mb-1">Fixed in Revised Creative:</span>
              {versionDiff.fixed_issues.length === 0 ? (
                <span className="text-slate-500 italic">None</span>
              ) : (
                <ul className="space-y-1">
                  {versionDiff.fixed_issues.map((fix: any, i: number) => (
                    <li key={i} className="flex items-center space-x-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{fix.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-2 rounded-lg bg-white border border-emerald-100">
              <span className="font-bold text-amber-700 block mb-1">Remaining Compliance Items:</span>
              {versionDiff.remaining_issues.length === 0 ? (
                <span className="text-emerald-700 font-semibold">All previous issues resolved!</span>
              ) : (
                <ul className="space-y-1">
                  {versionDiff.remaining_issues.map((rem: any, i: number) => (
                    <li key={i} className="flex items-center space-x-1.5 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{rem.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {contentDetail && (
        <>
          {/* 2. Executive Audit Summary & Visual Gauges */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPassed ? 'bg-[#EAF7F1] text-[#239B6B]' : isFailed ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#D97706]'
                }`}>
                  {isPassed ? (
                    <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                  ) : isFailed ? (
                    <XCircle className="w-6 h-6 stroke-[2]" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 stroke-[2]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isPassed ? 'bg-[#EAF7F1] text-[#239B6B]' : isFailed ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}>
                      {overallStatus}
                    </span>
                    <span className="text-[12px] text-[#64748B] font-medium">
                      Audit Version {contentDetail.current_version} • Guideline v{latestReport?.guideline_version || '1.0'}
                    </span>
                  </div>
                  <h2 className="text-[17px] sm:text-[18px] font-bold font-heading text-[#172033] mt-0.5">
                    {latestReport?.final_recommendation === 'Ready for Approval'
                      ? 'Creative Satisfies Pre-Publication Compliance Rules'
                      : latestReport?.final_recommendation === 'High-Risk Content'
                      ? 'Critical Compliance Blockers Detected in Asset'
                      : 'Audit Complete — Review Flagged Governance Items'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start md:self-auto flex-shrink-0">
                {latestReport && (
                  <button
                    onClick={handleDownloadAuditPDF}
                    disabled={isDownloadingAuditPDF}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-[12.5px] font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Download Official PDF Audit Report"
                  >
                    {isDownloadingAuditPDF ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315C76]" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#315C76]" />
                        <span>Download Audit Report</span>
                      </>
                    )}
                  </button>
                )}

                {latestReport?.summary && (
                  <button
                    onClick={() => setShowFullSummary(!showFullSummary)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#315C76] text-[12.5px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showFullSummary ? 'Hide Brief' : 'View Brief'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Executive Brief Drawer */}
            {showFullSummary && latestReport?.summary && (
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-[12px] font-bold uppercase tracking-wider text-[#315C76]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Multimodal Evaluation Narrative</span>
                </div>
                <p className="text-[13px] text-[#334155] leading-relaxed">
                  {latestReport.summary}
                </p>
                {latestReport.extracted_text && (
                  <div className="pt-2 border-t border-[#E2E8F0] text-[12px]">
                    <span className="text-[#64748B] font-semibold block mb-1">OCR Extracted Text from Artwork:</span>
                    <p className="font-mono text-[#475569] bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                      "{latestReport.extracted_text}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Company & Product Relevance Card */}
            {(() => {
              const compRel = latestReport?.company_relevance || (latestReport?.raw_analysis_json as any)?.company_relevance;
              if (!compRel) return null;

              const isRelated = compRel.status === 'Related to Company';
              const isUnrelated = compRel.status === 'Not Related to Company';
              const isReview = compRel.status === 'Needs Review';

              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isRelated ? 'bg-[#F0FDF4] border-[#BDE7D4]' : isUnrelated ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/20' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-lg ${
                        isRelated ? 'bg-emerald-100 text-emerald-800' : isUnrelated ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[#172033] flex items-center space-x-2">
                          <span>Company &amp; Product Relevance</span>
                          <span className="text-[11px] font-semibold text-[#64748B]">
                            ({Math.round((compRel.confidence || 0.9) * 100)}% Confidence)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Verified against configured business profile &amp; verified knowledge base.
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center space-x-1 ${
                      isRelated ? 'bg-emerald-600 text-white' : isUnrelated ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                    }`}>
                      {isRelated && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isUnrelated && <AlertTriangle className="w-3.5 h-3.5" />}
                      {isReview && <HelpCircle className="w-3.5 h-3.5" />}
                      <span>{compRel.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-black/5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Detected Subject</span>
                      <p className="font-bold text-[#172033] text-[12px]">{compRel.detected_product_or_service || 'Commercial Subject'}</p>
                      {compRel.matched_company_offering && (
                        <p className="text-[11px] text-emerald-800 font-medium pt-0.5">Matched: <strong>{compRel.matched_company_offering}</strong></p>
                      )}
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-black/5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Assessment</span>
                      <p className="text-[#334155] text-[11.5px] leading-relaxed">{compRel.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4 Visual Quality Score Meters */}
            {latestReport && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* 1. Visual Quality */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#64748B]">Visual &amp; Contrast</span>
                    <span className="text-[15px] font-bold font-heading tabular-nums text-[#315C76]">
                      {Math.round(latestReport.visual_quality_score)}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#315C76] rounded-full transition-all duration-500" 
                      style={{ width: `${latestReport.visual_quality_score}%` }} 
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {latestReport.visual_quality_score >= 80 ? 'Optimal sharpness & resolution' : 'Low contrast / clarity alert'}
                  </div>
                </div>

                {/* 2. Readability Index */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#64748B]">Readability Index</span>
                    <span className="text-[15px] font-bold font-heading tabular-nums text-[#239B6B]">
                      {Math.round(latestReport.readability_score)}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#239B6B] rounded-full transition-all duration-500" 
                      style={{ width: `${latestReport.readability_score}%` }} 
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {latestReport.readability_score >= 80 ? 'Typography hierarchy legible' : 'Small font or low contrast'}
                  </div>
                </div>

                {/* 3. Brand Adherence */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#64748B]">Brand Adherence</span>
                    <span className="text-[15px] font-bold font-heading tabular-nums text-[#7C3AED]">
                      {Math.round(latestReport.brand_consistency_score)}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#7C3AED] rounded-full transition-all duration-500" 
                      style={{ width: `${latestReport.brand_consistency_score}%` }} 
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {latestReport.brand_consistency_score >= 80 ? 'Palette aligned with guidelines' : 'Color divergence detected'}
                  </div>
                </div>

                {/* 4. Messaging Quality */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#64748B]">Messaging Compliance</span>
                    <span className="text-[15px] font-bold font-heading tabular-nums text-[#0EA5E9]">
                      {Math.round(latestReport.messaging_score)}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0EA5E9] rounded-full transition-all duration-500" 
                      style={{ width: `${latestReport.messaging_score}%` }} 
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {claims.length === 0 ? 'Zero high-risk claims found' : `${claims.length} claim(s) tracked for proof`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── PHASE 9: IMPROVE THIS CREATIVE WITH AI (DEDICATED SECTION) ─── */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#315C76] text-white flex items-center justify-center">
                  <Wand2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold font-heading text-[#172033]">
                    Improve This Creative with AI
                  </h3>
                  <p className="text-[12.5px] text-[#64748B]">
                    Actionable corrections grounded in your confirmed brand guidelines and approved facts.
                  </p>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveCorrectionTab('suggestions')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    activeCorrectionTab === 'suggestions' ? 'bg-white text-[#172033] shadow-xs' : 'text-slate-600 hover:text-[#172033]'
                  }`}
                >
                  Suggest Changes
                </button>
                <button
                  onClick={() => setActiveCorrectionTab('rewrite')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    activeCorrectionTab === 'rewrite' ? 'bg-white text-[#172033] shadow-xs' : 'text-slate-600 hover:text-[#172033]'
                  }`}
                >
                  Rewrite Text &amp; Caption
                </button>
                <button
                  onClick={() => setActiveCorrectionTab('revised_image')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    activeCorrectionTab === 'revised_image' ? 'bg-white text-[#172033] shadow-xs' : 'text-slate-600 hover:text-[#172033]'
                  }`}
                >
                  Generate Revised Creative
                </button>
              </div>
            </div>

            {/* TAB 1: SUGGEST CHANGES ONLY */}
            {activeCorrectionTab === 'suggestions' && (
              <div className="space-y-3">
                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                  Detected Correction Opportunities ({aiSuggestions.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiSuggestions.map((s: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#315C76] uppercase tracking-wide">
                          {s.action_type}
                        </span>
                        <Badge status={s.severity} size="sm" />
                      </div>
                      <div className="text-[13px] font-bold text-[#172033]">{s.title}</div>
                      <p className="text-[12px] text-slate-600">{s.explanation}</p>
                      {s.suggested_text && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11.5px] text-emerald-800">
                          <strong>Recommended Fix:</strong> {s.suggested_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: REWRITE TEXT & CAPTION */}
            {activeCorrectionTab === 'rewrite' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-slate-600">
                    Eliminates restricted vocabulary, qualifies unsubstantiated superlatives, and aligns copy with '{brandProfile?.tone_of_voice || 'Authoritative'}'.
                  </div>
                  <button
                    onClick={handleTriggerRewrite}
                    disabled={isRewriting}
                    className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[12.5px] font-bold cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isRewriting ? 'Rewriting with AI...' : 'Generate Copy Revision'}</span>
                  </button>
                </div>

                {rewrittenCopy ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Copy */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Original Copy</span>
                      <div className="text-[13px] font-bold text-slate-800">{rewrittenCopy.original_headline}</div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{rewrittenCopy.original_caption}</p>
                    </div>

                    {/* AI Suggested Copy */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">AI-Corrected Copy</span>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Brand Voice Aligned
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-emerald-900">{rewrittenCopy.suggested_headline}</div>
                      <p className="text-[12px] text-emerald-800 leading-relaxed">{rewrittenCopy.suggested_caption}</p>
                      <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-700">
                        <strong>CTA:</strong> {rewrittenCopy.suggested_cta} • <strong>Tags:</strong> {rewrittenCopy.suggested_hashtags}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-[13px] text-slate-500">
                    Click 'Generate Copy Revision' above to produce brand-governed headlines and captions.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: GENERATE REVISED CREATIVE */}
            {activeCorrectionTab === 'revised_image' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-[13px] font-bold text-[#172033]">
                    Visual Asset Synthesis Parameters
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    Generates a new brand-compliant version by compositing your registered company logo, official brand hex footer, and verified asset certification seal. <strong>The original uploaded creative is never overwritten.</strong>
                  </p>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Headline Text for Banner</label>
                    <input
                      type="text"
                      value={revisedHeadlineInput}
                      onChange={(e) => setRevisedHeadlineInput(e.target.value)}
                      placeholder="e.g. Nexus Dynamics • Enterprise Security Verified"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[12.5px] text-slate-900 focus:outline-none focus:border-[#315C76]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleGenerateRevised}
                      disabled={isGeneratingRevised}
                      className="px-5 py-2.5 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[13px] font-bold rounded-xl shadow-sm cursor-pointer flex items-center space-x-2 transition-all disabled:opacity-50"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>{isGeneratingRevised ? 'Synthesizing Version...' : 'Synthesize Revised Creative Asset'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Main Split View: Asset Preview & Governance Passport */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Asset Visual Artwork Preview (v1 vs v2) */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                    {contentDetail.revised_file_path ? 'Side-by-Side Asset Preview' : 'Audited Creative Asset'}
                  </h3>
                  <Badge status={overallStatus} />
                </div>

                {/* Artwork Display */}
                {contentDetail.revised_file_path ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Version 1 (Original)</span>
                      <div className="aspect-square rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-2 relative">
                        <img 
                          src={contentDetail.file_path} 
                          alt="Original Artwork" 
                          className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Version 2 (AI Revised)</span>
                      <div className="aspect-square rounded-xl bg-emerald-50/40 border border-emerald-200 overflow-hidden flex items-center justify-center p-2 relative">
                        <img 
                          src={contentDetail.revised_file_path} 
                          alt="Revised Artwork" 
                          className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-3 relative group">
                    <img 
                      src={contentDetail.file_path} 
                      alt={contentDetail.title} 
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xs transition-transform duration-300 group-hover:scale-102"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-[12px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B]">Active Version:</span>{' '}
                    <span className="font-bold text-[#172033]">v{contentDetail.current_version}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-[#64748B]">File:</span>{' '}
                    <span className="text-[#172033] font-mono text-[11px] truncate">{contentDetail.file_name}</span>
                  </div>
                </div>

                {contentDetail.caption && (
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[12.5px] text-[#475569] leading-relaxed">
                    <span className="text-[11px] font-semibold text-[#64748B] block mb-1 uppercase tracking-wide">
                      Ad Copy / Caption:
                    </span>
                    {contentDetail.caption}
                  </div>
                )}
              </Card>

              {/* Brand Color Swatch Verification Card */}
              <Card className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-[#315C76]" />
                    <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                      Brand Color Swatch Verification
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[#64748B]">Delta Spectrum</span>
                </div>

                {/* Expected Guidelines Swatches */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Expected Brand Identity Palette:
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div 
                      onClick={() => handleCopyHex(expectedPrimary)}
                      className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white transition-all cursor-pointer flex flex-col items-center text-center group"
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-black/10 shadow-xs mb-1.5 group-hover:scale-105 transition-transform" 
                        style={{ backgroundColor: expectedPrimary }} 
                      />
                      <div className="text-[11px] font-bold text-[#172033]">Primary</div>
                      <div className="text-[10px] font-mono text-[#64748B] uppercase">{expectedPrimary}</div>
                    </div>

                    <div 
                      onClick={() => handleCopyHex(expectedSecondary)}
                      className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white transition-all cursor-pointer flex flex-col items-center text-center group"
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-black/10 shadow-xs mb-1.5 group-hover:scale-105 transition-transform" 
                        style={{ backgroundColor: expectedSecondary }} 
                      />
                      <div className="text-[11px] font-bold text-[#172033]">Secondary</div>
                      <div className="text-[10px] font-mono text-[#64748B] uppercase">{expectedSecondary}</div>
                    </div>

                    <div 
                      onClick={() => handleCopyHex(expectedAccent)}
                      className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white transition-all cursor-pointer flex flex-col items-center text-center group"
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-black/10 shadow-xs mb-1.5 group-hover:scale-105 transition-transform" 
                        style={{ backgroundColor: expectedAccent }} 
                      />
                      <div className="text-[11px] font-bold text-[#172033]">Accent</div>
                      <div className="text-[10px] font-mono text-[#64748B] uppercase">{expectedAccent}</div>
                    </div>
                  </div>
                </div>

                {/* Detected Palette in Asset */}
                <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <span>Detected Dominant Swatches:</span>
                    <span className="text-[10px] lowercase text-[#94A3B8] font-normal">Extracted via deterministic CV</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {detectedColors.slice(0, 5).map((color, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleCopyHex(color)}
                        className="flex-1 min-w-[54px] p-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col items-center cursor-pointer hover:bg-white"
                      >
                        <div 
                          className="w-6 h-6 rounded-md border border-black/10 shadow-2xs mb-1"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[9.5px] font-mono text-[#64748B] uppercase">{color}</span>
                      </div>
                    ))}
                  </div>

                  {colorFinding ? (
                    <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#FAD79E] text-[12px] text-[#9A6218] flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold text-[#805012]">Brand Palette Advisory:</strong>{' '}
                        {colorFinding.suggested_correction || `Target color ${expectedPrimary} is not prominently represented in dominant pixels.`}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#EAF7F1] border border-[#BDE7D4] text-[12px] text-[#239B6B] flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Creative color spectrum complies with registered brand parameters.</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Governance Findings & Claim Passport */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Compliance & Governance Findings Card */}
              <Card className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#315C76]" />
                    <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                      Compliance Findings ({findings.length})
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                    <button
                      onClick={() => setFindingFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        findingFilter === 'all' ? 'bg-[#315C76] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      All ({findings.length})
                    </button>
                    <button
                      onClick={() => setFindingFilter('high')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        findingFilter === 'high' ? 'bg-[#DC2626] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      High ({findings.filter((f: any) => f.severity === 'High' || f.severity === 'Critical').length})
                    </button>
                    <button
                      onClick={() => setFindingFilter('identity')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        findingFilter === 'identity' ? 'bg-[#315C76] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      Visual Identity
                    </button>
                    <button
                      onClick={() => setFindingFilter('claims')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        findingFilter === 'claims' ? 'bg-[#315C76] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      Copy &amp; Claims
                    </button>
                    <button
                      onClick={() => setFindingFilter('relevance')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        findingFilter === 'relevance' ? 'bg-purple-700 text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      Company Relevance
                    </button>
                  </div>
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="p-8 text-center text-[13px] text-[#239B6B] bg-[#EAF7F1] rounded-xl border border-[#BDE7D4]">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5" />
                    <span>No compliance violations detected under the selected filter.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFindings.map((f: any) => {
                      const isExpanded = !!expandedFindings[f.id];
                      const isCritical = f.severity === 'Critical';
                      const isHigh = f.severity === 'High';
                      const isMedium = f.severity === 'Medium';

                      return (
                        <div 
                          key={f.id}
                          className={`rounded-xl border p-4 transition-all space-y-3 ${
                            isCritical || isHigh
                              ? 'border-l-4 border-l-rose-500 bg-[#FFFFFF] border-[#E2E8F0]' 
                              : isMedium
                              ? 'border-l-4 border-l-amber-500 bg-[#FFFFFF] border-[#E2E8F0]'
                              : 'border-l-4 border-l-sky-500 bg-[#FFFFFF] border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge status={f.severity} size="sm" />
                              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                                {f.issue_type}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#94A3B8]">
                              Finding #{f.id}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-[14px] font-bold text-[#172033] font-heading">
                              {f.title}
                            </h4>
                            <p className="text-[12.5px] text-[#475569] leading-relaxed mt-1">
                              {f.description}
                            </p>
                          </div>

                          {f.suggested_correction && (
                            <div className="p-3 bg-[#EAF7F1] rounded-lg border border-[#BDE7D4] text-[12px] text-[#1E835A] flex items-start space-x-2">
                              <Lightbulb className="w-4 h-4 text-[#239B6B] flex-shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-semibold text-[#186445]">Suggested Action:</strong>{' '}
                                {f.suggested_correction}
                              </div>
                            </div>
                          )}

                          {(f.why_it_matters || f.evidence_found || f.expected_rule) && (
                            <div className="pt-1">
                              <button
                                onClick={() => toggleFindingDetails(f.id)}
                                className="flex items-center space-x-1 text-[11.5px] font-semibold text-[#315C76] hover:text-[#183B59] transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Technical Context' : 'View Policy Context & Evidence'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[12px] animate-in fade-in duration-150">
                                  {f.expected_rule && (
                                    <div>
                                      <strong className="text-[#172033] block mb-0.5">Expected Company Rule:</strong>
                                      <p className="text-[#475569] leading-relaxed">{f.expected_rule}</p>
                                    </div>
                                  )}
                                  {f.why_it_matters && (
                                    <div>
                                      <strong className="text-[#172033] block mb-0.5">Why it matters:</strong>
                                      <p className="text-[#475569] leading-relaxed">{f.why_it_matters}</p>
                                    </div>
                                  )}
                                  {f.evidence_found && (
                                    <div className="pt-1.5 border-t border-[#E2E8F0]">
                                      <strong className="text-[#315C76] block mb-0.5">Evidence Detected in Artwork:</strong>
                                      <p className="text-[#475569] font-mono text-[11px] bg-white p-2 rounded border border-[#E2E8F0]">
                                        {f.evidence_found}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Claim Verification Passport Card */}
              <Card className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-[#315C76]" />
                    <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                      Claim Verification Passport ({claims.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#64748B]">RAG Grounded Checks</span>
                </div>

                {claims.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    No factual marketing claims detected in this creative copy.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {claims.map((c: any) => {
                      const isSupported = c.verification_status === 'Supported';
                      const hasEvidence = c.evidence_list && c.evidence_list.length > 0;

                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 rounded-xl border space-y-3 transition-all ${
                            isSupported ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-[#FEF6E8]/40 border-[#FAD79E]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                              {c.category}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Badge status={c.risk_level} size="sm" />
                              <Badge status={c.verification_status} size="sm" />
                            </div>
                          </div>

                          <blockquote className="text-[13.5px] font-bold text-[#172033] font-heading border-l-2 border-[#315C76] pl-3 py-0.5 leading-snug">
                            "{c.statement}"
                          </blockquote>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
                            <div className="flex items-center space-x-1.5">
                              {hasEvidence ? (
                                <span className="inline-flex items-center space-x-1 text-[#239B6B] font-semibold">
                                  <FileCheck2 className="w-3.5 h-3.5" />
                                  <span>{c.evidence_list.length} Proof Document Attached</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-[#D97706] font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Proof Required for Publication Sign-Off</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setSelectedClaimForEvidence(c);
                                setEvidenceFile(null);
                                setEvidenceDescription('');
                                setEvidenceError('');
                                setEvidenceSuccess('');
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#315C76] hover:text-[#183B59] text-[12px] font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer shadow-2xs"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Attach Evidence</span>
                            </button>
                          </div>

                          {c.required_action && (
                            <div className="p-2.5 rounded-lg bg-[#FEF6E8] border border-[#FAD79E] text-[11.5px] text-[#9A6218]">
                              <strong className="text-[#805012]">Required Action:</strong> {c.required_action}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

            </div>
          </div>
        </>
      )}

      {/* 5. Evidence Upload Modal for Claims */}
      <Modal
        isOpen={!!selectedClaimForEvidence}
        onClose={() => setSelectedClaimForEvidence(null)}
        title="Attach Verification Proof to Claim"
        maxWidth="max-w-lg"
      >
        {selectedClaimForEvidence && (
          <form onSubmit={handleUploadEvidenceSubmit} className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Target Claim:</span>
              <p className="text-[13px] font-bold text-[#172033] font-heading">
                "{selectedClaimForEvidence.statement}"
              </p>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                Upload Proof File (PDF, PNG, JPG, DOCX) *
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Official certificates, third-party lab testing, or executive approval documentation.
              </span>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                Evidence Description / Certification Notes
              </label>
              <textarea
                rows={2}
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="e.g. ISO 14021 recycled material test report certification issued by TUV."
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
              />
            </div>

            {evidenceError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[12px] flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{evidenceError}</span>
              </div>
            )}

            {evidenceSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{evidenceSuccess}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedClaimForEvidence(null)}
                className="px-4 py-2 bg-[#F1F5F9] text-[#172033] hover:bg-[#E2E8F0] text-[13px] font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingEvidence || !evidenceFile}
                className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] disabled:opacity-40 text-white text-[13px] font-semibold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploadingEvidence ? 'Substantiating Proof...' : 'Upload & Ground Claim'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
