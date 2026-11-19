import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Unlink, AlertTriangle, CheckCircle2, Clock,
  ShieldCheck, Loader2, X, RotateCw, ChevronRight, Layers
} from 'lucide-react';
import {
  InstagramIcon, FacebookIcon, LinkedinIcon, YouTubeIcon
} from '../components/common/SocialIcons';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { ConnectedSocialAccount } from '../types/index';

// ─── Platform Static Config (Verbatim Part 1 Specifications) ─────────────────
const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    heading: 'Connect your Instagram account',
    description: 'Connect your professional Instagram account to monitor comments, analyze customer sentiment and understand audience feedback.',
    cta: 'Continue with Instagram',
    note: 'You will securely sign in on Instagram and approve the permissions requested by BrandGuard AI.',
    Icon: InstagramIcon,
    color: '#E1306C',
    bgColor: 'rgba(225,48,108,0.10)',
    accountType: 'Professional & Creator accounts',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    heading: 'Connect your Facebook Page',
    description: 'Connect your Facebook Page to monitor post comments, understand customer feedback and manage brand reputation.',
    cta: 'Continue with Facebook',
    note: 'You will securely sign in on Facebook and approve the permissions requested by BrandGuard AI.',
    Icon: FacebookIcon,
    color: '#1877F2',
    bgColor: 'rgba(24,119,242,0.10)',
    accountType: 'Facebook Pages & Business accounts',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    heading: 'Connect your LinkedIn Company Page',
    description: 'Connect your authorized LinkedIn Company Page to analyze professional audience engagement, comments and brand perception.',
    cta: 'Continue with LinkedIn',
    note: 'You will securely sign in on LinkedIn and approve the permissions requested by BrandGuard AI.',
    Icon: LinkedinIcon,
    color: '#0A66C2',
    bgColor: 'rgba(10,102,194,0.10)',
    accountType: 'Company Pages via Community API',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    heading: 'Connect your YouTube channel',
    description: 'Connect your YouTube channel to monitor video comments and understand audience sentiment.',
    cta: 'Continue with Google',
    note: 'You will securely sign in on Google/YouTube and approve the permissions requested by BrandGuard AI.',
    Icon: YouTubeIcon,
    color: '#FF0000',
    bgColor: 'rgba(255,0,0,0.10)',
    accountType: 'YouTube Data API v3 (Channel Sync)',
  },
] as const;

type PlatformId = typeof PLATFORMS[number]['id'];

interface PlatformStatus {
  platform: PlatformId;
  name: string;
  account_type?: string;
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'credentials_missing' | 'awaiting_authorization' | 'token_expired' | 'reauthorization_required' | 'approval_required' | 'connection_error' | 'Approval Required';
  account_name: string | null;
  account_id: string | null;
  profile_picture_url?: string | null;
  permissions: string | null;
  last_synced_at: string | null;
  connection_error: string | null;
  redirect_uri?: string;
  missing_keys?: string[];
  setup_guide?: string;
}

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ isConnected: boolean; isConfigured?: boolean; rawStatus?: string }> = ({
  isConnected, rawStatus
}) => {
  if (rawStatus === 'Approval Required' || rawStatus === 'approval_required') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-800 border-purple-200 shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
        <span>Approval Required</span>
      </span>
    );
  }

  if (rawStatus === 'token_expired' || rawStatus === 'Token Expired' || rawStatus === 'reauthorization_required') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-200 shadow-2xs">
        <RotateCw className="w-3.5 h-3.5 text-amber-600" />
        <span>Token Expired</span>
      </span>
    );
  }

  if (isConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Connected</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-[#F4F1EA] text-[#68736B] border-[#E4DFD5] shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-[#829887]" />
      <span>Not Connected</span>
    </span>
  );
};

// ─── Toast Notification ───────────────────────────────────────────────────────
const Toast: React.FC<{ message: string; type?: 'success' | 'error'; onDismiss: () => void }> = ({
  message, type = 'success', onDismiss
}) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 max-w-md ${
    type === 'error' ? 'bg-[#2E1815] text-[#FFE8E6] border-[#662820]' : 'bg-[#18382F] text-[#F7F4EC] border-[#244B3F]'
  }`}>
    {type === 'error' ? (
      <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
    ) : (
      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
    )}
    <span className="text-xs font-medium leading-snug">{message}</span>
    <button onClick={onDismiss} className="ml-auto text-white/70 hover:text-white text-base leading-none cursor-pointer">×</button>
  </div>
);

// ─── Main Integrations Page ──────────────────────────────────────────────────
export const Integrations: React.FC = () => {
  const [statusMap, setStatusMap] = useState<Record<string, PlatformStatus>>({});
  const [, setAccounts] = useState<ConnectedSocialAccount[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // In-page feedback states
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [connectingId, setConnectingId] = useState<PlatformId | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<PlatformId | null>(null);
  const [syncingId, setSyncingId] = useState<PlatformId | null>(null);
  const [disconnectModalPlatform, setDisconnectModalPlatform] = useState<PlatformId | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Facebook Page Selection Modal
  const [fbPagesModal, setFbPagesModal] = useState<boolean>(false);
  const [fbPagesList, setFbPagesList] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [loadingFbPages, setLoadingFbPages] = useState<boolean>(false);
  const [selectingPageId, setSelectingPageId] = useState<string | null>(null);


  // Handle URL redirects after OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    const platform = params.get('platform');

    if (connected) {
      const p = PLATFORMS.find(pl => pl.id === connected.toLowerCase());
      const name = p ? p.name : connected;
      setToast({ message: `✅ ${name} connected successfully! Live data synchronization initiated.`, type: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const decodedError = decodeURIComponent(error);
      setToast({ message: `Connection could not be completed: ${decodedError}`, type: 'error' });
      if (platform) {
        setCardErrors(prev => ({ ...prev, [platform]: decodedError }));
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load backend configuration and connected accounts
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statusRes, accountsRes] = await Promise.all([
        apiRequest<Record<string, PlatformStatus>>('/integrations/status').catch(() => ({})),
        apiRequest<ConnectedSocialAccount[]>('/integrations/accounts').catch(() => [])
      ]);

      if (statusRes && typeof statusRes === 'object') {
        setStatusMap(statusRes as Record<string, PlatformStatus>);
      }
      if (Array.isArray(accountsRes)) {
        setAccounts(accountsRes);
      }
    } catch {
      // Keep existing status
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initiate Real Official OAuth Login
  const handleConnect = async (platformId: PlatformId) => {
    setConnectingId(platformId);
    setCardErrors(prev => ({ ...prev, [platformId]: '' }));

    try {
      const res = await apiRequest<{ auth_url: string }>(`/integrations/oauth/${platformId}/authorize`);
      if (res?.auth_url) {
        // Redirect browser to official OAuth authorization website
        window.location.href = res.auth_url;
      } else {
        const pName = PLATFORMS.find(p => p.id === platformId)?.name || platformId;
        setCardErrors(prev => ({
          ...prev,
          [platformId]: `${pName} connection is temporarily unavailable. Please contact your administrator.`
        }));
      }
    } catch (err: any) {
      const pName = PLATFORMS.find(p => p.id === platformId)?.name || platformId;
      let isCredentialsMissing = false;
      if (err?.detail && typeof err.detail === 'object' && err.detail.error === 'credentials_missing') {
        isCredentialsMissing = true;
      }

      const missingKeys = err?.detail?.missing_keys?.join(', ');
      const friendlyMsg = isCredentialsMissing
        ? `${pName} OAuth credentials not configured in .env. Required: ${missingKeys || 'META_APP_ID, META_APP_SECRET'}.`
        : (err?.detail?.message || err?.message || `${pName} connection is temporarily unavailable.`);

      setCardErrors(prev => ({ ...prev, [platformId]: friendlyMsg }));
    } finally {
      setConnectingId(null);
    }
  };

  // Disconnect social account
  const executeDisconnect = async (platformId: PlatformId) => {
    setDisconnectingId(platformId);
    setDisconnectModalPlatform(null);
    try {
      await apiRequest(`/integrations/oauth/${platformId}/disconnect`, { method: 'POST' });
      setToast({
        message: `${PLATFORMS.find(p => p.id === platformId)?.name || platformId} disconnected successfully.`,
        type: 'success'
      });
      await loadData();
    } catch (err: any) {
      setToast({
        message: `Disconnect failed: ${err?.message || 'Server error'}`,
        type: 'error'
      });
    } finally {
      setDisconnectingId(null);
    }
  };

  // Trigger manual comment synchronization
  const handleSync = async (platformId: PlatformId) => {
    setSyncingId(platformId);
    try {
      const res = await apiRequest<{ message: string; stats?: { imported_comments?: number } }>(
        `/integrations/oauth/${platformId}/sync`,
        { method: 'POST' }
      );
      setToast({
        message: res?.message || `Successfully synchronized latest comments from ${platformId}.`,
        type: 'success'
      });
      await loadData();
    } catch (err: any) {
      setToast({
        message: `Sync failed: ${err?.message || 'Check connection status.'}`,
        type: 'error'
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Open Facebook Page selection dialog
  const openFacebookPageSelector = async () => {
    setFbPagesModal(true);
    setLoadingFbPages(true);
    try {
      const res = await apiRequest<{ pages: Array<{ id: string; name: string; category?: string }> }>(
        '/integrations/oauth/facebook/pages'
      );
      setFbPagesList(res.pages || []);
    } catch {
      setFbPagesList([]);
    } finally {
      setLoadingFbPages(false);
    }
  };

  // Select Facebook Page to monitor
  const handleSelectFacebookPage = async (page: { id: string; name: string }) => {
    setSelectingPageId(page.id);
    try {
      await apiRequest('/integrations/oauth/facebook/select-page', {
        method: 'POST',
        body: JSON.stringify({ page_id: page.id, page_name: page.name }),
      });
      setToast({ message: `Connected to Facebook Page "${page.name}"!`, type: 'success' });
      setFbPagesModal(false);
      await loadData();
    } catch (err: any) {
      setToast({ message: `Page selection failed: ${err?.message || 'Server error'}`, type: 'error' });
    } finally {
      setSelectingPageId(null);
    }
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Disconnect Confirmation Modal */}
      {disconnectModalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-800">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Unlink className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="text-base font-bold text-[#242B27]">
                Disconnect {PLATFORMS.find(p => p.id === disconnectModalPlatform)?.name}?
              </h3>
            </div>
            <p className="text-xs text-[#68736B] leading-relaxed">
              Disconnecting will pause real-time customer comment monitoring and reputation risk defense. You can reconnect at any time using your official account.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4DFD5]">
              <button
                type="button"
                onClick={() => setDisconnectModalPlatform(null)}
                className="px-4 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDisconnect(disconnectModalPlatform)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook Page Selection Modal */}
      {fbPagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4DFD5] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#1877F2]/10 rounded-xl text-[#1877F2]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#242B27]">Select Facebook Page</h3>
                  <p className="text-xs text-[#68736B]">Choose which authorized Page BrandGuard AI should monitor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFbPagesModal(false)}
                className="text-[#68736B] hover:text-[#242B27] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingFbPages ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#68736B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#244B3F]" />
                <span>Loading your managed Facebook Pages…</span>
              </div>
            ) : fbPagesList.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#68736B] space-y-1">
                <p>No managed Facebook Pages found under this account.</p>
                <p className="text-[11px] text-[#829887]">Ensure your personal Facebook account has Administrator or Editor role on the Page.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fbPagesList.map((pg) => {
                  const isCurrent = statusMap['facebook']?.account_id === pg.id;
                  return (
                    <div
                      key={pg.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-[#E4DFD5] hover:bg-[#F7F4EC]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#242B27]">{pg.name}</div>
                        <div className="text-[11px] text-[#68736B]">ID: {pg.id} {pg.category ? `• ${pg.category}` : ''}</div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                          Active Page
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectFacebookPage(pg)}
                          disabled={selectingPageId === pg.id}
                          className="px-3 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          {selectingPageId === pg.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Connecting…</span>
                            </>
                          ) : (
                            <>
                              <span>Connect Page</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD5] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#242B27] font-serif">
            Social Media Integrations
          </h2>
          <p className="text-xs text-[#68736B] mt-1 leading-relaxed">
            Connect official brand social channels to monitor customer comments, analyze audience sentiment, and protect brand reputation.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] rounded-xl text-xs font-semibold text-[#242B27] cursor-pointer shadow-2xs transition-colors"
            title="Reload integration status"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#244B3F] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* Four Social Platform Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PLATFORMS.map((p) => {
          const { id, name, heading, description, cta, note, Icon, color, bgColor, accountType } = p;
          const statusInfo = statusMap[id] || {
            platform: id,
            name,
            account_type: accountType,
            configured: false,
            connected: false,
            status: 'credentials_missing',
            account_name: null,
            account_id: null,
            permissions: null,
            last_synced_at: null,
            connection_error: null,
          };

          const isConnected = statusInfo.connected;
          const isConfigured = statusInfo.configured;
          const isConnecting = connectingId === id;
          const isDisconnecting = disconnectingId === id;
          const isSyncing = syncingId === id;
          const cardError = cardErrors[id];
          const isApprovalRequired = statusInfo.status === 'Approval Required' || statusInfo.status === 'approval_required';

          return (
            <Card
              key={id}
              className="p-6 bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] hover:shadow-sm transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Platform Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xs flex-shrink-0"
                      style={{ backgroundColor: bgColor, borderColor: `${color}30`, color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#242B27]">
                          {name}
                        </h3>
                        <span className="text-[11px] font-semibold text-[#829887] bg-[#F7F4EC] px-2 py-0.5 rounded-md border border-[#E4DFD5]">
                          {accountType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge isConnected={isConnected} isConfigured={isConfigured} rawStatus={statusInfo.status} />
                </div>

                {/* Connected State Display */}
                {isConnected ? (
                  <div className="p-4 bg-[#F7F4EC] rounded-xl border border-[#E4DFD5] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#68736B]">Authorized Account</span>
                      <span className="text-sm font-bold text-[#242B27] flex items-center gap-2">
                        {statusInfo.profile_picture_url ? (
                          <img
                            src={statusInfo.profile_picture_url}
                            alt="Profile"
                            className="w-5 h-5 rounded-full object-cover border border-[#C8D7CF] shadow-xs"
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                        {id === 'instagram'
                          ? (statusInfo.account_name?.startsWith('@') ? statusInfo.account_name : `@${statusInfo.account_name || 'brandguard'}`)
                          : (statusInfo.account_name || 'Active Account')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E4DFD5]/60">
                      <span className="text-[#68736B]">Account Type</span>
                      <span className="font-semibold text-[#242B27]">{name} Official Channel</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E4DFD5]/60">
                      <span className="text-[#68736B] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#829887]" />
                        <span>Last Successful Sync</span>
                      </span>
                      <span className="font-semibold text-[#244B3F]">
                        {statusInfo.last_synced_at ? new Date(statusInfo.last_synced_at).toLocaleString() : 'Just now'}
                      </span>
                    </div>

                    {/* Facebook Page Switcher Button */}
                    {id === 'facebook' && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E4DFD5]/60">
                        <span className="text-[#68736B]">Managed Page</span>
                        <button
                          type="button"
                          onClick={openFacebookPageSelector}
                          className="text-[#244B3F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Switch Page</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#E4DFD5]/60">
                      <span className="text-[11px] font-semibold text-[#68736B] block mb-1.5">Available Data Access</span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 bg-white border border-[#E4DFD5] rounded-md text-[10.5px] text-[#244B3F] font-medium">
                          ✓ Comment Monitoring
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-[#E4DFD5] rounded-md text-[10.5px] text-[#244B3F] font-medium">
                          ✓ Audience Sentiment Analysis
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-[#E4DFD5] rounded-md text-[10.5px] text-[#244B3F] font-medium">
                          ✓ Reputation Risk Alerts
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Clean Disconnected State (Consumer-Grade Experience) */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-[15px] font-bold text-[#242B27]">
                        {heading}
                      </h4>
                      <p className="text-xs text-[#68736B] leading-relaxed">
                        {description}
                      </p>
                    </div>

                    {/* LinkedIn Community Management API approval required banner */}
                    {isApprovalRequired && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start justify-between gap-2 shadow-2xs">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span>LinkedIn Community Management API approval required.</span>
                        </div>
                      </div>
                    )}

                    {/* Clean Error Notice if OAuth connection fails */}
                    {cardError && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{cardError}</span>
                      </div>
                    )}

                    {/* The Prominent Connection Button (e.g. Continue with Google / Continue with Instagram) */}
                    <button
                      type="button"
                      onClick={() => handleConnect(id)}
                      disabled={isConnecting}
                      className="w-full py-3 px-5 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening official {name} authorization…</span>
                        </>
                      ) : (
                        <>
                          <Icon className="w-4 h-4" />
                          <span>{cta}</span>
                        </>
                      )}
                    </button>

                    {/* Explanatory security note */}
                    <p className="text-[11.5px] text-[#829887] flex items-center justify-center gap-1.5 text-center px-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#244B3F] flex-shrink-0" />
                      <span>{note}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons when Connected */}
              {isConnected && (
                <div className="pt-4 border-t border-[#E4DFD5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSync(id)}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Synchronizing…' : 'Sync Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnect(id)}
                      disabled={isConnecting}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F4EC] text-[#242B27] text-xs font-semibold rounded-xl border border-[#E4DFD5] transition-colors cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-60"
                      title="Refresh authorization session with provider"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#244B3F]" />
                      <span>Reconnect</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDisconnectModalPlatform(id)}
                    disabled={isDisconnecting}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
