import { interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, Figure, SERIF, Stage, alpha, ramp, useEnter } from "./shared";

const DURATION = 90;
const BASE_Y = 1400;
const COLUMN_X = [300, 540, 780];
const RULE_W = 700;

const DiamondRule: React.FC<{ progress: number; color: string }> = ({ progress, color }) => {
  const mid = RULE_W / 2;
  const reach = (mid - 14) * progress;
  const d = (cx: number) => `${cx},4 ${cx + 8},12 ${cx},20 ${cx - 8},12`;
  return (
    <svg width={RULE_W} height={24} viewBox={`0 0 ${RULE_W} 24`}>
      <line x1={mid} y1={12} x2={mid - reach} y2={12} stroke={color} strokeWidth={2} />
      <line x1={mid} y1={12} x2={mid + reach} y2={12} stroke={color} strokeWidth={2} />
      <g fill={color} opacity={progress}>
        <polygon points={d(8)} />
        <polygon points={d(RULE_W - 8)} />
      </g>
    </svg>
  );
};

export default function Frame03({ data }: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { palette } = useTheme();

  const columns = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const baseOpacity = ramp(frame, 0, 10);
  const roofOpacity = ramp(frame, 25, 38);
  const figureOpacity = ramp(frame, 25, 45);
  const dateScale = 0.8 + 0.2 * useEnter(40, 30);
  const dateOpacity = ramp(frame, 40, 55);
  const rules = ramp(frame, 55, 75);

  return (
    <Stage duration={DURATION} glowY={62}>
      <Canvas>
        <rect x={220} y={BASE_Y} width={640} height={40} fill={palette.secondary} opacity={baseOpacity} />
        {COLUMN_X.map((cx) => (
          <g
            key={cx}
            transform={`translate(${cx} ${BASE_Y}) scale(1 ${columns}) translate(${-cx} ${-BASE_Y})`}
          >
            <rect x={cx - 32} y={BASE_Y - 380} width={64} height={380} fill={palette.primary} />
            <rect x={cx - 42} y={BASE_Y - 380} width={84} height={20} fill={palette.accent} />
            <rect x={cx - 42} y={BASE_Y - 20} width={84} height={20} fill={palette.accent} />
          </g>
        ))}
        <g opacity={roofOpacity}>
          <rect x={250} y={975} width={580} height={45} fill={palette.secondary} />
          <polygon points="230,975 540,830 850,975" fill={palette.secondary} />
          <polygon points="300,960 540,860 780,960" fill={alpha(palette.background, 0.35)} />
          <circle cx={540} cy={930} r={16} fill={palette.accent} />
        </g>

        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <Figure
          kind="groom"
          x={501}
          y={BASE_Y}
          scale={0.6}
          rightArm="reach"
          opacity={figureOpacity}
        />
        <Figure
          kind="bride"
          x={579}
          y={BASE_Y}
          scale={0.6}
          leftArm="reach"
          opacity={figureOpacity}
        />
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 330,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <DiamondRule progress={rules} color={palette.accent} />
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 100,
            lineHeight: 1.1,
            letterSpacing: 2,
            textAlign: "center",
            color: palette.accent,
            opacity: dateOpacity,
            transform: `scale(${dateScale})`,
          }}
        >
          {data.weddingDate}
        </div>
        <DiamondRule progress={rules} color={palette.accent} />
      </div>
    </Stage>
  );
}
