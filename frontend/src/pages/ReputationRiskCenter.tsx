import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, 
  Send, Edit3, MessageSquare, ArrowRight, ShieldCheck, Clock
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ReputationIncident, ResponseSuggestion } from '../types';

export const ReputationRiskCenter: React.FC = () => {
  const [incidents, setIncidents] = useState<ReputationIncident[]>([]);
  const [suggestions, setSuggestions] = useState<ResponseSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  // Manage Incident Modal
  const [selectedIncident, setSelectedIncident] = useState<ReputationIncident | null>(null);
  const [incidentStatus, setIncidentStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // AI Response Draft Review Modal
  const [selectedSuggestion, setSelectedSuggestion] = useState<ResponseSuggestion | null>(null);
  const [draftResponseText, setDraftResponseText] = useState('');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const [inc, sug] = await Promise.all([
        apiRequest('/incidents'),
        apiRequest('/incidents/suggestions')
      ]);
      setIncidents(inc);
      setSuggestions(sug);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await apiRequest('/incidents/evaluate', { method: 'POST' });
      await fetchIncidents();
    } catch (e: any) {
      alert(e.message || 'Evaluation error');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      await apiRequest(`/incidents/${selectedIncident.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: incidentStatus,
          assigned_to: assignedTo,
          internal_notes: internalNotes
        })
      });
      setSelectedIncident(null);
      await fetchIncidents();
    } catch (e: any) {
      alert(e.message || 'Save failed');
    }
  };

  const handleActionSuggestion = async (action: 'Approved' | 'Rejected' | 'Published') => {
    if (!selectedSuggestion) return;
    try {
      await apiRequest(`/incidents/suggestions/${selectedSuggestion.id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          edited_text: draftResponseText
        })
      });
      setSelectedSuggestion(null);
      await fetchIncidents();
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-[#64748B]">
        Scanning reputation risk parameters...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 select-none animate-fade-up font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FAF0EC] border border-[#ECCBC0] text-[11.5px] font-semibold text-[#C77E63] font-sans mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Crisis &amp; Incident Governance</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">
            Reputation Risk Center
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#68736B] mt-1.5 leading-relaxed max-w-2xl">
            Automated reputation risk detection from verified audience feedback, incident management, and human-in-the-loop AI response drafting.
          </p>
        </div>

        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className="flex items-center space-x-2 px-4.5 py-2.5 bg-[#244B3F] hover:bg-[#1A362D] text-[#FCFAF5] rounded-xl text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(36,75,63,0.18)] transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#C6A66B] ${evaluating ? 'animate-spin' : ''}`} />
          <span>{evaluating ? 'Evaluating Feedback...' : 'Evaluate Current Risks'}</span>
        </button>
      </div>

      {/* Threshold Policies Reference Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF0EC] text-[#C77E63] flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="font-semibold text-[13.5px] text-[#242B27]">Documented Detection Thresholds</div>
            <div className="text-[12px] text-[#68736B] leading-relaxed">
              Cluster trigger: ≥ 3 recurring complaints on same topic. Negative spike: &gt; 25% negative audience sentiment.
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[12px] text-[#244B3F] bg-[#EBF0ED] px-3.5 py-1 rounded-full border border-[#C8D7CF] font-semibold">
          <span>Protection Policy: Active</span>
        </div>
      </div>

      {/* Active Incidents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold font-sans text-[#242B27] uppercase tracking-wider">
            Reputation Incidents Log ({incidents.length})
          </h2>
        </div>

        {incidents.length === 0 ? (
          <Card className="p-10 text-center bg-[#FCFAF5] border-[#E4DFD5] space-y-3 shadow-[0_2px_12px_rgba(36,43,39,0.04)]">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center mx-auto border border-[#C8D7CF]">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-[16px] font-normal text-[#242B27] font-heading">No Reputation Risks Detected</h3>
            <p className="text-[13px] text-[#68736B] max-w-md mx-auto leading-relaxed">
              Audience feedback analysis indicates stable sentiment within safety tolerances. No recurring complaint clusters or spikes found.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <Card key={inc.id} className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5] space-y-3 shadow-[0_2px_12px_rgba(36,43,39,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#EFEBE3]">
                  <div className="flex items-center space-x-3">
                    <Badge status={inc.severity} size="sm" />
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#242B27] font-sans">{inc.title}</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge status={inc.status} size="sm" />
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setIncidentStatus(inc.status);
                        setAssignedTo(inc.assigned_to);
                        setInternalNotes(inc.internal_notes || '');
                      }}
                      className="px-3.5 py-1.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#172033] text-[13px] font-semibold rounded-lg border border-[#CBD5E1] transition-colors shadow-2xs cursor-pointer"
                    >
                      Manage Incident
                    </button>
                  </div>
                </div>

                <div className="text-[13.5px] text-[#475569] leading-relaxed">
                  {inc.issue_description}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B]">Affected Post / Channel:</span>{' '}
                    <span className="text-[#172033] font-semibold">{inc.affected_post_title || 'General Category'}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Assigned Risk Owner:</span>{' '}
                    <span className="text-[#172033] font-semibold">{inc.assigned_to}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#315C76] font-semibold">Recommended Action:</span>{' '}
                    <span className="text-[#172033]">{inc.recommended_action}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Response Assistant Section */}
      <div className="space-y-4 pt-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#315C76] font-sans mb-1.5">
            Communication Safeguards
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-bold font-heading text-[#172033]">AI Response Assistant</h2>
          <p className="text-[13.5px] text-[#64748B] mt-1 leading-relaxed">
            Empathetic, brand-governed response drafts generated for affected customer feedback.
            <strong className="text-[#172033] ml-1">Human approval is strictly mandatory before publishing.</strong>
          </p>
        </div>

        {suggestions.length === 0 ? (
          <div className="text-[13px] text-[#94A3B8] italic p-6 text-center bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0]">
            No response drafts currently pending review. Drafts are automatically generated when negative complaint clusters appear.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((sug) => (
              <Card key={sug.id} className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                  <div className="flex items-center space-x-2 text-[13px]">
                    <span className="text-[#64748B]">Tone Policy:</span>
                    <span className="text-[#172033] font-semibold">{sug.tone}</span>
                  </div>
                  <Badge status={sug.approval_status} size="sm" />
                </div>

                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[13.5px] text-[#172033] leading-relaxed italic">
                  "{sug.suggested_response_text}"
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[12px] text-[#64748B]">
                    {sug.reviewer_name ? `Reviewed by ${sug.reviewer_name}` : 'Awaiting Brand Manager Sign-off'}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSuggestion(sug);
                        setDraftResponseText(sug.suggested_response_text);
                      }}
                      className="px-3.5 py-1.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Review &amp; Edit Draft</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Incident Management Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Manage Reputation Incident"
      >
        {selectedIncident && (
          <div className="space-y-4">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[13px]">
              <div className="font-bold text-[#172033] mb-1 text-[14px]">{selectedIncident.title}</div>
              <div className="text-[#64748B] leading-relaxed">{selectedIncident.issue_description}</div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Incident Status</label>
              <select
                value={incidentStatus}
                onChange={(e) => setIncidentStatus(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              >
                <option value="Active">Active</option>
                <option value="Investigating">Investigating</option>
                <option value="Action Taken">Action Taken</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Assigned Risk Manager</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Internal Investigation Notes</label>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Record mitigation steps, cross-department notifications, and root cause..."
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveIncident}
                className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Update Incident Record
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Review Response Draft Modal */}
      <Modal
        isOpen={!!selectedSuggestion}
        onClose={() => setSelectedSuggestion(null)}
        title="Human Review & Approval of AI Response Draft"
      >
        {selectedSuggestion && (
          <div className="space-y-4">
            <p className="text-[13px] text-[#64748B] leading-relaxed">
              Edit the draft to ensure complete alignment with your brand tone. Once approved, the response can be published to the customer.
            </p>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Response Copy</label>
              <textarea
                rows={4}
                value={draftResponseText}
                onChange={(e) => setDraftResponseText(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-3 text-[13.5px] text-[#172033] focus:outline-none focus:border-[#315C76] leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => handleActionSuggestion('Rejected')}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[13px] font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                Reject Draft
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleActionSuggestion('Approved')}
                  className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13px] font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Approve Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleActionSuggestion('Published')}
                  className="px-4 py-2 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[13px] font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Approve &amp; Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
