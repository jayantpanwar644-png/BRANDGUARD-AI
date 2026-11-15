import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ArrowRight, CheckCircle2, 
  Sparkles, MessageSquareHeart, LogOut, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ContinuousLoopWorkflow } from '../components/common/ContinuousLoopWorkflow';
import { Aurora } from '../components/ui/aurora';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user, organisation, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col relative overflow-hidden select-none">
      {/* Subtle Light Theme Atmospheric Aurora */}
      <Aurora
        asBackgroundOnly
        className="fixed inset-0 pointer-events-none z-0"
        colors={['#183B59', '#315C76', '#263A52']}
        duration={32}
        intensity={0.06}
      />

      {/* 1. Professional Enterprise Navigation Bar */}
      <header className="h-20 px-6 sm:px-12 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#315C76] flex items-center justify-center text-white shadow-sm shadow-[#315C76]/20 group-hover:scale-102 transition-transform">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="font-bold text-[18px] text-[#172033] tracking-tight font-heading block">
              BrandGuard AI
            </span>
            <span className="text-[11px] text-[#64748B] tracking-wider uppercase font-sans font-medium block -mt-0.5">
              Enterprise Governance
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-[14px] font-medium text-[#64748B]">
          <a href="#governance" className="hover:text-[#172033] transition-colors">Brand Governance</a>
          <a href="#audience" className="hover:text-[#172033] transition-colors">Audience Pulse</a>
          <a href="#workflow" className="hover:text-[#172033] transition-colors">How It Works</a>
        </nav>

        {/* Right CTA Buttons */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2.5">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#64748B]">Signed in:</span>
                <span className="font-semibold text-[#172033] max-w-[130px] truncate">
                  {user?.full_name || organisation?.name || user?.email}
                </span>
              </div>
              <Link
                to="/app/dashboard"
                className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-[13.5px] font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <span>Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-3 py-2 text-[13px] font-semibold text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="Switch Account / Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch Account</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-[14px] font-semibold text-[#172033] hover:text-[#315C76] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg text-[14px] font-semibold flex items-center space-x-2 transition-all shadow-sm shadow-[#315C76]/20"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 relative z-10 space-y-24 pb-20">
        
        {/* 2. Premium Hero Section */}
        <section className="pt-16 sm:pt-24 px-6 sm:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Editorial Headline & Messaging */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EAF2F8] border border-[#CBD5E1] text-[12px] font-semibold text-[#315C76]">
                <Sparkles className="w-4 h-4" />
                <span>Next-Generation AI Brand Compliance &amp; Reputation Shield</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold font-heading text-[#172033] tracking-tight leading-[1.14]">
                Your Brand Deserves More Than Just a <span className="text-[#315C76]">Visual Check.</span>
              </h1>

              <p className="text-[15px] sm:text-[17px] text-[#64748B] leading-relaxed max-w-xl">
                Upload your content. Understand your brand. Discover what needs improvement before publication and safeguard public trust after publication.
              </p>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-[#E2E8F0] grid grid-cols-3 gap-6 text-left">
                <div>
                  <div className="text-[30px] font-bold text-[#172033] font-heading tabular-nums">100%</div>
                  <div className="text-[13px] text-[#64748B] mt-0.5">Brand Rule Accuracy</div>
                </div>
                <div>
                  <div className="text-[30px] font-bold text-[#172033] font-heading tabular-nums">&lt; 5s</div>
                  <div className="text-[13px] text-[#64748B] mt-0.5">Pre-Publication Audit</div>
                </div>
                <div>
                  <div className="text-[30px] font-bold text-[#172033] font-heading">Zero</div>
                  <div className="text-[13px] text-[#64748B] mt-0.5">AI Hallucination Risk</div>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Photography & Live Visual Representation */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-[#E2E8F0] shadow-xl bg-white p-2">
                <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 relative group">
                  <img
                    src="/modern-office-glass.jpg"
                    alt="BrandGuard AI Enterprise Headquarters"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#172033]/60 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Floating Live Audit Badge */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-white/60 shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF7F1] text-[#239B6B] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[#172033]">Governance Engine Online</div>
                        <div className="text-[11px] text-[#64748B]">RAG claims &amp; visual guidelines active</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold bg-[#EAF2F8] text-[#315C76] px-2.5 py-0.5 rounded-full">
                      v1.0 Live
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Two Pillars of Brand Intelligence */}
        <section id="governance" className="px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h2 className="text-[28px] sm:text-[34px] font-bold font-heading text-[#172033] tracking-tight">
              Two Interconnected Systems. One Unified Reputation.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#64748B] leading-relaxed">
              BrandGuard AI unites pre-publication governance with post-publication audience reaction intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 Card */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 shadow-xs space-y-4 hover:border-[#CBD5E1] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#EAF2F8] text-[#315C76] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-[#315C76] font-sans">
                Pillar 1 • Pre-Publication Brand Governance
              </div>
              <h3 className="text-[20px] sm:text-[22px] font-bold font-heading text-[#172033] leading-snug">
                Audit Creative Assets Before They Go Live
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-[#64748B] leading-relaxed">
                Automatically verify logo usage, brand palette hex consistency, typography hierarchy, prohibited terminology, misleading marketing claims, and fact verifications against your verified company knowledge base.
              </p>
              <ul className="space-y-2.5 text-[13.5px] text-[#172033] pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>Logo placement, minimum clear space &amp; color integrity</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>RAG-backed claim detection with proof document attachment</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>Human-in-the-loop approval workflow with full decision audit log</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2 Card */}
            <div id="audience" className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 shadow-xs space-y-4 hover:border-[#CBD5E1] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#EAF7F1] text-[#239B6B] flex items-center justify-center shadow-xs">
                <MessageSquareHeart className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-[#239B6B] font-sans">
                Pillar 2 • Audience Pulse &amp; Crisis Response
              </div>
              <h3 className="text-[20px] sm:text-[22px] font-bold font-heading text-[#172033] leading-snug">
                Monitor Public Reception After Publication
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-[#64748B] leading-relaxed">
                Analyze incoming comments and customer feedback to track sentiment shifts, group repeated complaints into emerging issues, detect spikes in negative discourse, and draft brand-safe response recommendations.
              </p>
              <ul className="space-y-2.5 text-[13.5px] text-[#172033] pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>Multi-model sentiment clustering (Positive, Neutral, Negative, Mixed)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>Early reputation risk detection with threshold-based alerting</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#239B6B] flex-shrink-0" />
                  <span>AI Response Assistant with mandatory human approval before dispatch</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Continuous 8-Step Intelligence Cycle */}
        <section id="workflow" className="px-6 sm:px-12 max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-[26px] sm:text-[32px] font-bold font-heading text-[#172033] tracking-tight">
              The Continuous Brand Intelligence Loop
            </h2>
            <p className="text-[13.5px] sm:text-[14.5px] text-[#64748B] leading-relaxed">
              Every customer feedback cycle refines future marketing rules, creating an evolving, self-improving brand ecosystem.
            </p>
          </div>

          <ContinuousLoopWorkflow />
        </section>

        {/* 6. Enterprise Call to Action */}
        <section className="px-6 sm:px-12 max-w-5xl mx-auto">
          <div className="bg-[#183B59] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
              <h2 className="text-[28px] sm:text-[36px] font-bold font-heading tracking-tight leading-tight">
                Protect Your Organisation's Most Valuable Asset: Trust.
              </h2>
              <p className="text-[14px] sm:text-[15px] text-slate-300 leading-relaxed">
                Join forward-thinking enterprise brand teams maintaining impeccable consistency across all marketing touchpoints.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/app/dashboard"
                      className="px-6 py-3 bg-[#FFFFFF] hover:bg-slate-100 text-[#172033] rounded-xl text-[14px] font-semibold transition-all shadow-md flex items-center space-x-2"
                    >
                      <span>Continue to Command Center</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-[14px] font-semibold transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Switch Account / Sign In with Another Brand</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="px-6 py-3 bg-[#FFFFFF] hover:bg-slate-100 text-[#172033] rounded-xl text-[14px] font-semibold transition-all shadow-md"
                    >
                      Create Company Account
                    </Link>
                    <Link
                      to="/login"
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-[14px] font-semibold transition-all"
                    >
                      Sign In to Existing Brand
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Professional Enterprise Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#E2E8F0] px-6 sm:px-12 py-10 relative z-10 text-[13px] text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-[#315C76] flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="font-semibold text-[14px] text-[#172033]">BrandGuard AI</span>
            <span>• © {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-[13px] font-medium">
            <a href="#governance" className="hover:text-[#172033] transition-colors">Brand Governance</a>
            <a href="#audience" className="hover:text-[#172033] transition-colors">Audience Pulse</a>
            <a href="#workflow" className="hover:text-[#172033] transition-colors">8-Step Cycle</a>
            {isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="hover:text-rose-600 transition-colors cursor-pointer"
              >
                Switch Account / Sign Out
              </button>
            ) : (
              <Link to="/login" className="hover:text-[#172033] transition-colors">Enterprise Sign In</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
