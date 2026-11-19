import React, { useState } from 'react';
import { 
  Sparkles, MessageSquareHeart, CheckCircle2, TrendingUp, 
  Smile, Frown, Meh, AlertCircle, ArrowRight, CornerDownRight
} from 'lucide-react';

interface FeedbackSample {
  id: string;
  author: string;
  platform: 'Instagram' | 'LinkedIn' | 'Facebook' | 'YouTube';
  time: string;
  comment: string;
  sentiment: 'Mixed' | 'Positive' | 'Neutral';
  sentimentColor: string;
  sentimentBg: string;
  sentimentBorder: string;
  topic: string;
  emotion: string;
  recommendation: string;
  responseDraft: string;
  confidence: number;
}

const SAMPLES: FeedbackSample[] = [
  {
    id: 'sample-1',
    author: 'Sarah Jenkins',
    platform: 'Instagram',
    time: '24m ago',
    comment: 'Product quality is excellent, but delivery took too long.',
    sentiment: 'Mixed',
    sentimentColor: 'text-[#C6A66B]',
    sentimentBg: 'bg-[#FDF9F0]',
    sentimentBorder: 'border-[#EADBBF]',
    topic: 'Delivery & Logistics',
    emotion: 'Disappointed yet appreciative',
    recommendation: 'Acknowledge craftsmanship while addressing carrier transit delays empathetically.',
    responseDraft: 'Hi Sarah, thank you for praising our product quality! We apologize for the transit delay. We have upgraded our regional dispatch partners to prevent this in the future.',
    confidence: 97.4,
  },
  {
    id: 'sample-2',
    author: 'Marcus Vance',
    platform: 'LinkedIn',
    time: '1h ago',
    comment: 'The new enterprise brand guidelines portal is remarkably intuitive and sleek. Our design team loves it!',
    sentiment: 'Positive',
    sentimentColor: 'text-[#244B3F]',
    sentimentBg: 'bg-[#EBF0ED]',
    sentimentBorder: 'border-[#C8D7CF]',
    topic: 'Product Usability',
    emotion: 'Delighted & enthusiastic',
    recommendation: 'Engage with brand advocate and share testimonial for case study highlighting workflow efficiency.',
    responseDraft: 'Thank you Marcus! Empowering creative teams to work with complete brand confidence is our core mission.',
    confidence: 99.1,
  },
  {
    id: 'sample-3',
    author: 'David Chen',
    platform: 'YouTube',
    time: '3h ago',
    comment: 'Does the enterprise license support custom multi-tenant RAG knowledge bases?',
    sentiment: 'Neutral',
    sentimentColor: 'text-[#68736B]',
    sentimentBg: 'bg-[#F2EFE8]',
    sentimentBorder: 'border-[#DDD7CA]',
    topic: 'Features & Architecture',
    emotion: 'Inquiring & curious',
    recommendation: 'Provide technical documentation on multi-tenant tenant isolation and prompt scheduling a demo.',
    responseDraft: 'Hello David! Yes, each corporate department maintains an isolated vector passport with dedicated RAG partitions.',
    confidence: 96.8,
  },
];

export const CustomerFeedbackShowcase: React.FC = () => {
  const [activeSampleId, setActiveSampleId] = useState<string>('sample-1');
  const activeSample = SAMPLES.find(s => s.id === activeSampleId) || SAMPLES[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FCFAF5]/90 border border-[#C6A66B]/30 text-[11px] font-mono uppercase tracking-wider text-[#244B3F] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
          <span>Post-Publication Intelligence Engine</span>
        </div>
        <h2 className="text-[32px] sm:text-[42px] font-heading font-normal text-[#242B27] tracking-tight leading-tight">
          Customer Feedback Intelligence
        </h2>
        <p className="text-[14.5px] sm:text-[16px] text-[#68736B] leading-relaxed max-w-2xl mx-auto">
          Transform unstructured public comments, mentions, and customer reviews into actionable brand governance insights.
        </p>
      </div>

      {/* Main Dual-Panel Grid on Unified Warm Background */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Aggregated Sentiment Pulse & Trend (5 Cols) */}
        <div className="lg:col-span-5 bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-6 sm:p-7 shadow-[0_12px_32px_rgba(100,90,75,0.06)] flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE2D4]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="text-[14px] font-heading text-[#242B27]">Live Sentiment Distribution</div>
                  <div className="text-[11px] text-[#88857D] font-mono">1,480 Public Reactions Audited</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EBF0ED] text-[#244B3F] border border-[#C8D7CF]">
                SYNCED
              </span>
            </div>

            {/* Sentiment Metric Bars */}
            <div className="space-y-4 pt-5">
              {/* Positive */}
              <div>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5 font-medium">
                  <span className="text-[#242B27] flex items-center space-x-1.5">
                    <Smile className="w-3.5 h-3.5 text-[#244B3F]" />
                    <span>Positive Sentiment</span>
                  </span>
                  <span className="font-heading font-medium text-[#244B3F] tabular-nums">78.4%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#EAE2D4] overflow-hidden">
                  <div className="h-full rounded-full bg-[#244B3F] transition-all duration-1000" style={{ width: '78.4%' }} />
                </div>
              </div>

              {/* Neutral */}
              <div>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5 font-medium">
                  <span className="text-[#242B27] flex items-center space-x-1.5">
                    <Meh className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Neutral Inquiries</span>
                  </span>
                  <span className="font-heading font-medium text-[#C6A66B] tabular-nums">14.8%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#EAE2D4] overflow-hidden">
                  <div className="h-full rounded-full bg-[#C6A66B] transition-all duration-1000" style={{ width: '14.8%' }} />
                </div>
              </div>

              {/* Negative */}
              <div>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5 font-medium">
                  <span className="text-[#242B27] flex items-center space-x-1.5">
                    <Frown className="w-3.5 h-3.5 text-[#C77E63]" />
                    <span>Critical Complaints</span>
                  </span>
                  <span className="font-heading font-medium text-[#C77E63] tabular-nums">6.8%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#EAE2D4] overflow-hidden">
                  <div className="h-full rounded-full bg-[#C77E63] transition-all duration-1000" style={{ width: '6.8%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Sentiment Velocity Sparkline (Cubic Hermite Visual) */}
          <div className="pt-4 border-t border-[#EAE2D4] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#68736B] font-mono">
              <span>7-DAY FAVORABILITY TRAJECTORY</span>
              <span className="text-[#244B3F] font-semibold">+14.2% Growth</span>
            </div>
            <div className="w-full h-20 relative">
              <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sentimentTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#244B3F" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#244B3F" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d="M 10 65 Q 60 55 100 40 T 180 30 T 240 20 T 290 12 L 290 75 L 10 75 Z"
                  fill="url(#sentimentTrendGrad)"
                />
                {/* Stroke line */}
                <path
                  d="M 10 65 Q 60 55 100 40 T 180 30 T 240 20 T 290 12"
                  fill="none"
                  stroke="#244B3F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Key coordinate markers */}
                <circle cx="10" cy="65" r="3" fill="#FCFAF5" stroke="#244B3F" strokeWidth="2" />
                <circle cx="100" cy="40" r="3" fill="#FCFAF5" stroke="#244B3F" strokeWidth="2" />
                <circle cx="180" cy="30" r="3" fill="#FCFAF5" stroke="#244B3F" strokeWidth="2" />
                <circle cx="290" cy="12" r="4" fill="#C6A66B" stroke="#FCFAF5" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-[#88857D] font-mono">
              <span>Day 1 (Launch)</span>
              <span>Day 3 (Peak Reach)</span>
              <span>Day 7 (Stabilized)</span>
            </div>
          </div>

          <div className="text-[10.5px] text-[#88857D] font-mono text-center pt-1">
            * Sample analytical model preview for illustration purposes.
          </div>
        </div>

        {/* Right Column: Interactive Comment Analysis Showcase (7 Cols) */}
        <div className="lg:col-span-7 bg-[#FCFAF5] border border-[#E2D8C7] rounded-[28px] p-6 sm:p-7 shadow-[0_12px_32px_rgba(100,90,75,0.06)] flex flex-col justify-between space-y-6">
          <div>
            {/* Sample Selector Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D4]">
              <span className="text-[11px] font-mono uppercase text-[#68736B] tracking-wider font-semibold">
                Select Public Comment to Audit:
              </span>
              <span className="text-[10px] font-mono text-[#88857D]">
                Interactive Demo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => setActiveSampleId(sample.id)}
                  className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                    activeSampleId === sample.id
                      ? 'bg-[#F8F5EF] border-[#244B3F] shadow-xs'
                      : 'bg-[#FCFAF5] border-[#E4DFD5] hover:border-[#C6A66B] hover:bg-[#F8F5EF]/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#242B27]">
                    <span>{sample.platform}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${sample.sentimentBg} ${sample.sentimentColor} border ${sample.sentimentBorder}`}>
                      {sample.sentiment}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#68736B] truncate mt-1">
                    "{sample.comment}"
                  </div>
                </button>
              ))}
            </div>

            {/* Active Comment Card */}
            <div className="mt-5 p-4 rounded-2xl bg-[#F8F5EF] border border-[#E6DDCE] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68736B]">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-[#244B3F] text-[#FCFAF5] text-[9px] font-bold flex items-center justify-center font-mono">
                    {activeSample.author.charAt(0)}
                  </div>
                  <span className="font-semibold text-[#242B27]">{activeSample.author}</span>
                  <span>on {activeSample.platform}</span>
                </div>
                <span className="font-mono text-[10px] text-[#88857D]">{activeSample.time}</span>
              </div>
              <p className="text-[14px] text-[#242B27] font-serif italic pt-1 leading-relaxed">
                "{activeSample.comment}"
              </p>
            </div>

            {/* AI Multi-Layer Interpretation Breakdown */}
            <div className="mt-5 space-y-3.5">
              <div className="text-[11px] font-mono uppercase text-[#244B3F] font-semibold tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>AI Automated Diagnostics (Confidence: {activeSample.confidence}%)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Sentiment */}
                <div className={`p-3 rounded-xl border ${activeSample.sentimentBg} ${activeSample.sentimentBorder}`}>
                  <div className="text-[10px] text-[#68736B] uppercase font-mono">Sentiment</div>
                  <div className={`text-[13px] font-semibold mt-0.5 ${activeSample.sentimentColor}`}>
                    {activeSample.sentiment}
                  </div>
                </div>

                {/* Topic */}
                <div className="p-3 rounded-xl bg-[#F8F5EF] border border-[#E4DFD5]">
                  <div className="text-[10px] text-[#68736B] uppercase font-mono">Core Topic</div>
                  <div className="text-[13px] font-semibold text-[#242B27] mt-0.5 truncate">
                    {activeSample.topic}
                  </div>
                </div>

                {/* Emotion */}
                <div className="p-3 rounded-xl bg-[#F8F5EF] border border-[#E4DFD5]">
                  <div className="text-[10px] text-[#68736B] uppercase font-mono">Detected Emotion</div>
                  <div className="text-[13px] font-semibold text-[#242B27] mt-0.5 truncate">
                    {activeSample.emotion}
                  </div>
                </div>
              </div>

              {/* Actionable Strategic Recommendation */}
              <div className="p-3.5 rounded-xl bg-[#F4EEE3]/90 border border-[#E2D6C0] text-[12.5px] space-y-1">
                <div className="font-semibold text-[#242B27] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#244B3F]" />
                  <span>Strategic AI Recommendation:</span>
                </div>
                <div className="text-[#68736B] leading-relaxed">
                  {activeSample.recommendation}
                </div>
              </div>

              {/* Brand-Safe Response Draft */}
              <div className="p-3.5 rounded-xl bg-[#FCFAF5] border border-[#E2D8C7] text-[12.5px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#244B3F] text-xs flex items-center space-x-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Brand-Safe Response Draft (Requires Human Sign-off):</span>
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#EBF0ED] text-[#244B3F] font-semibold">
                    100% TONE COMPLIANT
                  </span>
                </div>
                <p className="text-[#262A25] italic text-[12.5px] leading-relaxed pl-5 border-l-2 border-[#C6A66B]/50">
                  "{activeSample.responseDraft}"
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#EAE2D4] text-[12px] text-[#68736B]">
            <span>Powered by Gemini 2.5 Flash &amp; BrandGuard Vector RAG</span>
            <span className="font-mono text-[#244B3F] font-semibold">Zero Hallucinations</span>
          </div>
        </div>

      </div>
    </div>
  );
};
