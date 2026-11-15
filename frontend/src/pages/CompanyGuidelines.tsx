import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, FileText, Upload, Plus, Trash2, 
  CheckCircle2, AlertTriangle, Eye, RefreshCw, Sparkles, 
  MessageSquare, Tag, Check, X, ArrowUpRight, FileCheck, 
  Layers, Image as ImageIcon, HelpCircle, ChevronDown, 
  ChevronUp, Lock, Sliders, Award, BookOpen, ExternalLink,
  Info, ToggleLeft, ToggleRight
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { BrandGuideline, BrandAsset, ApprovedClaim, BrandProfile } from '../types';
import { FlexibleLogoManager } from '../components/brand/FlexibleLogoManager';

interface VocabularyEngineState {
  restricted_words: string[];
  prohibited_claims: string[];
  approved_terminology: string[];
  preferred_phrases: string[];
  human_verification_required: string[];
}

export const CompanyGuidelines: React.FC = () => {
  const { brandProfile, organisation, refreshProfile } = useAuth();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingVocab, setSavingVocab] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Success Feedback States
  const [identitySuccess, setIdentitySuccess] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [vocabSuccess, setVocabSuccess] = useState(false);

  // Data Collections
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ApprovedClaim[]>([]);

  // 1. Brand Identity State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // 2. Brand Voice & Communication State
  const [brandPersonality, setBrandPersonality] = useState('Visionary, Rigorous, Transparent, Modern');
  const [toneOfVoice, setToneOfVoice] = useState('Authoritative, Trustworthy, Innovative');
  const [writingStyle, setWritingStyle] = useState('Active voice, concise sentences, data-backed claims, zero hype');
  const [audiencePreferences, setAudiencePreferences] = useState('Executive clarity, rigorous factual verification, transparent methodology');
  const [preferredLanguage, setPreferredLanguage] = useState('English (Global / US)');
  const [approvedMessages, setApprovedMessages] = useState<string[]>([
    'Delivering verified autonomous brand intelligence with zero compromise.',
    'Continuous brand governance before and after publication.'
  ]);
  const [newMessageInput, setNewMessageInput] = useState('');

  // 3. Categorized Vocabulary State
  const [activeVocabTab, setActiveVocabTab] = useState<keyof VocabularyEngineState>('restricted_words');
  const [vocabState, setVocabState] = useState<VocabularyEngineState>({
    restricted_words: ['miracle', 'cheat', 'unlimited', 'revolutionary', 'hack'],
    prohibited_claims: ['100% guaranteed', 'cheapest on earth', 'zero risk', 'instant cure', 'foolproof'],
    approved_terminology: ['Enterprise-grade', 'RAG-grounded', 'Substantiated', 'Net-Zero certified', 'Autonomous audit'],
    preferred_phrases: ['verified by rigorous testing', 'audited brand performance', 'substantiated with proof'],
    human_verification_required: ['patented', 'clinical', 'medical-grade', 'certified ISO', 'guaranteed ROI']
  });
  const [newVocabInput, setNewVocabInput] = useState('');

  // 4. Guideline Upload State
  const [docVersion, setDocVersion] = useState('1.1');
  const [docCategory, setDocCategory] = useState('Master Guidelines');

  // 5. Approved Claims State
  const [selectedClaimCategory, setSelectedClaimCategory] = useState('All');
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimCategory, setNewClaimCategory] = useState('Product Performance');
  const [newClaimRef, setNewClaimRef] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Asset Upload Modal / Direct State
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [targetAssetType, setTargetAssetType] = useState<'Primary Logo' | 'Alternate Logo' | 'Product Image'>('Primary Logo');
  const [assetDescription, setAssetDescription] = useState('');

  // Helper to format uploaded file paths
  const formatAssetUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return path;
    const match = path.match(/[/\\]uploads[/\\](.+)$/i);
    if (match) {
      return `/uploads/${match[1].replace(/\\/g, '/')}`;
    }
    return path;
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profileRes, guidelinesRes, assetsRes, claimsRes] = await Promise.all([
        apiRequest('/brand/profile').catch(() => null),
        apiRequest('/brand/guidelines').catch(() => []),
        apiRequest('/brand/assets').catch(() => []),
        apiRequest('/brand/approved-claims').catch(() => [])
      ]);

      if (profileRes) {
        setCompanyName(profileRes.company_name || organisation?.name || 'Nexus Dynamics Inc');
        setIndustry(profileRes.industry || organisation?.industry || 'Enterprise Software & Autonomous AI');
        setMissionStatement(profileRes.mission_statement || 'Empowering enterprises with continuous, real-time AI brand safety, compliance verification, and reputational protection.');
        setTargetAudience(profileRes.target_audience || 'Chief Brand Officers, Marketing Directors, Legal & Compliance Officers, Enterprise Teams');
        if (profileRes.tone_of_voice) setToneOfVoice(profileRes.tone_of_voice);

        // Parse communication rules if structured JSON
        if (profileRes.communication_rules) {
          try {
            const parsed = JSON.parse(profileRes.communication_rules);
            if (parsed.brand_personality) setBrandPersonality(parsed.brand_personality);
            if (parsed.writing_style) setWritingStyle(parsed.writing_style);
            if (parsed.audience_preferences) setAudiencePreferences(parsed.audience_preferences);
            if (parsed.preferred_language) setPreferredLanguage(parsed.preferred_language);
            if (Array.isArray(parsed.example_approved_messages)) setApprovedMessages(parsed.example_approved_messages);
            if (parsed.vocabulary_sections) {
              setVocabState(prev => ({
                ...prev,
                ...parsed.vocabulary_sections
              }));
            }
          } catch {
            // Raw text fallback
            setWritingStyle(profileRes.communication_rules);
          }
        }

        // If restricted_words exists and vocabulary_sections wasn't loaded from JSON, seed from profile
        if (profileRes.restricted_words && !profileRes.communication_rules) {
          const words = profileRes.restricted_words.split(',').map((w: string) => w.trim()).filter(Boolean);
          if (words.length) {
            setVocabState(prev => ({ ...prev, restricted_words: words }));
          }
        }
      }

      setGuidelines(guidelinesRes || []);
      setAssets(assetsRes || []);
      setApprovedClaims(claimsRes || []);
    } catch (err) {
      console.error('Error loading brand knowledge', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. SAVE BRAND IDENTITY
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIdentity(true);
    setIdentitySuccess(false);

    try {
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          company_name: companyName,
          industry,
          mission_statement: missionStatement,
          target_audience: targetAudience
        })
      });

      await refreshProfile();
      setIdentitySuccess(true);
      setTimeout(() => setIdentitySuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update brand identity.');
    } finally {
      setSavingIdentity(false);
    }
  };

  // 2. SAVE BRAND VOICE & EDITORIAL STYLE
  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVoice(true);
    setVoiceSuccess(false);

    try {
      const commRulesPayload = {
        brand_personality: brandPersonality,
        writing_style: writingStyle,
        audience_preferences: audiencePreferences,
        preferred_language: preferredLanguage,
        example_approved_messages: approvedMessages,
        vocabulary_sections: vocabState
      };

      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          tone_of_voice: toneOfVoice,
          communication_rules: JSON.stringify(commRulesPayload)
        })
      });

      await refreshProfile();
      setVoiceSuccess(true);
      setTimeout(() => setVoiceSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save brand voice configuration.');
    } finally {
      setSavingVoice(false);
    }
  };

  // 3. SAVE CATEGORIZED VOCABULARY
  const handleSaveVocab = async () => {
    setSavingVocab(true);
    setVocabSuccess(false);

    try {
      // Sync restricted + prohibited into comma-separated string for vision/text engine
      const mergedRestricted = Array.from(new Set([...vocabState.restricted_words, ...vocabState.prohibited_claims])).join(', ');
      const mergedApproved = Array.from(new Set([...vocabState.approved_terminology, ...vocabState.preferred_phrases])).join(', ');

      const commRulesPayload = {
        brand_personality: brandPersonality,
        writing_style: writingStyle,
        audience_preferences: audiencePreferences,
        preferred_language: preferredLanguage,
        example_approved_messages: approvedMessages,
        vocabulary_sections: vocabState
      };

      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          restricted_words: mergedRestricted,
          approved_vocabulary: mergedApproved,
          communication_rules: JSON.stringify(commRulesPayload)
        })
      });

      await refreshProfile();
      setVocabSuccess(true);
      setTimeout(() => setVocabSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save vocabulary rules.');
    } finally {
      setSavingVocab(false);
    }
  };

  const handleAddVocabWord = () => {
    const trimmed = newVocabInput.trim();
    if (!trimmed) return;
    if (vocabState[activeVocabTab].includes(trimmed)) {
      setNewVocabInput('');
      return;
    }
    setVocabState(prev => ({
      ...prev,
      [activeVocabTab]: [...prev[activeVocabTab], trimmed]
    }));
    setNewVocabInput('');
  };

  const handleRemoveVocabWord = (category: keyof VocabularyEngineState, word: string) => {
    setVocabState(prev => ({
      ...prev,
      [category]: prev[category].filter(w => w !== word)
    }));
  };

  const handleAddMessage = () => {
    const trimmed = newMessageInput.trim();
    if (!trimmed) return;
    setApprovedMessages(prev => [...prev, trimmed]);
    setNewMessageInput('');
  };

  const handleRemoveMessage = (index: number) => {
    setApprovedMessages(prev => prev.filter((_, idx) => idx !== index));
  };

  // 4. ASSET UPLOAD & MANAGEMENT
  const handleUploadAssetFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'Primary Logo' | 'Alternate Logo' | 'Product Image') => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingAsset(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('asset_type', type);
      formData.append('description', assetDescription || `${type} for ${companyName}`);
      formData.append('is_primary', type === 'Primary Logo' ? 'true' : 'false');

      await apiRequest('/brand/assets', {
        method: 'POST',
        body: formData
      });

      const updated = await apiRequest('/brand/assets');
      setAssets(updated || []);
      await refreshProfile();
      setShowAddAssetModal(false);
      setAssetDescription('');
    } catch (err: any) {
      alert(err.message || 'Asset upload failed.');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Remove this official brand asset?')) return;
    try {
      await apiRequest(`/brand/assets/${id}`, { method: 'DELETE' });
      setAssets(prev => prev.filter(a => a.id !== id));
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Delete asset failed.');
    }
  };

  // 5. GUIDELINE DOCUMENT UPLOAD & MANAGEMENT
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', docVersion);
      formData.append('category', docCategory);

      await apiRequest('/brand/guidelines', {
        method: 'POST',
        body: formData
      });

      const updated = await apiRequest('/brand/guidelines');
      setGuidelines(updated || []);
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Document upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleToggleDocActive = async (id: number) => {
    try {
      await apiRequest(`/brand/guidelines/${id}/toggle-active`, { method: 'PATCH' });
      setGuidelines(prev => prev.map(g => g.id === id ? { ...g, is_active: !g.is_active } : g));
    } catch (err: any) {
      alert(err.message || 'Could not toggle document status.');
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('Permanently remove this guideline document from Brand Knowledge Base?')) return;
    try {
      await apiRequest(`/brand/guidelines/${id}`, { method: 'DELETE' });
      setGuidelines(prev => prev.filter(g => g.id !== id));
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Delete guideline failed.');
    }
  };

  // 6. APPROVED CLAIMS MANAGEMENT
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimText.trim()) return;
    setSubmittingClaim(true);

    try {
      await apiRequest('/brand/approved-claims', {
        method: 'POST',
        body: JSON.stringify({
          claim_text: newClaimText.trim(),
          category: newClaimCategory,
          source_reference: newClaimRef.trim() || 'Internal Compliance Verification'
        })
      });

      const updated = await apiRequest('/brand/approved-claims');
      setApprovedClaims(updated || []);
      setShowAddClaimModal(false);
      setNewClaimText('');
      setNewClaimRef('');
    } catch (err: any) {
      alert(err.message || 'Could not register approved claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleToggleClaimActive = async (id: number) => {
    try {
      await apiRequest(`/brand/approved-claims/${id}/toggle-active`, { method: 'PATCH' });
      setApprovedClaims(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
    } catch (err: any) {
      alert(err.message || 'Toggle claim status failed.');
    }
  };

  const handleDeleteClaim = async (id: number) => {
    if (!confirm('Remove this approved claim from the authoritative registry?')) return;
    try {
      await apiRequest(`/brand/approved-claims/${id}`, { method: 'DELETE' });
      setApprovedClaims(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Delete claim failed.');
    }
  };

  // Filter Assets by Type
  const primaryLogoAsset = assets.find(a => a.asset_type === 'Primary Logo' || a.is_primary) || 
    (brandProfile?.logo_path ? { id: 0, asset_type: 'Primary Logo', file_name: 'Primary Brand Logo', file_path: brandProfile.logo_path, file_size: 0, is_primary: true, created_at: '' } as BrandAsset : undefined);
  
  const alternateLogoAsset = assets.find(a => a.asset_type === 'Alternate Logo');
  const productAssets = assets.filter(a => a.asset_type === 'Product Image');

  const filteredClaims = selectedClaimCategory === 'All' 
    ? approvedClaims 
    : approvedClaims.filter(c => c.category === selectedClaimCategory);

  const vocabTabLabels: Record<keyof VocabularyEngineState, { title: string; color: string; desc: string }> = {
    restricted_words: {
      title: 'Restricted Words',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      desc: 'Words flagged as non-compliant or hazardous in marketing copy.'
    },
    prohibited_claims: {
      title: 'Prohibited Claims',
      color: 'text-amber-800 bg-amber-50 border-amber-200',
      desc: 'Unsubstantiated superlative claims forbidden by legal policy.'
    },
    approved_terminology: {
      title: 'Approved Terminology',
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      desc: 'Standardized official company terms encouraged in brand communications.'
    },
    preferred_phrases: {
      title: 'Preferred Phrases',
      color: 'text-[#315C76] bg-[#EAF2F8] border-[#CBD5E1]',
      desc: 'High-performing, pre-approved positioning phrases for campaign copy.'
    },
    human_verification_required: {
      title: 'Needs Verification',
      color: 'text-purple-800 bg-purple-50 border-purple-200',
      desc: 'Terms that trigger mandatory human sign-off before publication.'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[13px] text-[#64748B] font-medium">
        Loading authoritative brand configuration...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 select-none animate-in fade-in duration-300">
      
      {/* 1. Header with Status & Ground Truth Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EAF2F8] border border-[#CBD5E1] text-[11px] font-semibold uppercase tracking-wider text-[#315C76] mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Authoritative Ground Truth Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#172033] tracking-tight">
            Company Guidelines &amp; Knowledge Base
          </h1>
          <p className="text-[13.5px] sm:text-[14px] text-[#64748B] mt-0.5 max-w-3xl leading-relaxed">
            Configure the verified brand ground truth, official assets, approved claims, and categorized vocabulary. This authoritative repository directly powers BrandGuard AI's vision audit and RAG claim verification models.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xs flex items-center space-x-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#239B6B]" />
            <span className="text-[#172033] font-semibold">
              {brandProfile?.is_configured ? 'Active in AI Engine' : 'Setup Incomplete'}
            </span>
          </div>
          <button
            onClick={loadAllData}
            className="p-2 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#315C76] transition-colors shadow-2xs cursor-pointer"
            title="Reload latest brand guidelines"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Professional Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ===================================================================
            LEFT COLUMN (Cols 1-6): Brand Identity, Voice & Categorized Vocabulary
           =================================================================== */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* A. Brand Identity & Assets Card */}
          <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold font-heading text-[#172033]">
                    Brand Identity &amp; Assets
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Official logos, product references, and corporate profile</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#315C76] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full">
                AI Vision Reference
              </span>
            </div>

            {/* Flexible Official Company Logos Section */}
            <div className="pt-2">
              <FlexibleLogoManager onLogoUpdated={refreshProfile} />
            </div>

            {/* Product Image References Gallery */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[12.5px] font-bold text-[#172033] uppercase tracking-wider block">
                    Product Reference Assets ({productAssets.length})
                  </label>
                  <p className="text-[11.5px] text-[#64748B]">Verified product packaging and hardware imagery for AI visual matching</p>
                </div>

                <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-[#315C76] text-xs font-semibold hover:bg-[#F8FAFC] shadow-2xs flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product Asset</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleUploadAssetFile(e, 'Product Image')} 
                    disabled={uploadingAsset}
                  />
                </label>
              </div>

              {productAssets.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs text-[#64748B]">
                  No product images uploaded yet. Add official packshots to teach the AI vision detector what your physical products look like.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-44 overflow-y-auto p-1">
                  {productAssets.map((pa) => (
                    <div key={pa.id} className="relative rounded-lg border border-[#E2E8F0] bg-white p-1.5 group overflow-hidden">
                      <div className="h-16 flex items-center justify-center">
                        <img src={formatAssetUrl(pa.file_path)} alt={pa.file_name} className="max-h-full object-contain" />
                      </div>
                      <div className="text-[10px] text-[#172033] font-medium truncate mt-1 text-center">{pa.file_name}</div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(pa.id)}
                        className="absolute top-1 right-1 p-1 bg-white/90 text-rose-600 rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove product asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Corporate Profile Form */}
            <form onSubmit={handleSaveIdentity} className="space-y-3.5 pt-2 border-t border-[#F1F5F9]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Official Company Name
                  </label>
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="e.g. Nexus Dynamics Inc"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] font-medium focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Industry / Business Category
                  </label>
                  <input 
                    type="text" 
                    value={industry} 
                    onChange={(e) => setIndustry(e.target.value)} 
                    placeholder="e.g. Enterprise Software, CleanTech"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] font-medium focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Short Company Description &amp; Mission
                </label>
                <textarea 
                  rows={2} 
                  value={missionStatement} 
                  onChange={(e) => setMissionStatement(e.target.value)} 
                  placeholder="Concise statement explaining what the company builds, represents, and promises to customers..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Primary Target Audience
                </label>
                <input 
                  type="text" 
                  value={targetAudience} 
                  onChange={(e) => setTargetAudience(e.target.value)} 
                  placeholder="e.g. Fortune 500 CIOs, Brand Marketing Directors, Compliance Officers"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] focus:ring-1 focus:ring-[#315C76]"
                />
              </div>

              {identitySuccess && (
                <div className="p-2.5 bg-[#EAF7F1] border border-[#BDE7D4] text-[#239B6B] rounded-xl text-xs flex items-center space-x-2 font-medium animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Company identity updated and synchronized with AI engine!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingIdentity}
                className="w-full py-2.5 bg-[#172333] hover:bg-[#253244] disabled:opacity-50 text-white text-[13px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {savingIdentity ? 'Saving Identity...' : 'Save Brand Identity'}
              </button>
            </form>
          </Card>

          {/* B. Brand Voice & Communication Card */}
          <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold font-heading text-[#172033]">
                    Brand Voice &amp; Communication
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Editorial personality, tone, writing style, and approved messages</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveVoice} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Brand Personality
                  </label>
                  <input 
                    type="text" 
                    value={brandPersonality} 
                    onChange={(e) => setBrandPersonality(e.target.value)} 
                    placeholder="e.g. Visionary, Rigorous, Transparent"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Communication Tone
                  </label>
                  <input 
                    type="text" 
                    value={toneOfVoice} 
                    onChange={(e) => setToneOfVoice(e.target.value)} 
                    placeholder="e.g. Authoritative, Inspiring, Precise"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Writing Style &amp; Syntax Rules
                  </label>
                  <input 
                    type="text" 
                    value={writingStyle} 
                    onChange={(e) => setWritingStyle(e.target.value)} 
                    placeholder="e.g. Active voice, concise sentences, no hyperbole"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Preferred Language &amp; Dialect
                  </label>
                  <select 
                    value={preferredLanguage} 
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76] cursor-pointer"
                  >
                    <option value="English (Global / US)">English (Global / US)</option>
                    <option value="English (UK / Commonwealth)">English (UK / Commonwealth)</option>
                    <option value="Bilingual (English / Spanish)">Bilingual (English / Spanish)</option>
                    <option value="Multilingual Enterprise">Multilingual Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Audience Communication Preferences
                </label>
                <textarea 
                  rows={2} 
                  value={audiencePreferences} 
                  onChange={(e) => setAudiencePreferences(e.target.value)} 
                  placeholder="e.g. Clear factual summaries, verified performance metrics, zero sensationalism..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              {/* Example Approved Brand Messages */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Approved Brand Messages &amp; Taglines ({approvedMessages.length})
                </label>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    value={newMessageInput} 
                    onChange={(e) => setNewMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMessage())}
                    placeholder="Enter approved marketing message or tagline..."
                    className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddMessage}
                    className="px-3 py-2 bg-[#EAF2F8] text-[#315C76] font-semibold text-xs rounded-xl hover:bg-[#D5E6F3] border border-[#CBD5E1] transition-colors cursor-pointer flex-shrink-0"
                  >
                    Add Message
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {approvedMessages.map((msg, idx) => (
                    <div key={idx} className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs text-[#172033]">
                      <span className="truncate pr-2">"{msg}"</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveMessage(idx)}
                        className="text-[#94A3B8] hover:text-rose-600 cursor-pointer flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {voiceSuccess && (
                <div className="p-2.5 bg-[#EAF7F1] border border-[#BDE7D4] text-[#239B6B] rounded-xl text-xs flex items-center space-x-2 font-medium animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Brand voice &amp; editorial standards updated!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingVoice}
                className="w-full py-2.5 bg-[#172333] hover:bg-[#253244] disabled:opacity-50 text-white text-[13px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {savingVoice ? 'Saving Voice...' : 'Save Voice & Communication Rules'}
              </button>
            </form>
          </Card>

          {/* C. Categorized Brand Vocabulary Engine */}
          <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold font-heading text-[#172033]">
                    Categorized Brand Vocabulary Engine
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Restricted terms, prohibited claims, approved terminology, and sign-off triggers</p>
                </div>
              </div>
            </div>

            {/* Vocabulary Category Selector Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {(Object.keys(vocabTabLabels) as Array<keyof VocabularyEngineState>).map(catKey => {
                const isActive = activeVocabTab === catKey;
                const count = vocabState[catKey].length;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveVocabTab(catKey)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-[#315C76] text-white shadow-2xs' 
                        : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#E2E8F0]'
                    }`}
                  >
                    <span>{vocabTabLabels[catKey].title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`p-2.5 rounded-xl border text-xs ${vocabTabLabels[activeVocabTab].color}`}>
              {vocabTabLabels[activeVocabTab].desc}
            </div>

            {/* Input to Add New Term */}
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={newVocabInput}
                onChange={(e) => setNewVocabInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVocabWord())}
                placeholder={`Type term to add to "${vocabTabLabels[activeVocabTab].title}"...`}
                className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76]"
              />
              <button 
                type="button"
                onClick={handleAddVocabWord}
                className="px-3.5 py-2 bg-[#315C76] hover:bg-[#183B59] text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex-shrink-0"
              >
                Add Term
              </button>
            </div>

            {/* Interactive Pills */}
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] min-h-[90px] max-h-48 overflow-y-auto flex flex-wrap gap-1.5 content-start">
              {vocabState[activeVocabTab].length === 0 ? (
                <div className="text-xs text-[#94A3B8] italic m-auto">
                  No terms registered in this category. Type a word above to add.
                </div>
              ) : (
                vocabState[activeVocabTab].map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[12px] font-semibold text-[#172033] shadow-2xs"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVocabWord(activeVocabTab, word)}
                      className="text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {vocabSuccess && (
              <div className="p-2.5 bg-[#EAF7F1] border border-[#BDE7D4] text-[#239B6B] rounded-xl text-xs flex items-center space-x-2 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Vocabulary synchronized with AI Vision &amp; RAG inspection engines!</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveVocab}
              disabled={savingVocab}
              className="w-full py-2.5 bg-[#172333] hover:bg-[#253244] disabled:opacity-50 text-white text-[13px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {savingVocab ? 'Synchronizing Vocabulary...' : 'Save Vocabulary Rules'}
            </button>
          </Card>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (Cols 7-12): Guidelines Ingestion & Approved Claims
           =================================================================== */}
        <div className="lg:col-span-6 space-y-6">

          {/* D. Guideline Document Ingestion Card */}
          <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2F8] text-[#315C76] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold font-heading text-[#172033]">
                    Upload Guideline Manual
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Ingest official brand manuals into the RAG vector knowledge base</p>
                </div>
              </div>
              <span className="text-[11px] text-[#64748B]">PDF • DOCX • TXT</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Manual Version
                </label>
                <input 
                  type="text" 
                  value={docVersion} 
                  onChange={(e) => setDocVersion(e.target.value)} 
                  placeholder="e.g. 2.1"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Document Category
                </label>
                <select 
                  value={docCategory} 
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] cursor-pointer"
                >
                  <option value="Master Guidelines">Master Guidelines</option>
                  <option value="Product Specifications">Product Specifications</option>
                  <option value="Legal & Disclaimers">Legal &amp; Disclaimers</option>
                  <option value="Brand Voice & Style">Brand Voice &amp; Style</option>
                  <option value="ESG & Sustainability">ESG &amp; Sustainability</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Upload Container */}
            <label className="w-full cursor-pointer p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] hover:border-[#315C76] text-center bg-[#F8FAFC] hover:bg-white transition-all flex flex-col items-center justify-center space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#CBD5E1] group-hover:border-[#315C76] text-[#315C76] flex items-center justify-center shadow-2xs transition-colors">
                <Upload className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="text-[13px] font-bold text-[#172033] font-heading">
                {uploadingDoc ? 'Extracting Sections with RAG...' : 'Choose or Drag Guideline Document'}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Supported formats: PDF, DOCX, TXT (Maximum file size: 50MB)
              </div>
              <input 
                type="file" 
                accept=".pdf,.docx,.txt" 
                onChange={handleDocUpload}
                disabled={uploadingDoc}
                className="hidden" 
              />
            </label>
          </Card>

          {/* E. Approved Claims & Verified Facts Card (High Priority Feature) */}
          <Card className="p-5 sm:p-6 bg-[#FFFFFF] border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF7F1] text-[#239B6B] flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold font-heading text-[#172033]">
                    Approved Claims &amp; Verified Facts
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Substantiated claims that automatically pass AI claim verification</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClaimModal(true)}
                className="px-3 py-1.5 bg-[#239B6B] hover:bg-[#1E835A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1 cursor-pointer self-start sm:self-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Verified Claim</span>
              </button>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {['All', 'Product Performance', 'Certifications', 'Sustainability/SDG', 'Service Level', 'Official Statistics'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedClaimCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex-shrink-0 cursor-pointer ${
                    selectedClaimCategory === cat
                      ? 'bg-[#172333] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#E2E8F0]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Claims List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredClaims.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs text-[#64748B] space-y-1">
                  <Award className="w-6 h-6 text-[#94A3B8] mx-auto opacity-40" />
                  <p className="font-semibold text-[#172033]">No approved claims registered in this category</p>
                  <p>Register official statistics, certifications, or performance numbers to substantiate campaign creatives.</p>
                </div>
              ) : (
                filteredClaims.map((claim) => (
                  <div 
                    key={claim.id} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      claim.is_active 
                        ? 'bg-[#FFFFFF] border-[#E2E8F0] shadow-2xs hover:border-[#CBD5E1]' 
                        : 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10.5px] font-bold text-[#315C76] bg-[#EAF2F8] px-2 py-0.5 rounded-md">
                            {claim.category}
                          </span>
                          <span className="text-[10px] text-[#239B6B] font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified Ground Truth</span>
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-[#172033] leading-snug">
                          "{claim.claim_text}"
                        </p>
                        {claim.source_reference && (
                          <div className="text-[11px] text-[#64748B] flex items-center space-x-1">
                            <FileCheck className="w-3 h-3 text-[#315C76]" />
                            <span>Ref: <strong>{claim.source_reference}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleClaimActive(claim.id)}
                          className="p-1 text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
                          title={claim.is_active ? 'Pause claim' : 'Activate claim'}
                        >
                          {claim.is_active ? (
                            <ToggleRight className="w-5 h-5 text-[#239B6B]" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-[#94A3B8]" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClaim(claim.id)}
                          className="p-1 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove claim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* F. Active Guideline Sources & Knowledge Library Card */}
          <Card className="overflow-hidden bg-[#FFFFFF] border-[#E2E8F0] shadow-xs">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#172033] uppercase tracking-wider font-heading">
                  Active Guideline Sources ({guidelines.length})
                </h3>
                <p className="text-[11.5px] text-[#64748B]">Authoritative indexed sources used by the RAG extraction pipeline</p>
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9] max-h-80 overflow-y-auto">
              {guidelines.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B] space-y-1">
                  <FileText className="w-6 h-6 text-[#94A3B8] mx-auto opacity-50" />
                  <p>No guidelines uploaded yet.</p>
                </div>
              ) : (
                guidelines.map((g) => (
                  <div key={g.id} className="p-4 flex items-center justify-between space-x-4 hover:bg-[#F8FAFC] transition-colors">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF2F8] text-[#315C76] flex items-center justify-center flex-shrink-0 border border-[#CBD5E1]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[13.5px] font-bold text-[#172033] font-heading truncate">{g.document_name}</span>
                          <span className="text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-md uppercase">
                            {g.file_type.replace('.', '')}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B] flex items-center space-x-2">
                          <span>v{g.version}</span>
                          <span>•</span>
                          <span>{Math.round(g.file_size / 1024)} KB</span>
                          <span>•</span>
                          <span className={`font-semibold ${
                            g.processing_status === 'Verified' ? 'text-[#239B6B]' : 'text-[#315C76]'
                          }`}>
                            {g.processing_status}
                          </span>
                        </div>
                        {g.extracted_summary && (
                          <div className="text-[11.5px] text-[#475569] truncate max-w-sm">
                            {g.extracted_summary}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleDocActive(g.id)}
                        className="text-xs text-[#64748B] hover:text-[#172033] p-1 cursor-pointer"
                        title={g.is_active ? 'Guideline Active in RAG' : 'Guideline Paused'}
                      >
                        {g.is_active !== false ? (
                          <span className="text-[10.5px] font-bold bg-[#EAF7F1] text-[#239B6B] px-2 py-0.5 rounded-full border border-[#BDE7D4]">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-bold bg-[#F1F5F9] text-[#94A3B8] px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(g.id)}
                        className="p-1.5 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                        title="Delete guideline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Add New Approved Claim / Verified Fact */}
      <Modal
        isOpen={showAddClaimModal}
        onClose={() => setShowAddClaimModal(false)}
        title="Register Approved Claim or Ground Truth Fact"
      >
        <form onSubmit={handleCreateClaim} className="space-y-4">
          <div className="p-3 bg-[#EAF7F1] border border-[#BDE7D4] rounded-xl text-xs text-[#239B6B] flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Approved claims registered here are used by RAG to automatically substantiate marketing creatives.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">
              Claim or Factual Statement
            </label>
            <textarea
              rows={3}
              value={newClaimText}
              onChange={(e) => setNewClaimText(e.target.value)}
              placeholder="e.g. 24-hour response times verified by enterprise SLA or 100% recycled packaging certified by FSC"
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#315C76]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Claim Category
              </label>
              <select
                value={newClaimCategory}
                onChange={(e) => setNewClaimCategory(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76] cursor-pointer"
              >
                <option value="Product Performance">Product Performance</option>
                <option value="Certifications">Certifications</option>
                <option value="Sustainability/SDG">Sustainability / SDG</option>
                <option value="Service Level">Service Level SLA</option>
                <option value="Official Statistics">Official Statistics</option>
                <option value="Corporate Facts">Corporate Facts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Evidence Document / Citation Reference
              </label>
              <input
                type="text"
                value={newClaimRef}
                onChange={(e) => setNewClaimRef(e.target.value)}
                placeholder="e.g. ISO 27001 Cert #901 or Lab Study 2026"
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#315C76]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setShowAddClaimModal(false)}
              className="px-4 py-2 border border-[#CBD5E1] text-[#172033] text-xs font-semibold rounded-lg hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingClaim || !newClaimText.trim()}
              className="px-5 py-2 bg-[#239B6B] hover:bg-[#1E835A] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
            >
              {submittingClaim ? 'Registering...' : 'Register Approved Claim'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
