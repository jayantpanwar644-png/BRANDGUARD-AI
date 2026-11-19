import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ArrowRight, CheckCircle2, Sparkles, 
  MessageSquareHeart, LogOut, TrendingUp, AlertTriangle, 
  Layers, Lock, Eye, Check, ExternalLink, Globe, Cpu, RefreshCw
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedinIcon, YouTubeIcon } from '../components/common/SocialIcons';
import { useAuth } from '../context/AuthContext';
import { Hero3DComposition } from '../components/brand/Hero3DComposition';
import { CustomerFeedbackShowcase } from '../components/brand/CustomerFeedbackShowcase';
import { ContinuousLoopWorkflow } from '../components/common/ContinuousLoopWorkflow';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user, organisation, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 320);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div 
      className="min-h-screen text-[#262A25] flex flex-col relative overflow-x-hidden font-sans select-none"
      style={{
        backgroundColor: '#E8E1D5',
        backgroundImage: `
          radial-gradient(ellipse 90% 55% at 50% 12%, #F8F5EF 0%, #F3EEE5 35%, #E8E1D5 75%, #DDD4C6 100%)
        `
      }}
    >
      {/* Subtle Studio Radial Spotlight in Hero Area (Zero CPU/GPU lag) */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[800px] pointer-events-none z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(255, 253, 248, 0.9) 0%, rgba(243, 238, 229, 0.4) 50%, transparent 80%)'
        }}
      />

      {/* ========================================================================= */}
      {/* 3. LUXURY STICKY NAVIGATION HEADER (Fades in smoothly when scrolled down)  */}
      {/* ========================================================================= */}
      <header className={`fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 max-w-7xl mx-auto w-full transition-all duration-300 ${
        scrolledPastHero ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className="h-16 px-5 sm:px-8 bg-[#F3EEE5]/90 backdrop-blur-md border border-[#DDD4C6]/80 rounded-full flex items-center justify-between shadow-[0_8px_25px_rgba(100,90,75,0.06)]">
          {/* Left Brand Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#244B3F] flex items-center justify-center text-[#FCFAF5] shadow-[0_2px_8px_rgba(36,75,63,0.22)] group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-heading font-medium text-[19px] text-[#242B27] tracking-tight block leading-tight">
                BrandGuard AI
              </span>
              <span className="text-[10px] text-[#88857D] tracking-wider uppercase font-mono font-medium block -mt-0.5">
                Brand Governance &amp; Intelligence
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Visible on desktop/tablet) */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-[13.5px] font-medium text-[#68736B]">
            <a 
              href="#showcase"
              onClick={(e) => { e.preventDefault(); scrollToSection('showcase'); }}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Platform
            </a>
            <a 
              href="#solutions"
              onClick={(e) => { e.preventDefault(); scrollToSection('solutions'); }}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Solutions
            </a>
            <a 
              href="#feedback"
              onClick={(e) => { e.preventDefault(); scrollToSection('feedback'); }}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Intelligence
            </a>
            <a 
              href="#workflow"
              onClick={(e) => { e.preventDefault(); scrollToSection('workflow'); }}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              How It Works
            </a>
            <a 
              href="#integrations"
              onClick={(e) => { e.preventDefault(); scrollToSection('integrations'); }}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Integrations
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center space-x-2.5">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FCFAF5]/80 border border-[#DDD4C6] text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#244B3F] animate-pulse" />
                  <span className="text-[#68736B]">Signed in:</span>
                  <span className="font-semibold text-[#242B27] max-w-[110px] truncate">
                    {user?.full_name || organisation?.name || user?.email}
                  </span>
                </div>
                <Link
                  to="/app/dashboard"
                  className="px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-full text-[13px] font-semibold flex items-center space-x-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-2 text-[#68736B] hover:text-[#C77E63] rounded-full transition-colors cursor-pointer"
                  title="Switch Account / Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-[13.5px] font-semibold text-[#242B27] hover:text-[#244B3F] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-full text-[13.5px] font-semibold flex items-center space-x-1.5 transition-all shadow-[0_2px_10px_rgba(36,75,63,0.2)] active:scale-[0.98]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Surfaces */}
      <main className="flex-1 relative z-10 space-y-20 sm:space-y-28 pb-24">
        
        {/* ========================================================================= */}
        {/* 1. TOP HERO SECTION — LUXURY 3D COMPOSITION ON TOP (Matching User Image) */}
        {/* ========================================================================= */}
        <section className="pt-2 sm:pt-4 px-2 sm:px-6 max-w-7xl mx-auto text-center relative z-20">
          <Hero3DComposition onExploreClick={() => scrollToSection('showcase')} />
        </section>

        {/* ========================================================================= */}
        {/* 2. SUPPORTING MISSION & VALUE STATEMENT                                   */}
        {/* ========================================================================= */}
        <section className="px-4 sm:px-8 max-w-4xl mx-auto text-center space-y-5 -mt-6 sm:-mt-10">
          
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FCFAF5]/85 border border-[#C6A66B]/35 text-[12px] font-medium text-[#244B3F] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Next-Generation AI Brand Governance &amp; Reputation Shield</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-heading font-normal text-[#262A25] tracking-tight leading-[1.08]">
            Protect Your Brand.<br />
            <span className="italic text-[#244B3F]">Build Lasting Trust.</span>
          </h1>

          <p className="text-[16px] sm:text-[18px] text-[#68736B] leading-relaxed max-w-2xl mx-auto font-sans">
            Intelligent brand governance, social listening and reputation intelligence — unified in one powerful workspace.
          </p>

          {/* Hero CTAs */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="px-7 py-3.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-full text-[14.5px] font-semibold flex items-center space-x-2 transition-all shadow-[0_4px_16px_rgba(36,75,63,0.22)] active:scale-[0.98]"
            >
              <span>Explore BrandGuard AI</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('showcase')}
              className="px-6 py-3.5 bg-[#FCFAF5]/80 hover:bg-[#FCFAF5] text-[#242B27] border border-[#DDD4C6] rounded-full text-[14.5px] font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              Discover the Platform
            </button>
          </div>

          {/* Credibility Statement */}
          <div className="pt-4 flex items-center justify-center space-x-6 text-[12px] text-[#88857D] font-mono">
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#244B3F]" />
              <span>Monitor</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#244B3F]" />
              <span>Analyze</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#244B3F]" />
              <span>Protect</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#244B3F]" />
              <span>Grow</span>
            </span>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 6. PRODUCT SHOWCASE SECTION ("One Intelligence Platform")                */}
        {/* ========================================================================= */}
        <section id="showcase" className="scroll-mt-28 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FCFAF5]/90 border border-[#C6A66B]/30 text-[11px] font-mono uppercase tracking-wider text-[#244B3F] shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Full-Spectrum Governance</span>
            </div>
            <h2 className="text-[34px] sm:text-[46px] font-heading font-normal text-[#242B27] tracking-tight leading-tight">
              One Intelligence Platform.<br />
              <span className="italic text-[#244B3F]">Complete Brand Protection.</span>
            </h2>
            <p className="text-[15px] sm:text-[16.5px] text-[#68736B] leading-relaxed max-w-2xl mx-auto">
              Safeguard organizational identity across four specialized intelligence pillars designed for high-growth enterprises.
            </p>
          </div>

          {/* 4 Feature Panels on Same Unified Warm Background */}
          <div id="solutions" className="scroll-mt-28 grid grid-cols-1 md:grid-cols-2 gap-7">
            
            {/* Panel A: Brand Governance */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-8 shadow-[0_12px_36px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-5 group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#244B3F] font-semibold bg-[#EBF0ED] border border-[#C8D7CF] px-3 py-1 rounded-full">
                  PRE-PUBLICATION
                </span>
              </div>

              <div>
                <h3 className="text-[22px] sm:text-[24px] font-heading text-[#242B27] leading-snug">
                  Brand Governance
                </h3>
                <p className="text-[13.5px] sm:text-[14px] text-[#68736B] leading-relaxed mt-1.5">
                  Automated verification of company identity, official guidelines, logo clearspace, color palettes, and compliance rules before marketing collateral goes live.
                </p>
              </div>

              {/* Visual Demonstration Pill */}
              <div className="p-4 rounded-2xl bg-[#F8F5EF] border border-[#E6DDCE] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#242B27]">
                  <span>Visual Consistency Lock</span>
                  <span className="text-[#244B3F] font-mono text-[11px]">100% Adherence</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-[#68736B]">
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E2D8C7] font-mono text-[#244B3F]">#244B3F</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E2D8C7] font-mono text-[#C6A66B]">#C6A66B</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E2D8C7] font-mono text-[#829887]">#829887</span>
                  <span className="text-[#88857D] text-[10px]">• Delta-E &lt; 0.8</span>
                </div>
              </div>

              <ul className="space-y-2 text-[13px] text-[#242B27] pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Logo placement, isolation zone &amp; distortion prevention</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Prohibited terminology &amp; negative marketing phrasing filter</span>
                </li>
              </ul>
            </div>

            {/* Panel B: Audience Intelligence */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-8 shadow-[0_12px_36px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-5 group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <MessageSquareHeart className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#244B3F] font-semibold bg-[#EBF0ED] border border-[#C8D7CF] px-3 py-1 rounded-full">
                  POST-PUBLICATION
                </span>
              </div>

              <div>
                <h3 className="text-[22px] sm:text-[24px] font-heading text-[#242B27] leading-snug">
                  Audience Intelligence
                </h3>
                <p className="text-[13.5px] sm:text-[14px] text-[#68736B] leading-relaxed mt-1.5">
                  Multi-channel social listening, sentiment analysis, emotional categorization, topic detection, and strategic response drafting.
                </p>
              </div>

              {/* Visual Demonstration Pill */}
              <div className="p-4 rounded-2xl bg-[#F8F5EF] border border-[#E6DDCE] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#242B27]">
                  <span>Sentiment Categorization</span>
                  <span className="text-[#244B3F] font-mono text-[11px]">+84 Favorable NPS</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EAE2D4] overflow-hidden flex">
                  <div className="bg-[#244B3F] h-full" style={{ width: '78%' }} />
                  <div className="bg-[#C6A66B] h-full" style={{ width: '15%' }} />
                  <div className="bg-[#C77E63] h-full" style={{ width: '7%' }} />
                </div>
              </div>

              <ul className="space-y-2 text-[13px] text-[#242B27] pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Real-time ingestion across Instagram, Facebook, LinkedIn &amp; YouTube</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Automated topic clustering &amp; audience intent classification</span>
                </li>
              </ul>
            </div>

            {/* Panel C: Reputation Intelligence */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-8 shadow-[0_12px_36px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-5 group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF0EC] text-[#C77E63] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C77E63] font-semibold bg-[#FAF0EC] border border-[#ECCBC0] px-3 py-1 rounded-full">
                  CRISIS SENTINEL
                </span>
              </div>

              <div>
                <h3 className="text-[22px] sm:text-[24px] font-heading text-[#242B27] leading-snug">
                  Reputation Intelligence
                </h3>
                <p className="text-[13.5px] sm:text-[14px] text-[#68736B] leading-relaxed mt-1.5">
                  Early detection of emerging negative feedback, complaint velocity spikes, brand safety alerts, and coordinated reputation risk incidents.
                </p>
              </div>

              {/* Visual Demonstration Pill */}
              <div className="p-4 rounded-2xl bg-[#F8F5EF] border border-[#E6DDCE] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#242B27]">
                  <span>Crisis Risk Threshold</span>
                  <span className="text-[#10B981] font-mono text-[11px] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span>0 Urgent Incidents</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#68736B]">
                  Continuous threshold monitoring active across all connected webhooks.
                </div>
              </div>

              <ul className="space-y-2 text-[13px] text-[#242B27] pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Velocity alarm: alerts when negative discourse surges &gt; 15%</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>AI response assistant with required human sign-off before dispatch</span>
                </li>
              </ul>
            </div>

            {/* Panel D: Content Intelligence */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-8 shadow-[0_12px_36px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-5 group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#F7F1E5] text-[#C6A66B] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Cpu className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#244B3F] font-semibold bg-[#EBF0ED] border border-[#C8D7CF] px-3 py-1 rounded-full">
                  RAG VERIFICATION
                </span>
              </div>

              <div>
                <h3 className="text-[22px] sm:text-[24px] font-heading text-[#242B27] leading-snug">
                  Content Intelligence
                </h3>
                <p className="text-[13.5px] sm:text-[14px] text-[#68736B] leading-relaxed mt-1.5">
                  Multimodal vision and text auditing against verified company knowledge bases, ensuring zero factual hallucinations and traceable citations.
                </p>
              </div>

              {/* Visual Demonstration Pill */}
              <div className="p-4 rounded-2xl bg-[#F8F5EF] border border-[#E6DDCE] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#242B27]">
                  <span>Knowledge Hub Citation</span>
                  <span className="text-[#244B3F] font-mono text-[11px]">Doc #884 Validated</span>
                </div>
                <div className="text-[11px] text-[#68736B]">
                  Every marketing claim is checked against stored whitepapers and legal specs.
                </div>
              </div>

              <ul className="space-y-2 text-[13px] text-[#242B27] pt-1">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Multimodal inspection of image layouts, text overlays &amp; video stills</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#244B3F] flex-shrink-0" />
                  <span>Automated suggestions with one-click revision application</span>
                </li>
              </ul>
            </div>

          </div>
        </section>


        {/* ========================================================================= */}
        {/* 7. CUSTOMER FEEDBACK ANALYSIS SHOWCASE                                   */}
        {/* ========================================================================= */}
        <section id="feedback" className="scroll-mt-28 px-4 sm:px-8 max-w-7xl mx-auto">
          <CustomerFeedbackShowcase />
        </section>


        {/* ========================================================================= */}
        {/* 8. SOCIAL MEDIA INTEGRATION SECTION                                      */}
        {/* ========================================================================= */}
        <section id="integrations" className="scroll-mt-28 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FCFAF5]/90 border border-[#C6A66B]/30 text-[11px] font-mono uppercase tracking-wider text-[#244B3F] shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Omnichannel Listening</span>
            </div>
            <h2 className="text-[34px] sm:text-[46px] font-heading font-normal text-[#242B27] tracking-tight leading-tight">
              Your Brand Conversations.<br />
              <span className="italic text-[#244B3F]">One Intelligent View.</span>
            </h2>
            <p className="text-[15px] sm:text-[16.5px] text-[#68736B] leading-relaxed max-w-2xl mx-auto">
              Securely connect authorized corporate accounts through official OAuth 2.0 partner APIs. Zero credentials stored.
            </p>
          </div>

          {/* 4 Social Platform Cards on Unified Warm Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Instagram */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-xs">
                  <InstagramIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] font-semibold border border-[#C8D7CF]">
                  GRAPH API
                </span>
              </div>
              <div>
                <h4 className="text-[17px] font-heading text-[#242B27]">Instagram</h4>
                <p className="text-[12.5px] text-[#68736B] mt-1 leading-relaxed">
                  Feed comments, Reel engagement, influencer mentions, and visual logo tag monitoring.
                </p>
              </div>
              <div className="pt-2 border-t border-[#EAE2D4] flex items-center justify-between text-[11px] font-mono text-[#88857D]">
                <span>Status:</span>
                <span className="text-[#244B3F] font-semibold">OAuth 2.0 Ready</span>
              </div>
            </div>

            {/* Facebook */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                  <FacebookIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] font-semibold border border-[#C8D7CF]">
                  WEBHOOKS
                </span>
              </div>
              <div>
                <h4 className="text-[17px] font-heading text-[#242B27]">Facebook</h4>
                <p className="text-[12.5px] text-[#68736B] mt-1 leading-relaxed">
                  Corporate page interactions, community discussions, customer feedback, and reaction clusters.
                </p>
              </div>
              <div className="pt-2 border-t border-[#EAE2D4] flex items-center justify-between text-[11px] font-mono text-[#88857D]">
                <span>Status:</span>
                <span className="text-[#244B3F] font-semibold">OAuth 2.0 Ready</span>
              </div>
            </div>

            {/* LinkedIn */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shadow-xs">
                  <LinkedinIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] font-semibold border border-[#C8D7CF]">
                  B2B SUITE
                </span>
              </div>
              <div>
                <h4 className="text-[17px] font-heading text-[#242B27]">LinkedIn</h4>
                <p className="text-[12.5px] text-[#68736B] mt-1 leading-relaxed">
                  Executive post comments, B2B brand perception, professional sentiment, and partner discussions.
                </p>
              </div>
              <div className="pt-2 border-t border-[#EAE2D4] flex items-center justify-between text-[11px] font-mono text-[#88857D]">
                <span>Status:</span>
                <span className="text-[#244B3F] font-semibold">OAuth 2.0 Ready</span>
              </div>
            </div>

            {/* YouTube */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#FF0000] text-white flex items-center justify-center shadow-xs">
                  <YouTubeIcon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] font-semibold border border-[#C8D7CF]">
                  DATA API v3
                </span>
              </div>
              <div>
                <h4 className="text-[17px] font-heading text-[#242B27]">YouTube</h4>
                <p className="text-[12.5px] text-[#68736B] mt-1 leading-relaxed">
                  Video comment streams, community poll sentiment, creator partnerships, and topic spikes.
                </p>
              </div>
              <div className="pt-2 border-t border-[#EAE2D4] flex items-center justify-between text-[11px] font-mono text-[#88857D]">
                <span>Status:</span>
                <span className="text-[#244B3F] font-semibold">OAuth 2.0 Ready</span>
              </div>
            </div>

          </div>
        </section>


        {/* ========================================================================= */}
        {/* 9. HOW IT WORKS SECTION (Minimal Visual 4-Step Process)                   */}
        {/* ========================================================================= */}
        <section id="workflow" className="scroll-mt-28 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FCFAF5]/90 border border-[#C6A66B]/30 text-[11px] font-mono uppercase tracking-wider text-[#244B3F] shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Architecture &amp; Workflow</span>
            </div>
            <h2 className="text-[34px] sm:text-[46px] font-heading font-normal text-[#242B27] tracking-tight leading-tight">
              How It Works
            </h2>
            <p className="text-[15px] sm:text-[16.5px] text-[#68736B] leading-relaxed max-w-2xl mx-auto">
              From identity onboarding to autonomous reputation governance in four structured stages.
            </p>
          </div>

          {/* 4 Minimal Process Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            
            {/* Step 01 */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-3 relative group">
              <div className="text-[32px] font-heading font-normal text-[#C6A66B] tabular-nums">
                01
              </div>
              <h4 className="text-[18px] font-heading text-[#242B27]">
                Connect Your Brand
              </h4>
              <p className="text-[13px] text-[#68736B] leading-relaxed">
                Connect authorized accounts, upload brand style guides, hex palettes, and verified whitepapers into your private RAG repository.
              </p>
            </div>

            {/* Step 02 */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-3 relative group">
              <div className="text-[32px] font-heading font-normal text-[#C6A66B] tabular-nums">
                02
              </div>
              <h4 className="text-[18px] font-heading text-[#242B27]">
                Monitor Conversations
              </h4>
              <p className="text-[13px] text-[#68736B] leading-relaxed">
                Collect social media commentary, customer mentions, reviews, and community threads automatically via secure webhooks.
              </p>
            </div>

            {/* Step 03 */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-3 relative group">
              <div className="text-[32px] font-heading font-normal text-[#C6A66B] tabular-nums">
                03
              </div>
              <h4 className="text-[18px] font-heading text-[#242B27]">
                Analyze with AI
              </h4>
              <p className="text-[13px] text-[#68736B] leading-relaxed">
                Understand public sentiment, emotional undercurrents, recurring complaint topics, and brand consistency in real time.
              </p>
            </div>

            {/* Step 04 */}
            <div className="bg-[#FCFAF5] border border-[#E2D8C7] rounded-[24px] p-6 shadow-[0_10px_30px_rgba(100,90,75,0.06)] hover:border-[#C6A66B] transition-all space-y-3 relative group">
              <div className="text-[32px] font-heading font-normal text-[#C6A66B] tabular-nums">
                04
              </div>
              <h4 className="text-[18px] font-heading text-[#242B27]">
                Take Action
              </h4>
              <p className="text-[13px] text-[#68736B] leading-relaxed">
                Receive proactive recommendations, approve brand-safe responses, mitigate complaints, and refine future creative campaigns.
              </p>
            </div>

          </div>

          {/* Connected Continuous Loop Workflow */}
          <div className="pt-6">
            <ContinuousLoopWorkflow className="bg-[#FCFAF5] border border-[#E2D8C7] shadow-[0_12px_36px_rgba(100,90,75,0.06)]" />
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 10. FINAL CALL TO ACTION (On SAME Warm Beige Background)                  */}
        {/* ========================================================================= */}
        <section className="px-4 sm:px-8 max-w-5xl mx-auto">
          {/* Frosted Ivory Pavilion Card on Unified Warm Background */}
          <div className="bg-[#FCFAF5] border border-[#C6A66B]/40 rounded-[32px] sm:rounded-[40px] p-10 sm:p-16 text-center space-y-7 shadow-[0_20px_50px_rgba(100,90,75,0.08),0_1px_2px_rgba(255,255,255,0.9)_inset] relative overflow-hidden">
            
            {/* Subtle Metallic Corner Light Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#C6A66B]/15 to-transparent rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-t from-[#244B3F]/10 to-transparent rounded-tr-full pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11px] font-mono uppercase tracking-wider text-[#244B3F] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise Brand Protection</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-heading font-normal text-[#242B27] tracking-tight leading-tight">
                Your Brand Deserves<br />
                <span className="italic text-[#244B3F]">Intelligent Protection.</span>
              </h2>

              <p className="text-[15px] sm:text-[16.5px] text-[#68736B] leading-relaxed">
                Turn brand data, customer feedback and reputation signals into confident business decisions.
              </p>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/app/dashboard"
                    className="px-8 py-3.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-full text-[14.5px] font-semibold transition-all shadow-[0_4px_16px_rgba(36,75,63,0.22)] flex items-center space-x-2 active:scale-[0.98]"
                  >
                    <span>Continue to Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="px-8 py-3.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-full text-[14.5px] font-semibold transition-all shadow-[0_4px_16px_rgba(36,75,63,0.22)] active:scale-[0.98] flex items-center space-x-2"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/login"
                      className="px-7 py-3.5 bg-[#FCFAF5] hover:bg-[#F8F5EF] text-[#242B27] border border-[#DDD4C6] rounded-full text-[14.5px] font-semibold transition-all shadow-xs active:scale-[0.98]"
                    >
                      Explore BrandGuard AI
                    </Link>
                  </>
                )}
              </div>

              {/* Compliance & SLA Pill */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#88857D] font-mono">
                <span>SOC2 Type II Certified</span>
                <span>•</span>
                <span>ISO 27001 Standards</span>
                <span>•</span>
                <span>256-Bit AES Encryption</span>
              </div>
            </div>
          </div>
        </section>

      </main>


      {/* ========================================================================= */}
      {/* 11. LUXURY MINIMAL FOOTER (On SAME Unified Warm Background)               */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#DDD4C6]/80 px-4 sm:px-8 py-12 relative z-10 text-[13px] text-[#68736B]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#DDD4C6]/60">
            {/* Logo & Tagline */}
            <div className="space-y-2 max-w-sm">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#244B3F] flex items-center justify-center text-[#FCFAF5] shadow-xs">
                  <ShieldCheck className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <span className="font-heading font-medium text-[18px] text-[#242B27] tracking-tight">
                  BrandGuard AI
                </span>
              </div>
              <p className="text-[12.5px] text-[#68736B] leading-relaxed">
                The AI-powered brand governance and reputation intelligence platform protecting enterprise trust before and after publication.
              </p>
            </div>

            {/* Quick Links Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px]">
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#242B27] font-semibold">
                  Platform
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <button onClick={() => scrollToSection('showcase')} className="text-left text-[#68736B] hover:text-[#242B27] transition-colors cursor-pointer">Brand Governance</button>
                  <button onClick={() => scrollToSection('feedback')} className="text-left text-[#68736B] hover:text-[#242B27] transition-colors cursor-pointer">Audience Pulse</button>
                  <button onClick={() => scrollToSection('showcase')} className="text-left text-[#68736B] hover:text-[#242B27] transition-colors cursor-pointer">Reputation Risk</button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#242B27] font-semibold">
                  Resources
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <button onClick={() => scrollToSection('workflow')} className="text-left text-[#68736B] hover:text-[#242B27] transition-colors cursor-pointer">8-Step Loop</button>
                  <button onClick={() => scrollToSection('integrations')} className="text-left text-[#68736B] hover:text-[#242B27] transition-colors cursor-pointer">Integrations</button>
                  <Link to="/login" className="text-left text-[#68736B] hover:text-[#242B27] transition-colors">Evaluation Demo</Link>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#242B27] font-semibold">
                  Security
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-[#68736B]">SOC2 Type II</span>
                  <span className="text-[#68736B]">GDPR &amp; CCPA</span>
                  <span className="text-[#68736B]">Zero Hallucination</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Legal Line */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#88857D] font-mono">
            <div>
              © {new Date().getFullYear()} BrandGuard AI Inc. All rights reserved. CodeNova India 2026.
            </div>
            <div className="flex items-center space-x-6">
              <span className="hover:text-[#242B27] cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-[#242B27] cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-[#242B27] cursor-pointer">Security Portal</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};
