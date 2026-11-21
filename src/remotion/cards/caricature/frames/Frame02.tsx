import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, Figure, SERIF, Stage, alpha, ramp } from "./shared";

const DURATION = 90;

const clusters = [
  { x: 130, y: 300, r: 70 },
  { x: 930, y: 380, r: 85 },
  { x: 90, y: 760, r: 60 },
  { x: 1000, y: 880, r: 70 },
  { x: 160, y: 1420, r: 90 },
  { x: 920, y: 1500, r: 75 },
  { x: 480, y: 1700, r: 65 },
  { x: 820, y: 220, r: 50 },
];
const petals = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 6;
  return { dx: Math.cos(a), dy: Math.sin(a) };
});

export default function Frame02(_: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette } = useTheme();

  const draw = interpolate(frame, [0, 25], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const figureOpacity = ramp(frame, 15, 40);
  const bob = Math.sin((frame / fps) * Math.PI) * 4; // 0.5 Hz
  const textOpacity = ramp(frame, 35, 60);
  const flowerOpacity = ramp(frame, 0, 20);

  const line = {
    fill: "none",
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: draw,
    strokeLinecap: "round" as const,
  };

  return (
    <Stage duration={DURATION} glowY={58}>
      <Canvas>
        <g opacity={flowerOpacity}>
          {clusters.map((c, i) => (
            <g key={i}>
              {petals.map((p, j) => (
                <circle
                  key={j}
                  cx={c.x + p.dx * c.r * 0.5}
                  cy={c.y + p.dy * c.r * 0.5}
                  r={c.r * 0.5}
                  fill={palette.primary}
                  opacity={0.18}
                />
              ))}
              <circle cx={c.x} cy={c.y} r={c.r * 0.3} fill={palette.accent} opacity={0.25} />
            </g>
          ))}
        </g>

        <path d="M 200 400 H 880" stroke={palette.secondary} strokeWidth={14} {...line} />
        <path d="M 300 400 L 300 1095" stroke={palette.accent} strokeWidth={5} {...line} />
        <path d="M 780 400 L 780 1095" stroke={palette.accent} strokeWidth={5} {...line} />
        <path d="M 270 1090 Q 540 1140 810 1090" stroke={palette.secondary} strokeWidth={18} {...line} />

        <g transform={`translate(0 ${bob})`}>
          {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
          <Figure kind="groom" x={440} y={1212} scale={1.2} seated opacity={figureOpacity} />
          <Figure kind="bride" x={640} y={1212} scale={1.2} seated opacity={figureOpacity} />
        </g>
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1400,
          textAlign: "center",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 84,
          letterSpacing: 3,
          color: palette.primary,
          opacity: textOpacity,
          textShadow: `0 2px 18px ${alpha(palette.background, 0.6)}`,
          transform: `translateY(${interpolate(textOpacity, [0, 1], [20, 0])}px)`,
        }}
      >
        are getting married
      </div>
    </Stage>
  );
}
