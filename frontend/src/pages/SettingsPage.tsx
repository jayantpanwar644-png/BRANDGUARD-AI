import React, { useState, useEffect } from 'react';
import { 
  Settings, User, Building, Users, Shield, 
  Cpu, History, Key, CheckCircle, Plus
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, organisation, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'org' | 'users' | 'activity' | 'ai'>('account');
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Org Form
  const [orgName, setOrgName] = useState(organisation?.name || '');
  const [industry, setIndustry] = useState(organisation?.industry || '');
  const [website, setWebsite] = useState(organisation?.website || '');
  const [contactInfo, setContactInfo] = useState(organisation?.contact_info || '');
  const [orgMsg, setOrgMsg] = useState('');

  // Invite User Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('Reviewer');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'users') {
        const u = await apiRequest('/settings/users');
        setUsersList(u);
      } else if (activeTab === 'activity') {
        const l = await apiRequest('/settings/activity-logs');
        setActivityLogs(l);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await apiRequest('/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined
        })
      });
      setCurrentPassword('');
      setNewPassword('');
      setProfileMsg('User profile updated successfully.');
      await refreshProfile();
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgMsg('');
    try {
      const formData = new FormData();
      formData.append('name', orgName);
      formData.append('industry', industry);
      formData.append('website', website);
      formData.append('contact_info', contactInfo);

      await apiRequest('/organisations/current', {
        method: 'PUT',
        body: formData
      });
      setOrgMsg('Organisation details updated successfully.');
      await refreshProfile();
    } catch (err: any) {
      setOrgMsg(`Error: ${err.message}`);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/settings/users', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          password: invitePassword,
          role: inviteRole
        })
      });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Invite failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none animate-fade-up font-sans">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] mb-2 font-sans">
          <Settings className="w-3.5 h-3.5" />
          <span>Administration &amp; Governance</span>
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">Platform Settings &amp; Security</h1>
        <p className="text-[13.5px] sm:text-[14.5px] text-[#68736B] mt-0.5 max-w-2xl leading-relaxed">
          Manage user profiles, organisation metadata, access permissions, and audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#E4DFD5] pb-2 text-[13px] overflow-x-auto font-sans">
        {[
          { id: 'account', label: 'User Account', icon: User },
          { id: 'org', label: 'Organisation Profile', icon: Building },
          { id: 'users', label: 'Team & Roles', icon: Users },
          { id: 'ai', label: 'AI Engine Settings', icon: Cpu },
          { id: 'activity', label: 'Audit Trail Logs', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer flex-shrink-0 ${
                activeTab === t.id
                  ? 'bg-[#EBF0ED] text-[#244B3F] border border-[#C8D7CF] shadow-2xs'
                  : 'text-[#68736B] hover:text-[#242B27] hover:bg-[#F7F4EC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: User Account */}
      {activeTab === 'account' && (
        <Card className="p-6 max-w-2xl space-y-4">
          <h2 className="text-[16px] font-bold font-heading text-[#172033]">Personal Account Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Official Email (Locked)</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] text-[#94A3B8] font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
              />
            </div>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <div className="text-[13px] font-bold text-[#172033] mb-2 font-heading">Change Password</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#475569] mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#475569] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                  />
                </div>
              </div>
            </div>

            {profileMsg && (
              <div className="text-[12.5px] text-[#315C76] bg-[#EAF2F8] p-2 rounded border border-[#D0E2EC]">{profileMsg}</div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#172333] hover:bg-[#253244] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Update Profile
            </button>
          </form>
        </Card>
      )}

      {/* TAB 2: Organisation Profile */}
      {activeTab === 'org' && (
        <Card className="p-6 max-w-2xl space-y-4">
          <h2 className="text-[16px] font-bold font-heading text-[#172033]">Organisation Master Details</h2>
          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Company Legal Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Industry Sector</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Company Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Contact Details / Support</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
              />
            </div>

            {orgMsg && (
              <div className="text-[12.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded">{orgMsg}</div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#172333] hover:bg-[#253244] text-white text-[13.5px] font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Save Organisation
            </button>
          </form>
        </Card>
      )}

      {/* TAB 3: Team & Roles */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-[#172033] uppercase tracking-wider font-heading">
              Authorised Team Members ({usersList.length})
            </h2>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-[#172333] hover:bg-[#253244] text-white rounded-lg text-[13px] font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Team Member</span>
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {usersList.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between text-[13px] hover:bg-[#F8FAFC] transition-colors">
                <div>
                  <div className="font-bold text-[#172033] font-heading">{u.full_name}</div>
                  <div className="text-[12px] text-[#64748B]">{u.email}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge status={u.role} size="sm" />
                  <span className="text-[11.5px] text-[#94A3B8]">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: AI Settings */}
      {activeTab === 'ai' && (
        <Card className="p-6 max-w-2xl space-y-4">
          <h2 className="text-[16px] font-bold font-heading text-[#172033]">AI Engine & Vision Configuration</h2>
          <div className="space-y-3 text-[13px]">
            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#172033] font-heading">Gemini Multimodal Vision API</div>
                <div className="text-[12px] text-[#64748B]">Cloud multimodal model for semantic OCR and advanced logo detection.</div>
              </div>
              <Badge status="Active (Cloud / Local Vision Dual Engine)" size="sm" />
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#172033] font-heading">Deterministic CV Engine (Pillow & Color Quantization)</div>
                <div className="text-[12px] text-[#64748B]">Local pixel analysis, hex palette extraction, contrast, and clarity computation.</div>
              </div>
              <Badge status="Operational" size="sm" />
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#172033] font-heading">RAG Grounded Claim Verifier</div>
                <div className="text-[12px] text-[#64748B]">Strict evidence retrieval matching claims against registered guidelines.</div>
              </div>
              <Badge status="Operational" size="sm" />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: Activity Logs */}
      {activeTab === 'activity' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="text-[13px] font-bold text-[#172033] uppercase tracking-wider font-heading">
              Security & Compliance Audit Trail ({activityLogs.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-3.5 text-[13px] hover:bg-[#F8FAFC] flex items-start justify-between transition-colors">
                <div>
                  <div className="font-semibold text-[#172033]">{log.description}</div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">
                    Actor: {log.user_email || 'System'} • Action: {log.action_type}
                  </div>
                </div>
                <div className="text-[11px] text-[#94A3B8] flex-shrink-0 ml-4">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite Member Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Add Team Member">
        <form onSubmit={handleInviteUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Official Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Temporary Password</label>
            <input
              type="password"
              required
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Assigned Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
            >
              <option value="Admin">Admin (Full Control)</option>
              <option value="Brand Manager">Brand Manager (Approve & Guidelines)</option>
              <option value="Reviewer">Reviewer (Audits & Claims)</option>
              <option value="Creator">Creator (Submit Creatives)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 bg-[#F1F5F9] text-[#172033] hover:bg-[#E2E8F0] text-xs font-medium rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#172333] hover:bg-[#253244] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
