import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { useInView } from './aurora-utils/use-in-view';

interface AuroraProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  colors?: [string, string, string] | string[];
  duration?: number;
  intensity?: number;
  asBackgroundOnly?: boolean;
}

export const Aurora: React.FC<AuroraProps> = ({
  children,
  className,
  colors = ['#829887', '#C6A66B', '#244B3F'],
  duration = 36,
  intensity = 0.05, // Delicate warmth for cream editorial theme
  asBackgroundOnly = false,
  ...props
}) => {
  const [containerRef, isInView] = useInView<HTMLDivElement>({ threshold: 0 });
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handleMotion);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener?.('change', handleMotion);
    };
  }, []);

  const color1 = colors[0] || '#829887';
  const color2 = colors[1] || '#C6A66B';
  const color3 = colors[2] || '#244B3F';

  // Pause animation if offscreen, tab hidden, or user prefers reduced motion
  const isPlaying = isInView && isTabVisible && !prefersReducedMotion;
  const playState = isPlaying ? 'running' : 'paused';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        asBackgroundOnly ? 'absolute inset-0 pointer-events-none z-0' : 'w-full',
        className
      )}
      {...props}
    >
      {/* Editorial Warm Atmospheric Drifter Layer (Lightweight GPU-optimized radial gradients) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        style={{ opacity: intensity }}
        aria-hidden="true"
      >
        {/* Radial Warm Sage Blob */}
        <div
          className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] rounded-full blur-[30px] will-change-transform animate-drift"
          style={{
            background: `radial-gradient(circle at 45% 45%, ${color1} 0%, rgba(130, 152, 135, 0.4) 35%, rgba(247, 244, 236, 0.05) 65%, transparent 75%)`,
            animationDuration: `${duration}s`,
            animationPlayState: playState,
          }}
        />

        {/* Radial Champagne Gold Blob */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[25px] will-change-transform animate-drift"
          style={{
            background: `radial-gradient(circle at 55% 55%, ${color2} 0%, rgba(198, 166, 107, 0.35) 35%, rgba(247, 244, 236, 0.05) 65%, transparent 75%)`,
            animationDuration: `${duration * 1.3}s`,
            animationDirection: 'reverse',
            animationDelay: `-${duration * 0.4}s`,
            animationPlayState: playState,
          }}
        />

        {/* Ambient Center Warm Forest Light */}
        <div
          className="absolute top-[25%] left-[30%] w-[50vw] h-[45vw] max-w-[700px] max-h-[650px] rounded-full blur-[35px] will-change-transform animate-drift"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color3} 0%, rgba(36, 75, 63, 0.25) 30%, rgba(247, 244, 236, 0.05) 60%, transparent 75%)`,
            animationDuration: `${duration * 1.6}s`,
            animationDelay: `-${duration * 0.7}s`,
            animationPlayState: playState,
          }}
        />
      </div>

      {/* Render children on top */}
      {children && <div className="relative z-10 w-full">{children}</div>}
    </div>
  );
};
