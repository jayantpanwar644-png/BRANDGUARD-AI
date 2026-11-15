import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, ShieldCheck, CheckCircle2, 
  Trash2, ExternalLink, Scale, FileText, Check,
  AlertTriangle, CheckCheck, X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { BrandRule, ApprovedClaim, CompanyFact } from '../types';

export const BrandKnowledgeHub: React.FC = () => {
  const { brandProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'claims' | 'facts'>('rules');
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [claims, setClaims] = useState<ApprovedClaim[]>([]);
  const [facts, setFacts] = useState<CompanyFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleFilter, setRuleFilter] = useState<'All' | 'Needs Review' | 'Confirmed' | 'Rejected'>('All');
  const [bulkConfirming, setBulkConfirming] = useState(false);

  // Modal States
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleCategory, setRuleCategory] = useState('Visual');
  const [ruleSeverity, setRuleSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [ruleDescription, setRuleDescription] = useState('');

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [claimCategory, setClaimCategory] = useState('Product');
  const [claimSource, setClaimSource] = useState('');

  const [isFactModalOpen, setIsFactModalOpen] = useState(false);
  const [factTitle, setFactTitle] = useState('');
  const [factDetail, setFactDetail] = useState('');
  const [factCategory, setFactCategory] = useState('Product');
  const [factDoc, setFactDoc] = useState('');

  useEffect(() => {
    fetchKnowledge();
  }, [activeTab]);

  const fetchKnowledge = async () => {
    try {
      const [r, c, f] = await Promise.all([
        apiRequest('/brand/rules'),
        apiRequest('/brand/approved-claims'),
        apiRequest('/brand/facts')
      ]);
      setRules(r);
      setClaims(c);
      setFacts(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/brand/rules', {
        method: 'POST',
        body: JSON.stringify({
          rule_name: ruleName,
          rule_category: ruleCategory,
          severity: ruleSeverity,
          description: ruleDescription
        })
      });
      setIsRuleModalOpen(false);
      setRuleName('');
      setRuleDescription('');
      await fetchKnowledge();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Delete this rule?')) return;
    await apiRequest(`/brand/rules/${id}`, { method: 'DELETE' });
    await fetchKnowledge();
  };

  const handleReviewRule = async (id: number, status: 'Confirmed' | 'Rejected') => {
    try {
      await apiRequest(`/brand/rules/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ review_status: status, is_active: status === 'Confirmed' })
      });
      await fetchKnowledge();
    } catch (err: any) {
      alert(err.message || 'Failed to update rule status');
    }
  };

  const handleBulkConfirm = async () => {
    setBulkConfirming(true);
    try {
      await apiRequest('/brand/rules/bulk-confirm', { method: 'POST' });
      await fetchKnowledge();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm all rules');
    } finally {
      setBulkConfirming(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/brand/approved-claims', {
        method: 'POST',
        body: JSON.stringify({
          claim_text: claimText,
          category: claimCategory,
          source_reference: claimSource
        })
      });
      setIsClaimModalOpen(false);
      setClaimText('');
      setClaimSource('');
      await fetchKnowledge();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteClaim = async (id: number) => {
    if (!confirm('Delete this approved claim?')) return;
    await apiRequest(`/brand/approved-claims/${id}`, { method: 'DELETE' });
    await fetchKnowledge();
  };

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/brand/facts', {
        method: 'POST',
        body: JSON.stringify({
          fact_title: factTitle,
          fact_detail: factDetail,
          category: factCategory,
          source_document: factDoc
        })
      });
      setIsFactModalOpen(false);
      setFactTitle('');
      setFactDetail('');
      setFactDoc('');
      await fetchKnowledge();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFact = async (id: number) => {
    if (!confirm('Delete this company fact?')) return;
    await apiRequest(`/brand/facts/${id}`, { method: 'DELETE' });
    await fetchKnowledge();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-[#64748B]">
        Loading Brand Knowledge Hub...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#315C76] font-sans mb-1.5">
            Enterprise Ground Truth Repository
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold font-heading text-[#172033] tracking-tight leading-tight">
            Brand Knowledge Hub
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#64748B] mt-1.5 leading-relaxed">
            Central database for verified facts, approved marketing claims, visual rules, and communication policies.
          </p>
        </div>
      </div>

      {/* Brand Identity Baseline Banner */}
      <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-[#315C76]" />
            <h2 className="text-[16px] font-bold font-heading text-[#172033]">Verified Brand Profile Baseline</h2>
          </div>
          <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full">Configured in DB</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="text-[11.5px] text-[#64748B] uppercase mb-1.5 font-semibold font-sans">Colors (Primary / Secondary)</div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: brandProfile?.primary_color || '#315C76' }} />
              <span className="font-mono text-[#172033] font-bold text-[13px]">{brandProfile?.primary_color || '#315C76'}</span>
              <span className="w-4 h-4 rounded-full border border-black/10 shadow-2xs ml-2" style={{ backgroundColor: brandProfile?.secondary_color || '#183B59' }} />
              <span className="font-mono text-[#172033] font-bold text-[13px]">{brandProfile?.secondary_color || '#183B59'}</span>
            </div>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="text-[11.5px] text-[#64748B] uppercase mb-1.5 font-semibold font-sans">Typography &amp; Voice</div>
            <div className="text-[#172033] font-semibold text-[13.5px] truncate">{brandProfile?.primary_font || 'Inter'} • {brandProfile?.tone_of_voice || 'Professional'}</div>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="text-[11.5px] text-[#D85F67] uppercase mb-1.5 font-semibold font-sans">Restricted Vocabulary</div>
            <div className="text-[#64748B] truncate text-[12px] font-medium">{brandProfile?.restricted_words || 'None registered'}</div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-2 gap-3">
        <div className="flex items-center space-x-2 text-xs overflow-x-auto">
          {[
            { id: 'rules', label: `Brand Rules (${rules.length})` },
            { id: 'claims', label: `Approved Claims Passport (${claims.length})` },
            { id: 'facts', label: `Company Fact Sheet (${facts.length})` }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-[13.5px] font-semibold transition-colors flex-shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#315C76] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'rules' && (
            <button
              onClick={() => setIsRuleModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Brand Rule</span>
            </button>
          )}
          {activeTab === 'claims' && (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Approved Claim</span>
            </button>
          )}
          {activeTab === 'facts' && (
            <button
              onClick={() => setIsFactModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Company Fact</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Brand Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Rules Filter Bar & Bulk Confirm */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              {(['All', 'Needs Review', 'Confirmed', 'Rejected'] as const).map((filter) => {
                const count = filter === 'All' 
                  ? rules.length 
                  : filter === 'Confirmed' 
                    ? rules.filter(r => r.review_status === 'Confirmed' || !r.review_status).length
                    : rules.filter(r => r.review_status === filter).length;
                return (
                  <button
                    key={filter}
                    onClick={() => setRuleFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      ruleFilter === filter 
                        ? 'bg-[#315C76] text-white shadow-2xs' 
                        : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {filter} ({count})
                  </button>
                );
              })}
            </div>

            {rules.some(r => r.review_status === 'Needs Review') && (
              <button
                onClick={handleBulkConfirm}
                disabled={bulkConfirming}
                className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{bulkConfirming ? 'Confirming...' : 'Confirm All Pending Rules'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules
              .filter(r => {
                if (ruleFilter === 'All') return true;
                if (ruleFilter === 'Confirmed') return r.review_status === 'Confirmed' || !r.review_status;
                return r.review_status === ruleFilter;
              })
              .length === 0 ? (
              <div className="col-span-full py-12 text-center text-[13px] text-[#94A3B8] italic bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0]">
                No brand rules matching this filter.
              </div>
            ) : (
              rules
                .filter(r => {
                  if (ruleFilter === 'All') return true;
                  if (ruleFilter === 'Confirmed') return r.review_status === 'Confirmed' || !r.review_status;
                  return r.review_status === ruleFilter;
                })
                .map((r) => {
                  const status = r.review_status || 'Confirmed';
                  return (
                    <Card key={r.id} className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-3 flex flex-col justify-between shadow-xs hover:border-[#CBD5E1]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1.5">
                          <span className="text-[11px] text-[#315C76] uppercase font-bold bg-[#EAF2F8] px-2.5 py-0.5 rounded-full">{r.rule_category}</span>
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                              status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              status === 'Needs Review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {status}
                            </span>
                            <Badge status={r.severity} size="sm" />
                          </div>
                        </div>

                        <h3 className="text-[14px] font-bold text-[#172033] font-heading">{r.rule_name}</h3>
                        <p className="text-[12.5px] text-[#475569] leading-relaxed">{r.description}</p>

                        {(r.source_document || r.section_reference) && (
                          <div className="text-[11px] text-[#64748B] bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9] flex items-center space-x-1.5">
                            <FileText className="w-3 h-3 text-[#94A3B8] shrink-0" />
                            <span className="truncate">
                              {r.source_document || 'Uploaded Doc'} {r.section_reference ? `• ${r.section_reference}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {status !== 'Confirmed' && (
                            <button
                              onClick={() => handleReviewRule(r.id, 'Confirmed')}
                              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="Confirm Rule"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          )}
                          {status !== 'Rejected' && (
                            <button
                              onClick={() => handleReviewRule(r.id, 'Rejected')}
                              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Reject Rule"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1.5 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Approved Claims */}
      {activeTab === 'claims' && (
        <div className="grid grid-cols-1 gap-3">
          {claims.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#94A3B8] italic bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0]">
              No approved claims registered yet. Pre-approving factual statements enables instant automated pass in RAG verification.
            </div>
          ) : (
            claims.map((c) => (
              <div key={c.id} className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl flex items-center justify-between text-xs shadow-xs hover:border-[#CBD5E1]">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-[14px] text-[#172033] font-semibold">"{c.claim_text}"</span>
                    {c.requires_special_approval && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Requires Special Signoff
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#64748B]">
                    Category: <span className="text-[#172033] font-semibold">{c.category}</span> • Ref: {c.source_reference || 'Internal Compliance'} • Approved by {c.approved_by}
                  </div>
                  {c.supporting_evidence && (
                    <div className="text-[11.5px] text-[#315C76] font-medium bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-emerald-100">
                      Evidence Source: {c.supporting_evidence}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteClaim(c.id)}
                  className="p-1.5 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete claim"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Company Facts */}
      {activeTab === 'facts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[13px] text-[#94A3B8] italic bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0]">
              No company facts registered. Add product specifications, pricing facts, and certifications.
            </div>
          ) : (
            facts.map((f) => (
              <Card key={f.id} className="p-5 bg-[#FFFFFF] border-[#E2E8F0] space-y-2 flex flex-col justify-between shadow-xs hover:border-[#CBD5E1]">
                <div>
                  <div className="text-[11px] text-[#315C76] uppercase font-bold bg-[#EAF2F8] px-2.5 py-0.5 rounded-full inline-block">{f.category}</div>
                  <h3 className="text-[14px] font-bold text-[#172033] font-heading mt-1.5">{f.fact_title}</h3>
                  <p className="text-[13px] text-[#475569] mt-1 leading-relaxed">{f.fact_detail}</p>
                </div>
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11.5px] text-[#64748B]">
                  <span>Source: {f.source_document || 'Official Spec Sheet'}</span>
                  <button
                    onClick={() => handleDeleteFact(f.id)}
                    className="p-1 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete fact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} title="Define Brand Rule">
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Rule Name</label>
            <input
              type="text"
              required
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Master Logo Exclusion Zone"
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Category</label>
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              >
                <option value="Visual">Visual</option>
                <option value="Terminology">Terminology</option>
                <option value="Claim">Claim</option>
                <option value="Tone">Tone</option>
                <option value="Formatting">Formatting</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Severity</label>
              <select
                value={ruleSeverity}
                onChange={(e) => setRuleSeverity(e.target.value as any)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Rule Description &amp; Instruction</label>
            <textarea
              rows={3}
              required
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Specify the exact brand requirement and guideline constraint..."
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Save Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Claim Modal */}
      <Modal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} title="Register Approved Marketing Claim">
        <form onSubmit={handleCreateClaim} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Approved Statement Text</label>
            <textarea
              rows={2}
              required
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="e.g. 99.99% uptime guaranteed by enterprise SLA"
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Category</label>
              <input
                type="text"
                value={claimCategory}
                onChange={(e) => setClaimCategory(e.target.value)}
                placeholder="Product Performance, SLA"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Source Reference</label>
              <input
                type="text"
                value={claimSource}
                onChange={(e) => setClaimSource(e.target.value)}
                placeholder="SOC-2 Audit or Whitepaper #1"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Register Claim
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Fact Modal */}
      <Modal isOpen={isFactModalOpen} onClose={() => setIsFactModalOpen(false)} title="Register Verified Company Fact">
        <form onSubmit={handleCreateFact} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Fact Title</label>
            <input
              type="text"
              required
              value={factTitle}
              onChange={(e) => setFactTitle(e.target.value)}
              placeholder="e.g. Enterprise Plan Pricing"
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Category</label>
              <select
                value={factCategory}
                onChange={(e) => setFactCategory(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              >
                <option value="Product">Product</option>
                <option value="Pricing">Pricing</option>
                <option value="Certification">Certification</option>
                <option value="Policy">Policy</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Source Document</label>
              <input
                type="text"
                value={factDoc}
                onChange={(e) => setFactDoc(e.target.value)}
                placeholder="Official Pricing Sheet Q4"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Fact Detail</label>
            <textarea
              rows={3}
              required
              value={factDetail}
              onChange={(e) => setFactDetail(e.target.value)}
              placeholder="Detail the exact specification, pricing, or certified claim..."
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsFactModalOpen(false)}
              className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Save Fact
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
