import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, MessageSquare, ArrowUpRight, RotateCcw } from 'lucide-react';
import { PeakChart } from '../ui/peak-chart';

interface CommentItem {
  id: number;
  text: string;
  author: string;
  platform: string;
  sentiment: 'Positive' | 'Negative';
  confidence: number;
  topic: string;
}

const DEMO_COMMENTS: CommentItem[] = [
  {
    id: 1,
    text: "Amazing product quality!",
    author: "Elena Rostova",
    platform: "Instagram",
    sentiment: "Positive",
    confidence: 98,
    topic: "Product Quality",
  },
  {
    id: 2,
    text: "Delivery was very late.",
    author: "Marcus Chen",
    platform: "X / Twitter",
    sentiment: "Negative",
    confidence: 94,
    topic: "Delivery Experience",
  },
  {
    id: 3,
    text: "Customer support was helpful.",
    author: "Sarah Jenkins",
    platform: "Trustpilot",
    sentiment: "Positive",
    confidence: 91,
    topic: "Customer Support",
  },
];

export const CommentIntelligenceDemo: React.FC = () => {
  // Steps: 0 = Comment 1 in focus, 1 = Comment 2 in focus, 2 = Comment 3 in focus, 3 = Synthesis Insight revealed
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setActiveStep(3); // show full synthesis directly
      return;
    }

    const interval = setInterval(() => {
      if (!isPaused) {
        setActiveStep((prev) => (prev + 1) % 4);
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-3xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(36,43,39,0.06)] relative overflow-hidden font-sans">
      {/* Header bar: Live AI indicator & Sample Preview pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-[#EFEBE3]">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#244B3F] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#244B3F]" />
          </span>
          <span className="text-[12px] font-semibold text-[#244B3F] tracking-wide uppercase">
            AI Customer Feedback Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#F7F4EC] border border-[#E4DFD5] text-[11px] font-medium text-[#68736B]">
            Illustrative Data • Sample Preview
          </span>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setActiveStep(0)}
              className="p-1 text-[#68736B] hover:text-[#242B27] rounded-lg hover:bg-[#F7F4EC] transition-colors"
              title="Replay Analysis Sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: PeakChart on one side, Comment classification and AI insight on the other */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 items-center">
        {/* Left: PeakChart positive trend visual */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="scale-[0.88] sm:scale-95 origin-center transition-transform">
            <PeakChart
              width={280}
              accent="#2ec99a"
              title="Positive Sentiment Peak"
              caption="Highest customer praise frequency"
              updatedText="Simulated Stream"
              trend="up"
              decimals={1}
              valueSuffix="%"
              defaultPeriod="Monthly"
              font="Plus Jakarta Sans, sans-serif"
            />
          </div>

          {/* Quick sentiment metric pills */}
          <div className="grid grid-cols-3 gap-2 w-full mt-2 pt-2 border-t border-[#EFEBE3] text-center">
            <div className="bg-[#EBF0ED] border border-[#C8D7CF] rounded-xl py-1.5 px-1">
              <div className="text-[10px] text-[#68736B] font-medium">Positive</div>
              <div className="text-[13px] font-bold text-[#244B3F] tabular-nums">78.4%</div>
            </div>
            <div className="bg-[#F7F4EC] border border-[#E4DFD5] rounded-xl py-1.5 px-1">
              <div className="text-[10px] text-[#68736B] font-medium">Neutral</div>
              <div className="text-[13px] font-bold text-[#68736B] tabular-nums">14.2%</div>
            </div>
            <div className="bg-[#FAF0EC] border border-[#ECCBC0] rounded-xl py-1.5 px-1">
              <div className="text-[10px] text-[#B85E42] font-medium">Negative</div>
              <div className="text-[13px] font-bold text-[#B85E42] tabular-nums">7.4%</div>
            </div>
          </div>
        </div>

        {/* Right: 3 Animated Customer Comments entering AI analysis pipeline */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-[11.5px] text-[#68736B] px-1">
            <span className="font-semibold uppercase tracking-wider text-[#242B27]">Live Ingestion Pipeline</span>
            <span>Analyzed Comments: <strong className="text-[#242B27]">320+ sample reviews</strong></span>
          </div>

          {/* The 3 Comment Cards with Animated Sentiment Transitions */}
          <div className="space-y-2">
            {DEMO_COMMENTS.map((cmt, idx) => {
              const isClassified = reducedMotion || activeStep >= idx;
              const isCurrent = !reducedMotion && activeStep === idx;

              return (
                <div
                  key={cmt.id}
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  className={`p-3 rounded-2xl border transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#FCFAF5] border-[#244B3F] shadow-[0_4px_16px_rgba(36,75,63,0.12)] scale-[1.01]'
                      : isClassified
                      ? 'bg-[#FAF8F2] border-[#E4DFD5]'
                      : 'bg-[#F7F4EC]/60 border-[#E4DFD5]/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[#244B3F] flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-[11px] font-medium text-[#68736B]">
                        {cmt.author} • <span className="text-[#93988F]">{cmt.platform}</span>
                      </span>
                    </div>

                    {/* Sentiment Classification Badge */}
                    {isClassified ? (
                      <div
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all animate-fade-in ${
                          cmt.sentiment === 'Positive'
                            ? 'bg-[#EBF0ED] text-[#244B3F] border border-[#C8D7CF]'
                            : 'bg-[#FAF0EC] text-[#B85E42] border border-[#ECCBC0]'
                        }`}
                      >
                        {cmt.sentiment === 'Positive' ? (
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                        )}
                        <span>{cmt.sentiment}</span>
                        <span className="text-[10px] opacity-80 font-normal">({cmt.confidence}%)</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#93988F] font-mono animate-pulse">
                        Scanning AI…
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] font-medium text-[#242B27] mt-1.5 pl-7">
                    "{cmt.text}"
                  </p>

                  {isClassified && (
                    <div className="pl-7 mt-1 text-[11px] text-[#68736B] flex items-center gap-1.5">
                      <span className="text-[#93988F]">Detected Topic:</span>
                      <span className="font-semibold text-[#344D3D]">{cmt.topic}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI-Generated Insight Preview */}
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-500 ${
              reducedMotion || activeStep === 3
                ? 'bg-[#EBF0ED] border-[#244B3F]/40 shadow-xs'
                : 'bg-[#F7F4EC] border-[#E4DFD5]'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#C6A66B] flex-shrink-0" />
              <span className="text-[12px] font-semibold text-[#244B3F]">
                AI Customer Sentiment Synthesis
              </span>
              {(reducedMotion || activeStep === 3) && (
                <span className="ml-auto text-[10px] bg-[#244B3F] text-[#FCFAF5] px-1.5 py-0.5 rounded-md font-medium">
                  Generated
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[#242B27] italic leading-relaxed pl-6">
              "Customers appreciate product quality and support, while delivery experience requires improvement."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
