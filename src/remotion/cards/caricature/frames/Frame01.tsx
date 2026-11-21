import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, Figure, SERIF, Stage, alpha, ramp, useEnter } from "./shared";

const DURATION = 90;
const ARCH_CX = 540;
const ARCH_CY = 1010;
const ARCH_R = 400;
const FLOWER_COUNT = 15;

const archFlowers = Array.from({ length: FLOWER_COUNT }, (_, i) => {
  const a = Math.PI + (Math.PI * i) / (FLOWER_COUNT - 1);
  return { x: ARCH_CX + ARCH_R * Math.cos(a), y: ARCH_CY + ARCH_R * Math.sin(a) };
});
const innerBuds = Array.from({ length: 11 }, (_, i) => {
  const a = Math.PI + (Math.PI * (i + 0.5)) / 11;
  return { x: ARCH_CX + (ARCH_R - 70) * Math.cos(a), y: ARCH_CY + (ARCH_R - 70) * Math.sin(a) };
});
const legFlowers = [1, 2, 3].flatMap((k) => [
  { x: ARCH_CX - ARCH_R, y: ARCH_CY + 80 * k },
  { x: ARCH_CX + ARCH_R, y: ARCH_CY + 80 * k },
]);

export default function Frame01({ data }: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette } = useTheme();

  const archOpacity = ramp(frame, 0, 20);
  const rise = useEnter(10, 25);
  const figureOpacity = ramp(frame, 10, 25);
  const heartOpacity = ramp(frame, 10, 30);
  const heartScale = 1.04 + 0.04 * Math.sin((frame / fps) * Math.PI * 1.6);
  const namesOpacity = ramp(frame, 30, 50);
  const namesShift = interpolate(namesOpacity, [0, 1], [20, 0]);
  const figureY = 1290 + (1 - rise) * 60;

  return (
    <Stage duration={DURATION} glowY={55}>
      <Canvas>
        <g opacity={archOpacity}>
          {innerBuds.map((p, i) => (
            <circle key={`bud-${i}`} cx={p.x} cy={p.y} r={16} fill={palette.primary} opacity={0.85} />
          ))}
          {[...archFlowers, ...legFlowers].map((p, i) => (
            <g key={`marigold-${i}`}>
              <circle cx={p.x} cy={p.y} r={38} fill={palette.accent} />
              <circle cx={p.x} cy={p.y} r={24} fill={palette.secondary} opacity={0.9} />
              <circle cx={p.x} cy={p.y} r={9} fill={palette.accent} />
            </g>
          ))}
        </g>

        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <Figure
          kind="groom"
          x={420}
          y={figureY}
          scale={1.15}
          opacity={figureOpacity}
        />
        <Figure
          kind="bride"
          x={660}
          y={figureY}
          scale={1.15}
          opacity={figureOpacity}
        />

        <g
          opacity={heartOpacity}
          transform={`translate(540 1030) scale(${0.65 * heartScale})`}
        >
          <path
            d="M0,30 C-50,-5 -30,-40 0,-15 C30,-40 50,-5 0,30 Z"
            fill={palette.primary}
            stroke={alpha(palette.accent, 0.8)}
            strokeWidth={3}
          />
        </g>
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1440,
          textAlign: "center",
          fontFamily: SERIF,
          fontSize: 96,
          lineHeight: 1.15,
          letterSpacing: 6,
          color: palette.accent,
          opacity: namesOpacity,
          transform: `translateY(${namesShift}px)`,
        }}
      >
        {data.groomName} &amp; {data.brideName}
      </div>
    </Stage>
  );
}
