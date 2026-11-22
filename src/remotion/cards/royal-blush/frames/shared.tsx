import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";

// ------------------------------------------------------------------ assets & fonts

export const asset = (path: string) => staticFile(`cards/royal-blush/${path}`);

export const SERIF = '"RB Garamond", "EB Garamond", Garamond, Georgia, serif';
export const ROMAN = '"RB Cormorant", "Cormorant Garamond", Garamond, Georgia, serif';
export const SCRIPT = '"RB Pinyon", "Pinyon Script", cursive';
// Pinyon's S reads as an "L"/"J" at a glance; Great Vibes' S is unmistakable
const SCRIPT_ALT = '"RB Vibes", "Great Vibes", cursive';
const ALT_CAPS = new Set(["S"]);

const FONTS = [
  { family: "RB Garamond", file: "EBGaramond.ttf", weight: "400 800", style: "normal" },
  { family: "RB Garamond", file: "EBGaramond-Italic.ttf", weight: "400 800", style: "italic" },
  { family: "RB Cormorant", file: "CormorantGaramond.ttf", weight: "300 700", style: "normal" },
  { family: "RB Pinyon", file: "PinyonScript.ttf", weight: "400", style: "normal" },
  { family: "RB Vibes", file: "GreatVibes.ttf", weight: "400", style: "normal" },
];

let fontsRequested = false;
let fontsLoaded = false;
let fontsPromise: Promise<void> = Promise.resolve();
/** Loads the card's bundled (OFL) fonts once; rendering waits until they are ready. */
export function loadFonts() {
  if (fontsRequested || typeof document === "undefined") return;
  fontsRequested = true;
  const handle = delayRender("royal-blush fonts");
  fontsPromise = Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${asset(`fonts/${f.file}`)}) format("truetype")`, {
        weight: f.weight,
        style: f.style,
      })
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  )
    .then(() => undefined)
    .catch((err) => console.error("royal-blush: font load failed", err))
    .finally(() => {
      fontsLoaded = true;
      continueRender(handle);
    });
}

/**
 * True once the card fonts are loaded. Text is measured with the real fonts (to shrink
 * lines that would not fit), so a component that measures re-renders when they arrive,
 * and holds the frame until it has.
 */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(fontsLoaded);
  const [handle] = useState(() => (fontsLoaded ? null : delayRender("royal-blush text fit")));
  useEffect(() => {
    if (!ready) fontsPromise.then(() => setReady(true));
  }, [ready]);
  useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  return ready;
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Advance width of text in px for a CSS font shorthand. */
function measure(text: string, cssFont: string, letterSpacing = 0): number {
  if (typeof document === "undefined") return 0;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = cssFont;
  return measureCtx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
}

/** Text is kept at least this far from the left and right edges of the card. */
export const SIDE_MARGIN = 90;
const widthFor = (cx: number, align: "start" | "middle" | "end") =>
  align === "start" ? 1080 - SIDE_MARGIN - cx : align === "end" ? cx - SIDE_MARGIN : 2 * Math.min(cx - SIDE_MARGIN, 1080 - SIDE_MARGIN - cx);

// ------------------------------------------------------------------ colours

export const MAROON = "#74182A";
export const GOLD = "#C38B4E";
export const GOLD_LIGHT = "#E2B878";
export const CREAM = "#FFF3DE";

// ------------------------------------------------------------------ motion helpers

/**
 * How fast a screen's entrances play (1 = as authored). A screen given 1.25 reveals its
 * text 25% sooner; ambient motion (petals, wind, sway, zoom) keeps the real clock.
 */
export const RevealSpeed = createContext(1);
/** The frame number that text and other entrances are timed against. */
export const useRevealFrame = () => useCurrentFrame() * useContext(RevealSpeed);


export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);

/** 0 -> 1 between frames [start, start + dur], clamped, eased. */
export const progress = (frame: number, start: number, dur: number, easing = EASE_OUT) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Smooth pseudo-random wobble in roughly [-1, 1]; deterministic in t and seed. */
export const wobble = (t: number, seed = 0) =>
  0.5 * Math.sin(t * 1.31 + seed * 12.9898) +
  0.3 * Math.sin(t * 2.71 + seed * 78.233) +
  0.2 * Math.sin(t * 4.13 + seed * 37.719);

/** Seeded random in [0, 1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ text

/** Opacity / rise / blur of the one text entrance used everywhere. */
export const revealStyle = (frame: number, at: number, dur = 26, rise = 18, glow?: string): CSSProperties => {
  const p = progress(frame, at, dur);
  const filters: string[] = [];
  if (p < 1) filters.push(`blur(${((1 - p) * 6).toFixed(2)}px)`);
  if (glow) filters.push(`drop-shadow(0 0 7px ${glow})`);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * rise}px)`,
    filter: filters.length ? filters.join(" ") : undefined,
  };
};

type BandProps = {
  /** Baseline in composition px. */
  y: number;
  size: number;
  style?: CSSProperties;
  children: (baseline: number) => ReactNode;
};

/**
 * A full-width SVG strip around one line of text. SVG text is positioned by its
 * baseline, which is how the reference layout was measured.
 */
export const TextBand: React.FC<BandProps> = ({ y, size, style, children }) => {
  const above = size * 1.45;
  const h = size * 2.1;
  return (
    <svg
      width={1080}
      height={h}
      viewBox={`0 0 1080 ${h}`}
      style={{ position: "absolute", left: 0, top: y - above, overflow: "visible", ...style }}
    >
      {children(above)}
    </svg>
  );
};

type LinesProps = {
  text: string;
  /** Baseline of the first line, in composition px. */
  baseline: number;
  lineHeight: number;
  fontSize: number;
  at: number;
  stagger?: number;
  color?: string;
  font?: string;
  weight?: number;
  italic?: boolean;
  letterSpacing?: number;
  /** Horizontal anchor x of the lines (their centre, or their start/end edge). */
  cx?: number;
  align?: "start" | "middle" | "end";
  glow?: string;
  /** Widest a line may be; longer text is scaled down to fit (default: up to the side margins). */
  maxWidth?: number;
};

export const SOFT_GLOW = "rgba(255, 246, 234, 0.95)";

/** Centred multi-line text positioned by baseline; each line reveals in turn. */
export const Lines: React.FC<LinesProps> = ({
  text,
  baseline,
  lineHeight,
  fontSize,
  at,
  stagger = 9,
  color = MAROON,
  font = SERIF,
  weight = 500,
  italic = false,
  letterSpacing,
  cx = 540,
  align = "middle",
  glow = SOFT_GLOW,
  maxWidth,
}) => {
  const frame = useRevealFrame();
  const ready = useFontsReady();
  const lines = text.split("\n");
  // one size for the whole block, so its lines stay the same size as each other
  const limit = maxWidth ?? widthFor(cx, align);
  const css = `${italic ? "italic " : ""}${weight} ${fontSize}px ${font}`;
  const widest = ready ? Math.max(...lines.map((l) => measure(l, css, letterSpacing ?? 0))) : 0;
  const size = widest > limit ? (fontSize * limit) / widest : fontSize;
  return (
    <>
      {lines.map((line, i) => (
        <TextBand key={i} y={baseline + i * lineHeight} size={fontSize} style={revealStyle(frame, at + i * stagger, 26, 18, glow)}>
          {(b) => (
            <text
              x={cx}
              y={b}
              textAnchor={align}
              fontFamily={font}
              fontSize={size}
              fontWeight={weight}
              fontStyle={italic ? "italic" : "normal"}
              letterSpacing={letterSpacing}
              fill={color}
              style={{ whiteSpace: "pre" }}
            >
              {line}
            </text>
          )}
        </TextBand>
      ))}
    </>
  );
};

// Extra room after a script capital whose flourish reaches right (Pinyon's S, for one)
const CAP_GAP: Record<string, number> = { S: 0.02, T: 0.14, F: 0.14, H: 0.1, K: 0.1 };

type NameProps = {
  name: string;
  /** Text after the name, e.g. "&" */
  suffix?: string;
  baseline: number;
  cx?: number;
  size: number;
  at: number;
  dur?: number;
  color?: string;
  glow?: string;
  /** Weight of the serif part. */
  weight?: number;
  /** Widest the name may be; a longer name is scaled down (default: up to the side margins). */
  maxWidth?: number;
};

/**
 * A name in the card's lettering: a flourished script capital followed by an upright,
 * high-contrast serif. Revealed left to right like ink being written.
 */
export const ScriptName: React.FC<NameProps> = ({
  name,
  suffix = "",
  baseline,
  cx = 540,
  at,
  dur = 42,
  color = MAROON,
  glow = SOFT_GLOW,
  weight = 600,
  maxWidth,
  size: requested,
}) => {
  const frame = useRevealFrame();
  const ready = useFontsReady();
  const cap = name.slice(0, 1);
  const alt = ALT_CAPS.has(cap);
  const capScale = alt ? 1.2 : 1.3;
  const gap = CAP_GAP[cap] ?? 0.06;
  // width at the requested size, plus room for the capital's flourish to reach outwards
  const total = ready
    ? measure(cap, `400 ${requested * capScale}px ${alt ? SCRIPT_ALT : SCRIPT}`) +
      requested * gap +
      measure(name.slice(1), `${weight} ${requested}px ${ROMAN}`) +
      (suffix ? requested * 0.16 + measure(suffix, `${weight - 100} ${requested * 0.82}px ${ROMAN}`) : 0) +
      requested * 0.25
    : 0;
  const limit = maxWidth ?? widthFor(cx, "middle");
  const size = total > limit ? (requested * limit) / total : requested;
  const p = progress(frame, at, dur, EASE_IN_OUT);
  const edge = -15 + p * 130; // % position of the soft writing edge
  const mask = `linear-gradient(100deg, #000 ${edge - 14}%, transparent ${edge}%)`;
  return (
    <TextBand
      y={baseline}
      size={size}
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        opacity: progress(frame, at, 10),
        transform: `translateY(${(1 - p) * 8}px)`,
        filter: glow ? `drop-shadow(0 0 8px ${glow})` : undefined,
      }}
    >
      {(b) => (
        <text x={cx} y={b} textAnchor="middle" fill={color} style={{ whiteSpace: "pre" }}>
          <tspan fontFamily={alt ? SCRIPT_ALT : SCRIPT} fontSize={size * capScale}>
            {cap}
          </tspan>
          <tspan fontFamily={ROMAN} fontWeight={weight} fontSize={size} dx={size * gap}>
            {name.slice(1)}
          </tspan>
          {suffix && (
            <tspan fontFamily={ROMAN} fontWeight={weight - 100} fontSize={size * 0.82} dx={size * 0.16}>
              {suffix}
            </tspan>
          )}
        </text>
      )}
    </TextBand>
  );
};

// ------------------------------------------------------------------ ornaments

type DividerProps = {
  y: number;
  cx?: number;
  /** Half the total width of the rule, ornament included. */
  half: number;
  at: number;
  color?: string;
  /** Size of the centre ornament (its width), px. */
  ornament?: number;
  dur?: number;
};

/** Thin gold rule with a small floral ornament; the rule draws outward from the centre. */
export const Divider: React.FC<DividerProps> = ({ y, cx = 540, half, at, color = GOLD, ornament = 62, dur = 34 }) => {
  const frame = useRevealFrame();
  const draw = progress(frame, at + 6, dur, EASE_IN_OUT);
  const orn = progress(frame, at, 22);
  const gap = ornament / 2 + 4;
  const len = Math.max(0, half - gap);
  const id = `rule-${Math.round(y)}-${Math.round(cx)}`;
  return (
    <svg
      width={half * 2}
      height={ornament}
      viewBox={`${-half} ${-ornament / 2} ${half * 2} ${ornament}`}
      style={{ position: "absolute", left: cx - half, top: y - ornament / 2, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`${id}-r`} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="0.7" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="1" x2="0">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="0.7" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={gap} y={-1.4} width={len * draw} height={2.8} fill={`url(#${id}-r)`} />
      <rect x={-gap - len * draw} y={-1.4} width={len * draw} height={2.8} fill={`url(#${id}-l)`} />
      <g
        opacity={orn}
        transform={`scale(${(ornament / 64) * (0.7 + 0.3 * orn)}) rotate(${(1 - orn) * -25})`}
        fill={color}
        stroke={color}
      >
        <Ornament />
      </g>
    </svg>
  );
};

/** Centre motif (a lotus-like fleuron with scrolls), drawn in a ~64 x 30 box around (0, 0). */
const Ornament: React.FC = () => (
  <g>
    {/* central fleuron */}
    <path d="M0,-12 C3,-7 3.5,-3 0,0 C-3.5,-3 -3,-7 0,-12Z" stroke="none" />
    <path d="M0,12 C3,7 3.5,3 0,0 C-3.5,3 -3,7 0,12Z" stroke="none" />
    <path d="M0,0 C4,-5 9,-6 11,-2 C9,-1 5,0 0,0Z" stroke="none" />
    <path d="M0,0 C-4,-5 -9,-6 -11,-2 C-9,-1 -5,0 0,0Z" stroke="none" />
    <path d="M0,0 C4,5 9,6 11,2 C9,1 5,0 0,0Z" stroke="none" />
    <path d="M0,0 C-4,5 -9,6 -11,2 C-9,1 -5,0 0,0Z" stroke="none" />
    <circle r={2.6} fill="#FFF3DE" stroke="none" />
    <circle r={1.3} stroke="none" />
    {/* scrolls either side */}
    {[1, -1].map((dir) => (
      <g key={dir} transform={`scale(${dir},1)`}>
        <path d="M12,0 C15,-6 22,-7 24,-3 C25.5,0 22,2.5 20,0.5" fill="none" strokeWidth={1.9} strokeLinecap="round" />
        <path d="M12,0 C15,6 22,7 24,3" fill="none" strokeWidth={1.9} strokeLinecap="round" />
        <path d="M25,0 L29,0" strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={31.5} cy={0} r={2} stroke="none" />
      </g>
    ))}
  </g>
);

// ------------------------------------------------------------------ icons

type IconProps = { cx: number; cy: number; size?: number; at: number; color?: string; kind: "calendar" | "clock" | "pin" };

export const Icon: React.FC<IconProps> = ({ cx, cy, size = 50, at, color = MAROON, kind }) => {
  const frame = useRevealFrame();
  const p = progress(frame, at, 22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        opacity: p,
        transform: `scale(${0.6 + 0.4 * p})`,
        overflow: "visible",
        filter: "drop-shadow(0 0 5px rgba(255,247,236,0.9))",
      }}
    >
      {kind === "calendar" && (
        <g fill="none" stroke={color} strokeWidth={2.1} strokeLinejoin="round">
          <rect x={-9} y={-7.5} width={18} height={17} rx={2} />
          <path d="M-9,-2.5 H9" />
          <path d="M-5,-10.5 V-5.5 M5,-10.5 V-5.5" strokeLinecap="round" strokeWidth={2} />
          {[-5, 0, 5].map((x) =>
            [1.5, 5.5].map((y) => <rect key={`${x}${y}`} x={x - 1.3} y={y - 1.3} width={2.6} height={2.6} fill={color} stroke="none" />),
          )}
        </g>
      )}
      {kind === "clock" && (
        <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
          <circle r={9} />
          <path d="M0,-5.5 V0 H4.5" />
          <path d="M-8.5,-9.5 L-11,-7 M8.5,-9.5 L11,-7" strokeWidth={1.8} />
        </g>
      )}
      {kind === "pin" && (
        <g>
          <path d="M0,11 C-3,6 -8,1 -8,-3.5 A8,8 0 1 1 8,-3.5 C8,1 3,6 0,11Z" fill={color} />
          <circle cx={0} cy={-3.5} r={3} fill="#FFF3DE" />
        </g>
      )}
    </svg>
  );
};

// ------------------------------------------------------------------ sparkle

/** A soft four-point twinkle (bangle glints, stars, gold dust). */
export const Twinkle: React.FC<{ x: number; y: number; size: number; intensity: number; color?: string }> = ({
  x,
  y,
  size,
  intensity,
  color = "#FFF6DC",
}) => {
  if (intensity <= 0.01) return null;
  const s = size * (0.6 + 0.4 * intensity);
  return (
    <svg
      width={s * 2}
      height={s * 2}
      viewBox="-1 -1 2 2"
      style={{ position: "absolute", left: x - s, top: y - s, opacity: intensity, mixBlendMode: "screen", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="tw-glow">
          <stop offset="0" stopColor={color} stopOpacity="0.9" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={0.55} fill="url(#tw-glow)" />
      <path d="M0,-1 C0.06,-0.15 0.15,-0.06 1,0 C0.15,0.06 0.06,0.15 0,1 C-0.06,0.15 -0.15,0.06 -1,0 C-0.15,-0.06 -0.06,-0.15 0,-1Z" fill={color} />
    </svg>
  );
};
