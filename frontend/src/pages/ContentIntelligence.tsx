import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, Search, Filter, RotateCcw, Trash2, 
  Eye, History, ExternalLink, Sparkles, AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { UploadedContent } from '../types';

export const ContentIntelligence: React.FC = () => {
  const [contents, setContents] = useState<UploadedContent[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedContent, setSelectedContent] = useState<UploadedContent | null>(null);
  const [reanalysing, setReanalysing] = useState(false);

  useEffect(() => {
    fetchContents();
  }, [search, statusFilter, platformFilter]);

  const fetchContents = async () => {
    try {
      let url = '/content?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (platformFilter) url += `platform=${encodeURIComponent(platformFilter)}&`;

      const data = await apiRequest(url);
      setContents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this creative and its version audit trail?')) return;
    try {
      await apiRequest(`/content/${id}`, { method: 'DELETE' });
      if (selectedContent?.id === id) setSelectedContent(null);
      await fetchContents();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const handleReanalyse = async (id: number) => {
    setReanalysing(true);
    try {
      await apiRequest(`/content/${id}/reanalyse`, { method: 'POST' });
      const updated = await apiRequest(`/content/${id}`);
      setSelectedContent(updated);
      await fetchContents();
    } catch (e: any) {
      alert(e.message || 'Re-analysis failed');
    } finally {
      setReanalysing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[13px] text-[#64748B] font-medium">
        Loading content history archives...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none animate-fade-up font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] mb-2 font-sans">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Asset Lifecycle &amp; Archives</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">Content Intelligence &amp; History</h1>
          <p className="text-[13.5px] sm:text-[14.5px] text-[#68736B] mt-0.5 max-w-2xl leading-relaxed">
            Permanent archive of every submitted campaign asset, version history, audit reports, and re-analysis logs.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content title or filename..."
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76]"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FFFFFF] border border-[#CBD5E1] text-[13px] text-[#172033] rounded-xl px-3 py-2 focus:outline-none focus:border-[#315C76]"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Needs Verification">Needs Verification</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-[#FFFFFF] border border-[#CBD5E1] text-[13px] text-[#172033] rounded-xl px-3 py-2 focus:outline-none focus:border-[#315C76]"
          >
            <option value="">All Platforms</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Twitter">Twitter</option>
          </select>
        </div>
      </div>

      {/* Grid of Archival Records */}
      {contents.length === 0 ? (
        <Card className="p-12 text-center bg-[#FFFFFF] border-[#E2E8F0] space-y-2 shadow-xs">
          <FolderKanban className="w-8 h-8 text-[#94A3B8] mx-auto stroke-[1.5]" />
          <h3 className="text-[15px] font-bold text-[#172033] font-heading">No Content Records Match Criteria</h3>
          <p className="text-[13px] text-[#64748B]">Try clearing filters or upload new advertising content.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {contents.map((item) => {
            const report = item.audit_reports?.[item.audit_reports.length - 1];

            return (
              <Card key={item.id} className="p-4 bg-[#FFFFFF] border-[#E2E8F0] flex flex-col justify-between space-y-3 group hover:border-[#CBD5E1] shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full">{item.platform}</span>
                    <Badge status={item.approval_status} size="sm" />
                  </div>

                  <div className="rounded-xl bg-[#F8FAFC] overflow-hidden border border-[#E2E8F0] h-48 flex items-center justify-center p-2">
                    <img src={item.file_path} alt={item.title} className="max-h-full object-contain rounded-lg" />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-[#172033] font-heading truncate">{item.title}</h3>
                    <div className="text-[12px] text-[#64748B] flex items-center space-x-2 mt-0.5">
                      <span className="font-semibold text-[#172033]">v{item.current_version}</span>
                      <span>•</span>
                      <span className="truncate">{item.file_name}</span>
                    </div>
                  </div>

                  {report && (
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center text-[11px]">
                      <div>
                        <div className="text-[#64748B]">Visual</div>
                        <div className="font-bold text-[#172033] tabular-nums font-heading">{report.visual_quality_score}</div>
                      </div>
                      <div>
                        <div className="text-[#64748B]">Brand</div>
                        <div className="font-bold text-[#172033] tabular-nums font-heading">{report.brand_consistency_score}</div>
                      </div>
                      <div>
                        <div className="text-[#64748B]">Claims</div>
                        <div className="font-bold text-[#172033] tabular-nums font-heading">{item.claims?.length || 0}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <span className="text-[11px] text-[#94A3B8]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setSelectedContent(item)}
                      className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#172033] text-xs transition-colors"
                      title="Inspect full details & version history"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReanalyse(item.id)}
                      className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#315C76] text-xs transition-colors"
                      title="Re-run brand audit (creates version v+1)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg bg-[#FFFFFF] border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive History & Reanalysis Modal */}
      <Modal
        isOpen={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        title={`Asset Archive Record: ${selectedContent?.title}`}
        maxWidth="max-w-4xl"
      >
        {selectedContent && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] flex items-center justify-center">
                  <img src={selectedContent.file_path} alt={selectedContent.title} className="max-h-72 object-contain rounded-lg" />
                </div>
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[13px] space-y-1.5">
                  <div><strong className="text-[#172033]">Active Version:</strong> v{selectedContent.current_version}</div>
                  <div><strong className="text-[#172033]">Platform:</strong> {selectedContent.platform}</div>
                  <div><strong className="text-[#172033]">File:</strong> {selectedContent.file_name} ({Math.round(selectedContent.file_size / 1024)} KB)</div>
                  <div><strong className="text-[#172033]">Uploaded Date:</strong> {new Date(selectedContent.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <h4 className="text-[12px] font-bold text-[#172033] uppercase tracking-wider font-heading">
                    Audit Reports ({selectedContent.audit_reports?.length || 0} iterations)
                  </h4>
                  <button
                    disabled={reanalysing}
                    onClick={() => handleReanalyse(selectedContent.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#315C76] hover:bg-[#183B59] disabled:opacity-40 text-white rounded-lg text-[13px] font-semibold shadow-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${reanalysing ? 'animate-spin' : ''}`} />
                    <span>Re-analyse</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(selectedContent.audit_reports || []).map((rep) => (
                    <div key={rep.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#172033] font-bold font-heading">Report v{rep.version_number}</span>
                        <Badge status={rep.overall_status} size="sm" />
                      </div>
                      <p className="text-[#475569] text-[12px] leading-relaxed">{rep.summary}</p>
                      <div className="text-[11px] text-[#94A3B8]">
                        Generated {new Date(rep.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedContent(null)}
                className="px-5 py-2 bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#172033] text-[13px] font-semibold rounded-lg shadow-2xs"
              >
                Close Archive
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
