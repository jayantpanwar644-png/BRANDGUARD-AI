import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UploadCloud, Folder, ShieldCheck, Scale, BarChart3, 
  Leaf, Layers, Target, Zap, Play, ArrowRight, 
  CheckCircle2, X, AlertCircle, Sparkles, ExternalLink,
  FileCheck2, ShieldAlert, Lock, AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { UploadForAuditModal } from '../components/upload/UploadForAuditModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [error, setError] = useState('');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalInitialFile, setModalInitialFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Phase 4: Brand Setup Guard State
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [loadingSetup, setLoadingSetup] = useState(true);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const data = await apiRequest('/brand/setup-status');
      setSetupStatus(data);
    } catch (e) {
      console.error('Failed to fetch setup status:', e);
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const valid = processFile(file);
      if (valid) {
        setModalInitialFile(file);
        setIsUploadModalOpen(true);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const valid = processFile(file);
      if (valid) {
        setModalInitialFile(file);
        setIsUploadModalOpen(true);
      }
    }
  };

  const handleTriggerFileInput = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const input = document.getElementById('hero-file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.click();
    }
  };

  const processFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isImage = validTypes.includes(file.type) || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    if (!isImage) {
      setError(`Invalid format "${ext || file.type}". Supported: JPG, JPEG, PNG, WEBP.`);
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds maximum size of 50MB.');
      return false;
    }

    setError('');
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    return true;
  };

  const triggerUploadAndAudit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError('');

    try {
      setUploadStep('Uploading asset to secure brand repository...');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title || selectedFile.name);
      formData.append('platform', 'Instagram');

      const uploadRes = await apiRequest('/content/upload', {
        method: 'POST',
        body: formData,
      });

      const content = uploadRes.content || uploadRes;
      const contentId = content.id;

      setUploadStep('Executing Agentic AI Brand Audit & Rule Comparison...');
      await apiRequest(`/content/${contentId}/analyse`, {
        method: 'POST',
      });

      setUploadStep('Audit finalized! Redirecting to governance dashboard...');
      setTimeout(() => {
        navigate(`/app/brand-governance?contentId=${contentId}`);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Audit analysis failed. Please try again.');
      setIsUploading(false);
    }
  };

  const isSetupComplete = setupStatus?.is_complete ?? false;
  const missingItems = setupStatus?.missing_requirements || [];
  const completionPercentage = setupStatus?.completion_percentage || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 select-none animate-in fade-in duration-300">
      {/* Smart Brand Audit Workflow Banner */}
      {!loadingSetup && (
        <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#172033]">
                Smart Guideline Verification &amp; 8-Step Interactive Audit Workflow
              </span>
              <p className="text-[#64748B] text-[11.5px] mt-0.5">
                Upload your creative asset anytime. Brand guidelines are verified or collected seamlessly during the upload workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg font-semibold whitespace-nowrap self-start sm:self-auto shadow-2xs cursor-pointer flex items-center space-x-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Start Audit Workflow</span>
          </button>
        </div>
      )}

      {/* 1. Main Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        {/* Left Column: Headline & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EFE9DF] border border-[#E0D8CB] text-[12px] font-semibold text-[#172333]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#315C76]" />
            <span>Pre-Publication Brand Governance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#172333] tracking-tight leading-[1.18] font-heading">
            Ensure Brand Trust,<br />
            Compliance &amp; <span className="text-[#315C76]">Integrity</span>
          </h1>

          <p className="text-[14px] sm:text-[15.5px] text-[#5A6472] leading-relaxed max-w-xl font-normal">
            Autonomous AI platform that evaluates brand assets against your confirmed guidelines, detects unverified claims, verifies official logo placement, and generates corrected creatives.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 bg-[#172333] hover:bg-[#253244] text-white rounded-lg text-[14px] font-semibold flex items-center space-x-2 transition-all shadow-xs cursor-pointer"
            >
              <span>Upload &amp; Audit Creative</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>

            {isSetupComplete && (
              <div className="inline-flex items-center space-x-1.5 text-[12px] font-semibold text-[#239B6B] px-3 py-1 bg-[#EAF7F1] rounded-lg border border-[#BDE7D4]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Brand Rules Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Showcase Card */}
        <div className="lg:col-span-5">
          <div className="w-full h-[220px] sm:h-[240px] rounded-2xl overflow-hidden border border-[#E6E0D6] shadow-sm relative group bg-[#EAE4D9] flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-[#315C76]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-[16px] font-bold font-heading text-[#172333]">Real-Data Audit Engine</h3>
              <p className="text-[12px] text-[#64748B] max-w-xs mx-auto">
                Audits real pixels, runs native OCR text extraction, verifies claims against company facts, and provides AI copy correction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Content Upload Panel */}
      <section
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={handleDrop}
        onClick={() => handleTriggerFileInput()}
        className={`w-full border-2 border-dashed rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all cursor-pointer select-none ${
          isDragging
            ? 'bg-[#EAF2F8] border-[#315C76] shadow-md scale-[1.005]'
            : 'bg-[#F3EDE3]/70 border-[#D2C8BA] hover:border-[#315C76] hover:bg-[#F3EDE3]/90'
        }`}
      >
        <input
          id="hero-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Left: Icon & Description */}
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs bg-white border border-[#E2DAD0] text-[#172333]">
            <UploadCloud className="w-6 h-6 stroke-[1.8] text-[#315C76]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-[16px] font-bold text-[#172333] font-heading">
                Upload Creative for AI Audit
              </h3>
              <span className="text-[10.5px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#EAF2F8] text-[#315C76]">
                Interactive 8-Step Workflow
              </span>
            </div>
            <p className="text-[12.5px] text-[#6B7584] mt-0.5">
              Drag &amp; drop a JPG, PNG, or WEBP creative here, or click to choose from your computer.
            </p>
          </div>
        </div>

        {/* Middle: Supported Formats */}
        <div className="hidden md:flex flex-col text-right pr-6 border-r border-[#DCD5C9] text-[12px] text-[#6B7584] space-y-0.5">
          <div><span className="text-[#8E97A6]">Supported:</span> JPG, JPEG, PNG, WEBP</div>
          <div><span className="text-[#8E97A6]">Max Size:</span> 50 MB</div>
        </div>

        {/* Right: Choose File Button */}
        <div className="w-full sm:w-auto flex items-center space-x-2 justify-end">
          <button
            type="button"
            onClick={handleTriggerFileInput}
            className="cursor-pointer px-4 py-2.5 bg-[#172333] hover:bg-[#253244] text-white rounded-xl text-[13px] font-semibold flex items-center space-x-2 transition-colors flex-shrink-0 shadow-xs"
          >
            <Folder className="w-4 h-4 text-white stroke-[2]" />
            <span>Choose Creative File</span>
          </button>
        </div>
      </section>

      {/* Selected File Audit Tray */}
      {selectedFile && (
        <div className="bg-[#FFFFFF] border border-[#E6E0D6] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3.5 w-full sm:w-auto">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-14 h-14 object-cover rounded-xl border border-[#E6E0D6] flex-shrink-0 shadow-2xs"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-[#172333] truncate font-heading">
                {title || selectedFile.name}
              </div>
              <div className="text-[12px] text-[#6B7584] flex items-center space-x-2 mt-0.5">
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">Ready for AI Governance Audit</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setModalInitialFile(null);
              }}
              className="px-3 py-1.5 text-[12px] font-medium text-[#6B7584] hover:text-[#172333] transition-colors cursor-pointer"
              disabled={isUploading}
            >
              Clear
            </button>

            <button
              onClick={() => {
                setModalInitialFile(selectedFile);
                setIsUploadModalOpen(true);
              }}
              disabled={isUploading}
              className="px-4 py-2 bg-[#EAF2F8] hover:bg-[#D5E6F3] text-[#315C76] text-[13px] font-semibold rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer border border-[#CBD5E1]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch 8-Step Smart Audit</span>
            </button>

            <button
              onClick={triggerUploadAndAudit}
              disabled={isUploading}
              className="px-4 py-2 bg-[#172333] hover:bg-[#253244] text-white text-[13px] font-semibold rounded-xl flex items-center space-x-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{uploadStep || 'Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Run Quick Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold px-1">✕</button>
        </div>
      )}

      {/* 3. Core Capabilities Section (4 Cards) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-[15px] sm:text-[16px] font-bold text-[#172333] tracking-wide font-heading">
          Brand Governance Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/app/brand-governance')}
            className="bg-[#FBF9F5] border border-[#E6E0D6] rounded-xl p-4 flex items-center space-x-3.5 hover:border-[#D0C7B9] hover:bg-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EFE9DF] text-[#172333] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#172333] font-heading">Brand Audit</div>
              <div className="text-[11px] text-[#7A8391]">Logo, color &amp; copy review</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/app/approvals')}
            className="bg-[#FBF9F5] border border-[#E6E0D6] rounded-xl p-4 flex items-center space-x-3.5 hover:border-[#D0C7B9] hover:bg-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EFE9DF] text-[#172333] flex items-center justify-center flex-shrink-0">
              <Scale className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#172333] font-heading">Approval Center</div>
              <div className="text-[11px] text-[#7A8391]">Human sign-off workflows</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/app/knowledge-hub')}
            className="bg-[#FBF9F5] border border-[#E6E0D6] rounded-xl p-4 flex items-center space-x-3.5 hover:border-[#D0C7B9] hover:bg-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EFE9DF] text-[#172333] flex items-center justify-center flex-shrink-0">
              <FileCheck2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#172333] font-heading">Knowledge Hub</div>
              <div className="text-[11px] text-[#7A8391]">Confirmed rules &amp; claims</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/app/reports')}
            className="bg-[#FBF9F5] border border-[#E6E0D6] rounded-xl p-4 flex items-center space-x-3.5 hover:border-[#D0C7B9] hover:bg-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EFE9DF] text-[#172333] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#172333] font-heading">Audit Reports</div>
              <div className="text-[11px] text-[#7A8391]">PDF compliance exports</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8-Step Interactive Audit Workflow Modal */}
      <ErrorBoundary fallbackTitle="Creative Audit Modal Error">
        <UploadForAuditModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setModalInitialFile(null);
          }}
          initialFile={modalInitialFile}
        />
      </ErrorBoundary>
    </div>
  );
};
