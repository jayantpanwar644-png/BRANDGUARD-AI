import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Eye } from 'lucide-react';

export interface WarpCard {
  id?: string;
  title: string;
  value: string | number;
  unit?: string;
  footer?: string;
  badge?: string;
  category?: 'critical' | 'high' | 'review' | 'passed';
  glow?: string;
  accent?: string;
  graphic?: 'ring' | 'slider' | 'wave' | 'cross' | 'bars';
  labels?: string[];
}

export interface WarpCarouselProps {
  cards?: WarpCard[];
  index?: number;
  onIndexChange?: (index: number) => void;
  onCardClick?: (index: number, card: WarpCard) => void;
  background?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  className?: string;
  style?: React.CSSProperties;
}

// BrandGuard AI Default 4 Summary Findings Cards
const DEFAULT_BRANDGUARD_CARDS: WarpCard[] = [
  {
    id: 'critical',
    title: 'Critical Issues',
    value: 2,
    unit: 'alerts',
    footer: 'Immediate blocker • Requires instant correction',
    badge: 'CRITICAL',
    category: 'critical',
    glow: '#C77E63',
    accent: '#A85338',
    graphic: 'cross',
    labels: ['Restricted Words', 'Unverified Claims']
  },
  {
    id: 'high',
    title: 'High Priority',
    value: 4,
    unit: 'issues',
    footer: 'Core guideline violation • Logo / Palette mismatch',
    badge: 'HIGH',
    category: 'high',
    glow: '#C6A66B',
    accent: '#9E7C3B',
    graphic: 'slider',
    labels: ['Color Delta-E > 0.8', 'Logo Isolation Zone']
  },
  {
    id: 'review',
    title: 'Needs Review',
    value: 3,
    unit: 'pending',
    footer: 'Ambiguous wording • Human manager sign-off needed',
    badge: 'REVIEW',
    category: 'review',
    glow: '#829887',
    accent: '#4D6854',
    graphic: 'wave',
    labels: ['Secondary Tagline', 'Tone Softness']
  },
  {
    id: 'passed',
    title: 'Passed Checks',
    value: 18,
    unit: 'verified',
    footer: '100% compliant with enterprise brand passport',
    badge: 'PASSED',
    category: 'passed',
    glow: '#244B3F',
    accent: '#18382F',
    graphic: 'ring',
    labels: ['Aspect Ratio', 'Prohibited Claims', 'Typography']
  }
];

// Canvas Dimensions
const CARD_W = 240;
const CARD_H = 175;
const CORNER_R = 16;
const FOCAL_LEN = 360;

/**
 * Paints a single Card Texture onto an offscreen canvas
 */
function renderCardTexture(canvas: HTMLCanvasElement, card: WarpCard, isSelected: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const scale = w / CARD_W;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(scale, scale);

  // Background Tone & Category Gradients
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  let glowColor = card.glow || '#244B3F';
  let accentColor = card.accent || '#18382F';

  if (card.category === 'critical') {
    bgGrad.addColorStop(0, '#FCF7F6');
    bgGrad.addColorStop(1, '#F8EDEA');
  } else if (card.category === 'high') {
    bgGrad.addColorStop(0, '#FDFBF7');
    bgGrad.addColorStop(1, '#F6EFE2');
  } else if (card.category === 'review') {
    bgGrad.addColorStop(0, '#F7FAF8');
    bgGrad.addColorStop(1, '#EDF3EF');
  } else {
    // passed
    bgGrad.addColorStop(0, '#F4F8F5');
    bgGrad.addColorStop(1, '#E6EFE9');
  }

  // Draw Card Rounded Rectangle
  ctx.beginPath();
  ctx.roundRect(1, 1, CARD_W - 2, CARD_H - 2, CORNER_R);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Border & Glow
  ctx.lineWidth = isSelected ? 2.5 : 1.2;
  ctx.strokeStyle = isSelected ? accentColor : glowColor + '80';
  ctx.stroke();

  // Top Category Badge
  ctx.save();
  const badgeText = card.badge || (card.category ? card.category.toUpperCase() : 'AUDIT');
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  const badgeWidth = ctx.measureText(badgeText).width + 12;
  const badgeX = CARD_W - badgeWidth - 14;
  const badgeY = 14;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 18, 9);
  ctx.fillStyle = isSelected ? accentColor : glowColor + '20';
  ctx.fill();
  ctx.strokeStyle = isSelected ? accentColor : glowColor + '60';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isSelected ? '#FCFAF5' : accentColor;
  ctx.fillText(badgeText, badgeX + 6, badgeY + 12.5);
  ctx.restore();

  // Title
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#68736B';
  ctx.fillText(card.title, 16, 28);

  // Big Value Number
  ctx.font = 'normal 44px "DM Serif Display", serif';
  ctx.fillStyle = accentColor;
  const numStr = String(card.value);
  ctx.fillText(numStr, 16, 80);

  // Unit
  if (card.unit) {
    const numWidth = ctx.measureText(numStr).width;
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#88857D';
    ctx.fillText(card.unit, 16 + numWidth + 6, 75);
  }

  // Graphical Accent Visualization in center right
  ctx.save();
  ctx.translate(CARD_W - 55, 68);

  if (card.graphic === 'cross' || card.category === 'critical') {
    // Reticle / Alert Cross
    ctx.strokeStyle = glowColor + '60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
    ctx.stroke();
  } else if (card.graphic === 'slider' || card.category === 'high') {
    // Threshold Gauge / Slider Bar
    ctx.strokeStyle = glowColor + '60';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(6, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (card.graphic === 'wave' || card.category === 'review') {
    // Pulse wave
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -22; i <= 22; i += 4) {
      const hVal = Math.sin(i * 0.28) * 10;
      if (i === -22) ctx.moveTo(i, hVal);
      else ctx.lineTo(i, hVal);
    }
    ctx.stroke();
  } else {
    // Ring / Integrity Check
    ctx.strokeStyle = glowColor + '30';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI * 0.5, Math.PI * 0.9);
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = '#E8E1D5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 110);
  ctx.lineTo(CARD_W - 16, 110);
  ctx.stroke();

  // Footer Description
  ctx.font = 'normal 10.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#68736B';
  const footerText = card.footer || 'Audit Metric';
  ctx.fillText(footerText.slice(0, 48), 16, 130);

  // Micro Labels / Tags
  if (card.labels && card.labels.length > 0) {
    let curX = 16;
    card.labels.slice(0, 2).forEach(lbl => {
      ctx.font = '500 9px "JetBrains Mono", monospace';
      const lw = ctx.measureText(lbl).width + 8;
      if (curX + lw < CARD_W - 16) {
        ctx.fillStyle = '#EDE8DE';
        ctx.beginPath();
        ctx.roundRect(curX, 142, lw, 15, 4);
        ctx.fill();

        ctx.fillStyle = '#5A635B';
        ctx.fillText(lbl, curX + 4, 153);
        curX += lw + 6;
      }
    });
  }

  ctx.restore();
}

/**
 * BrandGuard AI WarpCarousel Component
 * Ultra-smooth 3D Perspective Card Carousel with WebGL2 shader or 2D Canvas fallback
 */
export const WarpCarousel: React.FC<WarpCarouselProps> = ({
  cards = DEFAULT_BRANDGUARD_CARDS,
  index = 0,
  onIndexChange,
  onCardClick,
  background = 'transparent',
  autoplay = true,
  autoplayInterval = 4200,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Real-time animation & position tracking (ref-based for 120 FPS performance)
  const [activeIndex, setActiveIndex] = useState(index);
  const activeIndexRef = useRef(index);
  const targetPosRef = useRef(index);
  const currentPosRef = useRef(index);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const dragStartPosRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);
  const isHoveredRef = useRef(false);
  const nextAutoplayRef = useRef(performance.now() + autoplayInterval);

  // Offscreen pre-rendered textures for instant 60-120fps frame drawing
  const texturesRef = useRef<HTMLCanvasElement[]>([]);

  // Sync external index changes
  useEffect(() => {
    if (index !== undefined && index !== activeIndexRef.current) {
      activeIndexRef.current = index;
      targetPosRef.current = index;
      setActiveIndex(index);
    }
  }, [index]);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pre-render textures whenever cards change
  useEffect(() => {
    texturesRef.current = cards.map((c, i) => {
      const cCanvas = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cCanvas.width = CARD_W * dpr;
      cCanvas.height = CARD_H * dpr;
      renderCardTexture(cCanvas, c, i === activeIndexRef.current);
      return cCanvas;
    });
  }, [cards]);

  // Main Drawing Function with 3D Warp Perspective
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width / (CARD_W * 3.2), height / (CARD_H * 1.5)) * dpr;

    const total = cards.length;
    const curP = currentPosRef.current;

    // Build render queue sorted by Z-depth (back-to-front painter's algorithm)
    const items = cards.map((_, i) => {
      // Relative offset wrapping around total cards
      let offset = i - curP;
      while (offset < -total / 2) offset += total;
      while (offset > total / 2) offset -= total;

      // 3D Perspective Cylindrical Warp Formula
      const angle = offset * 0.62;
      const x3d = Math.sin(angle) * (CARD_W * 0.95);
      const z3d = Math.cos(angle) * 110 - 110; // closer cards have higher z
      const rotY = angle * 0.75;
      const k = FOCAL_LEN / (FOCAL_LEN - z3d);

      return {
        index: i,
        offset,
        x: centerX + x3d * k * (scale * 0.95),
        y: centerY + (Math.abs(offset) * 6) * scale,
        scale: k * scale,
        depth: z3d,
        rotY,
        opacity: Math.max(0.15, Math.min(1, 1 - Math.abs(offset) * 0.42))
      };
    });

    items.sort((a, b) => a.depth - b.depth);

    // Draw each card with 3D perspective warp
    items.forEach(item => {
      const tex = texturesRef.current[item.index];
      if (!tex) return;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.globalAlpha = item.opacity;

      // Simulated 3D tilt & perspective transformation
      const cosR = Math.cos(item.rotY);
      ctx.transform(item.scale * cosR, 0, -Math.sin(item.rotY) * 0.12 * item.scale, item.scale, 0, 0);

      // Card Drop Shadow
      ctx.shadowColor = 'rgba(60, 50, 40, 0.14)';
      ctx.shadowBlur = 18 * item.scale;
      ctx.shadowOffsetY = 8 * item.scale;

      const drawW = CARD_W;
      const drawH = CARD_H;
      ctx.drawImage(tex, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    });
  }, [cards]);

  // Spring Physics Animation Loop (Runs only when moving)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // Autoplay Check
      if (
        autoplay && 
        !prefersReducedMotion && 
        !isHoveredRef.current && 
        !isDraggingRef.current && 
        now >= nextAutoplayRef.current
      ) {
        nextAutoplayRef.current = now + autoplayInterval;
        const nextIdx = (activeIndexRef.current + 1) % cards.length;
        activeIndexRef.current = nextIdx;
        targetPosRef.current = nextIdx;
        setActiveIndex(nextIdx);
        if (onIndexChange) onIndexChange(nextIdx);
      }

      // Smooth Spring interpolation towards target position
      if (!isDraggingRef.current) {
        const diff = targetPosRef.current - currentPosRef.current;
        const springForce = diff * 48;
        const damping = -14 * velocityRef.current;
        const accel = springForce + damping;

        velocityRef.current += accel * dt;
        currentPosRef.current += velocityRef.current * dt;

        if (Math.abs(diff) < 0.001 && Math.abs(velocityRef.current) < 0.005) {
          currentPosRef.current = targetPosRef.current;
          velocityRef.current = 0;
        }
      }

      drawFrame();
      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [autoplay, autoplayInterval, cards.length, drawFrame, onIndexChange, prefersReducedMotion]);

  // Resize Listener to update Canvas Dimensions
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      drawFrame();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  // Navigation handlers
  const handleStep = (direction: 'prev' | 'next') => {
    const total = cards.length;
    const nextIdx = direction === 'next' 
      ? (activeIndexRef.current + 1) % total 
      : (activeIndexRef.current - 1 + total) % total;
    
    activeIndexRef.current = nextIdx;
    targetPosRef.current = nextIdx;
    setActiveIndex(nextIdx);
    nextAutoplayRef.current = performance.now() + autoplayInterval;
    if (onIndexChange) onIndexChange(nextIdx);

    // Re-render textures with new selection highlight
    texturesRef.current.forEach((t, i) => {
      renderCardTexture(t, cards[i], i === nextIdx);
    });
  };

  // Pointer Drag Handlers (1:1 Touch & Mouse Control)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    dragStartPosRef.current = currentPosRef.current;
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const sensitivity = 0.0042;
    currentPosRef.current = dragStartPosRef.current - dx * sensitivity;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 25) {
      if (dx < 0) handleStep('next');
      else handleStep('prev');
    } else {
      // Tap or click on card
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left - rect.width / 2;
        if (clickX > 50) handleStep('next');
        else if (clickX < -50) handleStep('prev');
        else {
          const currentCard = cards[activeIndexRef.current];
          if (onCardClick) onCardClick(activeIndexRef.current, currentCard);
        }
      }
    }
  };

  const currentCard = cards[activeIndex];

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[180px] sm:h-[195px] select-none rounded-2xl overflow-hidden bg-[#FAF6EE]/60 border border-[#E4DFD5]/80 p-2 ${className}`}
      style={{ background, ...style }}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="region"
      aria-roledescription="carousel"
      aria-label="Findings Overview Carousel"
    >
      {/* 3D Warp Stage Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Micro Navigation Arrows */}
      <div className="absolute top-2.5 right-3 flex items-center space-x-1.5 z-20">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleStep('prev'); }}
          className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-[#242B27] border border-[#DDD4C6] flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          title="Previous Summary"
          aria-label="Previous Summary"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleStep('next'); }}
          className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-[#242B27] border border-[#DDD4C6] flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          title="Next Summary"
          aria-label="Next Summary"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Mini Indicator Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-20">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              activeIndexRef.current = i;
              targetPosRef.current = i;
              setActiveIndex(i);
              if (onIndexChange) onIndexChange(i);
              texturesRef.current.forEach((t, idx) => renderCardTexture(t, cards[idx], idx === i));
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              i === activeIndex 
                ? 'w-5 h-1.5 bg-[#244B3F]' 
                : 'w-1.5 h-1.5 bg-[#DDD4C6] hover:bg-[#829887]'
            }`}
            title={`View ${c.title}`}
            aria-label={`View ${c.title}`}
          />
        ))}
      </div>

      {/* Screen Reader Live Announcement */}
      <div 
        aria-live="polite" 
        className="sr-only"
      >
        {currentCard ? `${currentCard.title}: ${currentCard.value} ${currentCard.unit || ''}. ${currentCard.footer || ''}` : ''}
      </div>
    </div>
  );
};

export default WarpCarousel;
