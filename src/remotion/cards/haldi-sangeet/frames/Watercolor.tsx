import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN_OUT, cardAsset } from "./shared";
import { inlined, useInlined } from "./WarpedPlate";

/**
 * Watercolour transitions. The incoming picture spreads over the outgoing one the way wet
 * paint spreads on paper: an irregular, organic edge (fractal noise added to an "arrival
 * time" field), a tint of pigment bleeding just ahead of it, and a slightly darker rim where
 * the pigment pools at the drying edge.
 *
 * It is one SVG filter applied to the incoming layer:
 *   v     = (1 - NOISE) * field + NOISE * noise         arrival time of every pixel
 *   image = SourceGraphic, alpha = clamp(S * (level - v))
 *   wash  = tint,          alpha = clamp(S * (level + LEAD - v)) * washOpacity
 *   rim   = pigment,       alpha = band just inside the edge
 */

export type WatercolorStyle = {
  /** Arrival-time field (public/cards/haldi-sangeet/fields/<name>.png): 0 arrives first. */
  field: "bloom" | "diagonal" | "rise" | "vignette";
  /** Pigment that bleeds ahead of the picture. */
  wash: string;
  washOpacity: number;
  /** Darker pigment pooled along the edge. */
  rim: string;
  rimOpacity: number;
  seed: number;
  /** Noise scale (feTurbulence base frequency) -- smaller = bigger blooms. */
  freq?: number;
  /** Edge crispness (higher = a harder, more watercolour-like edge). */
  sharp?: number;
  /** How much the noise shapes the edge (0 = a plain smooth sweep). */
  noise?: number;
};

const W = 1080;
const NOISE = 0.24; // a gently organic edge, not blotchy
const SHARP = 11; // a soft edge: 1/SHARP of the arrival range wide
const LEAD = 0.09; // how far the tint runs ahead of the picture
const RIM = 0.035; // rim width

/** alpha = clamp(k * (level - v)) from the R channel of v. */
const thresholdMatrix = (k: number, level: number) => `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${-k} 0 0 0 ${k * level}`;

export const WatercolorReveal: React.FC<{ p: number; style: WatercolorStyle; children: ReactNode }> = ({ p, style, children }) => {
  const { height: H } = useVideoConfig();
  const frame = useCurrentFrame();
  const fieldUrl = cardAsset(`fields/${style.field}.png`);
  const ready = useInlined([fieldUrl]);
  // v spans about [NOISE * 0.3, (1 - NOISE) + NOISE * 0.7]; sweep the level across it all
  const sharp = style.sharp ?? SHARP;
  const NZ = style.noise ?? NOISE;
  const lo = NZ * 0.25 - LEAD - 0.02;
  const hi = 1 - NZ + NZ * 0.75 + 1 / sharp + RIM;
  const level = lo + (hi - lo) * EASE_IN_OUT(Math.min(1, Math.max(0, p)));
  const id = `hs-wc-${style.field}-${style.seed}`;
  if (!ready) return <AbsoluteFill style={{ opacity: 0 }}>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter
            id={id}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x={-60}
            y={-60}
            width={W + 120}
            height={H + 120}
            colorInterpolationFilters="sRGB"
          >
            <feImage href={inlined(fieldUrl)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result="field" />
            <feTurbulence type="fractalNoise" baseFrequency={style.freq ?? 0.0042} numOctaves={4} seed={style.seed} result="n0" />
            {/* the bloom edge keeps creeping a little while it spreads */}
            <feOffset in="n0" dx={(frame * 0.7) % 400} dy={(frame * 0.4) % 400} result="n1" />
            <feColorMatrix in="n1" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="noise" />
            <feComposite in="field" in2="noise" operator="arithmetic" k1={0} k2={1 - NZ} k3={NZ} k4={0} result="v" />

            <feColorMatrix in="v" type="matrix" values={thresholdMatrix(sharp, level)} result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" result="image" />

            <feColorMatrix in="v" type="matrix" values={thresholdMatrix(sharp * 0.7, level + LEAD)} result="leadMask" />
            <feFlood floodColor={style.wash} floodOpacity={style.washOpacity} result="washColor" />
            <feComposite in="washColor" in2="leadMask" operator="in" result="wash" />

            <feColorMatrix in="v" type="matrix" values={thresholdMatrix(sharp * 2.2, level)} result="r1" />
            <feColorMatrix in="v" type="matrix" values={thresholdMatrix(sharp * 2.2, level - RIM)} result="r2" />
            <feComposite in="r1" in2="r2" operator="out" result="rimMask" />
            <feGaussianBlur in="rimMask" stdDeviation={2.5} result="rimSoft" />
            <feFlood floodColor={style.rim} floodOpacity={style.rimOpacity} result="rimColor" />
            <feComposite in="rimColor" in2="rimSoft" operator="in" result="rim" />

            <feMerge>
              <feMergeNode in="wash" />
              <feMergeNode in="image" />
              <feMergeNode in="rim" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the card's transitions

export type TransitionKind = "fromBlack" | "toHaldi" | "toSangeet" | "toNight";

const STYLES: Record<TransitionKind, WatercolorStyle> = {
  // the first picture blooms out of the dark from the middle
  fromBlack: { field: "bloom", wash: "#F3C6BE", washOpacity: 0, rim: "#E8A7B0", rimOpacity: 0.1, seed: 3, sharp: 9, noise: 0.2 },
  // a golden haldi wash runs down across the rose-pink intro
  toHaldi: { field: "diagonal", wash: "#F7C65A", washOpacity: 0.26, rim: "#E39A2B", rimOpacity: 0.1, seed: 7 },
  // rose and lilac pigment rises up through the gold
  toSangeet: { field: "rise", wash: "#EFA3C4", washOpacity: 0.24, rim: "#B970A6", rimOpacity: 0.09, seed: 11 },
  // evening falls: deep blue bleeds down from the sky
  toNight: { field: "diagonal", wash: "#6875B6", washOpacity: 0.28, rim: "#46509A", rimOpacity: 0.1, seed: 19, freq: 0.0036 },
};

/**
 * Wraps the INCOMING screen. Its Sequence starts `dur` frames before the previous screen
 * ends, so for those frames this draws on top of the outgoing screen.
 */
export const Transition: React.FC<{ kind: TransitionKind; dur: number; children: ReactNode }> = ({ kind, dur, children }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / dur);
  if (kind === "fromBlack") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {/* a plain, slow fade up from black with a gentle settle: any soft watercolour edge
            over black reads as smoke, so the watercolour bleeds are kept for screen changes */}
        <AbsoluteFill style={{ opacity: EASE_IN_OUT(p), transform: `scale(${1.025 - 0.025 * EASE_IN_OUT(p)})` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <WatercolorReveal p={p} style={STYLES[kind]}>
      {children}
    </WatercolorReveal>
  );
};

/** The very end: a slow, plain fade to black, then a short hold. */
export const EndToBlack: React.FC<{ start: number; dur: number }> = ({ start, dur }) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const p = Math.min(1, (frame - start) / dur);
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity: EASE_IN_OUT(p) }} />;
};
