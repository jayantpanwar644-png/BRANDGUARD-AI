import React from 'react';
import { ShieldCheck, Lock, Activity, Eye, FileCheck } from 'lucide-react';

export const BrandSecurityVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center select-none pointer-events-none sm:pointer-events-auto">
      {/* Outer ambient soft aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#244B3F]/10 via-[#C6A66B]/8 to-transparent blur-3xl transform -scale-95 animate-pulse-slow" />

      {/* SVG Geometric Rings & Orbital Paths */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#244B3F" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#829887" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C6A66B" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C6A66B" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#244B3F" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#829887" stopOpacity="0.25" />
          </linearGradient>

          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#244B3F" />
            <stop offset="100%" stopColor="#18382F" />
          </linearGradient>

          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Ring 1 - Slow Clockwise Spin */}
        <g className="animate-spin-very-slow origin-center">
          <circle
            cx="250"
            cy="250"
            r="210"
            stroke="url(#ringGrad1)"
            strokeWidth="1.25"
            strokeDasharray="8 6 2 6"
            opacity="0.85"
          />
          {/* Orbital Satellite Node on Outer Ring */}
          <circle cx="250" cy="40" r="4.5" fill="#C6A66B" filter="url(#glowFilter)" />
          <circle cx="250" cy="460" r="3.5" fill="#829887" />
        </g>

        {/* Middle Ring 2 - Counter-Clockwise Spin */}
        <g className="animate-spin-reverse-slow origin-center">
          <circle
            cx="250"
            cy="250"
            r="165"
            stroke="url(#ringGrad2)"
            strokeWidth="1.5"
            strokeDasharray="12 8"
            opacity="0.9"
          />
          <circle cx="85" cy="250" r="4" fill="#244B3F" />
          <circle cx="415" cy="250" r="4.5" fill="#C6A66B" filter="url(#glowFilter)" />
        </g>

        {/* Inner Ring 3 - Precise Radar Dial */}
        <circle
          cx="250"
          cy="250"
          r="120"
          stroke="#E4DFD5"
          strokeWidth="1"
          opacity="0.75"
        />
        <circle
          cx="250"
          cy="250"
          r="95"
          stroke="#244B3F"
          strokeWidth="0.85"
          strokeDasharray="4 4"
          opacity="0.5"
        />

        {/* Radiating Precision Crosshairs */}
        <line x1="250" y1="20" x2="250" y2="70" stroke="#829887" strokeWidth="1" opacity="0.4" />
        <line x1="250" y1="430" x2="250" y2="480" stroke="#829887" strokeWidth="1" opacity="0.4" />
        <line x1="20" y1="250" x2="70" y2="250" stroke="#829887" strokeWidth="1" opacity="0.4" />
        <line x1="430" y1="250" x2="480" y2="250" stroke="#829887" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Central Shield Emblematics with Light Sweep */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Breathing backdrop ring */}
        <div className="absolute w-36 h-36 rounded-full bg-[#244B3F]/10 animate-pulse-gentle" />

        {/* Main Solid Shield Container */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#244B3F] to-[#18382F] p-0.5 shadow-[0_12px_36px_rgba(36,75,63,0.3)] flex items-center justify-center overflow-hidden group">
          {/* Light Sweep Highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FCFAF5]/25 to-transparent -translate-x-full animate-shimmer" />

          {/* Golden Shield Border Accent */}
          <div className="w-full h-full rounded-[22px] bg-[#1D3D33] flex items-center justify-center relative border border-[#C6A66B]/30">
            <ShieldCheck className="w-12 h-12 sm:w-14 sm:h-14 text-[#FCFAF5] stroke-[1.8] drop-shadow-md" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C6A66B] animate-ping" />
          </div>
        </div>
      </div>

      {/* Floating Trust Indicator Badges positioned organically around the rings */}
      
      {/* Node 1: Top Right - Visual Compliance */}
      <div className="absolute top-8 right-2 sm:right-6 bg-[#FCFAF5]/95 backdrop-blur-md border border-[#E4DFD5] px-3.5 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,43,39,0.06)] flex items-center space-x-2 animate-float-slow">
        <div className="w-6 h-6 rounded-xl bg-[#EBF0ED] border border-[#C8D7CF] text-[#244B3F] flex items-center justify-center">
          <FileCheck className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        <div>
          <div className="text-[11.5px] font-bold text-[#242B27] leading-tight">Brand Assets</div>
          <div className="text-[10px] text-[#244B3F] font-semibold">100% Guarded</div>
        </div>
      </div>

      {/* Node 2: Bottom Left - Reputation Stream */}
      <div className="absolute bottom-8 left-2 sm:left-4 bg-[#FCFAF5]/95 backdrop-blur-md border border-[#E4DFD5] px-3.5 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,43,39,0.06)] flex items-center space-x-2 animate-float-reverse">
        <div className="w-6 h-6 rounded-xl bg-[#F7F1E5] border border-[#E7DBC5] text-[#C6A66B] flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        <div>
          <div className="text-[11.5px] font-bold text-[#242B27] leading-tight">Audience Sentiment</div>
          <div className="text-[10px] text-[#C6A66B] font-semibold">Real-Time Pulse</div>
        </div>
      </div>

      {/* Node 3: Top Left - Regulatory & Cryptographic Shield */}
      <div className="absolute top-16 left-0 sm:left-6 bg-[#FCFAF5]/95 backdrop-blur-md border border-[#E4DFD5] px-3 py-1.5 rounded-2xl shadow-[0_4px_16px_rgba(36,43,39,0.06)] flex items-center space-x-2 animate-float-slow" style={{ animationDelay: '1.2s' }}>
        <div className="w-5 h-5 rounded-lg bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center">
          <Lock className="w-3 h-3 stroke-[2.2]" />
        </div>
        <div className="text-[10.5px] font-medium text-[#242B27]">
          Enterprise RAG Passport
        </div>
      </div>

      {/* Node 4: Bottom Right - Claim Verification */}
      <div className="absolute bottom-16 right-0 sm:right-8 bg-[#FCFAF5]/95 backdrop-blur-md border border-[#E4DFD5] px-3 py-1.5 rounded-2xl shadow-[0_4px_16px_rgba(36,43,39,0.06)] flex items-center space-x-2 animate-float-reverse" style={{ animationDelay: '1.8s' }}>
        <div className="w-5 h-5 rounded-lg bg-[#FAF0EC] text-[#C77E63] flex items-center justify-center">
          <Eye className="w-3 h-3 stroke-[2.2]" />
        </div>
        <div className="text-[10.5px] font-medium text-[#242B27]">
          Autonomous Verification
        </div>
      </div>
    </div>
  );
};
