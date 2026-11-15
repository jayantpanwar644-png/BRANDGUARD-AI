import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, FileText, Image as ImageIcon, Sparkles, CheckCircle2,
  AlertCircle, X, Crop, RefreshCw, Trash2, Star, Eye, Layers,
  Sliders, ShieldCheck, Check, ArrowRight, Info, Download, Edit2
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { BrandAsset, LogoCandidate, LogoProcessResult } from '../../types';

interface FlexibleLogoManagerProps {
  onLogoUpdated?: (primaryLogoUrl?: string) => void;
  isCompactMode?: boolean; // When embedded in modal wizards
}

export const FlexibleLogoManager: React.FC<FlexibleLogoManagerProps> = ({
  onLogoUpdated,
  isCompactMode = false
}) => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction & Confirmation State
  const [processResult, setProcessResult] = useState<LogoProcessResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<LogoCandidate | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activeOriginalPath, setActiveOriginalPath] = useState<string | null>(null);
  const [activeSourceFormat, setActiveSourceFormat] = useState<string>('PNG');

  // Confirmation form fields
  const [logoName, setLogoName] = useState('');
  const [logoVariation, setLogoVariation] = useState<'Primary Logo' | 'Secondary Logo' | 'Icon-Only Logo' | 'Light-Background Logo' | 'Dark-Background Logo'>('Primary Logo');
  const [logoDescription, setLogoDescription] = useState('');
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [previewBackdrop, setPreviewBackdrop] = useState<'white' | 'dark' | 'checker'>('checker');

  // Cropping State
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 5, y: 5, width: 90, height: 90 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  // Asset Renaming / Editing State
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editVariation, setEditVariation] = useState<string>('Primary Logo');

  // Fullscreen Preview Modal
  const [previewModalAsset, setPreviewModalAsset] = useState<BrandAsset | null>(null);

  // Existing library modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  const SUPPORTED_EXTENSIONS_DISPLAY = [
    'PNG', 'JPG', 'WEBP', 'SVG (Vector)', 'GIF (Static Frame)', 'BMP', 'TIFF',
    'PDF (Document Extractor)', 'DOCX', 'PPTX'
  ];

  useEffect(() => {
    fetchBrandAssets();
  }, []);

  const fetchBrandAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await apiRequest('/brand/assets');
      setAssets(res || []);
    } catch (err: any) {
      console.error('Failed to load brand assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const formatAssetUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return path;
    const match = path.match(/[/\\]uploads[/\\](.+)$/i);
    return match ? `/uploads/${match[1].replace(/\\/g, '/')}` : path;
  };

  // --------------------------------------------------------------------------
  // 1. FILE UPLOAD & PROCESSING
  // --------------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadAndProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const uploadAndProcessFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);
    setProcessResult(null);
    setSelectedCandidate(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (['.eps', '.ai', '.psd'].includes(ext)) {
      setErrorMsg(`Format "${ext.toUpperCase()}" requires GhostScript runtime. Please export as SVG or high-resolution PNG/PDF.`);
      setIsProcessing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res: LogoProcessResult = await apiRequest('/brand/logos/process', {
        method: 'POST',
        body: formData
      });

      setProcessResult(res);

      if (res.status === 'candidates_found' && res.candidates && res.candidates.length > 0) {
        // Document with candidates: wait for user to pick
        setSelectedCandidate(res.candidates[0]);
        setActivePreviewUrl(res.candidates[0].preview_url);
        setActiveOriginalPath(res.original_path || '');
        setActiveSourceFormat(res.source_format || 'PDF');
        setLogoName(`${file.name.replace(/\.[^/.]+$/, '')} Logo Mark`);
        const rec = res.candidates[0].characteristics?.recommended_variant;
        if (rec) setLogoVariation(rec as any);
      } else if (res.status === 'ready' && res.raster_path) {
        // Direct image or SVG ready
        setActivePreviewUrl(res.raster_path);
        setActiveOriginalPath(res.original_path || res.raster_path);
        setActiveSourceFormat(res.source_format || 'PNG');
        setLogoName(file.name);
        const rec = res.characteristics?.recommended_variant;
        if (rec) setLogoVariation(rec as any);
        if (assets.length === 0) setSetAsPrimary(true);
      } else if (res.status === 'no_embedded_images') {
        setErrorMsg('No embedded logo or images were detected in this document. Please ensure the document contains image assets or upload a PNG/SVG.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Logo processing failed. Please verify the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2. CANDIDATE SELECTION (FOR PDF/DOCX/PPTX)
  // --------------------------------------------------------------------------
  const handleSelectCandidate = async (candidate: LogoCandidate) => {
    setSelectedCandidate(candidate);
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/brand/logos/select-candidate', {
        method: 'POST',
        body: JSON.stringify({
          candidate_preview_url: candidate.preview_url,
          original_filename: processResult?.file_name || 'document.pdf'
        })
      });
      setActivePreviewUrl(res.raster_path);
      setLogoName(res.file_name || 'Extracted Brand Logo');
      const rec = candidate.characteristics?.recommended_variant;
      if (rec) setLogoVariation(rec as any);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to select candidate.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. INTERACTIVE CROPPING
  // --------------------------------------------------------------------------
  const handleApplyCrop = async () => {
    if (!activePreviewUrl) return;
    setIsSavingCrop(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/brand/logos/crop', {
        method: 'POST',
        body: JSON.stringify({
          raster_url: activePreviewUrl,
          x: cropBox.x,
          y: cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
          is_percentage: true
        })
      });
      setActivePreviewUrl(res.raster_path);
      setIsCropping(false);
      setSuccessMsg('Logo cropped successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Cropping failed.');
    } finally {
      setIsSavingCrop(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. CONFIRM & SAVE OFFICIAL ASSET
  // --------------------------------------------------------------------------
  const handleConfirmOfficialLogo = async () => {
    if (!activePreviewUrl) {
      setErrorMsg('No active logo preview to confirm.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const isPrim = setAsPrimary || logoVariation === 'Primary Logo' || assets.length === 0;

      const payload = {
        original_path: activeOriginalPath || activePreviewUrl,
        raster_path: activePreviewUrl,
        file_name: logoName.trim() || 'Official Brand Logo',
        asset_type: logoVariation,
        variation_type: logoVariation,
        description: logoDescription.trim() || `${logoVariation} for official brand governance`,
        is_primary: isPrim
      };

      const res: BrandAsset = await apiRequest('/brand/logos/confirm', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(`Official ${logoVariation} confirmed and saved successfully.`);
      setProcessResult(null);
      setSelectedCandidate(null);
      setActivePreviewUrl(null);
      setLogoName('');
      setLogoDescription('');
      setSetAsPrimary(false);

      await fetchBrandAssets();
      if (onLogoUpdated) {
        onLogoUpdated(res.raster_path || res.file_path);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to confirm official logo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. ASSET MANAGEMENT ACTIONS (Set Primary, Rename, Delete)
  // --------------------------------------------------------------------------
  const handleSetPrimary = async (assetId: number) => {
    try {
      const res: BrandAsset = await apiRequest(`/brand/assets/${assetId}/set-primary`, {
        method: 'POST'
      });
      setSuccessMsg(`"${res.file_name}" set as official Primary Logo.`);
      await fetchBrandAssets();
      if (onLogoUpdated) {
        onLogoUpdated(res.raster_path || res.file_path);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update primary logo.');
    }
  };

  const handleSaveEdit = async (assetId: number) => {
    try {
      await apiRequest(`/brand/assets/${assetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          file_name: editName.trim(),
          variation_type: editVariation
        })
      });
      setEditingAssetId(null);
      setSuccessMsg('Asset details updated.');
      await fetchBrandAssets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update asset.');
    }
  };

  const handleDeleteAsset = async (assetId: number, isPrimary: boolean) => {
    const promptMsg = isPrimary
      ? 'This is your Primary Logo. Deleting it will designate the next available variation as primary. Proceed?'
      : 'Remove this brand logo variation?';
    if (!confirm(promptMsg)) return;

    try {
      await apiRequest(`/brand/assets/${assetId}`, { method: 'DELETE' });
      setSuccessMsg('Asset removed.');
      await fetchBrandAssets();
      if (onLogoUpdated) {
        onLogoUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete asset.');
    }
  };

  const primaryLogo = assets.find(a => a.is_primary || a.variation_type === 'Primary Logo');
  const alternateLogos = assets.filter(a => a.id !== primaryLogo?.id);

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between animate-in fade-in">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error: </span>
              <span>{errorMsg}</span>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* UPLOAD ZONE & METHODS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!activePreviewUrl && !processResult?.candidates?.length && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-[#315C76] bg-[#F0F7FB]'
                : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#94A3B8] hover:bg-[#F1F5F9]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.tiff,.tif,.pdf,.docx,.pptx"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2F8] text-[#315C76] mx-auto flex items-center justify-center shadow-2xs">
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                )}
              </div>

              <div>
                <h4 className="text-[14px] font-bold text-[#172033] font-heading">
                  {isProcessing ? 'Processing & Extracting Logo Asset...' : 'Upload Official Company Logo'}
                </h4>
                <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed">
                  Drag and drop your logo file, vector asset, or brand guidelines document.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Browse Device</span>
                </button>

                {assets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLibraryModal(true)}
                    className="px-3.5 py-2 bg-white border border-[#CBD5E1] text-[#315C76] hover:bg-[#F8FAFC] text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Select From Asset Library</span>
                  </button>
                )}
              </div>

              {/* Supported format pills */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="text-[10.5px] uppercase tracking-wider font-bold text-[#64748B] mb-1.5">
                  Supported Formats (Auto-Processed &amp; Rasterized)
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 text-[10.5px]">
                  {SUPPORTED_EXTENSIONS_DISPLAY.map((fmt) => (
                    <span
                      key={fmt}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] font-medium text-[#475569]"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CANDIDATE SELECTOR (MULTI-IMAGE PDF / DOCX / PPTX) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {processResult?.status === 'candidates_found' && processResult.candidates && (
        <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#315C76]" />
              <div>
                <h4 className="text-[13.5px] font-bold text-[#172033]">
                  Select Official Logo from Document ({processResult.candidates.length} Found)
                </h4>
                <p className="text-[11.5px] text-[#64748B]">
                  We extracted all embedded image assets from "{processResult.file_name}". Pick the correct logo mark below.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setProcessResult(null); setActivePreviewUrl(null); }}
              className="text-xs text-[#64748B] hover:text-[#172033] px-2.5 py-1 rounded-lg border border-[#CBD5E1]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {processResult.candidates.map((cand) => {
              const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => handleSelectCandidate(cand)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'border-[#315C76] bg-[#F0F7FB] ring-2 ring-[#315C76]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="h-24 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden p-1 relative">
                    <img
                      src={formatAssetUrl(cand.preview_url)}
                      alt={cand.source_name}
                      className="max-h-full max-w-full object-contain"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-5 h-5 bg-[#315C76] text-white rounded-full flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <div className="font-bold text-[#172033] truncate">{cand.page_or_slide}</div>
                    <div className="text-[#64748B] text-[10px]">
                      {cand.width} × {cand.height} px • {(cand.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PREVIEW, CROP & CONFIRMATION PANEL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activePreviewUrl && (
        <div className="p-5 bg-white border border-[#CBD5E1] rounded-2xl shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#315C76]">
                Automatic Processing Complete
              </span>
              <h4 className="text-[15px] font-bold text-[#172033] font-heading">
                Review &amp; Confirm Official Logo Asset
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCropping(!isCropping)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center space-x-1 ${
                  isCropping
                    ? 'bg-[#315C76] text-white border-[#315C76]'
                    : 'bg-white text-[#315C76] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{isCropping ? 'Close Cropper' : 'Crop / Adjust Region'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActivePreviewUrl(null); setProcessResult(null); }}
                className="p-1.5 text-[#94A3B8] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Interactive Preview with Backdrop Switcher */}
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#172033]">Preview Representation:</span>
                {/* Backdrop Switcher */}
                <div className="flex items-center space-x-1 bg-[#F1F5F9] p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewBackdrop('checker')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      previewBackdrop === 'checker' ? 'bg-white shadow-xs text-[#172033]' : 'text-[#64748B]'
                    }`}
                  >
                    Checkerboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBackdrop('white')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      previewBackdrop === 'white' ? 'bg-white shadow-xs text-[#172033]' : 'text-[#64748B]'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBackdrop('dark')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      previewBackdrop === 'dark' ? 'bg-white shadow-xs text-[#172033]' : 'text-[#64748B]'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Preview Canvas Box */}
              <div
                className={`h-52 rounded-xl border border-[#CBD5E1] flex items-center justify-center p-4 relative overflow-hidden transition-colors ${
                  previewBackdrop === 'dark'
                    ? 'bg-[#0F172A]'
                    : previewBackdrop === 'white'
                    ? 'bg-[#FFFFFF]'
                    : 'bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:12px_12px] bg-[#F8FAFC]'
                }`}
              >
                <img
                  src={formatAssetUrl(activePreviewUrl)}
                  alt="Logo Preview"
                  className="max-h-full max-w-full object-contain drop-shadow-xs"
                />

                {/* Crop overlay if cropping enabled */}
                {isCropping && (
                  <div
                    className="absolute border-2 border-dashed border-[#38BDF8] bg-sky-400/15 cursor-move pointer-events-none"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`
                    }}
                  >
                    <span className="absolute -top-5 left-0 bg-[#0F172A] text-[#38BDF8] text-[9.5px] font-bold px-1.5 py-0.5 rounded">
                      Crop Area ({cropBox.width}% × {cropBox.height}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Crop Controls if cropping */}
              {isCropping && (
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-[#172033] flex items-center justify-between">
                    <span>Adjust Crop Sliders (%):</span>
                    <button
                      type="button"
                      onClick={() => setCropBox({ x: 5, y: 5, width: 90, height: 90 })}
                      className="text-[10.5px] text-[#315C76] hover:underline"
                    >
                      Reset Box
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[#64748B]">X Origin: {cropBox.x}%</label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={cropBox.x}
                        onChange={(e) => setCropBox({ ...cropBox, x: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[#64748B]">Y Origin: {cropBox.y}%</label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={cropBox.y}
                        onChange={(e) => setCropBox({ ...cropBox, y: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[#64748B]">Width: {cropBox.width}%</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={cropBox.width}
                        onChange={(e) => setCropBox({ ...cropBox, width: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[#64748B]">Height: {cropBox.height}%</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={cropBox.height}
                        onChange={(e) => setCropBox({ ...cropBox, height: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={isSavingCrop}
                    className="w-full py-1.5 bg-[#315C76] text-white rounded-lg font-semibold hover:bg-[#183B59] transition-all"
                  >
                    {isSavingCrop ? 'Applying Crop...' : 'Apply Crop & Recalibrate'}
                  </button>
                </div>
              )}
            </div>

            {/* Right: Variation Configuration & Metadata */}
            <div className="md:col-span-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">
                  Asset Title *
                </label>
                <input
                  type="text"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  placeholder="e.g. Acme Corp Master Mark"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">
                  Logo Variation Type *
                </label>
                <select
                  value={logoVariation}
                  onChange={(e) => setLogoVariation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#172033]"
                >
                  <option value="Primary Logo">Primary Logo (Official Default Brand Mark)</option>
                  <option value="Secondary Logo">Secondary Logo (Alternate Lockup / Wordmark)</option>
                  <option value="Icon-Only Logo">Icon-Only Logo (Symbol / Monogram / Badge)</option>
                  <option value="Light-Background Logo">Light-Background Logo (Dark mark for white/light layouts)</option>
                  <option value="Dark-Background Logo">Dark-Background Logo (Light mark for dark/navy layouts)</option>
                </select>
                <p className="text-[10.5px] text-[#64748B] mt-1">
                  Categorizing variations allows the AI Audit to test content against the right colorway without false contrast flags.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">
                  Description / Clear Space Notes
                </label>
                <input
                  type="text"
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  placeholder="e.g. Master SVG with 24px exclusion zone, approved for external print & social"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#172033]"
                />
              </div>

              <div className="p-3 bg-[#F0F7FB] border border-[#CBD5E1] rounded-xl flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="set-primary-checkbox"
                  checked={setAsPrimary || logoVariation === 'Primary Logo'}
                  onChange={(e) => setSetAsPrimary(e.target.checked)}
                  disabled={logoVariation === 'Primary Logo'}
                  className="rounded text-[#315C76] focus:ring-[#315C76]"
                />
                <label htmlFor="set-primary-checkbox" className="text-xs text-[#172033] cursor-pointer">
                  <span className="font-bold">Designate as Official Primary Logo</span>
                  <span className="block text-[11px] text-[#64748B]">
                    Will serve as the master benchmark for automated vision audits.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmOfficialLogo}
                  disabled={isProcessing || !logoName.trim()}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Save Official Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePreviewUrl(null); setProcessResult(null); }}
                  className="px-4 py-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64748B] font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* REGISTERED LOGOS GALLERY & MANAGEMENT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
          <div>
            <h4 className="text-[14px] font-bold text-[#172033] font-heading">
              Official Registered Logos ({assets.length})
            </h4>
            <p className="text-[12px] text-[#64748B]">
              These verified assets are checked by the AI vision engine during creative audits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-[#315C76] hover:text-[#183B59] flex items-center space-x-1 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Add Variation</span>
          </button>
        </div>

        {loadingAssets ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#315C76]" />
            <span>Loading registered brand assets...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-center space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto text-[#94A3B8]" />
            <div className="text-xs font-bold text-[#172033]">No Official Logos Registered Yet</div>
            <p className="text-[11.5px] text-[#64748B] max-w-sm mx-auto">
              Upload your company logo in PNG, JPG, SVG, WEBP, or extract it from a PDF guide above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => {
              const isPrimary = asset.is_primary || asset.variation_type === 'Primary Logo';
              const isEditing = editingAssetId === asset.id;

              return (
                <div
                  key={asset.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isPrimary
                      ? 'border-[#315C76] bg-[#FFFFFF] shadow-sm ring-1 ring-[#315C76]/20'
                      : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        isPrimary
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-[#475569]'
                      }`}
                    >
                      {isPrimary && <Star className="w-3 h-3 fill-current text-emerald-600 mr-0.5" />}
                      <span>{asset.variation_type || asset.asset_type}</span>
                    </span>

                    <span className="text-[10px] font-semibold text-[#64748B] uppercase px-1.5 py-0.5 bg-[#F1F5F9] rounded">
                      {asset.source_format || 'PNG'}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewModalAsset(asset)}
                    className="h-28 rounded-xl bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:10px_10px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center p-3 cursor-pointer group relative overflow-hidden"
                    title="Click to view full preview"
                  >
                    <img
                      src={formatAssetUrl(asset.raster_path || asset.file_path)}
                      alt={asset.file_name}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Inspect</span>
                    </div>
                  </div>

                  {/* Asset Details or Edit Mode */}
                  {isEditing ? (
                    <div className="space-y-2 text-xs">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border border-[#CBD5E1] rounded-lg text-xs"
                      />
                      <select
                        value={editVariation}
                        onChange={(e) => setEditVariation(e.target.value)}
                        className="w-full px-2 py-1 border border-[#CBD5E1] rounded-lg text-xs"
                      >
                        <option value="Primary Logo">Primary Logo</option>
                        <option value="Secondary Logo">Secondary Logo</option>
                        <option value="Icon-Only Logo">Icon-Only Logo</option>
                        <option value="Light-Background Logo">Light-Background Logo</option>
                        <option value="Dark-Background Logo">Dark-Background Logo</option>
                      </select>
                      <div className="flex items-center space-x-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(asset.id)}
                          className="px-2.5 py-1 bg-[#315C76] text-white rounded text-[11px] font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAssetId(null)}
                          className="px-2.5 py-1 border border-[#CBD5E1] rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-[#172033] truncate" title={asset.file_name}>
                        {asset.file_name}
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                        <span>{asset.width && asset.height ? `${asset.width} × ${asset.height} px` : 'Vector/Doc'}</span>
                        <span>{asset.file_size ? `${(asset.file_size / 1024).toFixed(0)} KB` : ''}</span>
                      </div>
                      {asset.description && (
                        <p className="text-[11px] text-[#64748B] truncate" title={asset.description}>
                          {asset.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(asset.id)}
                        className="text-[11px] font-bold text-[#315C76] hover:text-[#183B59] flex items-center space-x-1 cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                        <span>Set Primary</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Active Master</span>
                      </span>
                    )}

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAssetId(asset.id);
                          setEditName(asset.file_name);
                          setEditVariation(asset.variation_type || asset.asset_type);
                        }}
                        className="text-[#64748B] hover:text-[#172033]"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id, isPrimary)}
                        className="text-[#94A3B8] hover:text-rose-600 transition-colors"
                        title="Delete variation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FULLSCREEN PREVIEW MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {previewModalAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#315C76] uppercase tracking-wider">
                  {previewModalAsset.variation_type || previewModalAsset.asset_type}
                </span>
                <h4 className="text-[16px] font-bold text-[#172033] font-heading">
                  {previewModalAsset.file_name}
                </h4>
              </div>
              <button
                onClick={() => setPreviewModalAsset(null)}
                className="p-1.5 text-[#64748B] hover:text-[#172033] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-64 rounded-xl bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:12px_12px] bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center p-4 overflow-hidden">
              <img
                src={formatAssetUrl(previewModalAsset.raster_path || previewModalAsset.file_path)}
                alt={previewModalAsset.file_name}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-[10.5px] text-[#64748B] block">Format</span>
                <span className="font-bold text-[#172033]">{previewModalAsset.source_format || 'PNG'}</span>
              </div>
              <div>
                <span className="text-[10.5px] text-[#64748B] block">Dimensions</span>
                <span className="font-bold text-[#172033]">
                  {previewModalAsset.width && previewModalAsset.height ? `${previewModalAsset.width} × ${previewModalAsset.height} px` : 'Vector'}
                </span>
              </div>
              <div>
                <span className="text-[10.5px] text-[#64748B] block">Primary Status</span>
                <span className={`font-bold ${previewModalAsset.is_primary ? 'text-emerald-700' : 'text-[#64748B]'}`}>
                  {previewModalAsset.is_primary ? 'Master Benchmark' : 'Alternate'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={formatAssetUrl(previewModalAsset.file_path)}
                download={previewModalAsset.file_name}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#315C76] text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Original Asset</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewModalAsset(null)}
                className="px-4 py-2 bg-[#315C76] text-white text-xs font-semibold rounded-xl hover:bg-[#183B59]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ASSET LIBRARY SELECTOR MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h4 className="text-[15px] font-bold text-[#172033] font-heading">
                  Company Brand Asset Library
                </h4>
                <p className="text-[12px] text-[#64748B]">
                  Select an asset to set as primary benchmark or configure alternate variations.
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="p-1.5 text-[#64748B] hover:text-[#172033]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    handleSetPrimary(asset.id);
                    setShowLibraryModal(false);
                  }}
                  className="p-3 border border-[#E2E8F0] rounded-xl hover:border-[#315C76] hover:bg-[#F0F7FB] cursor-pointer transition-all space-y-2 group"
                >
                  <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center p-2 overflow-hidden">
                    <img
                      src={formatAssetUrl(asset.raster_path || asset.file_path)}
                      alt={asset.file_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-[11px]">
                    <div className="font-bold text-[#172033] truncate">{asset.file_name}</div>
                    <div className="text-[#64748B] text-[10px]">{asset.variation_type || asset.asset_type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
