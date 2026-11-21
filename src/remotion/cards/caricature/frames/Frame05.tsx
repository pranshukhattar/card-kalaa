import { useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, Figure, SERIF, Stage, ramp } from "./shared";

const DURATION = 90;
const CONFETTI_COUNT = 36;
const FALL_FRAMES = 180;

// Deterministic PRNG so confetti is identical on every render.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SHAPES = ["circle", "triangle", "rect"] as const;
const COLORS = ["primary", "secondary", "accent", "text"] as const;

const rand = mulberry32(20261212);
const confetti = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  x: rand() * 1080,
  offset: Math.floor(rand() * FALL_FRAMES),
  size: 8 + rand() * 12,
  sway: 10 + rand() * 30,
  spin: (rand() - 0.5) * 12,
  shape: SHAPES[i % SHAPES.length],
  color: COLORS[Math.floor(rand() * COLORS.length)],
}));

export default function Frame05({ data }: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette } = useTheme();

  const figureOpacity = ramp(frame, 0, 30);
  const confettiOpacity = ramp(frame, 0, 10);
  const textOpacity = ramp(frame, 60, 90) * 0.8;
  const wave = Math.sin((frame / fps) * Math.PI * 2 * 1.5) * 12;

  return (
    <Stage duration={DURATION} glowY={60}>
      <Canvas>
        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <Figure
          kind="groom"
          x={370}
          y={1300}
          scale={1.4}
          leftArm="up"
          wave={wave}
          opacity={figureOpacity}
        />
        <Figure
          kind="bride"
          x={710}
          y={1300}
          scale={1.4}
          rightArm="up"
          wave={wave}
          opacity={figureOpacity}
        />

        <g opacity={confettiOpacity}>
          {confetti.map((c, i) => {
            const t = (frame + c.offset) % FALL_FRAMES;
            const y = -100 + (t / FALL_FRAMES) * 2100;
            const x = c.x + Math.sin((t / FALL_FRAMES) * Math.PI * 2) * c.sway;
            const fill = palette[c.color];
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${frame * c.spin})`} fill={fill}>
                {c.shape === "circle" && <circle r={c.size / 2} />}
                {c.shape === "triangle" && (
                  <polygon points={`0,${-c.size / 2} ${c.size / 2},${c.size / 2} ${-c.size / 2},${c.size / 2}`} />
                )}
                {c.shape === "rect" && <rect x={-c.size / 2} y={-c.size / 4} width={c.size} height={c.size / 2} />}
              </g>
            );
          })}
        </g>
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          top: 1560,
          textAlign: "center",
          fontFamily: SERIF,
          fontSize: 46,
          lineHeight: 1.4,
          letterSpacing: 1,
          color: palette.text,
          opacity: textOpacity,
        }}
      >
        {data.parentsLine}
      </div>
    </Stage>
  );
}
