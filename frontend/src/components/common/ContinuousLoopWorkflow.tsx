import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileEdit, ShieldCheck, UserCheck, Send, MessageSquare, 
  Smile, AlertTriangle, Lightbulb, ArrowRight 
} from 'lucide-react';

interface ContinuousLoopWorkflowProps {
  className?: string;
}

export const ContinuousLoopWorkflow: React.FC<ContinuousLoopWorkflowProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Create Post',
      desc: 'Draft creative & copy',
      icon: FileEdit,
      iconBg: 'bg-[#EAF4FB] text-[#2980B9]',
      path: '/app/overview',
    },
    {
      title: 'AI Brand Audit',
      desc: 'Vision & claim check',
      icon: ShieldCheck,
      iconBg: 'bg-[#EAF4FB] text-[#2980B9]',
      path: '/app/brand-governance',
    },
    {
      title: 'Human Approval',
      desc: 'Manager sign-off',
      icon: UserCheck,
      iconBg: 'bg-[#EAF4FB] text-[#2980B9]',
      path: '/app/approvals',
    },
    {
      title: 'Publish Content',
      desc: 'Authorized channel',
      icon: Send,
      iconBg: 'bg-[#F5EDFA] text-[#8E44AD]',
      iconClass: 'rotate-45 -translate-y-0.5 translate-x-0.5',
      path: '/app/approvals',
    },
    {
      title: 'Collect Comments',
      desc: 'Audience feedback',
      icon: MessageSquare,
      iconBg: 'bg-[#EDF9F1] text-[#27AE60]',
      path: '/app/audience-intelligence',
    },
    {
      title: 'Sentiment Analysis',
      desc: 'AI emotion & topic',
      icon: Smile,
      iconBg: 'bg-[#EDF9F1] text-[#27AE60]',
      path: '/app/audience-intelligence',
    },
    {
      title: 'Reputation Risks',
      desc: 'Incident detection',
      icon: AlertTriangle,
      iconBg: 'bg-[#EDF9F1] text-[#27AE60]',
      path: '/app/reputation-risk',
    },
    {
      title: 'Actionable Insights',
      desc: 'Guidelines refinement',
      icon: Lightbulb,
      iconBg: 'bg-[#EDF9F1] text-[#27AE60]',
      path: '/app/guidelines',
    },
  ];

  const handleStepClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-7 select-none ${className}`}>
      {/* Section Header Row */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <h2 className="text-[12px] sm:text-[13px] font-semibold tracking-wider text-[#5A6882] uppercase font-sans">
          CONTINUOUS BRAND GOVERNANCE &amp; INTELLIGENCE LOOP
        </h2>
        <span className="text-[11px] font-bold tracking-wider text-[#1D5E85] bg-[#EAF2F8] px-3 py-1 rounded-full uppercase font-sans shadow-2xs">
          8-STEP CYCLE
        </span>
      </div>

      {/* 8 Connected Cards with Arrows */}
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={idx}>
              {/* Step Card */}
              <div
                onClick={() => handleStepClick(step.path)}
                title={`Navigate to ${step.title}`}
                className="flex-1 min-w-[115px] sm:min-w-[124px] max-w-[152px] min-h-[142px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-4 sm:py-5 px-2.5 sm:px-3 text-center flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:border-[#315C76] hover:bg-white hover:shadow-xs hover:-translate-y-0.5 group"
              >
                {/* Circular Icon Container */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105 ${step.iconBg}`}
                >
                  <Icon className={`w-4.5 h-4.5 stroke-[1.75] ${step.iconClass || ''}`} />
                </div>

                {/* Step Title */}
                <div className="text-[13px] sm:text-[14px] font-bold text-[#172033] leading-snug mb-1 group-hover:text-[#315C76] transition-colors font-heading">
                  {step.title}
                </div>

                {/* Step Description */}
                <div className="text-[11.5px] sm:text-[12px] text-[#64748B] leading-tight font-normal">
                  {step.desc}
                </div>
              </div>

              {/* Connecting Arrow (between every card) */}
              {idx < steps.length - 1 && (
                <div className="flex-shrink-0 text-[#94A3B8] px-0.5 sm:px-1">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.5]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
