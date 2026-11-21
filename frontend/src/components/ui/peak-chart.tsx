import * as React from "react";

// --- Mathematical Constants & Coordinates ---
const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 696;
const CORNER_RADIUS = 56;
const ASPECT_RATIO = CANVAS_HEIGHT / CANVAS_WIDTH;
const NORMALIZED_RADIUS = CORNER_RADIUS / CANVAS_WIDTH;
const PADDING_X = 0.32 * CANVAS_WIDTH;
const PADDING_Y = 0.16 * CANVAS_WIDTH;

const BASE_COLOR = "#1678ff";
const FIELD_BLOBS = [
  { shape: [0.4748, 0.8152, 0.7509, 0.8801, 0.7026], color: "#000000", opacity: 1 },
  { shape: [0.3741, 0.2723, 0.7371, 0.3009, 0.1168], color: "#020000", opacity: 1 },
  { shape: [0.7846, 0.0251, 0.3833, 0.1301, -0.5566], color: "#2e85ff", opacity: 0.4756 },
  { shape: [0.6206, -0.2018, 0.1282, 0.5909, 0.2754], color: "#3584ff", opacity: 0.3146 },
  { shape: [0.6, 1.2391, 0.827, 0.2111, -1.6357], color: "#000d1e", opacity: 1 },
  { shape: [0.0964, 0.5388, 1000, 0.1285, 0.5421], color: "#000005", opacity: 0.2298 },
];

const EDGE_HIGHLIGHTS = [
  { shape: [0.1207, -0.0365, 0.0492], color: "#2667ff", opacity: 1 },
  { shape: [0.0667, -0.0166, 0.0176], color: "#467dff", opacity: 1 },
  { shape: [0.037, -0.0134, 0.0154], color: "#c2ffff", opacity: 0.8091 },
];

const HALO_SPEC = { cx: 0.4996, cy: 0.6438, sx: 0.2498, sy: 0.2433, opacity: 0.845, color: "#0e50ff" };
const LIFT_STRENGTH = 0.42;
const GRAIN_STRENGTH = 1.7;
const BG_DARK = "#08101a";

const MIN_X = 20.29;
const MAX_X = 503.69;
const MIN_Y = 158.49;
const MAX_Y = 385.28;

const LINE_WIDTH = 7.1;
const LINE_COLOR = "#6496e2";
const SIGMA_LINE = 108;
const EXP_LINE = 1.44;
const PEAK_OFFSET_X = 12;
const DOT_RADIUS = 13;
const PEAK_TOUCH_OFFSET = 8;
const PEAK_Y_SHIFT = 2.6;

const GRID_SPACING_X = 40.64;
const GRID_SPACING_Y = 40.07;
const GRID_ORIGIN_Y = 468.7;
const GRID_COLOR = "#5a87e1";
const GRID_OPACITY = 0.23;

const T_GRID = 0.9;
const T_LINE_START = 0.25;
const T_LINE_DUR = 2.1;
const T_NUM_START = 1;
const T_NUM_DUR = 1.7;
const T_ARROW_START = 2.65;
const T_STATIC = 3.3;
const T_BREATH_PERIOD = 4.6;
const MORPH_DURATION = 0.75;

const DEFAULT_ACCENT = "#4f8ef7";
const DOT_INNER_TOP = "#2680ff";
const DOT_INNER_MID = "#75aafa";
const DOT_INNER_BOT = "#d0e4fd";
const DOT_OUTER_COLOR = "#287dff";
const DOT_RIPPLE_COLOR = "#78afff";

const DEFAULT_MONTHLY_DATA = [
  60, 75, 91, 110, 120, 122, 116, 106, 96, 89, 88, 95, 112, 150, 339, 384, 400, 388, 318, 240, 182, 146, 126, 117, 115, 117, 121, 127, 134, 143
];

export const PEAK_CHART_SAMPLE_DATA: Record<string, { data: number[]; labels: string[] }> = {
  Weekly: {
    data: [128, 152, 141, 226, 384, 262, 214],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  Monthly: {
    data: DEFAULT_MONTHLY_DATA,
    labels: DEFAULT_MONTHLY_DATA.map((_, i) => `Day ${i + 1}`),
  },
  Yearly: {
    data: [92, 108, 104, 146, 171, 158, 214, 246, 231, 397, 322, 288],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

// --- Easing & Utility Helpers ---
function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(v: number) {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
}

function easeInOut(v: number) {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOut(v: number) {
  return 1 - Math.pow(1 - clamp01(v), 3);
}

function backOut(v: number) {
  const x = clamp01(v);
  const s = 1.9;
  return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
}

function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const poly =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-abs * abs);
  return sign * poly;
}

function phi(x: number) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function sdf(x: number, y: number) {
  const dx = Math.abs(x - 0.5) - (0.5 - NORMALIZED_RADIUS);
  const dy = Math.abs(y - ASPECT_RATIO / 2) - (ASPECT_RATIO / 2 - NORMALIZED_RADIUS);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0) - NORMALIZED_RADIUS;
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 1831565813) >>> 0;
    let b = s;
    b = Math.imul(b ^ (b >>> 15), b | 1);
    b ^= b + Math.imul(b ^ (b >>> 7), b | 61);
    return ((b ^ (b >>> 14)) >>> 0) / 4294967296;
  };
}

function parseRgb(color: string): [number, number, number] {
  const str = color.trim();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(str);
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(str);
  return rgb ? [+rgb[1], +rgb[2], +rgb[3]] : [0, 0, 0];
}

function formatRgba(color: string, alpha: number) {
  return `rgba(${parseRgb(color).join(",")},${alpha.toFixed(4)})`;
}

function rgbToHsl(color: string): [number, number] | null {
  if (!/^\s*(#|rgb)/i.test(color)) return null;
  const [r, g, b] = parseRgb(color).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [((h * 60 + 360) % 360), s];
}

function createCanvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return cv;
}

// Module-level caches to avoid rebuilding expensive pixel-by-pixel canvas art on re-renders
const fieldCache = new Map<string, { rest: HTMLCanvasElement; lift: HTMLCanvasElement }>();
const gridCache = new Map<number, HTMLCanvasElement>();
const haloCache = new Map<number, HTMLCanvasElement>();

function getCachedField(width: number, seed: number) {
  const targetW = Math.min(380, Math.round(width));
  const key = `${targetW}_${seed}`;
  let cached = fieldCache.get(key);
  if (!cached) {
    cached = buildField(targetW, seed);
    fieldCache.set(key, cached);
  }
  return cached;
}

function getCachedGrid(width: number) {
  const targetW = Math.min(600, Math.round(width));
  let cached = gridCache.get(targetW);
  if (!cached) {
    cached = buildGrid(targetW);
    gridCache.set(targetW, cached);
  }
  return cached;
}

function getCachedHalo(width: number) {
  const targetW = Math.min(300, Math.round(width));
  let cached = haloCache.get(targetW);
  if (!cached) {
    cached = buildHalo(targetW);
    haloCache.set(targetW, cached);
  }
  return cached;
}

function buildField(width: number, seed: number) {
  const w = Math.round(width);
  const h = Math.round(width * ASPECT_RATIO);
  const restCv = createCanvas(w, h);
  const liftCv = createCanvas(w, h);
  const restCtx = restCv.getContext("2d")!;
  const liftCtx = liftCv.getContext("2d")!;
  const restImg = restCtx.createImageData(w, h);
  const liftImg = liftCtx.createImageData(w, h);
  const restData = restImg.data;
  const liftData = liftImg.data;
  const rng = makeRng(seed);
  const baseRgb = parseRgb(BASE_COLOR);

  const blobs = FIELD_BLOBS.map(({ shape: [cx, cy, sx, sy, rot], color, opacity }) => ({
    cx,
    cy,
    isx: 1 / Math.abs(sx),
    isy: 1 / Math.abs(sy),
    c: Math.cos(rot),
    s: Math.sin(rot),
    rgb: parseRgb(color),
    a: opacity,
  }));

  const highlights = EDGE_HIGHLIGHTS.map(({ shape: [off, sp, sg], color, opacity }) => ({
    off,
    sp,
    sg,
    rgb: parseRgb(color),
    a: opacity,
  }));

  const liftMult = 1 + LIFT_STRENGTH;

  for (let y = 0; y < h; y++) {
    const ny = (y + 0.5) / w;
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w;
      let r = baseRgb[0];
      let g = baseRgb[1];
      let b = baseRgb[2];

      for (const blob of blobs) {
        const dx = nx - blob.cx;
        const dy = ny - blob.cy;
        const rx = (blob.c * dx + blob.s * dy) * blob.isx;
        const ry = (-blob.s * dx + blob.c * dy) * blob.isy;
        const weight = blob.a * Math.exp(-0.5 * (rx * rx + ry * ry));
        r += weight * (blob.rgb[0] - r);
        g += weight * (blob.rgb[1] - g);
        b += weight * (blob.rgb[2] - b);
      }

      let lr = r;
      let lg = g;
      let lb = b;

      for (const hg of highlights) {
        const hy = ny + hg.off;
        const distEdgeX = Math.min(nx, 1 - nx);
        const distEdgeY = Math.min(hy, ASPECT_RATIO - hy);
        const ratio = Math.min(
          1,
          phi((-sdf(nx, hy) - hg.sp) / hg.sg) / Math.max(1e-9, phi((Math.min(distEdgeX, distEdgeY) - hg.sp) / hg.sg))
        );
        const edgeBlend = 1 - phi((distEdgeX - hg.sp) / hg.sg) * phi((distEdgeY - hg.sp) / hg.sg) * ratio;
        const weight = hg.a * edgeBlend;
        r += weight * (hg.rgb[0] - r);
        g += weight * (hg.rgb[1] - g);
        b += weight * (hg.rgb[2] - b);

        const lWeight = Math.min(1, weight * liftMult);
        lr += lWeight * (hg.rgb[0] - lr);
        lg += lWeight * (hg.rgb[1] - lg);
        lb += lWeight * (hg.rgb[2] - lb);
      }

      const noise = (rng() + rng() + rng() - 1.5) * 2 * GRAIN_STRENGTH;
      const idx = (y * w + x) * 4;
      restData[idx] = r + noise;
      restData[idx + 1] = g + noise;
      restData[idx + 2] = b + noise;
      restData[idx + 3] = 255;

      liftData[idx] = lr + noise;
      liftData[idx + 1] = lg + noise;
      liftData[idx + 2] = lb + noise;
      liftData[idx + 3] = 255;
    }
  }

  restCtx.putImageData(restImg, 0, 0);
  liftCtx.putImageData(liftImg, 0, 0);
  return { rest: restCv, lift: liftCv };
}

function buildHalo(width: number) {
  const w = Math.max(8, Math.round(((CANVAS_WIDTH + 2 * PADDING_X) * width * 0.25) / CANVAS_WIDTH));
  const h = Math.max(8, Math.round(((CANVAS_HEIGHT + 2 * PADDING_Y) * width * 0.25) / CANVAS_WIDTH));
  const cv = createCanvas(w, h);
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const [r, g, b] = parseRgb(HALO_SPEC.color);

  for (let y = 0; y < h; y++) {
    const ny = ((y + 0.5) / h * (CANVAS_HEIGHT + 2 * PADDING_Y) - PADDING_Y) / CANVAS_WIDTH;
    for (let x = 0; x < w; x++) {
      const nx = (((x + 0.5) / w * (CANVAS_WIDTH + 2 * PADDING_X) - PADDING_X) / CANVAS_WIDTH - HALO_SPEC.cx) / HALO_SPEC.sx;
      const dy = (ny - HALO_SPEC.cy) / HALO_SPEC.sy;
      const intensity = Math.exp(-0.5 * (nx * nx + dy * dy)) * HALO_SPEC.opacity;
      const idx = (y * w + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.min(255, intensity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function buildGrid(width: number) {
  const w = Math.round(width);
  const h = Math.round(width * ASPECT_RATIO);
  const cv = createCanvas(w, h);
  const ctx = cv.getContext("2d")!;
  const scale = width / CANVAS_WIDTH;
  ctx.scale(scale, scale);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = -6; i <= 6; i++) {
    const x = CANVAS_WIDTH / 2 + GRID_SPACING_X * i;
    ctx.moveTo(x, 250);
    ctx.lineTo(x, CANVAS_HEIGHT);
  }
  for (let i = -6; i <= 6; i++) {
    const y = GRID_ORIGIN_Y + GRID_SPACING_Y * i;
    if (y >= 250 && y <= CANVAS_HEIGHT) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
  }
  ctx.stroke();

  // Vignette mask for the grid
  const maskW = 64;
  const maskH = Math.round(64 * ASPECT_RATIO);
  const maskCv = createCanvas(maskW, maskH);
  const maskCtx = maskCv.getContext("2d")!;
  const maskImg = maskCtx.createImageData(maskW, maskH);

  for (let y = 0; y < maskH; y++) {
    const ny = ((y + 0.5) / maskH) * CANVAS_HEIGHT;
    const fadeY = smoothstep((ny - 350) / 230);
    for (let x = 0; x < maskW; x++) {
      const nx = ((x + 0.5) / maskW) * CANVAS_WIDTH;
      const fadeX = Math.exp(-0.5 * Math.pow((nx - CANVAS_WIDTH / 2) / 92, 2));
      maskImg.data[(y * maskW + x) * 4 + 3] = Math.round(255 * GRID_OPACITY * fadeX * fadeY);
    }
  }
  maskCtx.putImageData(maskImg, 0, 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(maskCv, 0, 0, w, h);
  return cv;
}

function grainTile() {
  const rgb = parseRgb(BG_DARK);
  const size = 160;
  const cv = createCanvas(size, size);
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rng = makeRng(7);

  for (let i = 0; i < size * size * 4; i += 4) {
    const noise = (rng() + rng() + rng() - 1.5) * 2 * GRAIN_STRENGTH;
    img.data[i] = rgb[0] + noise;
    img.data[i + 1] = rgb[1] + noise;
    img.data[i + 2] = rgb[2] + noise;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

interface CurveData {
  ys: Float32Array;
  peakX: number;
  lo: number;
  hi: number;
  n: number;
}

function buildCurve(raw: number[]): CurveData {
  const arr = raw.length >= 2 ? raw : raw.length === 1 ? [raw[0], raw[0]] : [0, 0];
  const len = arr.length;
  let lo = Infinity;
  let hi = -Infinity;
  let peakIdx = 0;

  for (let i = 0; i < len; i++) {
    if (arr[i] < lo) lo = arr[i];
    if (arr[i] > hi) {
      hi = arr[i];
      peakIdx = i;
    }
  }

  const range = hi - lo || 1;
  const targetYs = arr.map((v) => (hi === lo ? (MIN_Y + MAX_Y) / 2 : MIN_Y + (1 - (v - lo) / range) * (MAX_Y - MIN_Y)));
  const stepX = (MAX_X - MIN_X) / (len - 1);
  const tangents: number[] = [];

  for (let i = 0; i < len - 1; i++) {
    tangents.push((targetYs[i + 1] - targetYs[i]) / stepX);
  }

  const derivs: number[] = [tangents[0]];
  for (let i = 1; i < len - 1; i++) {
    const t0 = tangents[i - 1];
    const t1 = tangents[i];
    derivs.push((Math.sign(t0) + Math.sign(t1)) * Math.min(Math.abs(t0), Math.abs(t1), 0.25 * Math.abs(t0 + t1)));
  }
  derivs.push(tangents[len - 2]);

  const ys = new Float32Array(CANVAS_WIDTH + 1);
  for (let x = 0; x <= CANVAS_WIDTH; x++) {
    let yVal: number;
    if (x <= MIN_X) {
      yVal = targetYs[0] + (x - MIN_X) * derivs[0];
    } else if (x >= MAX_X) {
      yVal = targetYs[len - 1] + (x - MAX_X) * derivs[len - 1];
    } else {
      const u = (x - MIN_X) / stepX;
      const idx = Math.min(len - 2, Math.floor(u));
      const frac = u - idx;
      const f2 = frac * frac;
      const f3 = f2 * frac;
      yVal =
        (2 * f3 - 3 * f2 + 1) * targetYs[idx] +
        (f3 - 2 * f2 + frac) * stepX * derivs[idx] +
        (-2 * f3 + 3 * f2) * targetYs[idx + 1] +
        (f3 - f2) * stepX * derivs[idx + 1];
    }
    ys[x] = yVal;
  }

  return {
    ys,
    peakX: MIN_X + peakIdx * stepX,
    lo,
    hi,
    n: len,
  };
}

function curveY(ys: Float32Array, x: number) {
  const cx = Math.max(0, Math.min(CANVAS_WIDTH, x));
  const floorX = Math.min(CANVAS_WIDTH - 1, Math.floor(cx));
  const frac = cx - floorX;
  return ys[floorX] * (1 - frac) + ys[floorX + 1] * frac;
}

function lineAlpha(dist: number) {
  return Math.exp(-Math.pow(Math.abs(dist) / SIGMA_LINE, EXP_LINE));
}

function inverseEase(v: number) {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (easeInOut(mid) < v) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function frameAt(t: number, loopPeriod: number) {
  const frame = {
    grid: smoothstep(t / T_GRID),
    draw: easeInOut((t - T_LINE_START) / T_LINE_DUR),
    erase: 0,
    dotS: backOut((t - T_LINE_START) / 0.4),
    dotA: smoothstep((t - T_LINE_START) / 0.2),
    num: easeOut((t - T_NUM_START) / T_NUM_DUR),
    numA: smoothstep((t - T_NUM_START) / 0.45),
    numY: 1 - easeOut((t - T_NUM_START) / 0.7),
    arrow: backOut((t - T_ARROW_START) / 0.45),
    arrowA: smoothstep((t - T_ARROW_START) / 0.18),
    breath: 0,
  };

  if (loopPeriod > 0) {
    const p = loopPeriod;
    const fadeOut = (delta: number, dur: number) => 1 - smoothstep((t - (p - delta)) / dur);
    frame.erase = easeInOut((t - (p - 1.4)) / 1.15);
    const dFade = fadeOut(1.05, 0.45);
    frame.dotA *= dFade;
    frame.dotS *= 0.6 + 0.4 * dFade;
    const nFade = fadeOut(1.3, 0.55);
    frame.numA *= nFade;
    frame.arrowA *= nFade;
    frame.numY -= (1 - nFade) * 0.7;
    frame.grid *= fadeOut(1.1, 0.85);
    const cycle = (((t - (p - 2.2)) % p) + p) % p;
    frame.breath = cycle < T_BREATH_PERIOD ? Math.pow(Math.sin((Math.PI * cycle) / T_BREATH_PERIOD), 2) : 0;
  } else if (t > T_STATIC) {
    frame.breath = 0.6 * Math.pow(Math.sin((Math.PI * (t - T_STATIC)) / 7), 2);
  }

  return frame;
}

// --- Component Props Interface ---
export interface PeakChartProps {
  data?: number[];
  labels?: string[];
  value?: number;
  valueSuffix?: string;
  decimals?: number;
  title?: string;
  caption?: string;
  updatedText?: string;
  trend?: "up" | "down" | "none";
  periods?: string[];
  period?: string;
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  accent?: string;
  width?: number;
  loop?: number;
  backdrop?: boolean;
  formatValue?: (val: number) => string;
  font?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PeakChart: React.FC<PeakChartProps> = ({
  data,
  labels,
  value = 400,
  valueSuffix = "%",
  decimals = 0,
  title = "Conversion rate",
  caption = "Increase vs last month",
  updatedText = "Data updated 2h ago",
  trend = "up",
  periods = ["Weekly", "Monthly", "Yearly"],
  period,
  defaultPeriod = "Monthly",
  onPeriodChange,
  accent = DEFAULT_ACCENT,
  width = 420,
  loop = 0,
  backdrop = false,
  formatValue,
  font = 'Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  className,
  style,
}) => {
  const [internalPeriod, setInternalPeriod] = React.useState(defaultPeriod);
  const activePeriod = period ?? internalPeriod;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [grainUrl, setGrainUrl] = React.useState<string | null>(null);

  const scaleRatio = width / CANVAS_WIDTH;
  const sampleDataForPeriod = PEAK_CHART_SAMPLE_DATA[activePeriod];
  const chartData = data ?? sampleDataForPeriod?.data ?? DEFAULT_MONTHLY_DATA;
  const chartLabels = labels ?? (sampleDataForPeriod && sampleDataForPeriod.data.length === chartData.length ? sampleDataForPeriod.labels : undefined);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const valueNumberRef = React.useRef<HTMLSpanElement>(null);
  const valueContainerRef = React.useRef<HTMLDivElement>(null);
  const arrowRef = React.useRef<SVGSVGElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const tooltipValRef = React.useRef<HTMLSpanElement>(null);
  const tooltipLabelRef = React.useRef<HTMLSpanElement>(null);
  const dropdownTriggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = React.useRef<HTMLDivElement>(null);

  const animStateRef = React.useRef({
    curve: buildCurve(chartData),
    from: null as CurveData | null,
    morph: 1,
    labels: chartLabels,
    value: value,
    shownValue: 0,
    valueFrom: 0,
    valueT: 1,
    hover: null as number | null,
    hoverX: 0,
    hoverMix: 0,
    fmt: formatValue,
    suffix: valueSuffix,
    decimals: decimals,
    loop: loop,
    kick: () => {},
  });

  animStateRef.current.labels = chartLabels;
  animStateRef.current.fmt = formatValue;
  animStateRef.current.suffix = valueSuffix;
  animStateRef.current.decimals = decimals;
  animStateRef.current.loop = loop;

  const dataKey = chartData.join(",");
  const isInitialMount = React.useRef(true);

  // Curve morphing when data updates
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const state = animStateRef.current;
    const nextCurve = buildCurve(chartData);
    const morphEased = easeInOut(state.morph);

    if (state.from && state.morph < 1) {
      const blended = new Float32Array(CANVAS_WIDTH + 1);
      for (let i = 0; i <= CANVAS_WIDTH; i++) {
        blended[i] = state.from.ys[i] + (state.curve.ys[i] - state.from.ys[i]) * morphEased;
      }
      state.from = {
        ...state.curve,
        ys: blended,
        peakX: state.from.peakX + (state.curve.peakX - state.from.peakX) * morphEased,
      };
    } else {
      state.from = state.curve;
    }

    state.curve = nextCurve;
    state.morph = 0;
    state.kick();
  }, [dataKey]);

  // Number counting when value prop changes
  React.useEffect(() => {
    const state = animStateRef.current;
    if (state.value !== value) {
      state.valueFrom = state.shownValue;
      state.value = value;
      state.valueT = 0;
      state.kick();
    }
  }, [value]);

  // Backdrop texture initialization
  React.useEffect(() => {
    if (backdrop && !grainUrl) {
      setGrainUrl(grainTile());
    }
  }, [backdrop, grainUrl]);

  // Canvas drawing & animation loop
  React.useEffect(() => {
    const cv = canvasRef.current;
    const card = cardRef.current;
    if (!cv || !card) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const state = animStateRef.current;
    const prefersReducedMotion =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const padX = Math.ceil(PADDING_X * scaleRatio);
    const padY = Math.ceil(PADDING_Y * scaleRatio);
    const padXScaled = padX * dpr;
    const padYScaled = padY * dpr;

    cv.width = Math.ceil(CANVAS_WIDTH * scaleRatio * dpr + 2 * padXScaled);
    cv.height = Math.ceil(CANVAS_HEIGHT * scaleRatio * dpr + 2 * padYScaled);
    cv.style.left = `${-padX}px`;
    cv.style.top = `${-padY}px`;
    cv.style.width = `${cv.width / dpr}px`;
    cv.style.height = `${cv.height / dpr}px`;

    const fieldSize = Math.min(width * dpr, Math.max(width, 700));
    const { rest: fieldRest, lift: fieldLift } = getCachedField(fieldSize, 11);
    const gridCv = getCachedGrid(width * dpr);
    const haloCv = getCachedHalo(width);

    const calcTimeLand = (tRatio: number) => T_LINE_START + T_LINE_DUR * inverseEase(tRatio);

    let progressTime = prefersReducedMotion ? T_STATIC + 0.01 : 0;
    let animActive = prefersReducedMotion;
    let inViewport = true;
    let rafId = 0;
    let lastTime = performance.now();

    const drawCardClip = () => {
      ctx.beginPath();
      ctx.moveTo(CORNER_RADIUS, 0);
      ctx.arcTo(CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT, CORNER_RADIUS);
      ctx.arcTo(CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_HEIGHT, CORNER_RADIUS);
      ctx.arcTo(0, CANVAS_HEIGHT, 0, 0, CORNER_RADIUS);
      ctx.arcTo(0, 0, CANVAS_WIDTH, 0, CORNER_RADIUS);
      ctx.closePath();
    };

    const drawFrame = (dt: number) => {
      const loopSec = state.loop > 0 ? Math.max(6, state.loop) : 0;
      const isHovered = state.hover !== null;

      if (animActive && !prefersReducedMotion) {
        const loopTime = loopSec ? progressTime % loopSec : progressTime;
        if (!isHovered || loopTime < T_STATIC || (loopSec && loopTime >= loopSec - 2.2)) {
          progressTime += dt;
        }
      }

      const curTime = loopSec ? progressTime % loopSec : progressTime;
      const f = animActive ? frameAt(curTime, loopSec) : frameAt(0, 0);
      if (prefersReducedMotion) f.breath = 0;

      if (state.morph < 1) {
        state.morph = prefersReducedMotion ? 1 : Math.min(1, state.morph + dt / MORPH_DURATION);
      }

      const morphEased = easeInOut(state.morph);
      const curCurve = state.curve;
      const ysArr = state.from && state.morph < 1 ? new Float32Array(CANVAS_WIDTH + 1) : curCurve.ys;

      if (ysArr !== curCurve.ys && state.from) {
        for (let i = 0; i <= CANVAS_WIDTH; i++) {
          ysArr[i] = state.from.ys[i] + (curCurve.ys[i] - state.from.ys[i]) * morphEased;
        }
      }

      const curPeakX = state.from && state.morph < 1 ? state.from.peakX + (curCurve.peakX - state.from.peakX) * morphEased : curCurve.peakX;
      const curLo = state.from && state.morph < 1 ? state.from.lo + (curCurve.lo - state.from.lo) * morphEased : curCurve.lo;
      const curHi = state.from && state.morph < 1 ? state.from.hi + (curCurve.hi - state.from.hi) * morphEased : curCurve.hi;

      const hasReachedPeak = curTime >= calcTimeLand((curPeakX + PEAK_TOUCH_OFFSET) / CANVAS_WIDTH) && f.erase <= 0 && f.dotA > 0.99;
      const isInteractiveHover = isHovered && (hasReachedPeak || prefersReducedMotion);

      if (state.hover !== null) {
        state.hoverX = prefersReducedMotion ? state.hover : state.hoverX + (state.hover - state.hoverX) * (1 - Math.exp(-dt * 14));
      }
      state.hoverMix = prefersReducedMotion
        ? isInteractiveHover ? 1 : 0
        : state.hoverMix + ((isInteractiveHover ? 1 : 0) - state.hoverMix) * (1 - Math.exp(-dt * 10));

      if (state.valueT < 1) {
        state.valueT = prefersReducedMotion ? 1 : Math.min(1, state.valueT + dt / 0.9);
      }

      const curVal = (state.valueFrom + (state.value - state.valueFrom) * easeOut(state.valueT)) * f.num;
      state.shownValue = curVal;

      if (valueNumberRef.current) {
        const strVal = curVal.toLocaleString("en-US", {
          minimumFractionDigits: state.decimals,
          maximumFractionDigits: state.decimals,
        });
        if (valueNumberRef.current.textContent !== strVal) {
          valueNumberRef.current.textContent = strVal;
        }
      }

      if (valueContainerRef.current) {
        valueContainerRef.current.style.opacity = String(f.numA);
        valueContainerRef.current.style.transform = `translateY(${(f.numY * 5 * scaleRatio).toFixed(2)}px)`;
        const blurAmount = Math.abs(f.numY) * 6 * scaleRatio;
        valueContainerRef.current.style.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : "";
      }

      if (arrowRef.current) {
        arrowRef.current.style.opacity = String(f.arrowA);
        arrowRef.current.style.transform = `scale(${Math.max(0, f.arrow).toFixed(3)})`;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);

      const renderScale = dpr * scaleRatio;
      ctx.setTransform(renderScale, 0, 0, renderScale, padXScaled, padYScaled);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Background ambient halo & field
      ctx.drawImage(haloCv, -PADDING_X, -PADDING_Y, CANVAS_WIDTH + 2 * PADDING_X, CANVAS_HEIGHT + 2 * PADDING_Y);
      ctx.save();
      drawCardClip();
      ctx.clip();
      ctx.drawImage(fieldRest, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (f.breath > 0.001) {
        ctx.globalAlpha = f.breath;
        ctx.drawImage(fieldLift, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      if (f.grid > 0.001) {
        ctx.globalAlpha = f.grid;
        ctx.drawImage(gridCv, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      ctx.globalAlpha = 1;

      // Draw peak chart line
      const eraseEdge = f.erase * CANVAS_WIDTH;
      const drawEdge = f.draw * CANVAS_WIDTH;

      if (drawEdge - eraseEdge > 0.5) {
        const lineGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
        const trailingFade = 0.95 * (1 - smoothstep((f.draw - 0.8) / 0.2));

        for (let i = 0; i <= 54; i++) {
          const ptX = (i / 54) * CANVAS_WIDTH;
          let a = lineAlpha(ptX - curPeakX - PEAK_OFFSET_X);
          if (trailingFade > 0.001 && ptX <= drawEdge + 10) {
            a = Math.max(a, trailingFade * Math.exp(-Math.max(0, drawEdge - ptX) / 70));
          }
          if (f.erase > 0) {
            a *= smoothstep((ptX - eraseEdge) / 60);
          }
          lineGrad.addColorStop(i / 54, formatRgba(LINE_COLOR, a));
        }

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = LINE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const startIdx = Math.floor(eraseEdge);
        ctx.moveTo(eraseEdge, curveY(ysArr, eraseEdge));
        for (let i = startIdx + 1; i < drawEdge; i++) {
          ctx.lineTo(i, ysArr[i]);
        }
        ctx.lineTo(drawEdge, curveY(ysArr, drawEdge));
        ctx.stroke();
      }

      // Draw pulsing peak dot
      if (f.dotA > 0.001) {
        const anchorX = curPeakX + PEAK_TOUCH_OFFSET;
        const boundedX = Math.min(drawEdge, anchorX);
        const targetX = boundedX + (state.hoverX - boundedX) * state.hoverMix;
        const targetY = curveY(ysArr, targetX) + PEAK_Y_SHIFT * (1 - state.hoverMix) * clamp01(boundedX / anchorX);
        const peakT = curTime - calcTimeLand(anchorX / CANVAS_WIDTH);
        const ripplePhase = peakT > 0 && peakT < 1.1 && !prefersReducedMotion ? peakT / 1.1 : -1;

        ctx.globalAlpha = f.dotA;
        ctx.translate(targetX, targetY);
        ctx.scale(f.dotS, f.dotS);

        const pulseScale = ripplePhase >= 0 ? Math.sin(Math.PI * Math.min(1, ripplePhase * 1.6)) : 0;
        const radialGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        const haloColor = (mult: number) => formatRgba(DOT_OUTER_COLOR, Math.min(1, mult * (1 + 0.9 * pulseScale)));

        radialGlow.addColorStop(0, haloColor(0.47));
        radialGlow.addColorStop(15 / 30, haloColor(0.47));
        radialGlow.addColorStop(17 / 30, haloColor(0.41));
        radialGlow.addColorStop(19 / 30, haloColor(0.31));
        radialGlow.addColorStop(21 / 30, haloColor(0.17));
        radialGlow.addColorStop(23 / 30, haloColor(0.1));
        radialGlow.addColorStop(25 / 30, haloColor(0.06));
        radialGlow.addColorStop(27 / 30, haloColor(0.03));
        radialGlow.addColorStop(1, haloColor(0));

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        // Expanding radar ring on initial landing
        if (ripplePhase >= 0) {
          const ringR = DOT_RADIUS + 26 * easeOut(ripplePhase);
          ctx.strokeStyle = formatRgba(DOT_RIPPLE_COLOR, 0.55 * (1 - ripplePhase) * (1 - ripplePhase));
          ctx.lineWidth = 2.2 * (1 - ripplePhase) + 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner glowing core
        const dotGrad = ctx.createLinearGradient(0, -DOT_RADIUS, 0, DOT_RADIUS);
        dotGrad.addColorStop(0, DOT_INNER_TOP);
        dotGrad.addColorStop(0.45, DOT_INNER_MID);
        dotGrad.addColorStop(1, DOT_INNER_BOT);
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(0, 0, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.setTransform(renderScale, 0, 0, renderScale, padXScaled, padYScaled);
        ctx.globalAlpha = 1;

        // Hover tooltip update
        const tip = tooltipRef.current;
        if (tip) {
          tip.style.opacity = state.hoverMix.toFixed(3);
          tip.style.transform = `translate(${(targetX * scaleRatio).toFixed(1)}px, ${(
            (targetY - 26) *
            scaleRatio
          ).toFixed(1)}px) translate(-50%, -100%) scale(${(0.92 + 0.08 * state.hoverMix).toFixed(3)})`;

          if (state.hoverMix > 0.01) {
            const interpolatedVal = curLo + ((MAX_Y - curveY(ysArr, targetX)) / (MAX_Y - MIN_Y)) * (curHi - curLo);
            const formattedVal = state.fmt
              ? state.fmt(interpolatedVal)
              : `${Math.round(interpolatedVal).toLocaleString("en-US")}${state.suffix}`;

            if (tooltipValRef.current && tooltipValRef.current.textContent !== formattedVal) {
              tooltipValRef.current.textContent = formattedVal;
            }

            const totalPoints = curCurve.n;
            const ptIdx = Math.round(((Math.max(MIN_X, Math.min(MAX_X, targetX)) - MIN_X) / (MAX_X - MIN_X)) * (totalPoints - 1));
            const ptLabel = state.labels?.[ptIdx] ?? "";

            if (tooltipLabelRef.current) {
              if (tooltipLabelRef.current.textContent !== ptLabel) {
                tooltipLabelRef.current.textContent = ptLabel;
              }
              tooltipLabelRef.current.style.display = ptLabel ? "" : "none";
            }
          }
        }
      }

      ctx.restore();
    };

    const isLooping = () => {
      if (!animActive) return false;
      if (prefersReducedMotion) {
        return state.morph < 1 || Math.abs(state.hoverMix - (state.hover !== null ? 1 : 0)) > 0.001;
      }
      // If looping is disabled (state.loop === 0) and initial drawing sequence has settled at rest
      if (
        state.loop === 0 &&
        progressTime >= T_STATIC + 0.2 &&
        state.morph >= 1 &&
        state.valueT >= 1 &&
        Math.abs(state.hoverMix - (state.hover !== null ? 1 : 0)) < 0.005
      ) {
        return false;
      }
      return true;
    };

    const tick = () => {
      rafId = 0;
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      drawFrame(dt);
      if (inViewport && !document.hidden && isLooping()) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (!rafId && inViewport && !document.hidden) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    state.kick = kick;
    drawFrame(0);

    // Viewport visibility via IntersectionObserver
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (inViewport) {
        animActive = true;
        kick();
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });
    observer.observe(card);

    const onVisibilityChange = () => {
      if (!document.hidden) kick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId) cancelAnimationFrame(rafId);
      state.kick = () => {};
    };
  }, [width, scaleRatio]);

  // Click outside listener for dropdown
  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!dropdownMenuRef.current?.contains(target) && !dropdownTriggerRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        dropdownTriggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSelectPeriod = (p: string) => {
    setMenuOpen(false);
    if (p !== activePeriod) {
      if (period === undefined) setInternalPeriod(p);
      onPeriodChange?.(p);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const state = animStateRef.current;
    const clampedX = Math.max(MIN_X, Math.min(MAX_X, nx));
    if (state.hover === null && state.hoverMix < 0.02) {
      state.hoverX = clampedX;
    }
    state.hover = clampedX;
    state.kick();
  };

  const handlePointerLeave = () => {
    animStateRef.current.hover = null;
    animStateRef.current.kick();
  };

  // Accent hue-rotate & saturate calculation
  const accentFilter = React.useMemo(() => {
    const curHsl = rgbToHsl(accent);
    const baseHsl = rgbToHsl(DEFAULT_ACCENT);
    if (!curHsl || !baseHsl) return undefined;
    let deltaHue = curHsl[0] - baseHsl[0];
    if (deltaHue > 180) deltaHue -= 360;
    if (deltaHue < -180) deltaHue += 360;
    const satRatio = baseHsl[1] > 0 ? curHsl[1] / baseHsl[1] : 1;
    if (Math.abs(deltaHue) < 0.5 && Math.abs(satRatio - 1) < 0.02) return undefined;
    return `hue-rotate(${deltaHue.toFixed(1)}deg) saturate(${satRatio.toFixed(3)})`;
  }, [accent]);

  const px = (val: number) => `${(val * scaleRatio).toFixed(3)}px`;

  const textStyle: React.CSSProperties = {
    position: "absolute",
    whiteSpace: "nowrap",
    fontFamily: font,
    fontStretch: "110%",
    fontWeight: 300,
    margin: 0,
    lineHeight: 1,
  };

  const trendColor = trend === "down" ? "#f08a8a" : "#93cfa2";
  const initialFormattedVal = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const cardElement = (
    <div
      ref={cardRef}
      data-peak-chart=""
      style={{
        position: "relative",
        width,
        height: width * ASPECT_RATIO,
        borderRadius: px(CORNER_RADIUS),
        flex: "none",
        fontFamily: font,
        color: "#fff",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden={true}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
          filter: accentFilter,
        }}
      />

      {/* Interactive hover overlay */}
      <div
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        style={{
          position: "absolute",
          left: 0,
          top: px(96),
          width: "100%",
          height: px(330),
          touchAction: "pan-y",
          cursor: "crosshair",
        }}
      />

      {/* Updated Text */}
      <p
        data-part="updated"
        style={{
          ...textStyle,
          left: px(45.6),
          top: px(43.6),
          fontSize: px(18.6),
          fontStretch: "107.7%",
          fontWeight: 200,
          color: "#99a3b6",
        }}
      >
        {updatedText}
      </p>

      {/* Period Dropdown Trigger */}
      <button
        ref={dropdownTriggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          position: "absolute",
          right: px(46),
          top: px(35),
          height: px(37),
          borderRadius: px(18.5),
          border: 0,
          padding: `0 ${px(19.8)} 0 ${px(19.4)}`,
          display: "flex",
          alignItems: "flex-start",
          gap: px(6.72),
          background: "rgba(255, 255, 255, 0.13)",
          cursor: "pointer",
          color: "#b9cdf2",
          fontFamily: font,
          outlineOffset: 2,
        }}
      >
        <span
          data-part="period"
          style={{
            ...textStyle,
            position: "relative",
            display: "block",
            marginTop: px(10.6),
            fontSize: px(17.2),
            fontStretch: "115%",
            fontWeight: 200,
            color: "#acc1e7",
          }}
        >
          {activePeriod}
        </span>
        <svg
          viewBox="0 0 12 7"
          aria-hidden={true}
          style={{
            flex: "none",
            marginTop: px(15.9),
            width: px(12),
            height: px(7),
            overflow: "visible",
            transition: "transform 0.2s ease",
            transform: menuOpen ? "rotate(180deg)" : "none",
          }}
        >
          <path
            d="M0.8 0.8 L6 6 L11.2 0.8"
            fill="none"
            stroke="#9fb7e0"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        ref={dropdownMenuRef}
        role="listbox"
        aria-label="Period"
        style={{
          position: "absolute",
          right: px(46),
          top: px(80),
          minWidth: px(150),
          padding: px(6),
          borderRadius: px(16),
          zIndex: 10,
          background: "rgba(20, 34, 64, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: "0 18px 40px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          transformOrigin: "top right",
          transition: "opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2), visibility 0.22s",
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? "none" : `translateY(${px(-6)}) scale(0.96)`,
          visibility: menuOpen ? "visible" : "hidden",
        }}
      >
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            role="option"
            aria-selected={p === activePeriod}
            onClick={() => handleSelectPeriod(p)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              height: px(36),
              padding: `0 ${px(12)}`,
              border: 0,
              borderRadius: px(10),
              background: p === activePeriod ? "rgba(255, 255, 255, 0.12)" : "transparent",
              cursor: "pointer",
              color: p === activePeriod ? "#e6eeff" : "#aebcd6",
              fontFamily: font,
              fontStretch: "116%",
              fontSize: px(15.5),
              textAlign: "left",
            }}
            onPointerEnter={(e) => {
              if (p !== activePeriod) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            }}
            onPointerLeave={(e) => {
              if (p !== activePeriod) e.currentTarget.style.background = "transparent";
            }}
          >
            {p}
            {p === activePeriod && (
              <svg viewBox="0 0 12 9" aria-hidden={true} style={{ width: px(12), height: px(9) }}>
                <path
                  d="M1 4.6 L4.4 8 L11 1"
                  fill="none"
                  stroke="#9fc0ff"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Floating Hover Tooltip */}
      <div
        ref={tooltipRef}
        aria-hidden={true}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: 5,
          display: "flex",
          alignItems: "baseline",
          gap: px(7),
          padding: `${px(7)} ${px(11)}`,
          borderRadius: px(11),
          background: "rgba(18, 36, 72, 0.75)",
          border: "1px solid rgba(160, 195, 255, 0.22)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          whiteSpace: "nowrap",
          fontFamily: font,
          fontStretch: "116%",
        }}
      >
        <span ref={tooltipValRef} style={{ fontSize: px(16), fontWeight: 600, color: "#fff" }} />
        <span ref={tooltipLabelRef} style={{ fontSize: px(12.5), color: "#9fb0cc" }} />
      </div>

      {/* Title */}
      <p
        data-part="title"
        style={{
          ...textStyle,
          left: 0,
          right: 0,
          textAlign: "center",
          top: px(441.4),
          fontSize: px(20.2),
          fontStretch: "115%",
          fontWeight: 200,
          color: "#9298a5",
        }}
      >
        {title}
      </p>

      {/* Value Container */}
      <div
        ref={valueContainerRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: px(469),
          display: "flex",
          justifyContent: "center",
          opacity: 0,
        }}
      >
        <div
          data-part="value"
          style={{
            position: "relative",
            fontFamily: font,
            fontWeight: 500,
            fontSize: px(89.2),
            lineHeight: 1,
            letterSpacing: px(-0.5),
            whiteSpace: "nowrap",
            marginLeft: px(-8.5),
          }}
        >
          <span
            style={{
              position: "relative",
              display: "inline-block",
              fontVariantNumeric: "tabular-nums",
              fontStretch: "106%",
            }}
          >
            <span style={{ visibility: "hidden" }}>{initialFormattedVal}</span>
            <span ref={valueNumberRef} style={{ position: "absolute", right: 0, top: 0 }}>
              {initialFormattedVal}
            </span>
          </span>
          <span
            data-part="suffix"
            style={{
              display: "inline-block",
              fontStretch: "76%",
              marginLeft: px(1.5),
              marginRight: px(-4),
              transform: "scaleX(0.93)",
              transformOrigin: "0 50%",
            }}
          >
            {valueSuffix}
          </span>
          {trend !== "none" && (
            <svg
              ref={arrowRef}
              viewBox="0 0 8 8"
              aria-hidden={true}
              style={{
                position: "absolute",
                left: "100%",
                marginLeft: px(5.5),
                top: px(16.4),
                width: px(7),
                height: px(7),
                overflow: "visible",
                transformOrigin: "0% 100%",
                opacity: 0,
                transform: trend === "down" ? "rotate(90deg)" : "none",
              }}
            >
              <path
                d="M0.6 7.4 L7.2 0.8 M2 0.6 L7.4 0.6 L7.4 6"
                fill="none"
                stroke={trendColor}
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Caption */}
      <p
        data-part="caption"
        style={{
          ...textStyle,
          left: 0,
          right: 0,
          textAlign: "center",
          top: px(560.9),
          fontSize: px(11.6),
          fontStretch: "108%",
          fontWeight: 250,
          color: "#9299a8",
        }}
      >
        {caption}
      </p>
    </div>
  );

  if (backdrop) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: BG_DARK,
          backgroundImage: grainUrl ? `url(${grainUrl})` : undefined,
          backgroundSize: "160px 160px",
          ...style,
        }}
      >
        {cardElement}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ display: "inline-block", ...style }}>
      {cardElement}
    </div>
  );
};
