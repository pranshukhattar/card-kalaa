import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN_OUT, EASE_OUT, Twinkle, progress, rand } from "./shared";

export type TransitionKind = "intro" | "crossfade" | "splash" | "wash" | "dusk";

const W = 1080;

/**
 * Wraps the INCOMING screen. Its Sequence starts `dur` frames before the previous screen
 * ends, so for those frames this draws on top of the outgoing screen.
 */
export const Transition: React.FC<{ kind: TransitionKind; dur: number; children: ReactNode }> = ({ kind, dur, children }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / dur);
  if (p >= 1 && kind !== "intro") return <AbsoluteFill>{children}</AbsoluteFill>;

  switch (kind) {
    case "intro":
      return <Intro p={p}>{children}</Intro>;
    case "crossfade":
      return <AbsoluteFill style={{ opacity: EASE_IN_OUT(p) }}>{children}</AbsoluteFill>;
    case "splash":
      return <Splash p={p}>{children}</Splash>;
    case "wash":
      return <Wash p={p}>{children}</Wash>;
    case "dusk":
      return <Dusk p={p}>{children}</Dusk>;
  }
};

// ------------------------------------------------------------------ intro: out of warm light

const Intro: React.FC<{ p: number; children: ReactNode }> = ({ p, children }) => {
  const e = EASE_OUT(p);
  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEFE3" }}>
      <AbsoluteFill style={{ opacity: e, transform: `scale(${1.05 - 0.05 * e})` }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(255,248,236,0.95), rgba(255,240,222,0) 70%)",
          opacity: 1 - e,
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ splash: watercolour blooms

/** Closed, smooth, wobbly blob around (cx, cy) as an SVG/CSS path string. */
const blobPath = (cx: number, cy: number, r: number, seed: number) => {
  const n = 48;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k =
      1 +
      0.13 * Math.sin(3 * a + seed * 5.1) +
      0.08 * Math.sin(5 * a + seed * 2.3) +
      0.05 * Math.sin(9 * a + seed * 7.7) +
      0.03 * Math.sin(15 * a + seed * 1.9);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  const mid = (i: number) => {
    const [x1, y1] = pts[i % n];
    const [x2, y2] = pts[(i + 1) % n];
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  };
  let d = `M${mid(0)[0].toFixed(1)},${mid(0)[1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [x, y] = pts[i % n];
    const [mx, my] = mid(i);
    d += ` Q${x.toFixed(1)},${y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  return d + "Z";
};

const BLOOMS = [
  { cx: 560, cy: 1250, delay: 0, max: 1700 },
  { cx: 230, cy: 640, delay: 0.1, max: 900 },
  { cx: 860, cy: 1950, delay: 0.16, max: 1000 },
  { cx: 880, cy: 420, delay: 0.24, max: 800 },
  { cx: 190, cy: 2150, delay: 0.3, max: 900 },
];

const Splash: React.FC<{ p: number; children: ReactNode }> = ({ p, children }) => {
  const H = useVideoConfig().height;
  const ky = H / 2624; // bloom centres were placed on the tall card
  // The colour blooms first; the new screen opens inside it a beat later.
  const radius = (b: (typeof BLOOMS)[number], lag: number) => {
    const q = interpolate(p, [b.delay + lag, 1 - (0.18 - lag)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return EASE_IN_OUT(q) * b.max;
  };
  const reveal = BLOOMS.map((b, i) => blobPath(b.cx, b.cy * ky, radius(b, 0.18), i + 1)).join(" ");
  const bloom = BLOOMS.map((b, i) => blobPath(b.cx, b.cy * ky, radius(b, 0) * 1.08, i + 7)).join(" ");
  const tint = 1 - progress(p * 100, 72, 28);
  return (
    <AbsoluteFill>
      {/* the pink wash that blooms ahead of the new screen */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: 0.9 * tint, filter: "blur(22px)" }}>
        <defs>
          <radialGradient id="splash-fill" cx="0.5" cy="0.48" r="0.75">
            <stop offset="0" stopColor="#FBDDE2" />
            <stop offset="0.45" stopColor="#F4B3C0" />
            <stop offset="0.8" stopColor="#EC90A5" />
            <stop offset="1" stopColor="#E27A93" />
          </radialGradient>
        </defs>
        <path d={bloom} fill="url(#splash-fill)" />
      </svg>
      <AbsoluteFill style={{ clipPath: `path('${reveal}')` }}>{children}</AbsoluteFill>
      {/* soften the opening edge with a blurred rim of the same pink */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: 0.85 * tint, filter: "blur(14px)" }}>
        <path d={reveal} fill="none" stroke="#F1A6B7" strokeWidth={46} />
      </svg>
      {/* a soft rose glaze over the new screen that fades as it settles */}
      <AbsoluteFill style={{ backgroundColor: "#F4B6C2", opacity: 0.35 * tint, mixBlendMode: "soft-light", clipPath: `path('${reveal}')` }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ wash: a golden sweep down

const Wash: React.FC<{ p: number; children: ReactNode }> = ({ p, children }) => {
  const H = useVideoConfig().height;
  const e = EASE_IN_OUT(p);
  const y = -260 + e * (H + 520);
  const edge = (x: number) => y + 46 * Math.sin(x / 140 + 1.3) + 22 * Math.sin(x / 61 + 4.1) + 12 * Math.sin(x / 23 + p * 6);
  let d = `M0,0 L${W},0`;
  for (let x = W; x >= 0; x -= 20) d += ` L${x},${edge(x).toFixed(1)}`;
  d += "Z";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `path('${d}')` }}>{children}</AbsoluteFill>
      {/* gilded edge */}
      <div
        style={{
          position: "absolute",
          left: -100,
          width: W + 200,
          top: y - 150,
          height: 300,
          background:
            "linear-gradient(180deg, rgba(236,190,115,0) 0%, rgba(236,190,115,0.9) 40%, rgba(255,232,180,1) 50%, rgba(226,170,95,0.9) 60%, rgba(226,170,95,0) 100%)",
          filter: "blur(16px)",
          opacity: 0.95,
        }}
      />
      {Array.from({ length: 26 }, (_, i) => {
        const x = rand(i + 3) * W;
        const yy = edge(x) + (rand(i + 50) - 0.5) * 120;
        return <Twinkle key={i} x={x} y={yy} size={8 + 10 * rand(i + 90)} intensity={0.9 * Math.sin(Math.PI * p)} color="#FFE9B8" />;
      })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ dusk: day sinks into night

const Dusk: React.FC<{ p: number; children: ReactNode }> = ({ p, children }) => {
  const sink = progress(p * 100, 0, 58, EASE_IN_OUT);
  const rise = progress(p * 100, 40, 60, EASE_IN_OUT);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: sink,
          background: "linear-gradient(180deg, #1A2540 0%, #2C3858 45%, #6B5470 80%, #B07A78 100%)",
        }}
      />
      <AbsoluteFill style={{ opacity: rise }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
