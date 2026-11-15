import React from 'react';
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
  colors = ['#183B59', '#315C76', '#263A52'],
  duration = 28,
  intensity = 0.08, // Very subtle for clean light theme
  asBackgroundOnly = false,
  ...props
}) => {
  const [containerRef, isInView] = useInView<HTMLDivElement>({ threshold: 0 });

  const color1 = colors[0] || '#183B59';
  const color2 = colors[1] || '#315C76';
  const color3 = colors[2] || '#263A52';

  const playState = isInView ? 'running' : 'paused';

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
      {/* Light Theme Subtle Atmospheric Aurora Layer */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        style={{ opacity: intensity }}
        aria-hidden="true"
      >
        {/* Radial Light 1: Top-Left to Center Drifter */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full blur-[90px] will-change-transform animate-aurora-light"
          style={{
            background: `radial-gradient(circle at 45% 45%, ${color1} 0%, rgba(49, 92, 118, 0.5) 40%, rgba(234, 242, 248, 0) 75%)`,
            animationDuration: `${duration}s`,
            animationPlayState: playState,
          }}
        />

        {/* Radial Light 2: Bottom-Right to Center-Left Drifter */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[65vw] h-[65vw] max-w-[750px] max-h-[750px] rounded-full blur-[85px] will-change-transform animate-aurora-light"
          style={{
            background: `radial-gradient(circle at 55% 55%, ${color2} 0%, rgba(38, 58, 82, 0.45) 45%, rgba(240, 244, 248, 0) 75%)`,
            animationDuration: `${duration * 1.25}s`,
            animationDirection: 'reverse',
            animationDelay: `-${duration * 0.35}s`,
            animationPlayState: playState,
          }}
        />

        {/* Radial Light 3: Center Ambient Floating Anchor */}
        <div
          className="absolute top-[25%] left-[25%] w-[60vw] h-[55vw] max-w-[700px] max-h-[650px] rounded-full blur-[95px] will-change-transform animate-aurora-light"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color3} 0%, rgba(24, 59, 89, 0.35) 40%, rgba(247, 249, 252, 0) 75%)`,
            animationDuration: `${duration * 1.5}s`,
            animationDelay: `-${duration * 0.65}s`,
            animationPlayState: playState,
          }}
        />
      </div>

      {/* Render children on top */}
      {children && <div className="relative z-10 w-full">{children}</div>}
    </div>
  );
};
