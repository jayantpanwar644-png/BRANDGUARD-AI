import React, { useState, useEffect } from 'react';
import { 
  Share2, CheckCircle2, RefreshCw, Key, ShieldCheck, AlertCircle, Plus
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedinIcon, TwitterIcon } from '../components/common/SocialIcons';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConnectedSocialAccount } from '../types';

export const Integrations: React.FC = () => {
  const [accounts, setAccounts] = useState<ConnectedSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Connect Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platform, setPlatform] = useState('Instagram');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiRequest('/integrations/accounts');
      setAccounts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/integrations/connect', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          account_name: accountName,
          account_id: accountId,
          access_token: accessToken || undefined
        })
      });
      setIsModalOpen(false);
      setAccountName('');
      setAccountId('');
      await fetchAccounts();
    } catch (err: any) {
      alert(err.message || 'Connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      await apiRequest(`/integrations/${id}/sync`, { method: 'POST' });
      await fetchAccounts();
    } catch (err: any) {
      alert(err.message || 'Sync error');
    } finally {
      setSyncingId(null);
    }
  };

  const platforms = [
    { name: 'Instagram', desc: 'Instagram Professional / Business account via Meta Graph API', icon: InstagramIcon, color: 'text-pink-600' },
    { name: 'Facebook', desc: 'Facebook Brand Page & Lead Management', icon: FacebookIcon, color: 'text-blue-600' },
    { name: 'LinkedIn', desc: 'LinkedIn Company Page & Professional Updates', icon: LinkedinIcon, color: 'text-sky-600' },
    { name: 'Twitter', desc: 'X / Twitter Enterprise Brand Account', icon: TwitterIcon, color: 'text-slate-700' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[13px] text-[#64748B] font-medium">
        Checking connected enterprise channels...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-sans uppercase tracking-wider text-[#315C76] font-semibold mb-1">
            External Publishing & Webhook Sync
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#172033]">Social Media Integrations</h1>
          <p className="text-[13.5px] sm:text-[14px] text-[#64748B] mt-0.5">
            Official OAuth connections for publishing approved content and continuous audience comment synchronization.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#172333] hover:bg-[#253244] text-white rounded-lg text-[13.5px] font-semibold shadow-xs transition-all font-heading cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Channel Account</span>
        </button>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {platforms.map((p) => {
          const Icon = p.icon;
          const connected = accounts.find((a) => a.platform.toLowerCase() === p.name.toLowerCase());

          return (
            <Card key={p.name} className="p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center border border-[#E2E8F0]">
                      <Icon className={`w-5 h-5 ${p.color}`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#172033] font-heading">{p.name}</h3>
                      <div className="text-[12px] text-[#64748B]">{p.desc}</div>
                    </div>
                  </div>
                  <Badge status={connected ? connected.status : 'Not Connected'} size="sm" />
                </div>

                {connected ? (
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[12.5px] space-y-1">
                    <div><span className="text-[#64748B]">Account Name:</span> <strong className="text-[#172033]">{connected.account_name}</strong></div>
                    <div><span className="text-[#64748B]">Platform ID:</span> <span className="text-[#172033] font-mono">{connected.account_id}</span></div>
                    <div><span className="text-[#64748B]">Permissions:</span> <span className="text-[#64748B] text-[11px]">{connected.permissions}</span></div>
                    <div><span className="text-[#64748B]">Last Synced:</span> <span className="text-emerald-700 font-semibold">{connected.last_synced_at ? new Date(connected.last_synced_at).toLocaleString() : 'Never'}</span></div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B]">
                    No authorized {p.name} credentials active. Required for one-click publishing and live audience feedback ingestion.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center">
                {connected ? (
                  <button
                    disabled={syncingId === connected.id}
                    onClick={() => handleSync(connected.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#172033] text-[13px] font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === connected.id ? 'animate-spin' : ''}`} />
                    <span>{syncingId === connected.id ? 'Syncing...' : 'Sync Comments Now'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPlatform(p.name);
                      setIsModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Authorize Account
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connect Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Connect Enterprise ${platform} Account`}
      >
        <form onSubmit={handleConnect} className="space-y-4">
          <p className="text-[13px] text-[#64748B]">
            Enter your official enterprise channel credentials or test API token to link this workspace.
          </p>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Target Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            >
              <option value="Instagram">Instagram Professional</option>
              <option value="Facebook">Facebook Brand Page</option>
              <option value="LinkedIn">LinkedIn Company</option>
              <option value="Twitter">X / Twitter Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Account Display Handle / Name</label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. @BrandGuardGlobal"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">Official Platform ID</label>
            <input
              type="text"
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. 178414053092104"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[13px] text-[#172033] font-mono focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#475569] mb-1">OAuth Access Token (Optional / Demo Authorized)</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAABwzL9... (defaults to authorized enterprise mock token)"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[13px] text-[#172033] font-mono focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-[#F1F5F9] text-[#172033] hover:bg-[#E2E8F0] text-[13px] font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#315C76] hover:bg-[#183B59] disabled:opacity-40 text-white text-[13px] font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              {submitting ? 'Connecting...' : 'Authorize Channel'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
