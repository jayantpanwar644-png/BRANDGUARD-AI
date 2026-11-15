import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Bell, ShieldCheck, Plus, Building2, LogOut, 
  ChevronDown, CheckCircle2, AlertTriangle, ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, organisation, brandProfile, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/overview')) return 'Overview';
    if (pathname.includes('/command-center') || pathname === '/app' || pathname === '/app/dashboard') return 'Command Center';
    if (pathname.includes('/brand-governance')) return 'Brand Governance & Audit';
    if (pathname.includes('/audience-intelligence')) return 'Audience Intelligence & Pulse';
    if (pathname.includes('/reputation-risk')) return 'Reputation Risk Center';
    if (pathname.includes('/content-history')) return 'Content Intelligence & History';
    if (pathname.includes('/approvals')) return 'Approval & Workflow Center';
    if (pathname.includes('/knowledge-hub')) return 'Brand Knowledge Hub';
    if (pathname.includes('/reports')) return 'Intelligence Reports & Exports';
    if (pathname.includes('/integrations')) return 'Social Media Integrations';
    if (pathname.includes('/guidelines')) return 'Company Guidelines Management';
    if (pathname.includes('/settings')) return 'Settings & Team Security';
    return 'BrandGuard AI';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JD';

  return (
    <header className="h-16 px-6 sm:px-8 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand Identity & Active Page Title */}
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#315C76] flex items-center justify-center text-white shadow-xs group-hover:scale-102 transition-transform">
            <ShieldCheck className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="font-bold text-[16px] text-[#172033] tracking-tight font-heading">
            BrandGuard AI
          </span>
        </Link>

        <div className="h-4 w-[1px] bg-[#E2E8F0] hidden sm:block" />

        <div className="flex items-center space-x-3">
          <h1 className="text-[15px] sm:text-[16px] font-bold text-[#172033] font-heading hidden sm:block">
            {getPageTitle(location.pathname)}
          </h1>

          {/* Real Brand configuration status pill */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
              brandProfile?.is_configured
                ? 'bg-[#EAF7F1] text-[#239B6B] border-[#BDE7D4]'
                : 'bg-[#FEF6E8] text-[#D99A32] border-[#F9E0B2]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-90" />
            {brandProfile?.is_configured ? 'Brand Rules Active' : 'Setup Incomplete'}
          </span>
        </div>
      </div>

      {/* Right: Quick Action, Notifications, User */}
      <div className="flex items-center space-x-3.5">
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#64748B]">
          <Building2 className="w-3.5 h-3.5 text-[#315C76]" />
          <span className="font-semibold text-[#172033]">{organisation?.name || 'Nexus Dynamics'}</span>
        </div>

        <Link
          to="/app/overview"
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg text-[13.5px] font-semibold transition-all shadow-xs"
          title="Upload Asset for AI Brand Audit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Audit Asset</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasUnread(false);
            }}
            className="p-2 rounded-full text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[1.8]" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-lg p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[13px] font-bold text-[#172033] pb-2 border-b border-[#F1F5F9] flex items-center justify-between">
                <span>Compliance Notifications</span>
                <span className="text-[11px] text-[#239B6B] bg-[#EAF7F1] px-2 py-0.5 rounded-full font-medium">Real-time</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[13px] text-[#172033]">Governance Engine Active</div>
                    <div className="text-[12px] text-[#64748B] leading-relaxed">Automated logo and claim checks operational.</div>
                  </div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#D99A32] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[13px] text-[#172033]">Claim Proof Required</div>
                    <div className="text-[12px] text-[#64748B] leading-relaxed">1 high-impact marketing claim awaits certificate upload.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 pl-1 py-1 rounded-full hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#183B59] text-white font-bold text-xs flex items-center justify-center tracking-wider shadow-2xs">
              {userInitials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-[#F1F5F9]">
                <div className="text-[13px] font-bold text-[#172033] truncate">
                  {user?.full_name || 'Enterprise Admin'}
                </div>
                <div className="text-[11px] text-[#64748B] truncate">
                  {user?.email || 'admin@nexusdynamics.io'}
                </div>
              </div>
              <div className="pt-1">
                <Link
                  to="/app/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-[13px] text-[#172033] hover:bg-[#F8FAFC] rounded-lg transition-colors font-medium"
                >
                  <span>Company Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
