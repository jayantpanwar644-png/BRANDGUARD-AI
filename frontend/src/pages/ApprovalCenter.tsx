import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, CheckCircle2, XCircle, AlertTriangle, 
  Upload, FileText, MessageSquare, Clock, User, ShieldCheck,
  ArrowRight, Eye, ShieldAlert, Send, Lock, ExternalLink,
  Sparkles, Share2, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { UploadedContent, DetectedClaim } from '../types';

interface PublishResult {
  success: boolean;
  message: string;
  post_url?: string;
  external_post_id?: string;
  platform: string;
  timestamp: string;
}

export const ApprovalCenter: React.FC = () => {
  const [contents, setContents] = useState<UploadedContent[]>([]);
  const [activeTab, setActiveTab] = useState('Pending Approval');
  const [loading, setLoading] = useState(true);

  // Review Dialog State
  const [selectedContent, setSelectedContent] = useState<UploadedContent | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionError, setActionError] = useState('');

  // Evidence Upload Modal State
  const [selectedClaim, setSelectedClaim] = useState<DetectedClaim | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceResult, setEvidenceResult] = useState<any>(null);

  // Social Publishing State (Unlocked Only When Approved)
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [publishStatusMap, setPublishStatusMap] = useState<Record<number, PublishResult>>({});
  const [targetPlatformMap, setTargetPlatformMap] = useState<Record<number, string>>({});
  const [publishError, setPublishError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  useEffect(() => {
    fetchAccounts();
    fetchPublished();
  }, []);

  const fetchPublished = async () => {
    try {
      const posts = await apiRequest('/integrations/published');
      if (Array.isArray(posts)) {
        const map: Record<number, PublishResult> = {};
        posts.forEach((p: any) => {
          map[p.content_id] = {
            success: true,
            message: `Content published to ${p.platform}.`,
            post_url: p.post_url,
            external_post_id: p.external_post_id,
            platform: p.platform,
            timestamp: new Date(p.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
        setPublishStatusMap(prev => ({ ...map, ...prev }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const data = await apiRequest(`/approvals?status_filter=${encodeURIComponent(activeTab)}`);
      setContents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await apiRequest('/integrations/accounts');
      setConnectedAccounts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecision = async (decision: 'Approved' | 'Rejected' | 'Changes Requested' | 'Evidence Requested') => {
    if (!selectedContent) return;
    setActionError('');
    setPublishError(null);

    try {
      const res = await apiRequest(`/approvals/${selectedContent.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          comments: decisionNotes,
          override_unverified_claims: true
        })
      });
      
      // Update selected content locally to immediately reflect status
      if (res && res.approval_status) {
        setSelectedContent(prev => prev ? { ...prev, approval_status: res.approval_status } : null);
      } else {
        setSelectedContent(null);
      }

      setDecisionNotes('');
      await fetchApprovals();
    } catch (err: any) {
      setActionError(err.message || 'Decision failed.');
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !evidenceFile) return;
    setUploadingEvidence(true);
    setEvidenceResult(null);

    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      formData.append('description', evidenceDescription);

      const res = await apiRequest(`/claims/${selectedClaim.id}/evidence`, {
        method: 'POST',
        body: formData,
      });

      setEvidenceResult(res);
      setEvidenceFile(null);
      setEvidenceDescription('');
      
      // Refresh selected content
      if (selectedContent) {
        const updated = await apiRequest(`/content/${selectedContent.id}`);
        setSelectedContent(updated);
      }
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Evidence upload failed.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handlePublish = async (contentId: number, platform: string) => {
    setPublishingId(contentId);
    setPublishError(null);

    try {
      const res = await apiRequest(`/integrations/publish/${contentId}?platform=${encodeURIComponent(platform)}`, {
        method: 'POST'
      });

      setPublishStatusMap(prev => ({
        ...prev,
        [contentId]: {
          success: true,
          message: res.message || `Content successfully published to ${platform}.`,
          post_url: res.post_url,
          external_post_id: res.external_post_id,
          platform,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }));
    } catch (err: any) {
      setPublishError(err.message || `Failed to publish to ${platform}.`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleQuickConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    setPublishError(null);
    try {
      await apiRequest('/integrations/connect', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          account_name: `@NexusDynamics_${platform}`,
          account_id: `acc_${platform.toLowerCase()}_${Date.now()}`
        })
      });
      await fetchAccounts();
    } catch (err: any) {
      setPublishError(err.message || `Could not connect ${platform}.`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const tabs = [
    'Pending Approval',
    'Pending Evidence',
    'Needs Verification',
    'Changes Requested',
    'Approved',
    'Rejected'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[13px] text-[#64748B] font-medium">
        Loading approval workflows...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 select-none animate-fade-up font-sans">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] mb-2 font-sans">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pillar 1 • Step 3 • Sign-Off &amp; Release</span>
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">
          Approval &amp; Workflow Center
        </h1>
        <p className="text-[13.5px] sm:text-[14.5px] text-[#68736B] mt-0.5 max-w-3xl leading-relaxed">
          Sequential brand governance: complete automated AI brand checks and claim verification first. Social publication is strictly locked until human manager sign-off is granted.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#E4DFD5] overflow-x-auto pb-2 text-[13px] font-sans">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === t
                ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                : 'text-[#68736B] hover:text-[#242B27] hover:bg-[#F7F4EC]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Governance Status Notice Banner */}
      {activeTab === 'Approved' ? (
        <div className="p-4 bg-[#EBF0ED] border border-[#C8D7CF] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#244B3F]">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#244B3F]" />
            <div>
              <span className="font-semibold block text-[13px] text-[#244B3F]">
                AI Verification &amp; Brand Approval Complete
              </span>
              <span className="text-[#344D3D]">
                All creatives in this view have satisfied active brand guidelines and received manager sign-off. Social publishing options are unlocked and ready for live transmission.
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center font-bold bg-[#244B3F] text-[#FCFAF5] px-3 py-1 rounded-full text-[11px] uppercase tracking-wider flex-shrink-0">
            Posting Unlocked
          </span>
        </div>
      ) : (
        <div className="p-4 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#68736B]">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-5 h-5 flex-shrink-0 text-[#93988F]" />
            <div>
              <span className="font-bold block text-[13px] text-[#172033]">
                Pre-Publication Governance Required
              </span>
              <span>
                Social channel publishing is locked. Complete the automated AI brand check, substantiate factual claims with evidence, and record brand manager sign-off before content can be published.
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center font-semibold bg-[#E2E8F0] text-[#475569] px-3 py-1 rounded-full text-[11px] uppercase tracking-wider flex-shrink-0">
            Publishing Locked
          </span>
        </div>
      )}

      {/* Content List */}
      {contents.length === 0 ? (
        <Card className="p-12 text-center bg-[#FFFFFF] border-[#E2E8F0] space-y-2 shadow-xs">
          <CheckSquare className="w-8 h-8 text-[#94A3B8] mx-auto stroke-[1.5]" />
          <h3 className="text-[15px] font-bold text-[#172033] font-heading">No Creatives in "{activeTab}"</h3>
          <p className="text-[13px] text-[#64748B]">
            All submitted campaigns in this governance category have been resolved.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contents.map((item) => {
            const unverifiedCount = (item.claims || []).filter(
              c => c.verification_status !== 'Supported'
            ).length;
            const isApproved = item.approval_status === 'Approved';
            const selectedPlatform = targetPlatformMap[item.id] || item.platform || 'Instagram';
            const publishedInfo = publishStatusMap[item.id];

            return (
              <Card key={item.id} className="p-4 bg-[#FFFFFF] border-[#E2E8F0] flex flex-col justify-between space-y-3 shadow-xs hover:border-[#CBD5E1] transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full">{item.platform}</span>
                    <Badge status={item.approval_status} size="sm" />
                  </div>

                  <div className="rounded-xl bg-[#F8FAFC] overflow-hidden border border-[#E2E8F0] h-44 flex items-center justify-center p-2">
                    <img src={item.file_path} alt={item.title} className="max-h-full object-contain rounded-lg" />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-[#172033] font-heading truncate">{item.title}</h3>
                    <p className="text-[12.5px] text-[#64748B] line-clamp-2 mt-0.5 leading-relaxed">{item.caption || 'No copy provided'}</p>
                  </div>

                  {unverifiedCount > 0 && (
                    <div className="p-2.5 bg-[#FEF6E8] rounded-xl border border-[#F9E0B2] text-[11.5px] text-[#D99A32] flex items-center space-x-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{unverifiedCount} claim(s) require evidence before approval</span>
                    </div>
                  )}
                </div>

                {/* Conditional Footer Based on AI Verification & Approval */}
                {isApproved ? (
                  <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#239B6B] flex items-center space-x-1 text-[11.5px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready to Post</span>
                      </span>
                      <div className="text-[11px] text-[#94A3B8]">
                        v{item.current_version} • {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {publishedInfo ? (
                      <div className="p-2.5 bg-[#EAF7F1] rounded-xl border border-[#BDE7D4] space-y-1.5 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between font-bold text-[#239B6B]">
                          <span className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Live on {publishedInfo.platform}</span>
                          </span>
                          <span className="text-[10px] text-[#239B6B]/80 font-mono">{publishedInfo.timestamp}</span>
                        </div>
                        <a
                          href={publishedInfo.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#315C76] hover:underline flex items-center space-x-1 font-semibold text-[11.5px]"
                        >
                          <span className="truncate">View Live Post</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Channel selector */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#64748B] text-[11px] font-medium">Channel:</span>
                          <select
                            value={selectedPlatform}
                            onChange={(e) => setTargetPlatformMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#172033] focus:outline-none focus:border-[#315C76]"
                          >
                            <option value="Instagram">Instagram</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Twitter">Twitter</option>
                          </select>
                        </div>

                        {/* Unlocked Post Button & Review Button */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePublish(item.id, selectedPlatform)}
                            disabled={publishingId === item.id}
                            className="flex-1 px-3 py-2 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[12.5px] font-bold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            title={`Publish approved creative to ${selectedPlatform}`}
                          >
                            {publishingId === item.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Posting...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 rotate-45 -translate-y-0.5 translate-x-0.5" />
                                <span>Publish to {selectedPlatform}</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedContent(item);
                              setActionError('');
                              setPublishError(null);
                            }}
                            className="px-2.5 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-[12.5px] font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer"
                            title="Inspect Review & Audit History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Unapproved State: Publishing Locked */
                  <div className="pt-3 border-t border-[#F1F5F9] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span className="flex items-center space-x-1 text-[#64748B]">
                        <Lock className="w-3 h-3 text-[#94A3B8]" />
                        <span>Publishing Locked</span>
                      </span>
                      <span>v{item.current_version} • {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedContent(item);
                        setActionError('');
                        setPublishError(null);
                      }}
                      className="w-full px-3 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13px] font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review &amp; Sign-Off</span>
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive Review & Sign-Off Modal */}
      <Modal
        isOpen={!!selectedContent}
        onClose={() => {
          setSelectedContent(null);
          setPublishError(null);
        }}
        title={`Governance Review & Publication: ${selectedContent?.title}`}
        maxWidth="max-w-4xl"
      >
        {selectedContent && (
          <div className="space-y-6">
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {publishError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{publishError}</span>
                </div>
                <button
                  onClick={() => handleQuickConnect(targetPlatformMap[selectedContent.id] || selectedContent.platform || 'Instagram')}
                  disabled={!!connectingPlatform}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors ml-2 flex-shrink-0 cursor-pointer"
                >
                  {connectingPlatform ? 'Connecting...' : 'Authorize Account'}
                </button>
              </div>
            )}

            {/* UNLOCKED POSTING STUDIO: ONLY APPEARS WHEN APPROVED */}
            {selectedContent.approval_status === 'Approved' && (
              <div className="p-4.5 bg-[#EAF7F1]/50 border border-[#BDE7D4] rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#239B6B] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[#172033] font-heading">
                        Pre-Publication Checks Complete — Clear to Post
                      </h4>
                      <p className="text-[12px] text-[#64748B]">
                        Automated AI audit and brand manager sign-off verified. Transmit this creative live to connected social channels.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#239B6B] bg-[#FFFFFF] border border-[#BDE7D4] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Posting Unlocked
                  </span>
                </div>

                {publishStatusMap[selectedContent.id] ? (
                  <div className="p-3.5 bg-[#FFFFFF] rounded-xl border border-[#BDE7D4] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#239B6B] flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Transmitted Live to {publishStatusMap[selectedContent.id].platform}!</span>
                      </span>
                      <span className="text-[11px] text-[#64748B] font-mono">
                        Published at {publishStatusMap[selectedContent.id].timestamp}
                      </span>
                    </div>
                    <div className="text-xs text-[#172033] flex items-center justify-between bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                      <span className="truncate mr-3 font-mono text-[11px] text-[#64748B]">
                        {publishStatusMap[selectedContent.id].post_url}
                      </span>
                      <a
                        href={publishStatusMap[selectedContent.id].post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#315C76] hover:underline font-bold text-xs flex items-center space-x-1 flex-shrink-0"
                      >
                        <span>View Live Post</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['Instagram', 'LinkedIn', 'Facebook', 'Twitter'].map(plat => {
                        const currentPlat = targetPlatformMap[selectedContent.id] || selectedContent.platform || 'Instagram';
                        const isSelected = currentPlat.toLowerCase() === plat.toLowerCase();
                        const isConnected = connectedAccounts.some(
                          a => a.platform.toLowerCase() === plat.toLowerCase() && a.status === 'Connected'
                        );

                        return (
                          <div
                            key={plat}
                            onClick={() => setTargetPlatformMap(prev => ({ ...prev, [selectedContent.id]: plat }))}
                            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#239B6B] bg-[#FFFFFF] ring-2 ring-[#239B6B]/20 shadow-xs'
                                : 'border-[#E2E8F0] bg-[#FFFFFF]/70 hover:bg-[#FFFFFF]'
                            }`}
                          >
                            <div className="text-[12.5px] font-bold text-[#172033]">{plat}</div>
                            <div className="text-[10px] mt-0.5 flex items-center justify-center space-x-1">
                              {isConnected ? (
                                <span className="text-[#239B6B] font-semibold">● Connected</span>
                              ) : (
                                <span className="text-[#94A3B8]">Not Connected</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#BDE7D4]/60">
                      <div className="text-xs text-[#64748B]">
                        Channel:{' '}
                        <strong className="text-[#172033]">
                          {targetPlatformMap[selectedContent.id] || selectedContent.platform || 'Instagram'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePublish(
                          selectedContent.id, 
                          targetPlatformMap[selectedContent.id] || selectedContent.platform || 'Instagram'
                        )}
                        disabled={publishingId === selectedContent.id}
                        className="px-6 py-2.5 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[13px] font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {publishingId === selectedContent.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Transmitting Live...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 rotate-45 -translate-y-0.5 translate-x-0.5" />
                            <span>
                              Post to {targetPlatformMap[selectedContent.id] || selectedContent.platform || 'Instagram'} Now
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Preview */}
              <div className="space-y-3">
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] flex items-center justify-center">
                  <img src={selectedContent.file_path} alt={selectedContent.title} className="max-h-72 object-contain rounded-lg" />
                </div>
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#475569]">
                  <strong className="text-[#172033] block mb-1">Marketing Copy / Caption:</strong>
                  {selectedContent.caption || 'None'}
                </div>
              </div>

              {/* Claims & Passport */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-bold text-[#172033] uppercase tracking-wider font-heading">
                    Claim Verification Passport ({selectedContent.claims?.length || 0})
                  </h4>
                  <span className="text-[12px] text-[#64748B]">RAG Grounded Checks</span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {(selectedContent.claims || []).map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#172033]">"{c.statement}"</span>
                        <Badge status={c.verification_status} size="sm" />
                      </div>
                      <div className="text-[12px] text-[#64748B]">
                        Risk Level: <strong className="text-[#172033]">{c.risk_level}</strong> • Action: {c.required_action}
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-[#94A3B8]">
                          {c.evidence_list?.length ? `${c.evidence_list.length} proof document(s) uploaded` : 'No evidence uploaded yet'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClaim(c);
                            setEvidenceFile(null);
                            setEvidenceResult(null);
                          }}
                          className="text-[12.5px] text-[#315C76] hover:text-[#183B59] font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Attach Proof</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Decision Comment Box */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                    Reviewer Decision Comments &amp; Audit Log
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Document compliance verification rationale, revision requests, or sign-off notes..."
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>
            </div>

            {/* Decision Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleDecision('Rejected')}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[13px] font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer"
                >
                  Reject Content
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('Changes Requested')}
                  className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[13px] font-semibold rounded-lg border border-amber-200 transition-colors cursor-pointer"
                >
                  Request Changes
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleDecision('Evidence Requested')}
                  className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#172033] text-[13px] font-semibold rounded-lg border border-[#CBD5E1] cursor-pointer"
                >
                  Request Proof Document
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('Approved')}
                  className="px-6 py-2 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[13px] font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Grant Final Approval</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Attach Evidence Proof Modal */}
      <Modal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title="Upload Supporting Verification Proof"
      >
        {selectedClaim && (
          <form onSubmit={handleUploadEvidence} className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs">
              <span className="text-[#64748B] block">Target Claim:</span>
              <span className="font-mono text-[#172033] font-bold">"{selectedClaim.statement}"</span>
            </div>

            <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 bg-[#F8FAFC] text-center cursor-pointer relative hover:border-[#315C76] transition-colors">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.csv"
                onChange={(e) => e.target.files && setEvidenceFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-[#315C76] mx-auto mb-2" />
              <div className="text-xs font-semibold text-[#172033]">{evidenceFile ? evidenceFile.name : 'Choose Certificate / Research Document'}</div>
              <div className="text-[10px] text-[#64748B]">Supported formats: PDF, DOCX, TXT (Max 50MB)</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Evidence Description &amp; Notes</label>
              <input
                type="text"
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="e.g. Clinical Study #412 or ISO Certificate 2026"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#315C76]"
              />
            </div>

            {evidenceResult && (
              <div className="p-3 bg-[#EAF7F1] border border-[#BDE7D4] text-[#239B6B] text-xs rounded-xl font-mono">
                Verification Result: {evidenceResult.claim?.verification_status}. {evidenceResult.verification_result?.explanation}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-xs font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!evidenceFile || uploadingEvidence}
                className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                {uploadingEvidence ? 'Extracting &amp; Verifying...' : 'Upload &amp; Verify with RAG'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
