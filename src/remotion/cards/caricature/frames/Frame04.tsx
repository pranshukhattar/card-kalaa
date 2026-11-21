import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, SANS, Stage, alpha, ramp, useEnter } from "./shared";
import { useCurrentFrame } from "remotion";

const DURATION = 90;

// Mehndi dots in the hand's local space (wrist at origin, fingers pointing +x).
const flowerDots = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 8;
  return { x: 190 + Math.cos(a) * 34, y: Math.sin(a) * 34, r: 6 };
});
const rowDots = [250, 276, 302, 328].flatMap((x) => [
  { x, y: -26, r: 4 },
  { x, y: 0, r: 5 },
  { x, y: 26, r: 4 },
]);
const wristDots = [80, 108, 136].map((x) => ({ x, y: 0, r: 4 }));
const mehndi = [{ x: 190, y: 0, r: 11 }, ...flowerDots, ...rowDots, ...wristDots];

const Hand: React.FC<{ fill: string; cuff: string }> = ({ fill, cuff }) => (
  <>
    <ellipse cx={200} cy={-92} rx={70} ry={32} transform="rotate(-25 200 -92)" fill={fill} />
    <path
      d="M0,-80 L220,-80 C340,-80 380,-40 380,0 C380,40 340,80 220,80 L0,80 Z"
      fill={fill}
    />
    <rect x={-10} y={-92} width={56} height={184} rx={14} fill={cuff} />
  </>
);

export default function Frame04({ data }: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { palette } = useTheme();

  const slide = useEnter(0, 35);
  const dotsOpacity = ramp(frame, 30, 50);
  const textOpacity = ramp(frame, 45, 70);

  const leftX = 250 + (1 - slide) * -700;
  const rightX = 830 + (1 - slide) * 700;

  return (
    <Stage duration={DURATION} glowY={42}>
      <Canvas>
        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <g transform={`translate(${rightX} 900) scale(-1 1)`}>
          <Hand fill={palette.secondary} cuff={palette.accent} />
        </g>
        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <g transform={`translate(${leftX} 800)`}>
          <Hand fill={palette.primary} cuff={palette.accent} />
          <g fill={palette.text} opacity={dotsOpacity * 0.85}>
            {mehndi.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} />
            ))}
          </g>
        </g>
        <g fill={palette.accent} opacity={ramp(frame, 20, 50) * 0.6}>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={440 + i * 50} cy={1120} r={i === 2 ? 7 : 4} />
          ))}
        </g>
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1250,
          textAlign: "center",
          fontFamily: SANS,
          fontVariant: "small-caps",
          color: palette.text,
          opacity: textOpacity,
          textShadow: `0 2px 16px ${alpha(palette.background, 0.5)}`,
        }}
      >
        <div style={{ fontSize: 42, letterSpacing: 8, lineHeight: 1.4 }}>{data.venueName}</div>
        <div style={{ fontSize: 34, letterSpacing: 8, lineHeight: 1.6, opacity: 0.85 }}>
          {data.city}
        </div>
      </div>
    </Stage>
  );
}
