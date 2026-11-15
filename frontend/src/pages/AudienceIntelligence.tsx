import React, { useState, useEffect } from 'react';
import { 
  MessageSquareHeart, Upload, TrendingUp, BarChart2, 
  MessageSquare, Edit2, Filter, AlertTriangle, CheckCircle2,
  Smile, Frown, Meh, Search
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { AudienceFeedback, AudienceSummary } from '../types';

export const AudienceIntelligence: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<AudienceFeedback[]>([]);
  const [summary, setSummary] = useState<AudienceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [search, setSearch] = useState('');

  // Manual Override Modal
  const [selectedFeedback, setSelectedFeedback] = useState<AudienceFeedback | null>(null);
  const [overrideSentiment, setOverrideSentiment] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPlatform, setImportPlatform] = useState('Instagram');
  const [uploadingCsv, setUploadingCsv] = useState(false);

  useEffect(() => {
    fetchAudienceData();
  }, [sentimentFilter, search]);

  const fetchAudienceData = async () => {
    try {
      const q = new URLSearchParams();
      if (sentimentFilter) q.append('sentiment', sentimentFilter);
      if (search) q.append('search', search);

      const [fb, sum] = await Promise.all([
        apiRequest(`/audience/feedback?${q.toString()}`),
        apiRequest('/audience/summary')
      ]);

      setFeedbacks(fb);
      setSummary(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setSubmittingOverride(true);

    try {
      await apiRequest(`/audience/feedback/${selectedFeedback.id}/override`, {
        method: 'POST',
        body: JSON.stringify({
          sentiment: overrideSentiment,
          notes: overrideNotes
        })
      });
      setSelectedFeedback(null);
      await fetchAudienceData();
    } catch (err: any) {
      alert(err.message || 'Failed to apply manual override.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setUploadingCsv(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('platform', importPlatform);

      await apiRequest('/audience/import-csv', {
        method: 'POST',
        body: formData,
      });

      setIsImportModalOpen(false);
      setImportFile(null);
      await fetchAudienceData();
    } catch (err: any) {
      alert(err.message || 'CSV Import failed. Check column headers.');
    } finally {
      setUploadingCsv(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-[#64748B]">
        Synthesizing real-time audience telemetry...
      </div>
    );
  }

  const sentimentColors: Record<string, string> = {
    Positive: '#239B6B',
    Neutral: '#64748B',
    Negative: '#D85F67',
    Mixed: '#7C3AED',
    Uncertain: '#D99A32',
  };

  const pieData = summary?.sentiment_counts ? [
    { name: 'Positive', value: summary.sentiment_counts.Positive || 0 },
    { name: 'Neutral', value: summary.sentiment_counts.Neutral || 0 },
    { name: 'Negative', value: summary.sentiment_counts.Negative || 0 },
    { name: 'Mixed', value: summary.sentiment_counts.Mixed || 0 },
    { name: 'Uncertain', value: summary.sentiment_counts.Uncertain || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#239B6B] font-sans mb-1.5">
            Pillar 2 • Post-Publication Audience Pulse
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold font-heading text-[#172033] tracking-tight leading-tight">
            Understand What Your Audience Thinks About Your Brand
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#64748B] mt-1.5 leading-relaxed">
            Analyze sentiment distribution, customer emotion, recurring complaints, and topic trends from public reactions.
          </p>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center space-x-2 px-4.5 py-2.5 bg-[#239B6B] hover:bg-[#1E835A] text-white rounded-xl text-[13.5px] font-semibold shadow-sm transition-all font-heading cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Customer Feedback CSV</span>
        </button>
      </div>

      {/* Empty State per Part 15.8 */}
      {!summary?.has_data ? (
        <Card className="p-12 text-center max-w-lg mx-auto bg-[#FFFFFF] border-[#E2E8F0] space-y-4 my-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF7F1] text-[#239B6B] flex items-center justify-center mx-auto border border-[#BDE7D4]">
            <MessageSquareHeart className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-[20px] font-bold font-heading text-[#172033]">No Audience Feedback Yet</h2>
          <p className="text-[13.5px] text-[#64748B] leading-relaxed">
            Upload customer feedback or connect an authorised platform to understand how people respond to your brand.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-5 py-2.5 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[13.5px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Upload Sample / Real Feedback CSV
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 15.3 Sentiment Donut Chart */}
            <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wider font-sans mb-2">
                Sentiment Distribution Overview
              </div>
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={sentimentColors[entry.name] || '#315C76'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 12, color: '#172033' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] pt-3 border-t border-[#F1F5F9]">
                {Object.entries(summary.sentiment_percentages || {}).map(([sentiment, pct]: any) => (
                  <div key={sentiment} className="flex items-center justify-between text-[#64748B]">
                    <span className="flex items-center">
                      <span
                        className="w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: sentimentColors[sentiment] || '#888' }}
                      />
                      {sentiment}:
                    </span>
                    <span className="text-[#172033] font-bold tabular-nums font-heading">{pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 15.4 Audience Reaction Trend */}
            <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wider font-sans mb-2 flex items-center justify-between">
                <span>Audience Sentiment Over Time</span>
                <TrendingUp className="w-4 h-4 text-[#239B6B]" />
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.daily_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 12, color: '#172033' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Positive" stroke="#239B6B" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Negative" stroke="#D85F67" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Neutral" stroke="#64748B" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11.5px] text-[#94A3B8] text-center pt-3 border-t border-[#F1F5F9]">
                Timeline based on authenticated comment date metadata.
              </div>
            </Card>

            {/* 15.5 Recurring Topics Horizontal Bar Chart */}
            <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wider font-sans mb-2 flex items-center justify-between">
                <span>What People Are Talking About</span>
                <BarChart2 className="w-4 h-4 text-[#315C76]" />
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.topics?.slice(0, 6) || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                    <YAxis dataKey="topic" type="category" stroke="#64748B" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 12, color: '#172033' }} />
                    <Bar dataKey="count" fill="#315C76" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11.5px] text-[#94A3B8] text-center pt-3 border-t border-[#F1F5F9]">
                Grouped complaint and praise topic clusters.
              </div>
            </Card>
          </div>

          {/* 15.6 Live Comment Feed Table */}
          <Card className="bg-[#FFFFFF] border-[#E2E8F0] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-[#315C76]" />
                <h3 className="text-[14px] font-bold text-[#172033] font-heading">
                  Audience Feedback Stream ({feedbacks.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search comment..."
                    className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="bg-[#FFFFFF] border border-[#CBD5E1] text-[13px] text-[#172033] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#315C76]"
                >
                  <option value="">All Sentiments</option>
                  <option value="Positive">Positive</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Negative">Negative</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Uncertain">Uncertain</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0] tracking-wider font-sans">
                  <tr>
                    <th className="py-3 px-4">Comment</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Topic Cluster</th>
                    <th className="py-3 px-4">Sentiment</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4 text-right">Human Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[#172033]">
                  {feedbacks.map((f) => (
                    <tr key={f.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-[13.5px] text-[#172033]">{f.comment_text}</div>
                        <div className="text-[11.5px] text-[#64748B] mt-0.5">
                          {f.author_name} • {new Date(f.comment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] font-medium">{f.platform}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-[#F1F5F9] rounded-md text-[12px] text-[#475569] border border-[#E2E8F0] font-medium">
                          {f.topic}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={f.manual_override_sentiment || f.sentiment} size="sm" />
                        {f.manual_override_sentiment && (
                          <div className="text-[10px] text-[#64748B] mt-0.5 font-medium">Verified by Human</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-heading tabular-nums text-[#172033]">
                        {Math.round(f.sentiment_confidence * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedFeedback(f);
                            setOverrideSentiment(f.manual_override_sentiment || f.sentiment);
                            setOverrideNotes('');
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#EDF2F7] transition-colors cursor-pointer"
                          title="Correct AI Classification"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Customer Feedback via CSV"
      >
        <form onSubmit={handleUploadCsv} className="space-y-4">
          <p className="text-[13px] text-[#64748B] leading-relaxed">
            Upload public social or review comments in CSV format. The AI Audience Engine will run sentiment scoring, complaint classification, and crisis alerts.
          </p>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Source Platform</label>
            <select
              value={importPlatform}
              onChange={(e) => setImportPlatform(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#239B6B]"
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Twitter">X / Twitter</option>
              <option value="Customer Support">Customer Support Tickets</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => e.target.files && setImportFile(e.target.files[0])}
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2 text-[13px] text-[#172033] focus:outline-none"
            />
            <p className="text-[11.5px] text-[#94A3B8] mt-1">
              Required headers: <code className="text-[#315C76]">comment_text</code>. Optional: <code className="text-[#315C76]">author_name, date</code>.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 bg-[#F1F5F9] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingCsv || !importFile}
              className="px-5 py-2 bg-[#239B6B] hover:bg-[#1E835A] disabled:opacity-40 text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              {uploadingCsv ? 'Analyzing CSV...' : 'Process & Ingest'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Classification Override Modal */}
      {selectedFeedback && (
        <Modal
          isOpen={!!selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          title="Human Classification Override"
        >
          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[13px]">
              <span className="text-[#64748B] block text-[11.5px] mb-0.5">Original Comment:</span>
              <p className="font-semibold text-[#172033] italic">"{selectedFeedback.comment_text}"</p>
              <div className="text-[11.5px] text-[#64748B] mt-1">
                AI Detected: <span className="font-bold text-[#172033]">{selectedFeedback.sentiment}</span> ({Math.round(selectedFeedback.sentiment_confidence * 100)}% confidence)
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Human Verified Sentiment</label>
              <select
                value={overrideSentiment}
                onChange={(e) => setOverrideSentiment(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
              >
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
                <option value="Mixed">Mixed</option>
                <option value="Uncertain">Uncertain</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Audit Log Reason</label>
              <textarea
                rows={2}
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Explain reason for human classification adjustment..."
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-[#F1F5F9] text-[#172033] text-[13px] font-medium rounded-lg hover:bg-[#E2E8F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOverride}
                className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                {submittingOverride ? 'Saving...' : 'Apply Human Correction'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
