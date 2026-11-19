import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileEdit, ShieldCheck, UserCheck, Send, MessageSquare, 
  Smile, AlertTriangle, Lightbulb, ArrowRight, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface ContinuousLoopWorkflowProps {
  className?: string;
}

const WORKFLOW_STEPS = [
  {
    title: 'Create Post',
    desc: 'Draft creative & copy',
    icon: FileEdit,
    iconBg: 'bg-[#EBF0ED] text-[#244B3F]',
    path: '/app/overview',
  },
  {
    title: 'AI Brand Audit',
    desc: 'Vision & claim check',
    icon: ShieldCheck,
    iconBg: 'bg-[#EBF0ED] text-[#244B3F]',
    path: '/app/brand-governance',
  },
  {
    title: 'Human Approval',
    desc: 'Manager sign-off',
    icon: UserCheck,
    iconBg: 'bg-[#EBF0ED] text-[#244B3F]',
    path: '/app/approvals',
  },
  {
    title: 'Publish Content',
    desc: 'Authorized channel',
    icon: Send,
    iconBg: 'bg-[#F7F1E5] text-[#C6A66B]',
    iconClass: 'rotate-45 -translate-y-0.5 translate-x-0.5',
    path: '/app/approvals',
  },
  {
    title: 'Collect Comments',
    desc: 'Audience feedback',
    icon: MessageSquare,
    iconBg: 'bg-[#E8ECE9] text-[#344D3D]',
    path: '/app/audience-intelligence',
  },
  {
    title: 'Sentiment Analysis',
    desc: 'AI emotion & topic',
    icon: Smile,
    iconBg: 'bg-[#E8ECE9] text-[#344D3D]',
    path: '/app/audience-intelligence',
  },
  {
    title: 'Reputation Risks',
    desc: 'Incident detection',
    icon: AlertTriangle,
    iconBg: 'bg-[#FAF0EC] text-[#C77E63]',
    path: '/app/reputation-risk',
  },
  {
    title: 'Actionable Insights',
    desc: 'Guidelines refinement',
    icon: Lightbulb,
    iconBg: 'bg-[#E8ECE9] text-[#244B3F]',
    path: '/app/guidelines',
  },
];

export const ContinuousLoopWorkflow: React.FC<ContinuousLoopWorkflowProps> = React.memo(({ className = '' }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use refs for drag state to achieve 120 FPS zero-render responsiveness
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const checkScrollBounds = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollBounds();
    const handleResize = () => checkScrollBounds();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollBounds]);

  const slide = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.65;
    container.style.scrollBehavior = 'smooth';
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
    });
    setTimeout(checkScrollBounds, 320);
  };

  // High-performance drag handlers (Native 1:1 tracking without re-render overhead)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.scrollBehavior = 'auto';
    setIsGrabbing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current);
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    checkScrollBounds();
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsGrabbing(false);
      checkScrollBounds();
    }
  };

  // Smooth mouse wheel translation for desktop users
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    // If predominantly vertical scroll while hovering the workflow track, slide horizontally
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollLeft += e.deltaY * 0.9;
      checkScrollBounds();
    }
  };

  const handleStepClick = (path: string) => {
    if (hasMovedRef.current) return; // Prevent navigation when user was sliding/dragging
    navigate(path);
  };

  return (
    <div className={`bg-[#FCFAF5] rounded-2xl border border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] p-5 sm:p-7 select-none relative ${className}`}>
      {/* Section Header Row */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h2 className="text-[12px] sm:text-[13px] font-semibold tracking-wider text-[#68736B] uppercase font-sans">
            CONTINUOUS BRAND GOVERNANCE &amp; INTELLIGENCE LOOP
          </h2>
          <p className="text-[11px] text-[#93988F] font-mono mt-0.5">
            Slide horizontally, drag, or use mouse wheel across the 8-step lifecycle
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Slide Arrow Navigation Buttons */}
          <div className="flex items-center space-x-1.5 mr-2">
            <button
              type="button"
              onClick={() => slide('left')}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-full border border-[#DDD4C6] flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                canScrollLeft 
                  ? 'bg-[#FCFAF5] hover:bg-[#EFECE2] text-[#242B27] hover:scale-105 active:scale-95' 
                  : 'bg-[#F5F2EB] text-[#BBB5A8] opacity-50 cursor-not-allowed'
              }`}
              aria-label="Slide Left"
              title="Slide Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => slide('right')}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-full border border-[#DDD4C6] flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                canScrollRight 
                  ? 'bg-[#FCFAF5] hover:bg-[#EFECE2] text-[#242B27] hover:scale-105 active:scale-95' 
                  : 'bg-[#F5F2EB] text-[#BBB5A8] opacity-50 cursor-not-allowed'
              }`}
              aria-label="Slide Right"
              title="Slide Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] font-bold tracking-wider text-[#244B3F] bg-[#EBF0ED] border border-[#C8D7CF] px-3 py-1 rounded-full uppercase font-sans shadow-2xs">
            8-STEP CYCLE
          </span>
        </div>
      </div>

      {/* 8 Connected Cards with Arrows & Smooth Zero-Jank Slider Container */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        onScroll={checkScrollBounds}
        className={`flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-3 pt-1 scrollbar-thin ${
          isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
        }}
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={idx}>
              {/* Step Card */}
              <div
                onClick={() => handleStepClick(step.path)}
                title={`Navigate to ${step.title}`}
                className="flex-1 min-w-[130px] sm:min-w-[140px] max-w-[165px] min-h-[145px] bg-[#F7F4EC] border border-[#E4DFD5] rounded-xl py-4 sm:py-5 px-3 text-center flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:border-[#244B3F] hover:bg-[#FCFAF5] hover:shadow-[0_6px_16px_rgba(36,43,39,0.08)] hover:-translate-y-0.5 group flex-shrink-0"
              >
                {/* Circular Icon Container */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105 ${step.iconBg}`}
                >
                  <Icon className={`w-4.5 h-4.5 stroke-[1.75] ${step.iconClass || ''}`} />
                </div>

                {/* Step Title */}
                <div className="text-[13px] sm:text-[14px] font-semibold text-[#242B27] leading-snug mb-1 group-hover:text-[#244B3F] transition-colors font-sans">
                  {step.title}
                </div>

                {/* Step Description */}
                <div className="text-[11.5px] sm:text-[12px] text-[#68736B] leading-tight font-normal">
                  {step.desc}
                </div>
              </div>

              {/* Connecting Arrow (between every card) */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className="flex-shrink-0 text-[#829887] px-0.5 sm:px-1">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.5]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

ContinuousLoopWorkflow.displayName = 'ContinuousLoopWorkflow';
