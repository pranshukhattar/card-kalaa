import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";

/*
 * Text, ornaments and motion helpers of the haldi-sangeet card. Self-contained on purpose:
 * nothing here is shared with any other card, so other cards always render as they did.
 */

// ------------------------------------------------------------------ assets & fonts

export const cardAsset = (path: string) => staticFile(`cards/haldi-sangeet/${path}`);

export const SERIF = '"HS Garamond", "EB Garamond", Garamond, Georgia, serif';
export const DISPLAY = '"HS Cormorant", "Cormorant Garamond", Garamond, Georgia, serif';
export const SCRIPT = '"HS Vibes", "Great Vibes", cursive';

const FONTS = [
  { family: "HS Garamond", file: "EBGaramond.ttf", weight: "400 800", style: "normal" },
  { family: "HS Garamond", file: "EBGaramond-Italic.ttf", weight: "400 800", style: "italic" },
  { family: "HS Cormorant", file: "CormorantGaramond.ttf", weight: "300 700", style: "normal" },
  { family: "HS Cormorant", file: "CormorantGaramond-Italic.ttf", weight: "300 700", style: "italic" },
  { family: "HS Vibes", file: "GreatVibes.ttf", weight: "400", style: "normal" },
];

let fontsRequested = false;
let fontsLoaded = false;
let fontsPromise: Promise<void> = Promise.resolve();
/** Loads the card's bundled (OFL) fonts once; rendering waits until they are ready. */
export function loadFonts() {
  if (fontsRequested || typeof document === "undefined") return;
  fontsRequested = true;
  const handle = delayRender("haldi-sangeet fonts");
  fontsPromise = Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${cardAsset(`fonts/${f.file}`)}) format("truetype")`, {
        weight: f.weight,
        style: f.style,
      })
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  )
    .then(() => undefined)
    .catch((err) => console.error("haldi-sangeet: font load failed", err))
    .finally(() => {
      fontsLoaded = true;
      continueRender(handle);
    });
}

/** True once the fonts are loaded (text is measured with them to shrink lines that won't fit). */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(fontsLoaded);
  const [handle] = useState(() => (fontsLoaded ? null : delayRender("haldi-sangeet text fit")));
  useEffect(() => {
    if (!ready) fontsPromise.then(() => setReady(true));
  }, [ready]);
  useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  return ready;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, cssFont: string, letterSpacing = 0): number {
  if (typeof document === "undefined") return 0;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = cssFont;
  return measureCtx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
}

/** Text is kept at least this far from the left and right edges of the card. */
export const SIDE_MARGIN = 100;
const W = 1080;

// ------------------------------------------------------------------ motion helpers

/** How fast a screen's entrances play (1 = as authored); ambient motion keeps the real clock. */
export const RevealSpeed = createContext(1);
export const useRevealFrame = () => useCurrentFrame() * useContext(RevealSpeed);

export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);

export const progress = (frame: number, start: number, dur: number, easing = EASE_OUT) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Smooth pseudo-random wobble in roughly [-1, 1]. */
export const wobble = (t: number, seed = 0) =>
  0.5 * Math.sin(t * 1.31 + seed * 12.9898) + 0.3 * Math.sin(t * 2.71 + seed * 78.233) + 0.2 * Math.sin(t * 4.13 + seed * 37.719);

/** Seeded random in [0, 1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ text

/**
 * The one text entrance used everywhere: the line settles in like ink soaking into paper --
 * it sharpens from a soft blur while it fades up a few px.
 */
export const revealStyle = (frame: number, at: number, dur = 30, rise = 14, glow?: string): CSSProperties => {
  const p = progress(frame, at, dur);
  const filters: string[] = [];
  if (p < 1) filters.push(`blur(${((1 - p) * 7).toFixed(2)}px)`);
  if (glow) filters.push(`drop-shadow(0 0 8px ${glow})`);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * rise}px)`,
    filter: filters.length ? filters.join(" ") : undefined,
  };
};

const TextBand: React.FC<{ y: number; size: number; style?: CSSProperties; children: (baseline: number) => ReactNode }> = ({
  y,
  size,
  style,
  children,
}) => {
  const above = size * 1.45;
  const h = size * 2.1;
  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} style={{ position: "absolute", left: 0, top: y - above, overflow: "visible", ...style }}>
      {children(above)}
    </svg>
  );
};

export type LinesProps = {
  text: string;
  /** Baseline of the first line, composition px. */
  baseline: number;
  lineHeight: number;
  fontSize: number;
  at: number;
  stagger?: number;
  color: string;
  font?: string;
  weight?: number;
  italic?: boolean;
  letterSpacing?: number;
  cx?: number;
  align?: "start" | "middle" | "end";
  glow?: string;
  maxWidth?: number;
};

export const SOFT_GLOW = "rgba(255, 248, 238, 0.9)";

/** Centred multi-line text positioned by baseline; each line reveals in turn. */
export const Lines: React.FC<LinesProps> = ({
  text,
  baseline,
  lineHeight,
  fontSize,
  at,
  stagger = 9,
  color,
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
  const limit =
    maxWidth ??
    (align === "start" ? W - SIDE_MARGIN - cx : align === "end" ? cx - SIDE_MARGIN : 2 * Math.min(cx - SIDE_MARGIN, W - SIDE_MARGIN - cx));
  const css = `${italic ? "italic " : ""}${weight} ${fontSize}px ${font}`;
  const widest = ready ? Math.max(...lines.map((l) => measure(l, css, letterSpacing ?? 0))) : 0;
  const size = widest > limit ? (fontSize * limit) / widest : fontSize;
  return (
    <>
      {lines.map((line, i) => (
        <TextBand key={i} y={baseline + i * lineHeight} size={fontSize} style={revealStyle(frame, at + i * stagger, 40, 12, glow)}>
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

/** Width the given text would take (0 until the fonts are in). */
export function useTextWidth(text: string, cssFont: string, letterSpacing = 0): number {
  const ready = useFontsReady();
  return ready ? measure(text, cssFont, letterSpacing) : 0;
}

// ------------------------------------------------------------------ vertical layout

/**
 * Vertical rhythm of a screen. Each item has a height (its visual extent: cap height for
 * capitals, ascender-to-descender for mixed text) and the gap above it. The block is
 * centred in the screen's open "zone" (from the asset manifest), slightly above centre.
 */
export type StackItem = { h: number; gap?: number };

export function stack(zone: [number, number], items: StackItem[], { bias = 0.46, fill = 0.72, maxSpread = 1.6 } = {}): number[] {
  // the gaps open up (to at most maxSpread x) so the block fills ~`fill` of a tall zone
  const heights = items.reduce((s, it) => s + it.h, 0);
  const gaps = items.reduce((s, it, i) => s + (i ? it.gap ?? 0 : 0), 0);
  const spread = gaps > 0 ? Math.min(maxSpread, Math.max(1, (fill * (zone[1] - zone[0]) - heights) / gaps)) : 1;
  const total = heights + gaps * spread;
  let y = zone[0] + Math.max(0, zone[1] - zone[0] - total) * bias;
  return items.map((it, i) => {
    if (i) y += (it.gap ?? 0) * spread;
    const top = y;
    y += it.h;
    return top;
  });
}

/** Item heights (and baseline offsets) for a text block. */
export const caps = (size: number) => ({ h: size * 0.7, base: size * 0.7 });
export const mixed = (size: number, lines = 1, lineHeight = 0) => ({ h: size * 0.98 + (lines - 1) * lineHeight, base: size * 0.74 });

// ------------------------------------------------------------------ ornaments

/** Thin rule with a lotus in the middle (as in the artwork); the rule draws outward. */
export const LotusDivider: React.FC<{ y: number; cx?: number; half: number; at: number; color: string; size?: number; dur?: number }> = ({
  y,
  cx = 540,
  half,
  at,
  color,
  size = 54,
  dur = 46,
}) => {
  const frame = useRevealFrame();
  const draw = progress(frame, at + 6, dur, EASE_IN_OUT);
  const orn = progress(frame, at, 24);
  const gap = size * 0.62;
  const len = Math.max(0, half - gap);
  const id = `lotus-${Math.round(y)}-${Math.round(cx)}-${Math.round(half)}`;
  return (
    <svg
      width={half * 2}
      height={size}
      viewBox={`${-half} ${-size / 2} ${half * 2} ${size}`}
      style={{ position: "absolute", left: cx - half, top: y - size / 2, overflow: "visible", filter: `drop-shadow(0 0 5px ${SOFT_GLOW})` }}
    >
      <defs>
        {[
          ["r", "0", "1"],
          ["l", "1", "0"],
        ].map(([k, x1, x2]) => (
          <linearGradient key={k} id={`${id}-${k}`} x1={x1} x2={x2}>
            <stop offset="0" stopColor={color} stopOpacity="1" />
            <stop offset="0.75" stopColor={color} stopOpacity="0.8" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {/* the rule, with a small teardrop flourish where it meets the lotus */}
      <rect x={gap} y={-1.3} width={len * draw} height={2.6} fill={`url(#${id}-r)`} />
      <rect x={-gap - len * draw} y={-1.3} width={len * draw} height={2.6} fill={`url(#${id}-l)`} />
      <g opacity={orn} fill={color}>
        <path d={`M${gap - 2},0 C${gap + 8},-5 ${gap + 18},-4 ${gap + 26},0 C${gap + 18},4 ${gap + 8},5 ${gap - 2},0Z`} />
        <path d={`M${-gap + 2},0 C${-gap - 8},-5 ${-gap - 18},-4 ${-gap - 26},0 C${-gap - 18},4 ${-gap - 8},5 ${-gap + 2},0Z`} />
      </g>
      <g opacity={orn} transform={`scale(${(size / 54) * (0.75 + 0.25 * orn)})`} fill={color}>
        <Lotus />
      </g>
    </svg>
  );
};

/** A small lotus: five petals on a little base, ~44 x 40 around (0, 0). */
const Lotus: React.FC = () => (
  <g>
    <path d="M0,-17 C5.5,-10 6,-3 0,4 C-6,-3 -5.5,-10 0,-17Z" />
    <path d="M1.5,3 C5,-6 11,-11 16,-11 C15,-3 10,3 1.5,4Z" />
    <path d="M-1.5,3 C-5,-6 -11,-11 -16,-11 C-15,-3 -10,3 -1.5,4Z" />
    <path d="M2,5 C9,0 17,-2 22,0 C18,5 10,7 2,6Z" opacity={0.85} />
    <path d="M-2,5 C-9,0 -17,-2 -22,0 C-18,5 -10,7 -2,6Z" opacity={0.85} />
    <path d="M-9,8 C-4,6 4,6 9,8 C5,11 -5,11 -9,8Z" />
    <circle cx={0} cy={-3} r={1.6} fill="#FFF4E4" />
  </g>
);

// ------------------------------------------------------------------ icons

export const Icon: React.FC<{ cx: number; cy: number; size?: number; at: number; color: string; kind: "calendar" | "clock" | "pin" }> = ({
  cx,
  cy,
  size = 50,
  at,
  color,
  kind,
}) => {
  const frame = useRevealFrame();
  const p = progress(frame, at, 32);
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
        filter: `drop-shadow(0 0 5px ${SOFT_GLOW})`,
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
        <g fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round">
          <circle r={9.5} />
          <path d="M0,-5.5 V0 H4.5" />
        </g>
      )}
      {kind === "pin" && (
        <g>
          <path d="M0,11 C-3,6 -8,1 -8,-3.5 A8,8 0 1 1 8,-3.5 C8,1 3,6 0,11Z" fill={color} />
          <circle cx={0} cy={-3.5} r={3} fill="#FFF4E4" />
        </g>
      )}
    </svg>
  );
};

/**
 * An icon followed by its text, the pair centred on the card as one unit (as in the
 * artwork). Multi-line text keeps its lines left-aligned under the first.
 */
export const IconRow: React.FC<{
  kind: "calendar" | "clock" | "pin";
  text: string;
  baseline: number;
  size: number;
  lineHeight?: number;
  at: number;
  color: string;
  font?: string;
  weight?: number;
  iconSize?: number;
  letterSpacing?: number;
}> = ({ kind, text, baseline, size, lineHeight = size * 1.3, at, color, font = SERIF, weight = 500, iconSize, letterSpacing = 0.5 }) => {
  const lines = text.split("\n");
  const css = `${weight} ${size}px ${font}`;
  const ready = useFontsReady();
  const widest = ready ? Math.max(...lines.map((l) => measure(l, css, letterSpacing))) : 0;
  const ic = iconSize ?? size * 1.15;
  const gap = size * 0.7;
  const maxText = W - 2 * SIDE_MARGIN - ic - gap;
  const fit = widest > maxText ? maxText / widest : 1;
  const total = ic + gap + widest * fit;
  const left = (W - total) / 2;
  const textX = left + ic + gap;
  const iconY = baseline - size * 0.34 + ((lines.length - 1) * lineHeight) / 2;
  return (
    <>
      <Icon kind={kind} cx={left + ic / 2} cy={iconY} size={ic} at={at} color={color} />
      <Lines
        text={text}
        baseline={baseline}
        lineHeight={lineHeight}
        fontSize={size * fit}
        at={at + 3}
        stagger={6}
        color={color}
        font={font}
        weight={weight}
        cx={textX}
        align="start"
        letterSpacing={letterSpacing}
        maxWidth={maxText + 2}
      />
    </>
  );
};

// ------------------------------------------------------------------ sparkle

/** A soft four-point twinkle (bulbs, stars, glints on water). */
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
        <radialGradient id="hs-tw-glow">
          <stop offset="0" stopColor={color} stopOpacity="0.9" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={0.55} fill="url(#hs-tw-glow)" />
      <path d="M0,-1 C0.06,-0.15 0.15,-0.06 1,0 C0.15,0.06 0.06,0.15 0,1 C-0.06,0.15 -0.15,0.06 -1,0 C-0.15,-0.06 -0.06,-0.15 0,-1Z" fill={color} />
    </svg>
  );
};

/** A soft round glow (lantern light, haze). */
export const Glow: React.FC<{ x: number; y: number; r: number; color: string; opacity: number; blend?: CSSProperties["mixBlendMode"] }> = ({
  x,
  y,
  r,
  color,
  opacity,
  blend = "screen",
}) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle closest-side, ${color} 0%, ${color.replace(/[\d.]+\)$/, "0.35)")} 35%, ${color.replace(/[\d.]+\)$/, "0)")} 100%)`,
      mixBlendMode: blend,
      opacity,
    }}
  />
);
