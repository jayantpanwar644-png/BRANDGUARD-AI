import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquareHeart, Upload, TrendingUp, BarChart2, 
  MessageSquare, AlertTriangle, CheckCircle2,
  Search, Sparkles, RefreshCw, Layers, ExternalLink,
  ThumbsUp, MessageCircle, Share2, ShieldCheck, ShieldAlert,
  ArrowRight, Filter, ChevronRight, X, Clock, HelpCircle,
  Copy, Check, Heart, Eye, AlertCircle, Link2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { apiRequest } from '../api/client';
import { formatAssetUrl } from '../lib/utils';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { PeakChart } from '../components/ui/peak-chart';
import {
  InstagramIcon, FacebookIcon, LinkedinIcon, TwitterIcon, YouTubeIcon
} from '../components/common/SocialIcons';

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================

interface SocialAccountItem {
  platform: string;
  platform_id: string;
  account_name: string | null;
  account_id: string | null;
  profile_picture_url: string | null;
  status: 'Connected' | 'Syncing' | 'Connection Expired' | 'Not Connected' | 'Sync Failed' | string;
  is_connected: boolean;
  last_synced_at: string | null;
  posts_count: number;
  comments_count: number;
  connection_error?: string | null;
}

interface SocialPostItem {
  id: number;
  content_id: number;
  platform: string;
  external_post_id: string;
  post_url: string;
  caption: string;
  title: string;
  thumbnail_url: string;
  media_type: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number | string;
  engagement_info: string;
  comments: Array<{
    id: number;
    author: string;
    text: string;
    sentiment: string;
    date: string | null;
    topic: string;
  }>;
  analysis?: PostAnalysisResult | null;
}

interface PostAnalysisResult {
  post_id: number;
  platform: string;
  overall_sentiment_score: number;
  sentiment_label: string;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  total_comments_analyzed: number;
  customer_complaints: Array<{
    author: string;
    text: string;
    topic: string;
    date: string | null;
  }>;
  frequently_mentioned_topics: Array<{
    topic: string;
    count: number;
    percentage: number;
  }>;
  brand_reputation_risks: Array<{
    risk: string;
    severity: 'High' | 'Medium' | 'Low';
    description: string;
  }>;
  customer_satisfaction_indicators: {
    csat_score: number;
    praise_highlights: string[];
    satisfaction_health: string;
  };
  suggested_actions: Array<{
    action: string;
    priority: 'High' | 'Medium' | 'Low';
    category: string;
  }>;
  analyzed_at: string;
}

interface LiveCommentItem {
  id: number;
  comment_text: string;
  author_name: string;
  platform: string;
  post_reference: string;
  post_id?: number | null;
  comment_date: string | null;
  sentiment: string;
  sentiment_confidence: number;
  topic: string;
  detected_type: 'Complaint' | 'Praise' | 'Inquiry' | 'General Feedback';
  urgency_level: 'High' | 'Medium' | 'Low';
  ai_recommended_response: string;
}

interface LiveAnalyticsResult {
  total_posts_analyzed: number;
  total_comments_retrieved: number;
  positive_sentiment_pct: number;
  negative_sentiment_pct: number;
  neutral_sentiment_pct: number;
  average_engagement: number;
  active_reputation_alerts: number;
  sentiment_distribution: Array<{ name: string; value: number; color: string }>;
  engagement_trends: Array<{
    date: string;
    likes: number;
    comments: number;
    engagement: number;
    platform: string;
  }>;
}

export const AudienceIntelligence: React.FC = () => {
  const navigate = useNavigate();

  // 1. Connected Social Accounts
  const [accounts, setAccounts] = useState<SocialAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);

  // 2. Live Posts Stream
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [platformFilter, setPlatformFilter] = useState<string>('All');

  // 3. Post Analysis Drawer / Modal
  const [selectedPostForAnalysis, setSelectedPostForAnalysis] = useState<SocialPostItem | null>(null);
  const [postAnalysis, setPostAnalysis] = useState<PostAnalysisResult | null>(null);
  const [isAnalyzingPost, setIsAnalyzingPost] = useState<boolean>(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  // 4. Live Comments
  const [comments, setComments] = useState<LiveCommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [commentFilter, setCommentFilter] = useState<string>('all');
  const [commentPlatformFilter, setCommentPlatformFilter] = useState<string>('All');
  const [commentSearch, setCommentSearch] = useState<string>('');
  const [selectedPostForComments, setSelectedPostForComments] = useState<SocialPostItem | null>(null);
  const [copiedCommentId, setCopiedCommentId] = useState<number | null>(null);

  // 5. Analytics Dashboard
  const [analytics, setAnalytics] = useState<LiveAnalyticsResult | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  // PeakChart State
  const [trendPeriod, setTrendPeriod] = useState<string>('Monthly');
  const [trendData, setTrendData] = useState<any>(null);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // CSV Import Modal & Single Tester
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPlatform, setImportPlatform] = useState<string>('Instagram');
  const [uploadingCsv, setUploadingCsv] = useState<boolean>(false);

  // Single Comment Ingestion Tester
  const [testComment, setTestComment] = useState<string>('');
  const [testPlatform, setTestPlatform] = useState<string>('Instagram');
  const [analyzingComment, setAnalyzingComment] = useState<boolean>(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Load Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await apiRequest<SocialAccountItem[]>('/audience/social-accounts');
      if (Array.isArray(data)) setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  // Load Posts
  const fetchPosts = useCallback(async (selectedPlatform = platformFilter) => {
    setLoadingPosts(true);
    try {
      const q = selectedPlatform !== 'All' ? `?platform=${encodeURIComponent(selectedPlatform)}` : '';
      const data = await apiRequest<SocialPostItem[]>(`/audience/posts${q}`);
      if (Array.isArray(data)) setPosts(data);
    } catch (err) {
      console.error('Failed to load social posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [platformFilter]);

  // Load Live Comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const params = new URLSearchParams();
      if (commentFilter && commentFilter !== 'all') params.append('filter', commentFilter);
      if (commentPlatformFilter && commentPlatformFilter !== 'All') params.append('platform', commentPlatformFilter);
      if (commentSearch.trim()) params.append('search', commentSearch.trim());
      if (selectedPostForComments?.id) params.append('post_id', String(selectedPostForComments.id));

      const data = await apiRequest<LiveCommentItem[]>(`/audience/live-comments?${params.toString()}`);
      if (Array.isArray(data)) setComments(data);
    } catch (err) {
      console.error('Failed to load live comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [commentFilter, commentPlatformFilter, commentSearch, selectedPostForComments]);

  // Load Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await apiRequest<LiveAnalyticsResult>('/audience/live-analytics');
      if (data) setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Load PeakChart Trend
  const fetchTrendData = useCallback(async (period: string) => {
    setTrendLoading(true);
    try {
      const data = await apiRequest(`/audience/sentiment-trend?period=${period}`);
      setTrendData(data);
    } catch (err) {
      console.error('Failed to load trend data:', err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchAccounts();
    fetchPosts();
    fetchComments();
    fetchAnalytics();
    fetchTrendData(trendPeriod);
  }, [fetchAccounts, fetchPosts, fetchComments, fetchAnalytics, fetchTrendData, trendPeriod]);

  // Trigger Sync
  const handleSyncPlatform = async (platform: string) => {
    setSyncingPlatform(platform);
    try {
      const res = await apiRequest<any>('/audience/sync-platform', {
        method: 'POST',
        body: JSON.stringify({ platform })
      });

      if (res?.status === 'success') {
        setToastMessage({
          text: `✅ ${res.message || `Synchronized ${platform} live stream.`}`,
          type: 'success'
        });
      } else if (res?.status === 'warning') {
        setToastMessage({ text: `ℹ️ ${res.message}`, type: 'error' });
      } else {
        setToastMessage({ text: res?.message || 'Sync failed.', type: 'error' });
      }

      await Promise.all([
        fetchAccounts(),
        fetchPosts(),
        fetchComments(),
        fetchAnalytics(),
        fetchTrendData(trendPeriod)
      ]);
    } catch (err: any) {
      setToastMessage({ text: err.message || `Failed to synchronize ${platform}.`, type: 'error' });
    } finally {
      setSyncingPlatform(null);
    }
  };

  // Run AI Analysis on Selected Post
  const handleAnalyzePost = async (post: SocialPostItem) => {
    setSelectedPostForAnalysis(post);
    setIsAnalysisModalOpen(true);
    setIsAnalyzingPost(true);
    setPostAnalysis(post.analysis || null);

    try {
      const result = await apiRequest<PostAnalysisResult>(`/audience/analyze-post/${post.id}`, {
        method: 'POST'
      });
      setPostAnalysis(result);
      // Update local post item with fresh analysis
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, analysis: result } : p));
      fetchAnalytics();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Post analysis failed.', type: 'error' });
    } finally {
      setIsAnalyzingPost(false);
    }
  };

  // Handle CSV Import
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
      setToastMessage({ text: 'Customer feedback CSV imported successfully.', type: 'success' });
      await Promise.all([fetchPosts(), fetchComments(), fetchAnalytics(), fetchTrendData(trendPeriod)]);
    } catch (err: any) {
      setToastMessage({ text: err.message || 'CSV Import failed.', type: 'error' });
    } finally {
      setUploadingCsv(false);
    }
  };

  // Single Comment Ingestion Tester
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
      setToastMessage({ text: 'Comment ingested and analyzed in unified stream.', type: 'success' });
      await Promise.all([fetchComments(), fetchAnalytics(), fetchTrendData(trendPeriod)]);
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Analysis failed.', type: 'error' });
    } finally {
      setAnalyzingComment(false);
    }
  };

  // Copy AI response to clipboard
  const handleCopyResponse = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommentId(id);
    setTimeout(() => setCopiedCommentId(null), 2000);
  };

  // Platform icon helper
  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <InstagramIcon className="w-4 h-4 text-[#E1306C]" />;
    if (p.includes('linkedin')) return <LinkedinIcon className="w-4 h-4 text-[#0A66C2]" />;
    if (p.includes('facebook')) return <FacebookIcon className="w-4 h-4 text-[#1877F2]" />;
    if (p.includes('twitter') || p.includes('x')) return <TwitterIcon className="w-4 h-4 text-[#1D9BF0]" />;
    return <MessageSquare className="w-4 h-4 text-[#244B3F]" />;
  };

  // Sentiment badge color
  const getSentimentBadge = (sentiment: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s === 'positive') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Positive
        </span>
      );
    }
    if (s === 'negative') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Negative
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4F1EA] text-[#68736B] border border-[#E4DFD5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#829887]" />
        Neutral
      </span>
    );
  };

  // Account status badge
  const getAccountStatusBadge = (status: string, isConnected: boolean) => {
    if (status === 'Syncing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
          Syncing
        </span>
      );
    }
    if (isConnected && status === 'Connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Connected
        </span>
      );
    }
    if (isConnected && (status === 'Token Expired' || status === 'Connection Expired')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Connection Expired
        </span>
      );
    }
    if (isConnected && status === 'Sync Failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Sync Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F4F1EA] text-[#68736B] border border-[#E4DFD5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#829887]" />
        Not Connected
      </span>
    );
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    if (platformFilter === 'All') return posts;
    return posts.filter(p => p.platform.toLowerCase().includes(platformFilter.toLowerCase()));
  }, [posts, platformFilter]);

  // Main Instagram & LinkedIn account items
  const instagramAccount = accounts.find(a => a.platform_id === 'instagram') || {
    platform: 'Instagram',
    platform_id: 'instagram',
    account_name: null,
    account_id: null,
    profile_picture_url: null,
    status: 'Not Connected',
    is_connected: false,
    last_synced_at: null,
    posts_count: 0,
    comments_count: 0
  };

  const linkedinAccount = accounts.find(a => a.platform_id === 'linkedin') || {
    platform: 'LinkedIn',
    platform_id: 'linkedin',
    account_name: null,
    account_id: null,
    profile_picture_url: null,
    status: 'Not Connected',
    is_connected: false,
    last_synced_at: null,
    posts_count: 0,
    comments_count: 0
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 max-w-md ${
          toastMessage.type === 'error' ? 'bg-[#2E1815] text-[#FFE8E6] border-[#662820]' : 'bg-[#18382F] text-[#F7F4EC] border-[#244B3F]'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-xs font-medium leading-snug">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-auto text-white/70 hover:text-white text-base leading-none cursor-pointer">×</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD5] pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] mb-2 font-sans">
            <MessageSquareHeart className="w-3.5 h-3.5 text-[#244B3F]" />
            <span>Pillar 2 • Social Media Live Analytics &amp; Post Intelligence Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#242B27] tracking-tight">
            Social Media Live Analytics &amp; Post Intelligence Center
          </h1>
          <p className="text-xs sm:text-sm text-[#68736B] mt-1 leading-relaxed">
            Real-time synchronization of published creatives, public engagement metrics, customer sentiment, and AI-powered reputation telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleSyncPlatform('all')}
            disabled={!!syncingPlatform}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingPlatform === 'all' ? 'animate-spin' : ''}`} />
            <span>{syncingPlatform === 'all' ? 'Synchronizing Stream…' : 'Sync All Accounts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            title="Import customer feedback CSV"
          >
            <Upload className="w-3.5 h-3.5 text-[#244B3F]" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CONNECTED SOCIAL ACCOUNTS SECTION                                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#244B3F]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#68736B]">
              Connected Social Accounts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/integrations')}
            className="text-xs font-semibold text-[#244B3F] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Manage Integrations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Instagram Account Card */}
          <Card className="p-5 bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#E1306C]/10 border border-[#E1306C]/25 flex items-center justify-center shrink-0">
                  {instagramAccount.profile_picture_url ? (
                    <img
                      src={instagramAccount.profile_picture_url}
                      alt="Instagram Avatar"
                      className="w-12 h-12 rounded-2xl object-cover"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <InstagramIcon className="w-6 h-6 text-[#E1306C]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-[#242B27]">Instagram</h3>
                    {getAccountStatusBadge(instagramAccount.status, instagramAccount.is_connected)}
                  </div>
                  <p className="text-xs font-mono text-[#244B3F] font-semibold mt-0.5">
                    {instagramAccount.is_connected && instagramAccount.account_name
                      ? instagramAccount.account_name
                      : 'Not Connected'}
                  </p>
                  <p className="text-[11px] text-[#829887] mt-0.5">
                    {instagramAccount.is_connected
                      ? `${instagramAccount.posts_count} Posts • ${instagramAccount.comments_count} Ingested Comments`
                      : 'Connect on Integrations to fetch live feed'}
                  </p>
                </div>
              </div>

              {instagramAccount.is_connected ? (
                <button
                  type="button"
                  onClick={() => handleSyncPlatform('Instagram')}
                  disabled={syncingPlatform === 'Instagram'}
                  className="px-3.5 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all disabled:opacity-60 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingPlatform === 'Instagram' ? 'animate-spin' : ''}`} />
                  <span>{syncingPlatform === 'Instagram' ? 'Syncing…' : 'Sync Now'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/app/integrations')}
                  className="px-3 py-1.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                >
                  <span>Connect</span>
                  <ExternalLink className="w-3 h-3 text-[#68736B]" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-[#E4DFD5]/70 flex items-center justify-between text-[11px] text-[#68736B]">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#829887]" />
                <span>Last Synced:</span>
              </span>
              <span className="font-semibold text-[#242B27]">
                {instagramAccount.is_connected && instagramAccount.last_synced_at
                  ? new Date(instagramAccount.last_synced_at).toLocaleString()
                  : 'Never Synced'}
              </span>
            </div>
          </Card>

          {/* LinkedIn Account Card */}
          <Card className="p-5 bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0A66C2]/10 border border-[#0A66C2]/25 flex items-center justify-center shrink-0">
                  {linkedinAccount.profile_picture_url ? (
                    <img
                      src={linkedinAccount.profile_picture_url}
                      alt="LinkedIn Avatar"
                      className="w-12 h-12 rounded-2xl object-cover"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <LinkedinIcon className="w-6 h-6 text-[#0A66C2]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-[#242B27]">LinkedIn</h3>
                    {getAccountStatusBadge(linkedinAccount.status, linkedinAccount.is_connected)}
                  </div>
                  <p className="text-xs font-mono text-[#0A66C2] font-semibold mt-0.5">
                    {linkedinAccount.is_connected && linkedinAccount.account_name
                      ? linkedinAccount.account_name
                      : 'Not Connected'}
                  </p>
                  <p className="text-[11px] text-[#829887] mt-0.5">
                    {linkedinAccount.is_connected
                      ? `${linkedinAccount.posts_count} Posts • ${linkedinAccount.comments_count} Ingested Comments`
                      : 'Connect on Integrations to fetch company posts'}
                  </p>
                </div>
              </div>

              {linkedinAccount.is_connected ? (
                <button
                  type="button"
                  onClick={() => handleSyncPlatform('LinkedIn')}
                  disabled={syncingPlatform === 'LinkedIn'}
                  className="px-3.5 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all disabled:opacity-60 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingPlatform === 'LinkedIn' ? 'animate-spin' : ''}`} />
                  <span>{syncingPlatform === 'LinkedIn' ? 'Syncing…' : 'Sync Now'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/app/integrations')}
                  className="px-3 py-1.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                >
                  <span>Connect</span>
                  <ExternalLink className="w-3 h-3 text-[#68736B]" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-[#E4DFD5]/70 flex items-center justify-between text-[11px] text-[#68736B]">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#829887]" />
                <span>Last Synced:</span>
              </span>
              <span className="font-semibold text-[#242B27]">
                {linkedinAccount.is_connected && linkedinAccount.last_synced_at
                  ? new Date(linkedinAccount.last_synced_at).toLocaleString()
                  : 'Never Synced'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PREMIUM ANALYTICS DASHBOARD SUMMARY                                    */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-[#244B3F]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#68736B]">
            Audience Pulse &amp; Engagement Analytics
          </h2>
        </div>

        {/* 6 Key Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Total Posts Analyzed</span>
            <div className="text-2xl font-bold font-serif text-[#242B27] mt-1">
              {analytics?.total_posts_analyzed ?? 0}
            </div>
            <span className="text-[10px] text-[#829887]">Live feed archives</span>
          </Card>

          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Comments Retrieved</span>
            <div className="text-2xl font-bold font-serif text-[#242B27] mt-1">
              {analytics?.total_comments_retrieved ?? 0}
            </div>
            <span className="text-[10px] text-[#829887]">Verified API streams</span>
          </Card>

          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Positive Sentiment</span>
            <div className="text-2xl font-bold font-serif text-emerald-800 mt-1">
              {analytics?.positive_sentiment_pct ?? 0}%
            </div>
            <span className="text-[10px] text-emerald-700/80">Brand affinity</span>
          </Card>

          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Negative Sentiment</span>
            <div className="text-2xl font-bold font-serif text-[#C77E63] mt-1">
              {analytics?.negative_sentiment_pct ?? 0}%
            </div>
            <span className="text-[10px] text-[#C77E63]/80">Friction &amp; complaints</span>
          </Card>

          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Avg Engagement</span>
            <div className="text-2xl font-bold font-serif text-[#244B3F] mt-1">
              {analytics?.average_engagement ?? 0}
            </div>
            <span className="text-[10px] text-[#829887]">Likes + comments/post</span>
          </Card>

          <Card className="p-4 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#68736B] block">Reputation Alerts</span>
            <div className={`text-2xl font-bold font-serif mt-1 ${
              (analytics?.active_reputation_alerts ?? 0) > 0 ? 'text-amber-700' : 'text-[#244B3F]'
            }`}>
              {analytics?.active_reputation_alerts ?? 0}
            </div>
            <span className="text-[10px] text-[#829887]">Active brand risks</span>
          </Card>
        </div>

        {/* Charts: Sentiment Distribution & Peak Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Distribution Donut Chart */}
          <Card className="p-5 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#68736B]">Sentiment Distribution</h3>
              <p className="text-[11.5px] text-[#829887] mt-0.5">Calculated from actual ingested audience reactions</p>
            </div>

            <div className="h-52 w-full my-2">
              {analytics && (analytics.total_comments_retrieved ?? 0) > 0 && (analytics.sentiment_distribution?.some(d => d.value > 0)) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sentiment_distribution.filter(d => d.value > 0)}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.sentiment_distribution.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} comments`, name]}
                      contentStyle={{
                        backgroundColor: '#FCFAF5',
                        border: '1px solid #E4DFD5',
                        borderRadius: '0.75rem',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#829887]">
                  No audience comments synchronized yet. Connect an account to stream live data.
                </div>
              )}
            </div>

            <div className="flex items-center justify-around pt-2 border-t border-[#E4DFD5] text-xs">
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#244B3F]" />
                Positive: {analytics?.positive_sentiment_pct ?? 0}%
              </span>
              <span className="flex items-center gap-1.5 text-[#68736B] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#829887]" />
                Neutral: {analytics?.neutral_sentiment_pct ?? 0}%
              </span>
              <span className="flex items-center gap-1.5 text-[#C77E63] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C77E63]" />
                Negative: {analytics?.negative_sentiment_pct ?? 0}%
              </span>
            </div>
          </Card>

          {/* Engagement Trends & Sentiment Trajectory (PeakChart) */}
          <Card className="lg:col-span-2 p-5 bg-[#FCFAF5] border-[#E4DFD5] shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4DFD5]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#68736B]">
                  Audience Feedback Trajectory &amp; Peak Volume
                </h3>
                <p className="text-[11.5px] text-[#829887] mt-0.5">
                  Chronological sentiment telemetry with automated anomaly detection
                </p>
              </div>

              <div className="flex items-center space-x-1 bg-white border border-[#E4DFD5] p-0.5 rounded-lg text-xs">
                {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTrendPeriod(p)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      trendPeriod === p ? 'bg-[#244B3F] text-white shadow-2xs' : 'text-[#68736B] hover:text-[#242B27]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3">
              {trendLoading ? (
                <div className="h-52 flex items-center justify-center text-xs text-[#829887]">
                  Loading sentiment telemetry...
                </div>
              ) : trendData && trendData.has_data && trendData.data && trendData.data.length > 0 ? (
                <PeakChart
                  data={trendData.data || []}
                  labels={trendData.labels || []}
                  value={trendData.value ?? 85}
                  valueSuffix="%"
                  decimals={1}
                  period={trendPeriod}
                  title="Audience Stability Index"
                  caption={trendData.insight || 'Audience sentiment stability index'}
                  updatedText={`Trend: ${trendData.trend === 'up' ? '↗ Upward' : '↘ Softening'}`}
                  trend={trendData.trend || 'up'}
                  accent="#244B3F"
                />
              ) : (
                <div className="h-52 flex items-center justify-center text-xs text-[#829887]">
                  No historical trend telemetry recorded yet. Connect an authorized social account to stream audience feedback.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LIVE DATA FETCHING SECTION ("Live Social Media Data Stream")           */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DFD5] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#244B3F]" />
              <h2 className="text-base font-bold text-[#242B27] font-serif">
                Live Social Media Data Stream
              </h2>
            </div>
            <p className="text-xs text-[#68736B] mt-0.5">
              Fetched posts from authorized connected accounts via official platform APIs.
            </p>
          </div>

          {/* Action buttons & platform filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleSyncPlatform('Instagram')}
              disabled={syncingPlatform === 'Instagram'}
              className="px-3 py-1.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-[#E1306C]" />
              <span>Fetch Instagram Posts</span>
            </button>

            <button
              type="button"
              onClick={() => handleSyncPlatform('LinkedIn')}
              disabled={syncingPlatform === 'LinkedIn'}
              className="px-3 py-1.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <LinkedinIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
              <span>Fetch LinkedIn Posts</span>
            </button>

            {/* Platform Filter Pills */}
            <div className="flex items-center bg-[#F7F4EC] p-0.5 rounded-xl border border-[#E4DFD5] text-xs">
              {['All', 'Instagram', 'LinkedIn', 'Facebook'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    platformFilter === p
                      ? 'bg-[#244B3F] text-white shadow-2xs'
                      : 'text-[#68736B] hover:text-[#242B27]'
                  }`}
                >
                  {p === 'All' ? 'All Platforms' : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {loadingPosts ? (
          <div className="py-12 text-center text-xs text-[#68736B] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#244B3F] mx-auto" />
            <span>Retrieving live social posts from database archives…</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-10 text-center bg-[#FCFAF5] border-[#E4DFD5] space-y-3 max-w-lg mx-auto my-6">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center mx-auto border border-[#C8D7CF]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#242B27]">No Posts Available for {platformFilter}</h3>
            <p className="text-xs text-[#68736B] leading-relaxed">
              No published posts have been synchronized yet. Click <strong>Sync All Accounts</strong> or connect your accounts on the Integrations page to stream authentic posts.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSyncPlatform('all')}
                className="px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Sync Connected Accounts
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/integrations')}
                className="px-4 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Integrations Page
              </button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => {
              const hasAnalysis = Boolean(post.analysis);
              return (
                <Card
                  key={post.id}
                  className="bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Post Header: Platform & Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getPlatformIcon(post.platform)}
                        <span className="text-xs font-bold text-[#242B27]">{post.platform}</span>
                      </div>
                      <span className="text-[11px] text-[#829887]">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    {/* Image / Thumbnail Preview */}
                    <div className="relative rounded-xl overflow-hidden bg-[#F7F4EC] border border-[#E4DFD5] aspect-video flex items-center justify-center group">
                      {post.thumbnail_url && !post.thumbnail_url.includes('http') ? (
                        <img
                          src={formatAssetUrl(post.thumbnail_url)}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : post.thumbnail_url && post.thumbnail_url.startsWith('http') && !post.thumbnail_url.includes('instagram.com/p/') ? (
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-[#829887] space-y-1">
                          <Layers className="w-8 h-8 text-[#244B3F]/40" />
                          <span className="text-[11px] font-semibold">{post.platform} Creative</span>
                        </div>
                      )}

                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                        {post.media_type || 'Image'}
                      </span>
                    </div>

                    {/* Post Caption */}
                    <p className="text-xs text-[#242B27] line-clamp-3 leading-relaxed">
                      {post.caption || 'No caption provided for this published media item.'}
                    </p>

                    {/* Engagement Indicators */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E4DFD5]/70 text-[#68736B]">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1" title="Likes">
                          <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600/20" />
                          <span className="font-semibold text-[#242B27]">{post.likes_count}</span>
                        </span>
                        <span className="flex items-center space-x-1" title="Comments">
                          <MessageCircle className="w-3.5 h-3.5 text-[#244B3F]" />
                          <span className="font-semibold text-[#242B27]">{post.comments_count}</span>
                        </span>
                        {post.shares_count !== 'Not Available' && (
                          <span className="flex items-center space-x-1" title="Shares">
                            <Share2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                            <span className="font-semibold text-[#242B27]">{post.shares_count}</span>
                          </span>
                        )}
                      </div>

                      {hasAnalysis && (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Score: {post.analysis?.overall_sentiment_score}/100
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Action Bar */}
                  <div className="p-3 bg-[#F7F4EC] border-t border-[#E4DFD5] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleAnalyzePost(post)}
                      className="flex-1 py-1.5 px-3 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                      <span>{hasAnalysis ? 'View AI Analysis' : 'Analyze Post'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPostForComments(selectedPostForComments?.id === post.id ? null : post);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center space-x-1 ${
                        selectedPostForComments?.id === post.id
                          ? 'bg-[#244B3F] text-white border-[#244B3F]'
                          : 'bg-white border-[#E4DFD5] text-[#242B27] hover:bg-[#F7F4EC]'
                      }`}
                      title="Inspect comments for this post"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Comments</span>
                    </button>

                    {post.post_url && post.post_url.startsWith('http') && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#68736B] hover:text-[#242B27] rounded-lg transition-colors cursor-pointer"
                        title="View original on platform"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. LIVE COMMENT INTELLIGENCE SECTION                                      */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DFD5] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-[#244B3F]" />
              <h2 className="text-base font-bold text-[#242B27] font-serif">
                Live Comment Intelligence &amp; AI Response Engine
              </h2>
            </div>
            <p className="text-xs text-[#68736B] mt-0.5">
              Actual audience feedback retrieved via authorized APIs with automated response recommendations.
            </p>
          </div>

          {/* Comment Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#829887]" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search comments..."
                className="pl-8 pr-3 py-1.5 bg-white border border-[#E4DFD5] rounded-xl text-xs text-[#242B27] focus:outline-none focus:border-[#244B3F] w-40 sm:w-48"
              />
            </div>

            {/* Sentiment Filters */}
            <div className="flex items-center bg-[#F7F4EC] p-0.5 rounded-xl border border-[#E4DFD5] text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'positive', label: 'Positive' },
                { id: 'negative', label: 'Negative' },
                { id: 'critical', label: 'Critical Complaints' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCommentFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    commentFilter === f.id
                      ? 'bg-[#244B3F] text-white shadow-2xs'
                      : 'text-[#68736B] hover:text-[#242B27]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {selectedPostForComments && (
              <button
                type="button"
                onClick={() => setSelectedPostForComments(null)}
                className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>Filter: Post #{selectedPostForComments.id}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Comments Stream */}
        {loadingComments ? (
          <div className="py-10 text-center text-xs text-[#68736B]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#244B3F] mx-auto mb-2" />
            <span>Filtering live audience comments…</span>
          </div>
        ) : comments.length === 0 ? (
          <Card className="p-8 text-center bg-[#FCFAF5] border-[#E4DFD5] space-y-2">
            <MessageSquareHeart className="w-8 h-8 text-[#829887] mx-auto" />
            <h4 className="text-sm font-bold text-[#242B27]">
              {commentSearch.trim() || commentFilter !== 'all' || selectedPostForComments
                ? 'No Comments Match Current Filter'
                : 'No Live Comments Synchronized'}
            </h4>
            <p className="text-xs text-[#68736B]">
              {commentSearch.trim() || commentFilter !== 'all' || selectedPostForComments
                ? 'Try clearing search terms or selecting a different sentiment filter.'
                : 'No audience feedback has been ingested or fetched yet. Connect your official social accounts in Integrations to stream verified comments.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const isCopied = copiedCommentId === comment.id;
              const isComplaint = comment.detected_type === 'Complaint';
              return (
                <Card
                  key={comment.id}
                  className={`p-4 bg-[#FCFAF5] border transition-all space-y-3 ${
                    isComplaint ? 'border-amber-300 shadow-xs' : 'border-[#E4DFD5] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E4DFD5] flex items-center justify-center shrink-0 mt-0.5">
                        {getPlatformIcon(comment.platform)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-[#242B27]">{comment.author_name}</span>
                          <span className="text-[11px] text-[#829887]">• on {comment.post_reference}</span>
                          <span className="text-[11px] text-[#829887]">
                            • {comment.comment_date ? new Date(comment.comment_date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-xs text-[#242B27] font-medium leading-relaxed">
                          "{comment.comment_text}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                      {getSentimentBadge(comment.sentiment)}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isComplaint
                          ? 'bg-rose-100 text-rose-800'
                          : comment.detected_type === 'Praise'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {comment.detected_type}
                      </span>
                    </div>
                  </div>

                  {/* AI Response Recommendation Box */}
                  <div className="p-3 bg-[#F7F4EC] rounded-xl border border-[#E4DFD5] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-[#244B3F] font-semibold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                        <span>AI Recommended Response ({comment.topic})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyResponse(comment.id, comment.ai_recommended_response)}
                        className="text-[11px] font-semibold text-[#244B3F] hover:text-[#18382F] flex items-center space-x-1 cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Template</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[#4F5B53] text-[11.5px] italic leading-relaxed">
                      "{comment.ai_recommended_response}"
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. POST ANALYSIS MODAL / DRAWER                                           */}
      {/* ========================================================================= */}
      {isAnalysisModalOpen && selectedPostForAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E4DFD5] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#244B3F]/10 text-[#244B3F] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#244B3F]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#242B27] font-serif">
                    AI Post Intelligence &amp; Reputation Audit
                  </h3>
                  <p className="text-xs text-[#68736B]">
                    {selectedPostForAnalysis.platform} Post • #{selectedPostForAnalysis.external_post_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalysisModalOpen(false)}
                className="text-[#68736B] hover:text-[#242B27] p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loading or Results */}
            {isAnalyzingPost && !postAnalysis ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#244B3F] mx-auto" />
                <h4 className="text-sm font-bold text-[#242B27]">Running AI Post Analysis…</h4>
                <p className="text-xs text-[#68736B] max-w-sm mx-auto">
                  Synthesizing post media, engagement telemetry, recurring customer complaints, and sentiment distribution.
                </p>
              </div>
            ) : postAnalysis ? (
              <div className="space-y-5">
                {/* Sentiment & CSAT Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white border border-[#E4DFD5] rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-[#68736B]">Overall Sentiment Score</span>
                    <div className="text-2xl font-bold font-serif text-[#244B3F]">
                      {postAnalysis.overall_sentiment_score}/100
                    </div>
                    <span className="text-[10.5px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                      {postAnalysis.sentiment_label} Overall
                    </span>
                  </div>

                  <div className="p-4 bg-white border border-[#E4DFD5] rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-[#68736B]">Customer Satisfaction (CSAT)</span>
                    <div className="text-2xl font-bold font-serif text-[#242B27]">
                      {postAnalysis.customer_satisfaction_indicators.csat_score} / 5.0
                    </div>
                    <span className="text-[10.5px] text-[#68736B]">
                      Health: <strong>{postAnalysis.customer_satisfaction_indicators.satisfaction_health}</strong>
                    </span>
                  </div>

                  <div className="p-4 bg-white border border-[#E4DFD5] rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-[#68736B]">Audience Breakdown</span>
                    <div className="text-xs font-semibold text-[#242B27] pt-1">
                      <span className="text-emerald-700">{postAnalysis.positive_percentage}% Positive</span> •{' '}
                      <span className="text-[#C77E63]">{postAnalysis.negative_percentage}% Negative</span>
                    </div>
                    <span className="text-[10px] text-[#829887]">
                      {postAnalysis.neutral_percentage}% Neutral • {postAnalysis.total_comments_analyzed} Comments
                    </span>
                  </div>
                </div>

                {/* Frequently Mentioned Topics */}
                {postAnalysis.frequently_mentioned_topics?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#68736B]">
                      Frequently Mentioned Topics
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {postAnalysis.frequently_mentioned_topics.map((t, i) => (
                        <div
                          key={i}
                          className="px-3 py-1 bg-white border border-[#E4DFD5] rounded-xl text-xs flex items-center space-x-1.5 shadow-2xs"
                        >
                          <span className="font-bold text-[#242B27]">{t.topic}</span>
                          <span className="text-[11px] text-[#68736B] bg-[#F7F4EC] px-1.5 py-0.5 rounded-md">
                            {t.count} ({t.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Reputation Risks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#68736B]">
                    Detected Brand Reputation Risks
                  </h4>
                  <div className="space-y-2">
                    {postAnalysis.brand_reputation_risks?.map((r, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          r.severity === 'High'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : r.severity === 'Medium'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{r.risk}</span>
                          <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-white/70">
                            {r.severity} Severity
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed opacity-90">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Complaints List */}
                {postAnalysis.customer_complaints?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      Customer Complaints &amp; Pain Points ({postAnalysis.customer_complaints.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {postAnalysis.customer_complaints.map((c, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-rose-700 font-semibold">
                            <span>{c.author}</span>
                            <span>{c.topic}</span>
                          </div>
                          <p className="text-[#242B27] font-medium">"{c.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#244B3F]">
                    Strategic Suggested Actions
                  </h4>
                  <div className="space-y-2">
                    {postAnalysis.suggested_actions?.map((a, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white border border-[#E4DFD5] rounded-xl flex items-start space-x-2 text-xs"
                      >
                        <Sparkles className="w-4 h-4 text-[#C6A66B] mt-0.5 shrink-0" />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#242B27]">{a.action}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] font-semibold">
                              {a.category} • {a.priority} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-[#E4DFD5] flex justify-end">
              <button
                type="button"
                onClick={() => setIsAnalysisModalOpen(false)}
                className="px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Intelligence Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Upload Customer Feedback CSV"
        >
          <form onSubmit={handleUploadCsv} className="space-y-4 text-xs">
            <p className="text-[#68736B]">
              Upload customer reviews or comments from CSV. Expected headers: <code>comment</code>, <code>text</code>, or <code>feedback</code>.
            </p>

            <div>
              <label className="block font-semibold text-[#242B27] mb-1">Source Platform</label>
              <select
                value={importPlatform}
                onChange={(e) => setImportPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4DFD5] rounded-xl text-xs"
              >
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Facebook">Facebook</option>
                <option value="Twitter">X (Twitter)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#242B27] mb-1">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-white border border-[#E4DFD5] rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4DFD5]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E4DFD5] text-[#242B27] rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingCsv || !importFile}
                className="px-4 py-2 bg-[#244B3F] text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {uploadingCsv ? 'Importing…' : 'Upload & Analyze'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
