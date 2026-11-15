import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Sparkles, CheckCircle2,
  ShieldCheck, FileCheck, ClipboardCheck, HeartPulse,
  MessageCircle, AlertTriangle, TrendingUp, Layers,
  Trash2, ExternalLink, Calendar, Filter, RefreshCw,
  Check, Info, ChevronDown, ChevronUp, FileDown, Eye,
  BarChart3, PieChart, AlertCircle, Loader2
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { GeneratedReport } from '../types';

interface ReportTypeMeta {
  id: string;
  title: string;
  backendType: string;
  icon: React.ComponentType<{ className?: string }>;
  shortLabel: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}

const REPORT_CATEGORIES: ReportTypeMeta[] = [
  {
    id: 'brand-audit',
    title: 'Brand Audit',
    backendType: 'Brand Audit Report',
    icon: ShieldCheck,
    shortLabel: 'Visual identity and compliance.',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200'
  },
  {
    id: 'claim-verification',
    title: 'Claim Verification',
    backendType: 'Claim Verification Report',
    icon: FileCheck,
    shortLabel: 'Verified claims and supporting evidence.',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200'
  },
  {
    id: 'approval-history',
    title: 'Approval History',
    backendType: 'Approval History Report',
    icon: ClipboardCheck,
    shortLabel: 'Decisions and review activity.',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200'
  },
  {
    id: 'audience-sentiment',
    title: 'Audience Sentiment',
    backendType: 'Audience Sentiment Report',
    icon: HeartPulse,
    shortLabel: 'Customer reactions and sentiment.',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200'
  },
  {
    id: 'complaint-analysis',
    title: 'Complaint Analysis',
    backendType: 'Complaint Analysis Report',
    icon: MessageCircle,
    shortLabel: 'Recurring customer complaints.',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200'
  },
  {
    id: 'reputation-risk',
    title: 'Reputation Risk',
    backendType: 'Reputation Risk Report',
    icon: AlertTriangle,
    shortLabel: 'Brand risks and incidents.',
    accentBg: 'bg-red-50',
    accentText: 'text-red-700',
    accentBorder: 'border-red-200'
  },
  {
    id: 'post-performance',
    title: 'Post Performance',
    backendType: 'Post Performance Report',
    icon: TrendingUp,
    shortLabel: 'Content and campaign performance.',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200'
  },
  {
    id: 'complete-brand',
    title: 'Complete Brand Report',
    backendType: 'Complete Brand Intelligence',
    icon: Layers,
    shortLabel: 'Combined brand intelligence report.',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200'
  }
];

interface ReportOverviewData {
  total_reports: number;
  available_types: number;
  latest_report?: {
    id: number;
    title: string;
    report_type: string;
    created_at: string;
    file_size: number;
  } | null;
  pending_data_count: number;
  types_summary: Record<string, { records: number; ready: boolean; label: string }>;
}

interface PreviewData {
  report_type: string;
  title: string;
  subtitle: string;
  company_name: string;
  summary: string;
  metrics: [string, string][];
  findings: Array<{
    category: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
  chart_data?: {
    type: string;
    categories?: string[];
    values?: number[];
    labels?: string[];
    data?: number[];
  } | null;
  missing_data_warnings: string[];
}

export const IntelligenceReports: React.FC = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [overview, setOverview] = useState<ReportOverviewData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ReportTypeMeta>(REPORT_CATEGORIES[0]);
  
  // Configuration Form State
  const [reportTitle, setReportTitle] = useState('');
  const [reportSubtitle, setReportSubtitle] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeFindings, setIncludeFindings] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contentId, setContentId] = useState<string>('');
  const [availableContents, setAvailableContents] = useState<Array<{ id: number; title: string }>>([]);

  // Preview State
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Execution States
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update default title when selected report category changes
  useEffect(() => {
    const orgName = overview?.latest_report?.title ? overview.latest_report.title.split(' — ')[0] : 'Enterprise';
    setReportTitle(`${orgName} — ${selectedCategory.title} Executive Brief`);
    setReportSubtitle('Confidential Brand Governance & Audit Deliverable for Executive Stakeholders');
    fetchPreview();
  }, [selectedCategory, dateRange, includeCharts, includeFindings, includeRecommendations, contentId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [reportsData, overviewData, contentsData] = await Promise.all([
        apiRequest('/reports'),
        apiRequest('/reports/overview').catch(() => null),
        apiRequest('/content').catch(() => [])
      ]);
      setReports(reportsData || []);
      setOverview(overviewData);
      setAvailableContents(contentsData || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest('/reports/preview', {
        method: 'POST',
        body: JSON.stringify({
          report_type: selectedCategory.backendType,
          title: reportTitle || undefined,
          subtitle: reportSubtitle || undefined,
          date_range: dateRange,
          include_charts: includeCharts,
          include_findings: includeFindings,
          include_recommendations: includeRecommendations,
          content_id: contentId ? parseInt(contentId) : undefined
        })
      });
      setPreview(data);
    } catch (err: any) {
      console.error('Preview error:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const result: GeneratedReport = await apiRequest('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: selectedCategory.backendType,
          title: reportTitle.trim() || `${selectedCategory.title} Executive Brief`,
          subtitle: reportSubtitle.trim() || undefined,
          date_range: dateRange,
          include_charts: includeCharts,
          include_findings: includeFindings,
          include_recommendations: includeRecommendations,
          content_id: contentId ? parseInt(contentId) : undefined
        })
      });

      setSuccessBanner(`Report "${result.title}" compiled and registered in your library.`);
      await fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compile report. Please verify configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: GeneratedReport) => {
    if (downloadingId === report.id) return;
    setDownloadingId(report.id);
    try {
      const token = localStorage.getItem('brandguard_token');
      const downloadUrl = `/api/reports/${report.id}/download?token=${encodeURIComponent(token || '')}`;
      const res = await fetch(downloadUrl, {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const token = localStorage.getItem('brandguard_token');
      window.open(`/api/reports/${report.id}/download?token=${encodeURIComponent(token || '')}`, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = (report: GeneratedReport) => {
    const token = localStorage.getItem('brandguard_token');
    window.open(`/api/reports/${report.id}/download?token=${encodeURIComponent(token || '')}&preview=true#toolbar=1`, '_blank');
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest(`/reports/${id}`, {
        method: 'DELETE'
      });
      setDeleteConfirmId(null);
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          r.report_type.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || r.report_type.includes(categoryFilter) || r.report_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#315C76] border-t-transparent rounded-full animate-spin" />
        <div className="text-[13px] text-[#64748B] font-medium">Loading Intelligence Reports Center...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 select-none animate-in fade-in duration-300">
      {/* 1. NEW PAGE IDENTITY & COMPACT SUMMARY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-sans uppercase tracking-wider text-[#315C76] font-semibold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315C76]" />
              <span>Executive Intelligence & Audit Briefs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#172033]">Intelligence Reports</h1>
            <p className="text-[14px] text-[#64748B] mt-0.5">
              Your brand performance. Your insights. One clear report.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchInitialData}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#315C76]" />
              <span>Sync Records</span>
            </button>
          </div>
        </div>

        {/* Compact Visual Summary (Real Database Values) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3.5 flex items-center space-x-3.5 bg-white/90 border-[#E2E8F0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center flex-shrink-0 border border-[#D0E2EC]">
              <FileDown className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#64748B]">Total Reports Generated</div>
              <div className="text-[19px] font-bold font-heading text-[#172033]">
                {overview ? overview.total_reports : reports.length}
              </div>
            </div>
          </Card>

          <Card className="p-3.5 flex items-center space-x-3.5 bg-white/90 border-[#E2E8F0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#64748B]">Available Report Types</div>
              <div className="text-[19px] font-bold font-heading text-[#172033]">
                8 Categories
              </div>
            </div>
          </Card>

          <Card className="p-3.5 flex items-center space-x-3.5 bg-white/90 border-[#E2E8F0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-200">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div className="truncate">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#64748B]">Latest Report Generated</div>
              <div className="text-[13px] font-bold font-heading text-[#172033] truncate">
                {reports.length > 0
                  ? new Date(reports[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No reports yet'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[13px] text-emerald-800 shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[12px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-[13px] text-rose-800 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 2. MAIN SECTION — CHOOSE YOUR REPORT (2x4 Desktop Layout) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold font-heading text-[#172033]">
              What would you like to analyse?
            </h2>
            <p className="text-[13px] text-[#64748B]">
              Select a specialized intelligence domain to compile an executive-ready brief.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full border border-[#D0E2EC]">
            Step 1 of 3
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {REPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.id === cat.id;
            const summaryMeta = overview?.types_summary?.[cat.backendType];

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between h-[132px] ${
                  isSelected
                    ? 'bg-white border-[#315C76] ring-2 ring-[#315C76]/20 shadow-sm'
                    : 'bg-white/80 border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-white hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat.accentBg} ${cat.accentText} border ${cat.accentBorder} transition-transform group-hover:scale-105`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-[#315C76] text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      summaryMeta && (
                        <span className="text-[10.5px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                          {summaryMeta.label}
                        </span>
                      )
                    )}
                  </div>

                  <h3 className="text-[14px] font-bold font-heading text-[#172033] group-hover:text-[#315C76] transition-colors leading-snug">
                    {cat.title}
                  </h3>
                  <p className="text-[12px] text-[#64748B] mt-0.5 line-clamp-1 leading-normal">
                    {cat.shortLabel}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F1F5F9]">
                  <span className={`font-semibold ${isSelected ? 'text-[#315C76]' : 'text-[#94A3B8]'}`}>
                    {isSelected ? 'Selected Category' : 'Click to Configure'}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">v2.4 Engine</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. THREE-STEP CREATION & PREVIEW (Progressive Workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: STEP 2 (Configure) & STEP 3 (Generate Action) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 space-y-5 bg-white border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#172333] text-white text-[11px] font-bold flex items-center justify-center font-heading">
                  2
                </span>
                <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                  Configure {selectedCategory.title}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">
                PDF Layout Settings
              </span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Report Title */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#334155] mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Nexus Dynamics — Brand Audit Executive Report"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:bg-white focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76] transition-all"
                  required
                />
              </div>

              {/* Optional Subtitle */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#334155] mb-1">
                  Subtitle <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={reportSubtitle}
                  onChange={(e) => setReportSubtitle(e.target.value)}
                  placeholder="e.g. Q4 Executive Brand Governance & Compliance Review"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:bg-white focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76] transition-all"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#334155] mb-1">
                  Reporting Timeframe
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:bg-white focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76] transition-all cursor-pointer"
                >
                  <option value="all">All Time (Complete Database Archive)</option>
                  <option value="7d">Last 7 Days (Recent Activity)</option>
                  <option value="30d">Last 30 Days (Monthly Executive Review)</option>
                  <option value="90d">Last 90 Days (Quarterly Assessment)</option>
                </select>
              </div>

              {/* Section Inclusions Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <span className="block text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                  Report Sections Included
                </span>

                <label className="flex items-center space-x-2.5 text-[13px] text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="w-4 h-4 rounded text-[#315C76] border-[#CBD5E1] focus:ring-[#315C76] cursor-pointer"
                  />
                  <span>Include visual distribution charts & analytics</span>
                </label>

                <label className="flex items-center space-x-2.5 text-[13px] text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFindings}
                    onChange={(e) => setIncludeFindings(e.target.checked)}
                    className="w-4 h-4 rounded text-[#315C76] border-[#CBD5E1] focus:ring-[#315C76] cursor-pointer"
                  />
                  <span>Include detailed line-item audit findings</span>
                </label>

                <label className="flex items-center space-x-2.5 text-[13px] text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecommendations}
                    onChange={(e) => setIncludeRecommendations(e.target.checked)}
                    className="w-4 h-4 rounded text-[#315C76] border-[#CBD5E1] focus:ring-[#315C76] cursor-pointer"
                  />
                  <span>Include strategic recommendations & remediation steps</span>
                </label>
              </div>

              {/* Advanced Collapsible Filter (Content Filter) */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-[12px] font-semibold text-[#64748B] hover:text-[#172033] py-1 cursor-pointer"
                >
                  <span>Advanced Campaign & Content Filter</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-2.5 space-y-2 animate-in fade-in duration-200">
                    <label className="block text-[12px] font-medium text-[#64748B]">
                      Filter to Specific Content Item
                    </label>
                    <select
                      value={contentId}
                      onChange={(e) => setContentId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                    >
                      <option value="">All Uploaded Creatives & Campaigns</option>
                      {availableContents.map((c) => (
                        <option key={c.id} value={c.id.toString()}>
                          #{c.id} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* STEP 3: GENERATE ACTION BUTTON */}
              <div className="pt-3 border-t border-[#F1F5F9]">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-[#172333] hover:bg-[#233145] disabled:opacity-50 text-white font-semibold text-[14px] rounded-xl shadow-xs transition-all font-heading cursor-pointer"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Compiling Print-Ready PDF Report...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4.5 h-4.5" />
                      <span>Generate PDF Report</span>
                    </>
                  )}
                </button>
                <div className="text-center mt-2 text-[11px] text-[#64748B]">
                  Compiled with ReportLab print engine • NumberedCanvas running footer
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT: 4. REPORT PREVIEW PANEL */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 bg-white border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2">
                <Eye className="w-4.5 h-4.5 text-[#315C76]" />
                <h3 className="text-[15px] font-bold font-heading text-[#172033]">
                  Live Report Preview
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full border border-[#D0E2EC]">
                Real Database Evidence
              </span>
            </div>

            {loadingPreview ? (
              <div className="py-16 text-center text-[13px] text-[#64748B] space-y-2">
                <div className="w-6 h-6 border-2 border-[#315C76] border-t-transparent rounded-full animate-spin mx-auto" />
                <div>Reading database records for {selectedCategory.title}...</div>
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Header in Preview */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#315C76] uppercase tracking-wider">
                      BRANDGUARD AI BRIEF PREVIEW
                    </span>
                    <span className="text-[10.5px] text-[#64748B]">
                      Organization: <b className="text-[#172033]">{preview.company_name}</b>
                    </span>
                  </div>
                  <div className="text-[15px] font-bold font-heading text-[#172033]">
                    {preview.title}
                  </div>
                  <div className="text-[12px] text-[#64748B] italic">
                    {preview.subtitle}
                  </div>
                </div>

                {/* Executive Summary in Preview */}
                <div>
                  <div className="text-[12px] font-bold font-heading text-[#172033] mb-1 uppercase tracking-wider">
                    Executive Summary
                  </div>
                  <p className="text-[13px] text-[#475569] leading-relaxed bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                    {preview.summary}
                  </p>
                </div>

                {/* KPI Metrics Preview */}
                {preview.metrics && preview.metrics.length > 0 && (
                  <div>
                    <div className="text-[12px] font-bold font-heading text-[#172033] mb-1.5 uppercase tracking-wider">
                      Key Performance Indicators
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {preview.metrics.map(([label, val], idx) => (
                        <div key={idx} className="p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-center shadow-2xs">
                          <div className="text-[16px] font-bold font-heading text-[#172033]">{val}</div>
                          <div className="text-[10.5px] text-[#64748B] mt-0.5 leading-tight">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Chart Preview */}
                {includeCharts && preview.chart_data && (
                  <div>
                    <div className="text-[12px] font-bold font-heading text-[#172033] mb-1.5 uppercase tracking-wider flex items-center justify-between">
                      <span>Visual Analytics Preview</span>
                      <span className="text-[10px] text-[#64748B] font-normal">ReportLab Vector Chart</span>
                    </div>

                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                      {preview.chart_data.type === 'bar' && preview.chart_data.categories ? (
                        <div className="space-y-2">
                          {preview.chart_data.categories.map((cat, idx) => {
                            const val = preview.chart_data?.values?.[idx] || 0;
                            const maxVal = Math.max(...(preview.chart_data?.values || [100]), 100);
                            const pct = Math.min(Math.round((val / maxVal) * 100), 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-[11.5px] text-[#334155] font-medium">
                                  <span>{cat}</span>
                                  <span className="font-bold text-[#172033]">{val}</span>
                                </div>
                                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#315C76] h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : preview.chart_data.labels ? (
                        <div className="flex flex-wrap gap-2 justify-center py-2">
                          {preview.chart_data.labels.map((lbl, idx) => (
                            <span
                              key={idx}
                              className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] text-[#172033] shadow-2xs"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Findings Preview (if enabled) */}
                {includeFindings && preview.findings && preview.findings.length > 0 && (
                  <div>
                    <div className="text-[12px] font-bold font-heading text-[#172033] mb-1.5 uppercase tracking-wider">
                      Audit Findings & Records ({preview.findings.length})
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {preview.findings.map((f, idx) => (
                        <div key={idx} className="p-2 bg-white border border-[#E2E8F0] rounded-md text-[12px] flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-[#172033]">{f.category}: </span>
                            <span className="text-[#475569]">{f.description}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            f.severity === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {f.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Preview (if enabled) */}
                {includeRecommendations && preview.recommendations && preview.recommendations.length > 0 && (
                  <div>
                    <div className="text-[12px] font-bold font-heading text-[#172033] mb-1.5 uppercase tracking-wider">
                      Strategic Recommendations
                    </div>
                    <ul className="space-y-1 text-[12px] text-[#475569] bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      {preview.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-[#315C76] font-bold">0{idx + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Data Warnings */}
                {preview.missing_data_warnings && preview.missing_data_warnings.length > 0 && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11.5px] text-amber-800 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Data Notice: </span>
                      {preview.missing_data_warnings.join(' ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[13px] text-[#64748B]">
                Select a report category above to preview live database records.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 5. PREVIOUSLY GENERATED REPORTS — YOUR REPORT LIBRARY */}
      <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold font-heading text-[#172033]">
              Your Report Library
            </h2>
            <p className="text-[13px] text-[#64748B]">
              Access, download, and review previously compiled executive reports.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search reports..."
                className="w-48 sm:w-60 bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12.5px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#334155] focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Brand Audit">Brand Audit</option>
              <option value="Claim">Claim Verification</option>
              <option value="Approval">Approval History</option>
              <option value="Sentiment">Sentiment</option>
              <option value="Complaint">Complaints</option>
              <option value="Risk">Reputation Risk</option>
              <option value="Performance">Post Performance</option>
              <option value="Complete">Complete Brief</option>
            </select>
          </div>
        </div>

        {/* Reports Table / Card List */}
        {filteredReports.length === 0 ? (
          <Card className="p-12 text-center space-y-3 bg-white border-[#E2E8F0] shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[16px] font-bold font-heading text-[#172033]">
                {reports.length === 0 ? 'No reports yet' : 'No matching reports found'}
              </h3>
              <p className="text-[13px] text-[#64748B] max-w-md mx-auto">
                {reports.length === 0
                  ? 'Your generated brand intelligence reports will appear here. Choose a report type above to create your first executive brief.'
                  : 'Try clearing your search query or selecting a different category filter.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredReports.map((r) => (
              <Card
                key={r.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-[#CBD5E1] transition-all shadow-2xs"
              >
                <div className="flex items-start sm:items-center space-x-3.5 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center flex-shrink-0 border border-[#D0E2EC]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px] font-bold text-[#172033] font-heading truncate">
                        {r.title}
                      </span>
                      <span className="text-[10px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2 py-0.5 rounded border border-[#D0E2EC] flex-shrink-0">
                        {r.report_type}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                        Ready
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[12px] text-[#64748B] mt-0.5">
                      <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{formatFileSize(r.file_size)}</span>
                      <span>•</span>
                      <span>ID #{r.id}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => handlePreview(r)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-[12.5px] font-semibold text-[#334155] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Open PDF Preview"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#315C76]" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleDownload(r)}
                    disabled={downloadingId === r.id}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-[12.5px] font-semibold text-white bg-[#172333] hover:bg-[#233145] rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Download PDF File"
                  >
                    {downloadingId === r.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </>
                    )}
                  </button>

                  {deleteConfirmId === r.id ? (
                    <div className="flex items-center space-x-1 bg-red-50 p-1 rounded-lg border border-red-200">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2 py-0.5 text-[11px] font-bold text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:text-red-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(r.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
