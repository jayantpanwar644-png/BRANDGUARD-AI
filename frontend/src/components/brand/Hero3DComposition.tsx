import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Sparkles, ArrowRight, Search, SlidersHorizontal,
  X, Check, AlertTriangle, ExternalLink, Activity, Info, Settings,
  Radio, CheckCircle2, MessageSquareHeart, Eye, Cpu
} from 'lucide-react';

interface Hero3DCompositionProps {
  onExploreClick?: () => void;
}

export const Hero3DComposition: React.FC<Hero3DCompositionProps> = React.memo(({ onExploreClick }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef<boolean>(true);
  const rafRef = useRef<number | null>(null);

  // Modal / Popover States for working interactive options
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSlidersOpen, setIsSlidersOpen] = useState(false);
  const [isLiveGuardedOpen, setIsLiveGuardedOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [motionActive, setMotionActive] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pause all calculations when Hero is out of viewport
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
      if (!entry.isIntersecting && container) {
        container.classList.add('hero-resting');
        container.style.setProperty('--mx', '0');
        container.style.setProperty('--my', '0');
      }
    }, { threshold: 0.05 });
    observer.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisibleRef.current || document.hidden || !motionActive) return;
      if (rafRef.current) return;
      
      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current || !isVisibleRef.current) {
          rafRef.current = null;
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        containerRef.current.classList.remove('hero-resting');
        containerRef.current.style.setProperty('--mx', x.toFixed(4));
        containerRef.current.style.setProperty('--my', y.toFixed(4));
        rafRef.current = null;
      });
    };

    const handleMouseLeave = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.classList.add('hero-resting');
        containerRef.current.style.setProperty('--mx', '0');
        containerRef.current.style.setProperty('--my', '0');
      }
    };

    // Keyboard shortcut (Ctrl+K / Cmd+K) to toggle search palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSlidersOpen(false);
        setIsLiveGuardedOpen(false);
        setIsVersionModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [motionActive]);

  // Search Commands List
  const COMMANDS = [
    { title: 'Brand Governance & Audit', path: '/app/brand-governance', desc: 'Pre-publication visual compliance, logo clearspace & color matching', icon: ShieldCheck, badge: 'Pillar 1' },
    { title: 'Audience Intelligence & Feedback', path: '/app/audience-intelligence', desc: 'Post-publication comment sentiment and audience emotional pulse', icon: MessageSquareHeart, badge: 'Pillar 2' },
    { title: 'Reputation Sentinel & Risk Center', path: '/app/reputation-risk', desc: 'Real-time crisis escalation webhooks and incident alerts', icon: AlertTriangle, badge: 'Pillar 3' },
    { title: 'Company Guidelines & Palette Lock', path: '/app/guidelines', desc: 'Manage hex codes, typography rules, and restricted vocabulary', icon: Sparkles, badge: 'Guidelines' },
    { title: 'Executive Command Center', path: '/app/command-center', desc: 'Unified high-level dashboard of brand health and critical alerts', icon: Cpu, badge: 'Overview' },
    { title: 'Social Media Integrations', path: '/app/integrations', desc: 'Connected accounts: Instagram, LinkedIn, YouTube, X', icon: Radio, badge: 'Webhooks' },
  ];

  const filteredCommands = COMMANDS.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      ref={containerRef}
      className="hero-resting relative w-full max-w-6xl mx-auto h-[620px] sm:h-[660px] lg:h-[700px] flex items-center justify-center select-none overflow-visible will-change-transform [&.hero-resting_*]:transition-transform [&.hero-resting_*]:duration-500 [&.hero-resting_*]:ease-out"
      style={{ perspective: '1400px', '--mx': 0, '--my': 0 } as React.CSSProperties}
    >
      {/* 1. STUDIO ENVIRONMENT & RADIAL SPOTLIGHT */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Warm Studio Horizon Glow (Lightweight hardware-accelerated gradient) */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[560px] rounded-full opacity-75 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(250, 247, 240, 0.95) 0%, rgba(235, 226, 212, 0.5) 50%, transparent 75%)',
          }}
        />

        {/* Studio Coordinate Grid / Wireframe Matrix (Inspired by Reference) */}
        <div className="absolute inset-x-2 sm:inset-x-4 inset-y-3 sm:inset-y-4 border border-[#C6A66B]/25 rounded-[36px] sm:rounded-[44px] overflow-hidden opacity-70">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at center, rgba(198, 166, 107, 0.45) 1.2px, transparent 1.2px),
                linear-gradient(to right, rgba(198, 166, 107, 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(198, 166, 107, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '46px 46px, 46px 46px, 46px 46px',
            }}
          />
          {/* Coordinate Crosshairs */}
          <div className="absolute top-4 left-6 text-[9.5px] font-mono text-[#88857D] tracking-widest uppercase">
            [SYS_GRID: 34.2°N · LUXURY_STAGE]
          </div>
          <div className="absolute bottom-4 right-6 text-[9.5px] font-mono text-[#88857D] tracking-widest uppercase">
            [BRANDGUARD_AI · AUTONOMOUS_GOVERNANCE]
          </div>
        </div>

        {/* Sculptural Ceramic Arch (Left Horizon on studio floor with glowing light strip) */}
        <div 
          className="absolute -bottom-24 -left-14 w-72 h-72 sm:w-84 sm:h-84 rounded-full border-[26px] border-[#F2ECE1] opacity-95 will-change-transform pointer-events-none"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -10px), 0) rotate(-22deg)',
            boxShadow: 'inset 0 4px 14px rgba(255,255,255,0.9), 0 20px 45px rgba(100,90,75,0.15)'
          }}
        >
          {/* Inner Curved Warm Gold LED Light Strip Rim */}
          <div className="absolute inset-0 rounded-full border-t-[4px] border-[#C6A66B] shadow-[0_-8px_25px_rgba(198,166,107,0.7)]" />
        </div>

        {/* Sculptural Standing Gold Torus Ring (Right Horizon - Standing upright sculpture as in Reference) */}
        <div 
          className="absolute -bottom-6 right-6 sm:right-14 w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[15px] sm:border-[18px] border-[#EDE0CC] opacity-90 will-change-transform pointer-events-none"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 16px), calc(var(--my, 0) * 12px), 0) rotate(-15deg)',
            boxShadow: 'inset 0 4px 14px rgba(255,255,255,0.9), 0 20px 42px rgba(100,90,75,0.18)',
            borderRightColor: '#D9BE8E',
            borderBottomColor: '#C6A66B',
          }}
        >
          <div className="absolute inset-0 rounded-full border-r-[2.5px] border-b-[2.5px] border-[#C6A66B] shadow-[0_4px_16px_rgba(198,166,107,0.5)]" />
        </div>

        {/* Botanical Green Foliage (Vibrant leaves rising behind right torus arch, refined organic curves) */}
        <div 
          className="absolute right-4 sm:right-8 bottom-16 sm:bottom-22 w-48 sm:w-56 h-68 sm:h-76 pointer-events-none opacity-90 will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 12px), calc(var(--my, 0) * 10px), 0)'
          }}
        >
          <svg viewBox="0 0 160 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
            <path d="M130 250C110 200 95 140 85 80C80 40 85 10 90 5" stroke="#344D3D" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M88 35C108 20 135 22 145 38C135 55 108 55 86 42" fill="#244B3F" opacity="0.9" />
            <path d="M88 35C108 20 135 22 145 38" stroke="#829887" strokeWidth="1" />
            <path d="M85 75C110 60 142 65 152 82C138 102 105 102 83 85" fill="#344D3D" opacity="0.95" />
            <path d="M85 75C110 60 142 65 152 82" stroke="#829887" strokeWidth="1" />
            <path d="M82 120C108 108 140 118 148 138C130 156 98 150 78 132" fill="#244B3F" opacity="0.9" />
            <path d="M78 170C102 160 132 172 138 190C122 205 92 198 75 180" fill="#344D3D" opacity="0.85" />
            <path d="M86 55C66 42 38 48 28 62C40 80 68 80 84 65" fill="#4B6B56" opacity="0.8" />
            <path d="M82 100C60 90 32 102 24 118C40 135 70 130 80 112" fill="#344D3D" opacity="0.85" />
            <path d="M78 145C58 136 34 150 28 165C42 180 70 174 76 155" fill="#244B3F" opacity="0.8" />
          </svg>
        </div>
      </div>

      {/* 2. FLOATING 3D OBJECTS & TILES (Hardware-Accelerated Parallax Stage) */}
      <div 
        className="relative w-full h-full flex items-center justify-center will-change-transform"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(calc(var(--my, 0) * -9deg)) rotateY(calc(var(--mx, 0) * 12deg))'
        }}
      >
        {/* ======================================================================= */}
        {/* FLOATING IN-SCENE GLASS CAPSULE NAVBAR (All Options Fully Functional!)  */}
        {/* ======================================================================= */}
        <div 
          className="absolute top-4 sm:top-6 z-30 px-3.5 sm:px-5 py-2 rounded-full bg-[#FCFAF5]/85 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(90,75,60,0.08),0_1px_1px_rgba(255,255,255,0.95)_inset] flex items-center justify-between space-x-2.5 sm:space-x-5 will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 6px), calc(var(--my, 0) * 5px), 45px)',
          }}
        >
          {/* Left Title Link */}
          <button
            type="button"
            onClick={() => navigate('/app/overview')}
            title="Navigate to BrandGuard Enterprise Overview"
            className="flex items-center space-x-1.5 hover:opacity-85 transition-opacity cursor-pointer group text-left"
          >
            <span className="font-heading font-medium text-[13px] sm:text-[14px] text-[#242B27] tracking-tight group-hover:text-[#244B3F]">
              BrandGuard Enterprise
            </span>
            <span className="text-[10px] text-[#88857D] font-mono group-hover:text-[#C6A66B]">/ v3.2</span>
          </button>

          {/* Center Micro Navigation Links (Working Routes) */}
          <div className="hidden md:flex items-center space-x-3.5 lg:space-x-5 text-[12px] font-medium text-[#68736B]">
            <button
              type="button"
              onClick={() => navigate('/app/overview')}
              className="text-[#242B27] font-semibold hover:text-[#244B3F] transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/brand-governance')}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Governance
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/audience-intelligence')}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Intelligence
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/reputation-risk')}
              className="hover:text-[#242B27] transition-colors cursor-pointer"
            >
              Sentinel
            </button>
          </div>

          {/* Right Micro Controls (Interactive Search, Sliders, Live Guarded, White Capsule Pill) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* 1. Search Button (Opens Command Palette) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-7 h-7 rounded-full bg-[#EFECE2]/80 hover:bg-[#E2DDD2] flex items-center justify-center text-[#68736B] hover:text-[#242B27] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Search BrandGuard platform (Ctrl+K)"
              aria-label="Search Platform"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* 2. Sliders/Preferences Button (Opens System Control Modal) */}
            <button
              type="button"
              onClick={() => setIsSlidersOpen(true)}
              className="w-7 h-7 rounded-full bg-[#EFECE2]/80 hover:bg-[#E2DDD2] flex items-center justify-center text-[#68736B] hover:text-[#242B27] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="System Controls & Preferences"
              aria-label="System Controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* 3. Live Guarded Badge (Opens Telemetry Status Modal) */}
            <button
              type="button"
              onClick={() => setIsLiveGuardedOpen(true)}
              className="hidden sm:flex px-2.5 py-1 rounded-full bg-[#FCFAF5] hover:bg-[#EBF0ED] border border-[#C6A66B]/50 hover:border-[#244B3F] text-[10px] font-mono font-semibold text-[#244B3F] shadow-2xs transition-all cursor-pointer items-center space-x-1.5 hover:scale-105 active:scale-95"
              title="Click to view live system telemetry"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Live Guarded</span>
            </button>

            {/* 4. White Capsule Action Pill Button (Matches "max 5 ins" white pill from reference image!) */}
            <button
              type="button"
              onClick={() => navigate('/app/brand-governance')}
              className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white text-[#242B27] hover:text-[#244B3F] text-[11px] sm:text-[11.5px] font-semibold border border-[#E2DAD0] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,0.95)_inset] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
              title="Run Instant Brand Audit"
            >
              <span>Run Audit</span>
              <span className="text-[9.5px] font-mono text-[#88857D] hidden md:inline">&lt; 5s</span>
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* SPHERE PROPS (Realistic Ceramic Spheres with Studio Light)              */}
        {/* ======================================================================= */}
        {/* SPHERE 1: Top-Left Floating Ceramic Sphere (Positioned above top-left card as in Reference) */}
        <div 
          className="absolute top-16 sm:top-20 left-8 sm:left-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full z-20 pointer-events-none will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -18px), calc(var(--my, 0) * -16px), 65px)',
            background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F5E8DA 35%, #D4BEA7 75%, #A68D74 100%)',
            boxShadow: '0 16px 32px rgba(80, 65, 50, 0.22), inset -2px -4px 8px rgba(90, 75, 60, 0.32), inset 2px 2px 4px rgba(255, 255, 255, 0.95)'
          }}
        />

        {/* SPHERE 2: Bottom-Right Large Resting Peach Ceramic Sphere (Resting on floor next to gold ring) */}
        <div 
          className="absolute bottom-4 sm:bottom-6 right-10 sm:right-22 w-16 h-16 sm:w-20 sm:h-20 rounded-full z-20 pointer-events-none will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 22px), calc(var(--my, 0) * 18px), 85px)',
            background: 'radial-gradient(circle at 32% 28%, #FFFFFF 0%, #F8EFE4 30%, #DECBBA 70%, #AB9179 100%)',
            boxShadow: '0 24px 45px rgba(80, 65, 50, 0.26), inset -3px -6px 12px rgba(85, 70, 55, 0.4), inset 3px 3px 6px rgba(255, 255, 255, 0.95)'
          }}
        />

        {/* SPHERE 3: Foreground Tiny Bokeh Sphere */}
        <div 
          className="absolute bottom-18 left-10 w-6 h-6 rounded-full z-30 pointer-events-none blur-[1px] opacity-80 will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -26px), calc(var(--my, 0) * -22px), 95px)',
            background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #E8D3C0 50%, #B89C82 100%)',
            boxShadow: '0 10px 20px rgba(80, 65, 50, 0.2)'
          }}
        />

        {/* ======================================================================= */}
        {/* THE 4 TILTED 3D CARDS (Fully Clickable & Interactive!)                   */}
        {/* ======================================================================= */}

        {/* CARD 1: Top-Left Tilted Frosted Porcelain Card -> Brand Governance (Cleared from navbar!) */}
        <div 
          onClick={() => navigate('/app/brand-governance')}
          title="Click to open Brand Governance & RAG Claim Guard"
          className="absolute top-22 sm:top-26 left-2 sm:left-5 lg:left-8 w-48 sm:w-56 p-3.5 sm:p-4 rounded-2xl z-10 bg-[#FCFAF5]/70 backdrop-blur-md border border-white/80 shadow-[0_20px_45px_rgba(100,90,75,0.12)] will-change-transform overflow-hidden cursor-pointer hover:border-[#244B3F] hover:shadow-[0_26px_55px_rgba(36,75,63,0.22)] hover:scale-[1.02] transition-all group"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -12px), 35px) rotate(-18deg) rotateY(16deg) rotateX(-7deg)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="goldWave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C6A66B" stopOpacity="0.1" />
                  <stop offset="40%" stopColor="#E5D3AE" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#C6A66B" stopOpacity="1" />
                  <stop offset="85%" stopColor="#8A6E3B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#E5D3AE" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path 
                d="M -10 60 C 70 120, 160 30, 250 80" 
                stroke="url(#goldWave1)" 
                strokeWidth="7" 
                strokeLinecap="round"
                className="drop-shadow-[0_4px_8px_rgba(198,166,107,0.45)]"
              />
              <path 
                d="M -10 59 C 70 119, 160 29, 250 79" 
                stroke="#FFFFFF" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="w-6.5 h-6.5 rounded-lg bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#242B27] group-hover:text-[#244B3F] transition-colors">
                  RAG Claim Guard
                </div>
                <div className="text-[9px] text-[#88857D]">Automated Fact Check</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[9.5px] text-[#244B3F] font-semibold bg-[#EBF0ED]/90 px-2 py-1 rounded-lg border border-[#C8D7CF]/70 backdrop-blur-xs mt-1.5 group-hover:bg-[#EBF0ED] transition-colors">
              <span>100% Citation Match</span>
              <span className="text-[8px] bg-white px-1.5 py-0.5 rounded text-[#244B3F] font-mono font-bold shadow-2xs">
                VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Bottom-Left Tilted Terrazzo Card -> Guidelines & Palettes */}
        <div 
          onClick={() => navigate('/app/guidelines')}
          title="Click to open Brand Guidelines & Palette Lock"
          className="absolute bottom-6 sm:bottom-10 left-3 sm:left-8 lg:left-10 w-50 sm:w-58 p-3.5 sm:p-4 rounded-2xl z-10 border border-[#E2D8C7] shadow-[0_22px_45px_rgba(100,90,75,0.15)] will-change-transform overflow-hidden cursor-pointer hover:border-[#C6A66B] hover:shadow-[0_26px_55px_rgba(198,166,107,0.25)] hover:scale-[1.02] transition-all group"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -16px), calc(var(--my, 0) * -14px), 45px) rotate(16deg) rotateY(-12deg) rotateX(8deg)',
            backgroundColor: '#F5EFE4',
            backgroundImage: `
              radial-gradient(#7C6D5F 1px, transparent 1px),
              radial-gradient(#C6A66B 0.9px, transparent 0.9px),
              radial-gradient(#244B3F 0.8px, #F5EFE4 0.8px)
            `,
            backgroundSize: '16px 16px, 22px 22px, 12px 12px',
            backgroundPosition: '0 0, 8px 8px, 4px 4px',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 250 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="goldWave2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C6A66B" stopOpacity="0.2" />
                  <stop offset="35%" stopColor="#F2E4C4" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#C6A66B" stopOpacity="1" />
                  <stop offset="100%" stopColor="#8A6E3B" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path 
                d="M -10 40 C 70 90, 160 50, 260 110" 
                stroke="url(#goldWave2)" 
                strokeWidth="8" 
                strokeLinecap="round"
                className="drop-shadow-[0_4px_10px_rgba(198,166,107,0.5)]"
              />
              <path 
                d="M -10 39 C 70 89, 160 49, 260 109" 
                stroke="#FFFFFF" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="text-[9.5px] uppercase tracking-wider font-semibold text-[#68736B] font-mono mb-0.5 group-hover:text-[#244B3F] transition-colors">
              Brand Consistency
            </div>
            <div className="text-[13px] font-heading font-medium text-[#242B27] group-hover:text-[#244B3F] transition-colors">
              Palette &amp; Hex Lock
            </div>
            <div className="mt-2 flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#244B3F] border border-white shadow-2xs" title="#244B3F" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#C6A66B] border border-white shadow-2xs" title="#C6A66B" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#829887] border border-white shadow-2xs" title="#829887" />
              <span className="text-[10px] text-[#242B27] font-mono font-medium ml-1">Delta-E &lt; 0.8</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Top-Right Tilted Translucent Card -> Audience Intelligence (Cleared from navbar!) */}
        <div 
          onClick={() => navigate('/app/audience-intelligence')}
          title="Click to open Audience Intelligence & Sentiment Pulse"
          className="absolute top-22 sm:top-26 right-2 sm:right-5 lg:right-8 w-48 sm:w-56 p-3.5 sm:p-4 rounded-2xl z-10 bg-[#FCFAF5]/70 backdrop-blur-md border border-white/80 shadow-[0_20px_45px_rgba(100,90,75,0.12)] will-change-transform overflow-hidden cursor-pointer hover:border-[#244B3F] hover:shadow-[0_26px_55px_rgba(36,75,63,0.22)] hover:scale-[1.02] transition-all group"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 14px), calc(var(--my, 0) * -14px), 40px) rotate(18deg) rotateY(-16deg) rotateX(-7deg)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path 
                d="M -10 50 C 80 110, 160 60, 250 90" 
                stroke="url(#goldWave1)" 
                strokeWidth="7" 
                strokeLinecap="round"
                className="drop-shadow-[0_4px_8px_rgba(198,166,107,0.45)]"
              />
              <path 
                d="M -10 49 C 80 109, 160 59, 250 89" 
                stroke="#FFFFFF" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-1.5">
              <div className="w-6.5 h-6.5 rounded-lg bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-3.5 h-3.5 stroke-[2] text-[#C6A66B]" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#242B27] group-hover:text-[#244B3F] transition-colors">
                  Audience Sentiment
                </div>
                <div className="text-[9px] text-[#88857D]">Real-Time Public Pulse</div>
              </div>
            </div>

            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="text-[18px] font-heading font-medium text-[#244B3F]">78.4%</span>
              <span className="text-[10px] text-[#68736B]">Positive Comments</span>
            </div>
          </div>
        </div>

        {/* CARD 4: Bottom-Right Tilted Ribbed Texture Card -> Reputation Risk */}
        <div 
          onClick={() => navigate('/app/reputation-risk')}
          title="Click to open Reputation Sentinel & Crisis Escalation"
          className="absolute bottom-6 sm:bottom-10 right-3 sm:right-8 lg:right-10 w-50 sm:w-58 p-3.5 sm:p-4 rounded-2xl z-10 border border-[#E2D8C7] shadow-[0_22px_45px_rgba(100,90,75,0.15)] will-change-transform overflow-hidden cursor-pointer hover:border-[#10B981] hover:shadow-[0_26px_55px_rgba(16,185,129,0.22)] hover:scale-[1.02] transition-all group"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 18px), calc(var(--my, 0) * 16px), 50px) rotate(-16deg) rotateY(14deg) rotateX(8deg)',
            backgroundColor: '#F7F4EC',
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(198, 166, 107, 0.12) 0px, rgba(198, 166, 107, 0.12) 2px, transparent 2px, transparent 7px),
              linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(247,244,236,0.9) 100%)
            `,
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 250 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path 
                d="M -10 110 C 90 60, 160 100, 260 40" 
                stroke="url(#goldWave2)" 
                strokeWidth="8" 
                strokeLinecap="round"
                className="drop-shadow-[0_4px_10px_rgba(198,166,107,0.5)]"
              />
              <path 
                d="M -10 109 C 90 59, 160 99, 260 39" 
                stroke="#FFFFFF" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center space-x-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#244B3F] font-semibold">
                Reputation Sentinel
              </span>
            </div>

            <div className="text-[12.5px] font-heading text-[#242B27] leading-tight group-hover:text-[#244B3F] transition-colors">
              Zero Escalation Alerts
            </div>
            <div className="text-[9.5px] text-[#88857D] mt-0.5 font-mono">
              Social Webhooks Active
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. CENTRAL HERO FROSTED-GLASS CARD (All Metrics & CTAs Interactive!)    */}
        {/* ======================================================================= */}
        <div 
          className="relative w-[320px] sm:w-[390px] md:w-[430px] p-5 sm:p-6 md:p-6.5 rounded-[28px] sm:rounded-[32px] z-25 bg-[#FCFAF5]/88 backdrop-blur-xl border border-white/80 shadow-[0_28px_65px_rgba(80,65,50,0.15),0_1px_2px_rgba(255,255,255,0.95)_inset] will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 8px), calc(var(--my, 0) * 7px), 85px)',
          }}
        >
          {/* Ambient Gold Edge Sheen */}
          <div className="absolute -inset-[1px] rounded-[29px] sm:rounded-[33px] bg-gradient-to-b from-white/95 via-[#C6A66B]/20 to-transparent pointer-events-none -z-10" />

          {/* Top Pill Bar inside Central Card */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E8DFD0]/70">
            <button
              type="button"
              onClick={() => navigate('/app/command-center')}
              className="flex items-center space-x-2 text-left group cursor-pointer hover:opacity-85 transition-opacity"
              title="Open Command Center"
            >
              <div className="w-6.5 h-6.5 rounded-lg bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="font-heading font-medium text-[14.5px] text-[#242B27] tracking-tight group-hover:text-[#244B3F] transition-colors">
                BrandGuard AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsVersionModalOpen(true)}
              className="flex items-center space-x-1 text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EBF0ED] hover:bg-[#244B3F] hover:text-[#FCFAF5] text-[#244B3F] border border-[#C8D7CF]/80 transition-all cursor-pointer shadow-2xs"
              title="Click to view v3.2 Enterprise Specs"
            >
              <span>Enterprise v3.2</span>
              <Info className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Center Brand Headline */}
          <div className="text-center space-y-1.5 py-1">
            <h2 className="text-[24px] sm:text-[30px] font-heading font-normal text-[#242B27] tracking-tight leading-tight">
              Intelligent Brand Governance
            </h2>
            <p className="text-[12.5px] sm:text-[13px] text-[#68736B] leading-relaxed max-w-xs mx-auto">
              Pre-publication creative auditing and post-publication audience listening in one unified workspace.
            </p>
          </div>

          {/* Key Metric Highlights in 3 Mini Pillars (Clickable to jump to specific modules!) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-3 pt-3 border-t border-[#E8DFD0]/70 text-center">
            {/* Metric 1 -> Brand Governance */}
            <button
              type="button"
              onClick={() => navigate('/app/brand-governance')}
              title="Open Brand Health Audit & Findings"
              className="p-2 rounded-xl bg-[#F8F5EF]/85 hover:bg-[#F2ECE1] border border-[#EAE3D5] hover:border-[#244B3F] transition-all cursor-pointer text-center group"
            >
              <div className="text-[17px] sm:text-[20px] font-heading font-normal text-[#244B3F] tabular-nums group-hover:scale-105 transition-transform">
                98.4%
              </div>
              <div className="text-[9px] text-[#88857D] font-sans group-hover:text-[#242B27]">Brand Health</div>
            </button>

            {/* Metric 2 -> Command Center */}
            <button
              type="button"
              onClick={() => navigate('/app/command-center')}
              title="Open AI Scan & Audit Engine"
              className="p-2 rounded-xl bg-[#F8F5EF]/85 hover:bg-[#F2ECE1] border border-[#EAE3D5] hover:border-[#C6A66B] transition-all cursor-pointer text-center group"
            >
              <div className="text-[17px] sm:text-[20px] font-heading font-normal text-[#C6A66B] tabular-nums group-hover:scale-105 transition-transform">
                &lt; 5s
              </div>
              <div className="text-[9px] text-[#88857D] font-sans group-hover:text-[#242B27]">AI Scan Time</div>
            </button>

            {/* Metric 3 -> Audience Intelligence */}
            <button
              type="button"
              onClick={() => navigate('/app/audience-intelligence')}
              title="Open Audience Sentiment Trends"
              className="p-2 rounded-xl bg-[#F8F5EF]/85 hover:bg-[#F2ECE1] border border-[#EAE3D5] hover:border-[#244B3F] transition-all cursor-pointer text-center group"
            >
              <div className="text-[17px] sm:text-[20px] font-heading font-normal text-[#242B27] tabular-nums group-hover:scale-105 transition-transform">
                +84 NPS
              </div>
              <div className="text-[9px] text-[#88857D] font-sans group-hover:text-[#242B27]">Sentiment</div>
            </button>
          </div>

          {/* Glowing Pill Button (Inspired by Reference Image's Glowing "COTa hero" Pill with Luminous Radial Halo Bloom) */}
          <div className="pt-2.5 flex justify-center relative">
            {/* Luminous Warm Golden/Peach Radial Ambient Underglow Bloom (Exact match to "COTa hero" in Image 1) */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 sm:w-60 h-16 sm:h-20 rounded-full opacity-90 blur-xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(235, 175, 100, 0.95) 0%, rgba(215, 155, 80, 0.6) 45%, rgba(198, 166, 107, 0.2) 70%, transparent 85%)',
              }}
            />
            <button
              type="button"
              onClick={onExploreClick}
              className="relative px-8 sm:px-9 py-2.5 sm:py-3 rounded-full text-[13px] sm:text-[13.5px] font-semibold text-[#242B27] bg-gradient-to-b from-[#FFFFFF] via-[#FCF9F3] to-[#F7EFE1] border border-[#E5D7C3] shadow-[0_4px_22px_rgba(215,155,80,0.45),0_1px_2px_rgba(255,255,255,0.95)_inset] hover:shadow-[0_6px_32px_rgba(215,155,80,0.75)] hover:border-[#C6A66B] transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center space-x-2 group"
            >
              <span>Explore Architecture</span>
              <ArrowRight className="w-4 h-4 text-[#C6A66B] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 4. MODALS & PALETTES TRIGGERED BY THE TOP OPTIONS                       */}
      {/* ======================================================================= */}

      {/* MODAL A: Command / Search Palette (Opened by Search Icon or Ctrl+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-xl bg-[#FCFAF5] rounded-2xl border border-[#DDD4C6] shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#EAE2D4]">
              <Search className="w-4 h-4 text-[#88857D] mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search BrandGuard modules, governance tools, guidelines..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[14px] text-[#242B27] placeholder-[#88857D] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-md text-[#88857D] hover:text-[#242B27] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Command Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(cmd.path);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#F3EFE6] transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EBF0ED] group-hover:bg-[#244B3F] text-[#244B3F] group-hover:text-[#FCFAF5] flex items-center justify-center transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-[#242B27] group-hover:text-[#244B3F]">
                            {cmd.title}
                          </div>
                          <div className="text-[11px] text-[#68736B]">
                            {cmd.desc}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#88857D] bg-white border border-[#DDD4C6] px-2 py-0.5 rounded">
                        {cmd.badge}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[#88857D]">
                  No matching intelligence module found.
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-[#F8F5EF] border-t border-[#EAE2D4] flex items-center justify-between text-[11px] text-[#88857D] font-mono">
              <span>Press ESC to close</span>
              <span>Quick Navigation active</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL B: System Controls & Preferences (Opened by Sliders Icon) */}
      {isSlidersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-md bg-[#FCFAF5] rounded-3xl border border-[#DDD4C6] shadow-[0_24px_60px_rgba(0,0,0,0.18)] p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D4]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-[16px] text-[#242B27]">Platform Controls</h3>
                  <p className="text-[11px] text-[#88857D] font-mono">BrandGuard Studio Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSlidersOpen(false)}
                className="p-1 rounded-md text-[#88857D] hover:text-[#242B27] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-[13px]">
              {/* Motion Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div>
                  <div className="font-semibold text-[#242B27]">3D Parallax Stage Motion</div>
                  <div className="text-[11px] text-[#68736B]">Hardware-accelerated tilt dynamics</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMotionActive(!motionActive)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    motionActive ? 'bg-[#244B3F]' : 'bg-[#DDD4C6]'
                  }`}
                >
                  <span 
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      motionActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Strict Audit Lock */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div>
                  <div className="font-semibold text-[#242B27]">Enterprise Delta-E Strictness</div>
                  <div className="text-[11px] text-[#68736B]">Threshold set to &lt; 0.8 CIELAB</div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] border border-[#C8D7CF]">
                  STRICT
                </span>
              </div>

              {/* Connected Sentinel Webhooks */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div>
                  <div className="font-semibold text-[#242B27]">Sentinel Social Webhooks</div>
                  <div className="text-[11px] text-[#68736B]">Instagram, LinkedIn, YouTube, X</div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF7F1] text-[#239B6B] border border-[#BDE7D4]">
                  4 / 4 ACTIVE
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSlidersOpen(false)}
                className="px-5 py-2 bg-[#244B3F] text-[#FCFAF5] rounded-full text-xs font-semibold hover:bg-[#18382F] transition-all cursor-pointer shadow-xs"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL C: Live Guarded Telemetry Status (Opened by Live Guarded Badge) */}
      {isLiveGuardedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-md bg-[#FCFAF5] rounded-3xl border border-[#DDD4C6] shadow-[0_24px_60px_rgba(0,0,0,0.18)] p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D4]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#239B6B] text-[#FCFAF5] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-[16px] text-[#242B27]">Live Telemetry Monitor</h3>
                  <p className="text-[11px] text-[#239B6B] font-mono font-semibold">ALL 4 PILLARS OPERATIONAL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveGuardedOpen(false)}
                className="p-1 rounded-md text-[#88857D] hover:text-[#242B27] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div className="text-[18px] font-heading font-medium text-[#244B3F]">99.98%</div>
                <div className="text-[10px] text-[#88857D] font-mono">Service Availability</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div className="text-[18px] font-heading font-medium text-[#C6A66B]">28 ms</div>
                <div className="text-[10px] text-[#88857D] font-mono">Gateway Latency</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div className="text-[18px] font-heading font-medium text-[#242B27]">1,480</div>
                <div className="text-[10px] text-[#88857D] font-mono">Comments Monitored</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8F5EF] border border-[#EAE2D4]">
                <div className="text-[18px] font-heading font-medium text-[#239B6B]">0 Alerts</div>
                <div className="text-[10px] text-[#88857D] font-mono">Critical Escalations</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] text-[#244B3F] flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Multi-tenant RAG vector partition locked &amp; active.</span>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLiveGuardedOpen(false)}
                className="px-5 py-2 bg-[#244B3F] text-[#FCFAF5] rounded-full text-xs font-semibold hover:bg-[#18382F] transition-all cursor-pointer"
              >
                Close Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D: Enterprise v3.2 Release Specs (Opened by v3.2 Badge) */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-md bg-[#FCFAF5] rounded-3xl border border-[#DDD4C6] shadow-[0_24px_60px_rgba(0,0,0,0.18)] p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D4]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-[16px] text-[#242B27]">BrandGuard Enterprise v3.2</h3>
                  <p className="text-[11px] text-[#88857D] font-mono">Production Release Build</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="p-1 rounded-md text-[#88857D] hover:text-[#242B27] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2.5 text-[12.5px] text-[#242B27]">
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-[#244B3F] mt-0.5 flex-shrink-0" />
                <span>Multi-modal Vision Audit for logo clearspace and color fidelity.</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-[#244B3F] mt-0.5 flex-shrink-0" />
                <span>Zero-shot RAG claim extraction with exact source citations.</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-[#244B3F] mt-0.5 flex-shrink-0" />
                <span>Cross-platform public sentiment listening (Instagram, LinkedIn, YouTube).</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-[#244B3F] mt-0.5 flex-shrink-0" />
                <span>Automated continuous 8-step brand governance loop.</span>
              </li>
            </ul>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="px-5 py-2 bg-[#244B3F] text-[#FCFAF5] rounded-full text-xs font-semibold hover:bg-[#18382F] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

Hero3DComposition.displayName = 'Hero3DComposition';
