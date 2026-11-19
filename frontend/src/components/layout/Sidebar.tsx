import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShieldCheck, Sparkles, MessageSquareHeart, 
  AlertTriangle, FolderKanban, CheckSquare, BookOpen, 
  FileText, Share2, FileSliders, Settings, PlusCircle,
  LogOut, ChevronLeft, ChevronRight, Building2, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UploadForAuditModal } from '../upload/UploadForAuditModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, organisation, brandProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowed.includes(ext) && !file.type.startsWith('image/')) {
        setFileError(`Unsupported file format "${ext}". Only JPG, JPEG, PNG, and WEBP images are supported.`);
        setPendingFile(null);
      } else if (file.size > 50 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(`File size (${sizeMb} MB) exceeds the 50 MB limit. Please select a smaller image.`);
        setPendingFile(null);
      } else {
        setFileError(null);
        setPendingFile(file);
      }
      setIsUploadModalOpen(true);
    }
  };

  // All 12 Required BrandGuard AI Modules
  const mainNavItems = [
    { name: 'Overview', path: '/app/overview', icon: LayoutDashboard },
    { name: 'Command Center', path: '/app/command-center', icon: ShieldCheck },
    { name: 'Brand Governance', path: '/app/brand-governance', icon: Sparkles },
    { name: 'Audience Intelligence', path: '/app/audience-intelligence', icon: MessageSquareHeart },
    { name: 'Reputation Risk Center', path: '/app/reputation-risk', icon: AlertTriangle },
    { name: 'Content Intelligence', path: '/app/content-history', icon: FolderKanban },
    { name: 'Approval & Workflow', path: '/app/approvals', icon: CheckSquare },
    { name: 'Brand Knowledge Hub', path: '/app/knowledge-hub', icon: BookOpen },
    { name: 'Intelligence Reports', path: '/app/reports', icon: FileText },
    { name: 'Integrations', path: '/app/integrations', icon: Share2 },
  ];

  const secondaryNavItems = [
    { name: 'Company Guidelines', path: '/app/guidelines', icon: FileSliders },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={`h-[calc(100vh-4rem)] sticky top-16 flex flex-col bg-[#FCFAF5] border-r border-[#E4DFD5] transition-all duration-300 z-30 select-none flex-shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
      {/* Quick Action: Upload for AI Audit */}
      <div className="p-3.5 border-b border-[#EFEBE3] flex-shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          id="sidebar-upload-input"
        />

        <button
          type="button"
          onClick={handleButtonClick}
          className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[13.5px] font-semibold bg-[#244B3F] hover:bg-[#1A362D] text-[#FCFAF5] transition-all cursor-pointer shadow-[0_2px_8px_rgba(36,75,63,0.18)] active:scale-[0.98] group ${
            collapsed ? 'px-2' : 'px-3.5'
          }`}
          title="Upload Asset for AI Brand Audit"
        >
          <PlusCircle className="w-4 h-4 flex-shrink-0 stroke-[2.2] group-hover:rotate-90 transition-transform duration-300" />
          {!collapsed && <span className="truncate tracking-wide">Upload for Audit</span>}
        </button>
      </div>

      {/* Main Nav Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* Core Modules */}
        <div>
          {!collapsed && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#93988F] px-3 mb-2 font-sans">
              Brand Intelligence
            </div>
          )}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-xl text-[13.5px] transition-all duration-150 leading-normal ${
                      isActive
                        ? 'bg-[#EBF0ED] text-[#244B3F] font-semibold border-l-3 border-[#244B3F] shadow-[0_1px_2px_rgba(36,75,63,0.06)]'
                        : 'text-[#68736B] hover:text-[#242B27] hover:bg-[#F3EFE6] font-medium'
                    }`
                  }
                  title={item.name}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 stroke-[1.8]" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Organisation & Governance Config */}
        <div>
          {!collapsed && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#93988F] px-3 mb-2 font-sans">
              Governance &amp; Controls
            </div>
          )}
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-xl text-[13.5px] transition-all duration-150 leading-normal ${
                      isActive
                        ? 'bg-[#EBF0ED] text-[#244B3F] font-semibold border-l-3 border-[#244B3F] shadow-[0_1px_2px_rgba(36,75,63,0.06)]'
                        : 'text-[#68736B] hover:text-[#242B27] hover:bg-[#F3EFE6] font-medium'
                    }`
                  }
                  title={item.name}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 stroke-[1.8]" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Collapse Toggle & User Profile Footer */}
      <div className="p-3 border-t border-[#E4DFD5] bg-[#F7F4EC]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-[13px] font-semibold text-[#242B27] truncate font-sans">
                  {user?.full_name || 'Brand Director'}
                </div>
                <div className="text-[11px] text-[#68736B] truncate">
                  {organisation?.name || 'Nexus Dynamics'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded-md text-[#93988F] hover:text-[#242B27] hover:bg-[#EFECE2] transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#93988F] hover:text-[#C77E63] hover:bg-[#FAF0EC] transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-lg text-[#93988F] hover:text-[#242B27] hover:bg-[#EFECE2] transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#93988F] hover:text-[#C77E63] hover:bg-[#FAF0EC] transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>

    {/* Upload for Audit Workflow Modal */}
    <ErrorBoundary fallbackTitle="Smart Audit Modal Error">
      <UploadForAuditModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setPendingFile(null);
          setFileError(null);
        }}
        initialFile={pendingFile}
        initialError={fileError}
      />
    </ErrorBoundary>
  </>
);
};
