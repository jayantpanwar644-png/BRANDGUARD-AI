import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Image as ImageIcon, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, Upload, Trash2, Palette, Type, ShieldCheck,
  Globe, MessageSquare, AlertTriangle, Plus, X, Sparkles, Check,
  BookOpen, Scale, Award, RefreshCw, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { BrandGuideline, BrandRule } from '../types';
import { Aurora } from '../components/ui/aurora';

export const OnboardingWizard: React.FC = () => {
  const { organisation, brandProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Step 1: Company Profile ───────────────────────────────────────────────
  const [companyName, setCompanyName] = useState(organisation?.name || '');
  const [industry, setIndustry] = useState(organisation?.industry || 'Technology / Enterprise SaaS');
  const [website, setWebsite] = useState(brandProfile?.website || organisation?.website || 'https://');
  const [companyDescription, setCompanyDescription] = useState(
    brandProfile?.company_description || brandProfile?.mission_statement || ''
  );
  const [businessCategory, setBusinessCategory] = useState(brandProfile?.business_category || 'B2B Enterprise Software');
  const [productsAndServices, setProductsAndServices] = useState(
    brandProfile?.products_and_services || 'Enterprise AI Brand Governance & Automated Compliance Auditing Platform'
  );
  const [targetAudience, setTargetAudience] = useState(
    brandProfile?.target_audience || 'Chief Marketing Officers, Brand Compliance Directors, and Legal Teams'
  );
  const [mainRegion, setMainRegion] = useState(brandProfile?.main_region || 'Global / North America');
  const [preferredLanguage, setPreferredLanguage] = useState(brandProfile?.preferred_language || 'English (Global / US)');

  // ─── Step 2: Brand Identity & Assets ───────────────────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(organisation?.logo_url || null);
  const [primaryColor, setPrimaryColor] = useState(brandProfile?.primary_color || '#1A56DB');
  const [secondaryColor, setSecondaryColor] = useState(brandProfile?.secondary_color || '#7E3AF2');
  const [accentColor, setAccentColor] = useState(brandProfile?.accent_color || '#10B981');
  const [primaryFont, setPrimaryFont] = useState(brandProfile?.primary_font || 'Inter');
  const [secondaryFont, setSecondaryFont] = useState(brandProfile?.secondary_font || 'Manrope');

  // ─── Step 3: Brand Voice & Communication ───────────────────────────────────
  const [brandPersonality, setBrandPersonality] = useState(
    brandProfile?.brand_personality || 'Authoritative, Visionary, Transparent, Rigorous'
  );
  const [toneOfVoice, setToneOfVoice] = useState(
    brandProfile?.tone_of_voice || 'Professional, Authoritative, Trustworthy, Innovative'
  );
  const [writingStyle, setWritingStyle] = useState(
    brandProfile?.writing_style || 'Active voice, concise sentences, data-backed claims, zero hype'
  );
  const [approvedMessages, setApprovedMessages] = useState<string[]>([
    'Protecting brand identity before publication and public trust after publication.',
    'Autonomous AI brand governance grounded in verified evidence.'
  ]);
  const [newMessage, setNewMessage] = useState('');

  // ─── Step 4: Approved Claims & Verified Facts ──────────────────────────────
  const [approvedClaims, setApprovedClaims] = useState<Array<{ text: string; category: string; source: string }>>([
    {
      text: 'Our AI audit engine reduces brand compliance review time by 85%.',
      category: 'Product Performance',
      source: 'Internal Enterprise Benchmark Study 2026'
    }
  ]);
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimCategory, setNewClaimCategory] = useState('Product Performance');
  const [newClaimSource, setNewClaimSource] = useState('');

  // ─── Step 5: Restricted Vocabulary & Prohibited Claims ─────────────────────
  const [restrictedWords, setRestrictedWords] = useState(
    brandProfile?.restricted_words || '100% guaranteed, miracle, cheapest, hack, unverified, foolproof'
  );
  const [prohibitedClaims, setProhibitedClaims] = useState(
    brandProfile?.prohibited_claims || 'zero risk, instant cure, #1 on earth, permanently free'
  );
  const [approvedVocabulary, setApprovedVocabulary] = useState(
    brandProfile?.approved_vocabulary || 'enterprise-grade, verified, compliant, secure, intelligent, substantiated'
  );
  const [preferredPhrases, setPreferredPhrases] = useState(
    brandProfile?.preferred_phrases || 'verified by rigorous audit, substantiated with empirical data, certified adherence'
  );

  // ─── Step 6: Documents & Extracted Rules ───────────────────────────────────
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [extractedRules, setExtractedRules] = useState<BrandRule[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [extractingRules, setExtractingRules] = useState(false);

  useEffect(() => {
    fetchGuidelinesAndRules();
  }, []);

  const fetchGuidelinesAndRules = async () => {
    try {
      const gData = await apiRequest('/brand/guidelines');
      setGuidelines(gData || []);
      const rData = await apiRequest('/brand/rules');
      setExtractedRules(rData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // ─── Step Navigation Handlers ──────────────────────────────────────────────
  const handleSaveStep1 = async () => {
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!industry.trim()) {
      setError('Industry is required.');
      return;
    }
    if (!companyDescription.trim()) {
      setError('Company description is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          company_name: companyName,
          industry,
          website,
          company_description: companyDescription,
          mission_statement: companyDescription,
          business_category: businessCategory,
          products_and_services: productsAndServices,
          target_audience: targetAudience,
          main_region: mainRegion,
          preferred_language: preferredLanguage
        })
      });
      await refreshProfile();
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save company profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep2 = async () => {
    if (!logoPreview && !logoFile) {
      setError('An official master logo is required before proceeding.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        await apiRequest('/organisations/logo', {
          method: 'POST',
          body: formData,
        });
      }
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          primary_font: primaryFont,
          secondary_font: secondaryFont
        })
      });
      await refreshProfile();
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to save brand identity.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          brand_personality: brandPersonality,
          tone_of_voice: toneOfVoice,
          writing_style: writingStyle,
          approved_messaging_examples: approvedMessages
        })
      });
      await refreshProfile();
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to save brand voice.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep4 = async () => {
    setLoading(true);
    setError('');
    try {
      // Register all approved claims in backend
      for (const c of approvedClaims) {
        await apiRequest('/brand/approved-claims', {
          method: 'POST',
          body: JSON.stringify({
            claim_text: c.text,
            category: c.category,
            source_reference: c.source
          })
        }).catch(() => {});
      }
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to save claims.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep5 = async () => {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/brand/profile', {
        method: 'PUT',
        body: JSON.stringify({
          restricted_words: restrictedWords,
          prohibited_claims: prohibitedClaims,
          approved_vocabulary: approvedVocabulary,
          preferred_phrases: preferredPhrases,
          vocabulary_configured: true
        })
      });
      await refreshProfile();
      await fetchGuidelinesAndRules();
      setStep(6);
    } catch (err: any) {
      setError(err.message || 'Failed to save vocabulary.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuidelineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingDoc(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', '1.0');
      formData.append('category', 'Master Guidelines');

      await apiRequest('/brand/guidelines/upload', {
        method: 'POST',
        body: formData,
      });

      await fetchGuidelinesAndRules();
    } catch (err: any) {
      setError(err.message || 'Document upload & rule extraction failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRuleReview = async (ruleId: number, status: 'Confirmed' | 'Rejected') => {
    try {
      await apiRequest(`/brand/rules/${ruleId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ review_status: status })
      });
      await fetchGuidelinesAndRules();
    } catch (err: any) {
      alert(err.message || 'Failed to update rule status.');
    }
  };

  const handleBulkConfirmRules = async () => {
    try {
      await apiRequest('/brand/rules/bulk-confirm', { method: 'POST' });
      await fetchGuidelinesAndRules();
    } catch (err: any) {
      alert(err.message || 'Bulk confirmation failed.');
    }
  };

  const handleFinalConfirmation = async () => {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/brand/confirm-setup', { method: 'POST' });
      await refreshProfile();
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Setup confirmation failed. Ensure all steps are completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] py-10 px-4 sm:px-6 flex flex-col items-center relative overflow-hidden select-none">
      <Aurora
        asBackgroundOnly
        className="fixed inset-0 pointer-events-none z-0"
        colors={['#183B59', '#315C76', '#263A52']}
        duration={28}
        intensity={0.06}
      />

      <div className="w-full max-w-3xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#315C76] text-white mb-2 shadow-sm">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#172033]">
            Mandatory Brand Setup
          </h1>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-xl mx-auto leading-relaxed">
            Configure your enterprise brand profile, official assets, voice, and guidelines before unlocking AI auditing.
          </p>
        </div>

        {/* 6-Step Stepper Progress Bar */}
        <div className="flex items-center justify-between mb-6 px-3 py-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-x-auto">
          {[
            { num: 1, label: 'Profile' },
            { num: 2, label: 'Identity' },
            { num: 3, label: 'Voice' },
            { num: 4, label: 'Claims' },
            { num: 5, label: 'Vocabulary' },
            { num: 6, label: 'Rules & Finish' },
          ].map((s) => (
            <div key={s.num} className="flex items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold transition-colors ${
                step === s.num
                  ? 'bg-[#315C76] text-white shadow-xs'
                  : step > s.num
                  ? 'bg-[#239B6B] text-white'
                  : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`ml-1.5 text-[12px] font-semibold hidden md:inline ${
                step >= s.num ? 'text-[#172033]' : 'text-[#94A3B8]'
              }`}>
                {s.label}
              </span>
              {s.num < 6 && (
                <div className={`w-6 sm:w-10 h-0.5 mx-2 ${
                  step > s.num ? 'bg-[#239B6B]' : 'bg-[#E2E8F0]'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Container Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-sm">

          {/* ─── STEP 1: Company Profile ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 1: Company Profile
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Essential commercial information that grounds the AI auditor in your organisation's context.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Industry *</label>
                  <input
                    type="text"
                    required
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Enterprise Security / Healthcare"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Business Category</label>
                  <input
                    type="text"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    placeholder="e.g. B2B Enterprise Software"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Company Description &amp; Mission *</label>
                <textarea
                  rows={3}
                  required
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Provide an overview of your company, its mission, and core value proposition..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Target Audience *</label>
                  <input
                    type="text"
                    required
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Enterprise Leaders &amp; Security Practitioners"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Main Operating Region</label>
                  <input
                    type="text"
                    value={mainRegion}
                    onChange={(e) => setMainRegion(e.target.value)}
                    placeholder="e.g. Global, North America, EMEA"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSaveStep1}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{loading ? 'Saving...' : 'Continue to Brand Identity'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Brand Identity & Master Logo ───────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 2: Brand Identity &amp; Master Logo
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Your official logo is the visual ground truth for AI placement detection. Upload it now.
                </p>
              </div>

              {/* Master Logo Upload Box */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-2">
                  Official Master Logo (PNG, JPG, WEBP) *
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="w-24 h-24 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Master Logo" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <Building2 className="w-8 h-8 text-[#94A3B8]" />
                    )}
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="text-[13px] font-bold text-[#172033]">High-Resolution Brand Mark</div>
                    <div className="text-[12px] text-[#64748B]">Required to verify logo placement, clearspace, and prevent unbranded content.</div>
                    <label className="inline-block cursor-pointer px-3.5 py-1.5 bg-white hover:bg-[#F1F5F9] text-[12.5px] font-semibold rounded-lg text-[#172033] border border-[#CBD5E1] shadow-2xs mt-1">
                      <span>{logoPreview ? 'Replace Logo' : 'Upload Master Logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Official Palette Swatches */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-2 flex items-center space-x-1.5">
                  <Palette className="w-4 h-4 text-[#315C76]" />
                  <span>Official Color Swatches (Hex Codes)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    />
                    <div>
                      <div className="text-[11px] font-semibold text-[#64748B]">Primary Color</div>
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="bg-transparent text-[12.5px] font-mono uppercase text-[#172033] w-20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    />
                    <div>
                      <div className="text-[11px] font-semibold text-[#64748B]">Secondary Color</div>
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="bg-transparent text-[12.5px] font-mono uppercase text-[#172033] w-20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    />
                    <div>
                      <div className="text-[11px] font-semibold text-[#64748B]">Accent Color</div>
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="bg-transparent text-[12.5px] font-mono uppercase text-[#172033] w-20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1 flex items-center space-x-1.5">
                    <Type className="w-3.5 h-3.5 text-[#315C76]" />
                    <span>Primary Typography</span>
                  </label>
                  <input
                    type="text"
                    value={primaryFont}
                    onChange={(e) => setPrimaryFont(e.target.value)}
                    placeholder="e.g. Inter, Manrope"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Secondary Typography</label>
                  <input
                    type="text"
                    value={secondaryFont}
                    onChange={(e) => setSecondaryFont(e.target.value)}
                    placeholder="e.g. Roboto, Open Sans"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#172033] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep2}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{loading ? 'Saving...' : 'Continue to Brand Voice'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Brand Voice & Communication ─────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 3: Brand Voice &amp; Communication
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Define how your brand speaks across digital channels, ad copy, and executive announcements.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Brand Personality *</label>
                  <input
                    type="text"
                    value={brandPersonality}
                    onChange={(e) => setBrandPersonality(e.target.value)}
                    placeholder="e.g. Authoritative, Visionary, Transparent"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Tone of Voice *</label>
                  <input
                    type="text"
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                    placeholder="e.g. Professional, Authoritative, Trustworthy"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">Writing Style Guidelines</label>
                <textarea
                  rows={2}
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value)}
                  placeholder="e.g. Active voice, concise sentences, data-backed claims, zero hype"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              {/* Approved Messaging Examples */}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                  Approved Messaging Examples ({approvedMessages.length})
                </label>
                <div className="space-y-2 mb-2">
                  {approvedMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12.5px]">
                      <span className="text-[#172033]">"{msg}"</span>
                      <button
                        type="button"
                        onClick={() => setApprovedMessages(approvedMessages.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Add approved campaign slogan or value proposition..."
                    className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newMessage.trim()) {
                        setApprovedMessages([...approvedMessages, newMessage.trim()]);
                        setNewMessage('');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#315C76] text-white rounded-lg text-[12px] font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#172033] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep3}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{loading ? 'Saving...' : 'Continue to Approved Claims'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Approved Claims & Verified Facts ────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 4: Approved Claims &amp; Verified Facts
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Register pre-verified marketing claims and certified company facts. Unsubstantiated claims will be flagged during AI audits.
                </p>
              </div>

              {/* Claims List */}
              <div className="space-y-2">
                <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wider">
                  Configured Claims ({approvedClaims.length})
                </div>
                {approvedClaims.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#315C76] uppercase tracking-wide">{c.category}</span>
                      <button
                        type="button"
                        onClick={() => setApprovedClaims(approvedClaims.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[13px] font-bold text-[#172033]">"{c.text}"</div>
                    <div className="text-[11px] text-[#64748B]">Source Evidence: {c.source}</div>
                  </div>
                ))}
              </div>

              {/* Add New Claim Form */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
                <div className="text-[12.5px] font-bold text-[#172033]">Add Verified Claim</div>
                <input
                  type="text"
                  value={newClaimText}
                  onChange={(e) => setNewClaimText(e.target.value)}
                  placeholder="e.g. Conclusively tested for 99.99% system availability"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newClaimCategory}
                    onChange={(e) => setNewClaimCategory(e.target.value)}
                    placeholder="Category (e.g. Product Performance)"
                    className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12px] text-[#172033] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newClaimSource}
                    onChange={(e) => setNewClaimSource(e.target.value)}
                    placeholder="Evidence Reference (e.g. ISO 9001 Report)"
                    className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[12px] text-[#172033] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newClaimText.trim()) {
                      setApprovedClaims([
                        ...approvedClaims,
                        {
                          text: newClaimText.trim(),
                          category: newClaimCategory.trim() || 'Product Performance',
                          source: newClaimSource.trim() || 'Internal Compliance Sheet'
                        }
                      ]);
                      setNewClaimText('');
                      setNewClaimSource('');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[#315C76] text-white text-[12px] font-semibold rounded-lg cursor-pointer"
                >
                  Save Claim
                </button>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#172033] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep4}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{loading ? 'Saving...' : 'Continue to Vocabulary'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: Restricted Vocabulary & Prohibited Claims ─────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 5: Vocabulary &amp; Prohibited Language
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Define restricted buzzwords and strictly prohibited marketing claims to protect brand safety.
                </p>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-rose-700 mb-1">
                  Restricted / Forbidden Words (comma separated)
                </label>
                <textarea
                  rows={2}
                  value={restrictedWords}
                  onChange={(e) => setRestrictedWords(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-rose-200 rounded-lg px-3 py-2 text-[12.5px] text-[#172033] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-amber-700 mb-1">
                  Prohibited Marketing Claims (comma separated)
                </label>
                <textarea
                  rows={2}
                  value={prohibitedClaims}
                  onChange={(e) => setProhibitedClaims(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-amber-200 rounded-lg px-3 py-2 text-[12.5px] text-[#172033] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                  Approved Terminology (comma separated)
                </label>
                <input
                  type="text"
                  value={approvedVocabulary}
                  onChange={(e) => setApprovedVocabulary(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[#475569] mb-1">
                  Preferred Phrases (comma separated)
                </label>
                <input
                  type="text"
                  value={preferredPhrases}
                  onChange={(e) => setPreferredPhrases(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[12.5px] text-[#172033] focus:outline-none focus:border-[#315C76]"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#172033] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep5}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white text-[13.5px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{loading ? 'Saving...' : 'Upload Guidelines & Extract Rules'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 6: Guidelines, Extracted Rules & Confirmation ───────── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-bold font-heading text-[#172033]">
                  Step 6: Document Upload &amp; Rule Confirmation
                </h2>
                <p className="text-[13px] text-[#64748B]">
                  Upload official guideline documents (PDF, DOCX, TXT). Review and confirm extracted governance rules to unlock audit access.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="p-5 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#315C76] transition-colors text-center">
                <Upload className="w-7 h-7 text-[#315C76] mx-auto mb-1.5" />
                <div className="text-[13px] font-semibold text-[#172033]">
                  {uploadingDoc ? 'Parsing document & extracting rules...' : 'Upload Brand Manual / Style Guide (PDF, DOCX, TXT)'}
                </div>
                <div className="text-[11.5px] text-[#64748B] mb-2.5">Text is parsed and categorized into actionable governance rules automatically.</div>
                <label className="inline-block cursor-pointer px-4 py-1.5 bg-[#315C76] hover:bg-[#183B59] text-[12.5px] font-semibold rounded-lg text-white transition-all shadow-xs">
                  <span>Browse Document</span>
                  <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleGuidelineUpload} className="hidden" disabled={uploadingDoc} />
                </label>
              </div>

              {/* Uploaded Documents */}
              {guidelines.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11.5px] font-semibold uppercase text-[#64748B] tracking-wider">
                    Indexed Documents ({guidelines.length})
                  </div>
                  {guidelines.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px]">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-4 h-4 text-[#315C76] flex-shrink-0" />
                        <span className="font-semibold text-[#172033] truncate">{g.document_name}</span>
                        <span className="text-[#64748B]">• v{g.version}</span>
                      </div>
                      <span className="text-[#239B6B] font-semibold">{g.processing_status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted Rules Review List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[12.5px] font-bold text-[#172033]">
                    Extracted Brand Rules ({extractedRules.length})
                  </div>
                  {extractedRules.some(r => r.review_status === 'Needs Review') && (
                    <button
                      type="button"
                      onClick={handleBulkConfirmRules}
                      className="px-2.5 py-1 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[11.5px] font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      Confirm All Pending Rules
                    </button>
                  )}
                </div>

                {extractedRules.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#64748B] text-center">
                    Upload a guideline document above or manual rules will be initialized upon confirmation.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {extractedRules.map((r) => {
                      const isConfirmed = r.review_status === 'Confirmed';
                      const isRejected = r.review_status === 'Rejected';
                      return (
                        <div key={r.id} className="p-3 rounded-lg border bg-white border-[#E2E8F0] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#315C76] uppercase tracking-wider">{r.rule_category}</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              isConfirmed ? 'bg-emerald-50 text-emerald-700' : isRejected ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {r.review_status}
                            </span>
                          </div>
                          <div className="text-[13px] font-bold text-[#172033] font-heading">{r.rule_name}</div>
                          <div className="text-[12px] text-[#475569]">{r.description}</div>
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRuleReview(r.id, 'Confirmed')}
                              disabled={isConfirmed}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                isConfirmed ? 'bg-slate-100 text-slate-400' : 'bg-[#EAF7F1] text-[#239B6B] hover:bg-[#239B6B] hover:text-white cursor-pointer'
                              }`}
                            >
                              Confirm Rule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRuleReview(r.id, 'Rejected')}
                              disabled={isRejected}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                isRejected ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Final Confirm Button */}
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#172033] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirmation}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-[#239B6B] hover:bg-[#1E835A] text-white text-[14px] font-bold rounded-xl shadow-md transition-all cursor-pointer font-heading"
                >
                  <CheckCircle2 className="w-4.5 h-4.5" />
                  <span>{loading ? 'Confirming...' : 'Confirm Brand Setup & Unlock Audits'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
