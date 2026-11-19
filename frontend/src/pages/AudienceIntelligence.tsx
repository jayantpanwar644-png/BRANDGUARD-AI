import React, { useState, useEffect } from 'react';
import { 
  MessageSquareHeart, Upload, TrendingUp, BarChart2, 
  MessageSquare, Edit2, Filter, AlertTriangle, CheckCircle2,
  Smile, Frown, Meh, Search, Sparkles, RefreshCw, RotateCcw
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
import { PeakChart } from '../components/ui/peak-chart';
import { AudienceFeedback, AudienceSummary } from '../types';

export const AudienceIntelligence: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<AudienceFeedback[]>([]);
  const [summary, setSummary] = useState<AudienceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // PeakChart Trend State & Period Selection
  const [trendPeriod, setTrendPeriod] = useState<string>('Monthly');
  const [trendData, setTrendData] = useState<any>(null);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);
  const [trendError, setTrendError] = useState<string | null>(null);

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

  // Live Single Comment Ingestion
  const [testComment, setTestComment] = useState('');
  const [testPlatform, setTestPlatform] = useState('Instagram');
  const [analyzingComment, setAnalyzingComment] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  // Debounce search input to avoid flood of duplicate API requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAudienceData(debouncedSearch);
  }, [sentimentFilter, debouncedSearch]);

  useEffect(() => {
    fetchTrendData(trendPeriod);
  }, [trendPeriod]);

  const fetchTrendData = async (period: string) => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const data = await apiRequest(`/audience/sentiment-trend?period=${period}`);
      setTrendData(data);
    } catch (err: any) {
      console.error("Failed to load sentiment trend:", err);
      setTrendError(err.message || 'Failed to load sentiment trend data.');
    } finally {
      setTrendLoading(false);
    }
  };

  const fetchAudienceData = async (searchQuery = debouncedSearch) => {
    try {
      const q = new URLSearchParams();
      if (sentimentFilter) q.append('sentiment', sentimentFilter);
      if (searchQuery) q.append('search', searchQuery);

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
      await fetchTrendData(trendPeriod);
    } catch (err: any) {
      alert(err.message || 'CSV Import failed. Check column headers.');
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleAnalyzeDirectComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testComment.trim()) return;
    setAnalyzingComment(true);
    try {
      const data = await apiRequest('/audience/analyze-comment', {
        method: 'POST',
        body: JSON.stringify({
          comment_text: testComment.trim(),
          platform: testPlatform,
          author_name: 'Live Evaluator'
        })
      });
      setLatestAnalysis(data.analysis);
      setTestComment('');
      await fetchAudienceData();
      await fetchTrendData(trendPeriod);
    } catch (err: any) {
      alert(err.message || 'Analysis failed');
    } finally {
      setAnalyzingComment(false);
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
    Positive: '#244B3F',
    Neutral: '#829887',
    Negative: '#C77E63',
    Mixed: '#C6A66B',
    Uncertain: '#93988F',
  };

  const pieData = summary?.sentiment_counts ? [
    { name: 'Positive', value: summary.sentiment_counts.Positive || 0 },
    { name: 'Neutral', value: summary.sentiment_counts.Neutral || 0 },
    { name: 'Negative', value: summary.sentiment_counts.Negative || 0 },
    { name: 'Mixed', value: summary.sentiment_counts.Mixed || 0 },
    { name: 'Uncertain', value: summary.sentiment_counts.Uncertain || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 select-none animate-fade-up font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] mb-2 font-sans">
            <MessageSquareHeart className="w-3.5 h-3.5" />
            <span>Pillar 2 • Post-Publication Audience Pulse</span>
          </div>
          <h1 className="text-[30px] sm:text-[36px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">
            Understand What Your Audience Thinks About Your Brand
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#68736B] mt-1.5 leading-relaxed font-sans max-w-2xl">
            Analyze sentiment distribution, customer emotion, recurring complaints, and topic trends from public reactions.
          </p>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center space-x-2 px-4.5 py-2.5 bg-[#244B3F] hover:bg-[#1A362D] text-[#FCFAF5] rounded-xl text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(36,75,63,0.18)] transition-all cursor-pointer active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Customer Feedback CSV</span>
        </button>
      </div>

      {/* Live Comment AI Ingestion & Analysis Bar */}
      <Card className="p-5 bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#244B3F]" />
            <h3 className="text-[15px] font-semibold text-[#242B27] font-sans">
              Live Comment Testing &amp; AI Telemetry Ingestion
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#244B3F] bg-[#EBF0ED] px-2 py-0.5 rounded-md border border-[#C8D7CF]">
            Gemini 2.0 Flash Powered
          </span>
        </div>
        <form onSubmit={handleAnalyzeDirectComment} className="flex flex-col sm:flex-row gap-2.5">
          <div className="w-full sm:w-36 flex-shrink-0">
            <select
              value={testPlatform}
              onChange={(e) => setTestPlatform(e.target.value)}
              className="w-full h-10 px-3 bg-[#F7F4EC] border border-[#E4DFD5] rounded-xl text-[13px] text-[#242B27] focus:outline-none focus:border-[#244B3F]"
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="YouTube">YouTube</option>
            </select>
          </div>
          <input
            type="text"
            value={testComment}
            onChange={(e) => setTestComment(e.target.value)}
            placeholder="Type any customer feedback (e.g., 'Loved the new interface, but the latency is unbearable!')"
            className="flex-1 h-10 px-3 bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl text-[13px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F]"
          />
          <button
            type="submit"
            disabled={analyzingComment || !testComment.trim()}
            className="h-10 px-4 bg-[#244B3F] hover:bg-[#1A362D] disabled:opacity-40 text-[#FCFAF5] text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex-shrink-0 active:scale-[0.98]"
          >
            {analyzingComment ? 'Analyzing…' : 'Analyze with AI'}
          </button>
        </form>
        {latestAnalysis && (
          <div className="p-3 bg-[#EBF0ED] border border-[#C8D7CF] rounded-xl text-[12px] text-[#244B3F] flex flex-wrap items-center gap-3">
            <span><strong>Sentiment:</strong> <span className="font-semibold text-[#244B3F]">{latestAnalysis.sentiment}</span> ({Math.round(latestAnalysis.sentiment_confidence * 100)}%)</span>
            <span><strong>Topic:</strong> {latestAnalysis.topic}</span>
            <span><strong>Emotion:</strong> {latestAnalysis.emotion}</span>
            <span><strong>Intent:</strong> {latestAnalysis.intent}</span>
            <span><strong>Urgency:</strong> {latestAnalysis.urgency_level}</span>
            {latestAnalysis.is_spam && <span className="text-[#C77E63] font-semibold">[Spam Flagged]</span>}
          </div>
        )}
      </Card>

      {/* Empty State per Part 15.8 */}
      {!summary?.has_data ? (
        <Card className="p-12 text-center max-w-lg mx-auto bg-[#FCFAF5] border-[#E4DFD5] space-y-4 my-10 shadow-[0_4px_20px_rgba(36,43,39,0.06)]">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center mx-auto border border-[#C8D7CF]">
            <MessageSquareHeart className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-[20px] font-normal font-heading text-[#242B27]">No Audience Feedback Yet</h2>
          <p className="text-[13.5px] text-[#68736B] leading-relaxed font-sans">
            Upload customer feedback or connect an authorised platform to understand how people respond to your brand.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-5 py-2.5 bg-[#244B3F] hover:bg-[#1A362D] text-[#FCFAF5] text-[13.5px] font-semibold rounded-xl shadow-[0_2px_8px_rgba(36,75,63,0.18)] transition-all cursor-pointer active:scale-[0.98]"
            >
              Upload Sample / Real Feedback CSV
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Premier PeakChart Card: Authenticated Customer Feedback Sentiment Trajectory & Peak Analysis */}
          <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_4px_24px_rgba(36,43,39,0.06)] mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFEBE3]">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                  <h3 className="text-[17px] font-normal font-heading text-[#242B27]">
                    AI Customer Feedback Sentiment Trajectory & Peak Analysis
                  </h3>
                  <Badge status="Verified" size="sm" />
                </div>
                <p className="text-[12.5px] text-[#68736B] mt-1">
                  Neural sentiment analysis with interactive peak detection across real customer feedback streams.
                </p>
              </div>

              {/* Period Selector Tabs */}
              <div className="flex items-center space-x-1.5 p-1 bg-[#F7F4EC] border border-[#E4DFD5] rounded-xl">
                {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTrendPeriod(p);
                      fetchTrendData(p);
                    }}
                    className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer ${
                      trendPeriod === p
                        ? 'bg-[#244B3F] text-[#FCFAF5] shadow-2xs'
                        : 'text-[#68736B] hover:text-[#242B27]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fetchTrendData(trendPeriod)}
                  disabled={trendLoading}
                  className="p-1.5 text-[#68736B] hover:text-[#242B27] rounded-lg hover:bg-[#EFEBE3] transition-colors ml-1"
                  title="Refresh Analytics"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${trendLoading ? 'animate-spin text-[#244B3F]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Body: Loading / Error / Empty / Real Data with PeakChart */}
            {trendLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#244B3F] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[13px] text-[#68736B]">Computing neural sentiment trajectory from database...</p>
              </div>
            ) : trendError ? (
              <div className="p-4 my-4 rounded-xl bg-[#FAF0EC] border border-[#ECCBC0] text-[#B85E42] text-[13px] flex items-center justify-between">
                <span>{trendError}</span>
                <button
                  type="button"
                  onClick={() => fetchTrendData(trendPeriod)}
                  className="px-3 py-1 bg-[#B85E42] text-[#FCFAF5] rounded-lg text-xs font-semibold hover:bg-[#9E4C33]"
                >
                  Retry
                </button>
              </div>
            ) : !trendData?.has_data || trendData.data.length === 0 ? (
              <div className="py-12 text-center max-w-md mx-auto space-y-3">
                <MessageSquare className="w-10 h-10 text-[#93988F] mx-auto stroke-[1.5]" />
                <h4 className="text-[16px] font-medium text-[#242B27]">No Feedback Recorded for {trendPeriod}</h4>
                <p className="text-[12.5px] text-[#68736B] leading-relaxed">
                  Upload feedback CSV or ingest comments via the live evaluator to view real AI sentiment curves.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
                {/* Left: The interactive PeakChart */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center">
                  <div className="scale-90 sm:scale-100 origin-center transition-transform">
                    <PeakChart
                      width={310}
                      data={trendData.data}
                      labels={trendData.labels}
                      value={trendData.value}
                      valueSuffix={trendData.valueSuffix || "%"}
                      decimals={trendData.decimals || 1}
                      title={`Peak Positive Sentiment (${trendPeriod})`}
                      caption="Highest satisfaction peak detected this period"
                      updatedText="Real Database Analytics"
                      trend={trendData.trend || "up"}
                      periods={["Weekly", "Monthly", "Yearly"]}
                      period={trendPeriod}
                      onPeriodChange={(newP) => {
                        setTrendPeriod(newP);
                        fetchTrendData(newP);
                      }}
                      accent="#2ec99a"
                      font="Plus Jakarta Sans, sans-serif"
                    />
                  </div>
                </div>

                {/* Right: Real KPI Breakdown & AI Insight Synthesis */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Real KPI Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 bg-[#EBF0ED] border border-[#C8D7CF] rounded-2xl text-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#244B3F]">Positive</span>
                      <div className="text-2xl font-normal font-heading text-[#244B3F] mt-1 tabular-nums">
                        {trendData.positive_pct}%
                      </div>
                      <span className="text-[10.5px] text-[#344D3D]">Customer Praise</span>
                    </div>

                    <div className="p-3.5 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl text-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68736B]">Neutral</span>
                      <div className="text-2xl font-normal font-heading text-[#242B27] mt-1 tabular-nums">
                        {trendData.neutral_pct}%
                      </div>
                      <span className="text-[10.5px] text-[#68736B]">Inquiries & Misc</span>
                    </div>

                    <div className="p-3.5 bg-[#FAF0EC] border border-[#ECCBC0] rounded-2xl text-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B85E42]">Negative</span>
                      <div className="text-2xl font-normal font-heading text-[#B85E42] mt-1 tabular-nums">
                        {trendData.negative_pct}%
                      </div>
                      <span className="text-[10.5px] text-[#B85E42]">Complaints & Risk</span>
                    </div>
                  </div>

                  {/* Real Dynamic AI Insight Box */}
                  <div className="p-4 bg-[#F7F4EC] border border-[#E4DFD5] rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                      <span className="text-[12.5px] font-semibold text-[#244B3F]">
                        AI Strategic Recommendation
                      </span>
                      <span className="text-[11px] text-[#68736B] ml-auto">
                        Total {trendData.total_count} Verified Reviews
                      </span>
                    </div>
                    <p className="text-[13px] text-[#242B27] italic leading-relaxed">
                      "{trendData.insight}"
                    </p>
                  </div>

                  <div className="text-[11.5px] text-[#68736B] flex items-center justify-between px-1">
                    <span>Active Period: <strong className="text-[#242B27]">{trendPeriod}</strong></span>
                    <span>Peak Satisfaction: <strong className="text-[#244B3F]">{trendData.value}%</strong></span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 15.3 Sentiment Donut Chart */}
            <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#68736B] tracking-wider font-sans mb-2">
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
                      contentStyle={{ backgroundColor: '#FCFAF5', borderColor: '#E4DFD5', borderRadius: 8, fontSize: 12, color: '#242B27' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] pt-3 border-t border-[#EFEBE3]">
                {Object.entries(summary.sentiment_percentages || {}).map(([sentiment, pct]: any) => (
                  <div key={sentiment} className="flex items-center justify-between text-[#68736B]">
                    <span className="flex items-center">
                      <span
                        className="w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: sentimentColors[sentiment] || '#888' }}
                      />
                      {sentiment}:
                    </span>
                    <span className="text-[#242B27] font-bold tabular-nums font-heading">{pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 15.4 Audience Reaction Trend */}
            <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#68736B] tracking-wider font-sans mb-2 flex items-center justify-between">
                <span>Audience Sentiment Over Time</span>
                <TrendingUp className="w-4 h-4 text-[#244B3F]" />
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.daily_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE3" />
                    <XAxis dataKey="date" stroke="#93988F" fontSize={11} />
                    <YAxis stroke="#93988F" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#FCFAF5', borderColor: '#E4DFD5', borderRadius: 8, fontSize: 12, color: '#242B27' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Positive" stroke="#244B3F" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Negative" stroke="#B85E42" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Neutral" stroke="#829887" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11.5px] text-[#93988F] text-center pt-3 border-t border-[#EFEBE3]">
                Timeline based on authenticated comment date metadata.
              </div>
            </Card>

            {/* 15.5 Recurring Topics Horizontal Bar Chart */}
            <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5] shadow-xs flex flex-col justify-between">
              <div className="text-[12px] font-semibold uppercase text-[#68736B] tracking-wider font-sans mb-2 flex items-center justify-between">
                <span>What People Are Talking About</span>
                <BarChart2 className="w-4 h-4 text-[#244B3F]" />
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.topics?.slice(0, 6) || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE3" />
                    <XAxis type="number" stroke="#93988F" fontSize={11} />
                    <YAxis dataKey="topic" type="category" stroke="#68736B" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#FCFAF5', borderColor: '#E4DFD5', borderRadius: 8, fontSize: 12, color: '#242B27' }} />
                    <Bar dataKey="count" fill="#244B3F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11.5px] text-[#93988F] text-center pt-3 border-t border-[#EFEBE3]">
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
