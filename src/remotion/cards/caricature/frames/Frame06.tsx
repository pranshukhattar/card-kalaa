import { interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CaricatureData } from "../types";
import { Canvas, Figure, SANS, SERIF, Stage, alpha, ramp, useEnter } from "./shared";

const DURATION = 120;

export default function Frame06({ data }: { data: CaricatureData }) {
  const frame = useCurrentFrame();
  const { palette } = useTheme();

  const border = interpolate(frame, [0, 40], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inviteOpacity = ramp(frame, 20, 40);
  const namesEnter = useEnter(30, 30);
  const namesScale = 0.85 + 0.15 * namesEnter;
  const namesOpacity = ramp(frame, 30, 45);
  const dateOpacity = ramp(frame, 50, 70);
  const figureRise = useEnter(40, 30);
  const figureOpacity = ramp(frame, 40, 60);
  const venueOpacity = ramp(frame, 80, 110) * 0.6;

  const nameStyle = {
    fontFamily: SERIF,
    fontSize: 160,
    lineHeight: 1.05,
    letterSpacing: 4,
    color: palette.accent,
  } as const;

  return (
    <Stage duration={DURATION} glowY={40}>
      <Canvas>
        <rect
          x={60}
          y={60}
          width={960}
          height={1800}
          fill="none"
          stroke={palette.accent}
          strokeWidth={1}
          strokeOpacity={0.4}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={border}
        />

        {/* ILLUSTRATION PLACEHOLDER — replace with real character illustration before shipping */}
        <Figure
          kind="groom"
          x={455}
          y={1630 + (1 - figureRise) * 80}
          scale={0.9}
          opacity={figureOpacity}
        />
        <Figure
          kind="bride"
          x={625}
          y={1630 + (1 - figureRise) * 80}
          scale={0.9}
          opacity={figureOpacity}
        />

        <g opacity={dateOpacity}>
          <line x1={390} y1={1005} x2={510} y2={1005} stroke={palette.accent} strokeWidth={2} />
          <line x1={570} y1={1005} x2={690} y2={1005} stroke={palette.accent} strokeWidth={2} />
          <polygon points="540,993 552,1005 540,1017 528,1005" fill={palette.accent} />
        </g>
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 290,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 32,
          letterSpacing: 14,
          color: palette.text,
          opacity: inviteOpacity,
        }}
      >
        YOU ARE INVITED
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 380,
          textAlign: "center",
          opacity: namesOpacity,
          transform: `scale(${namesScale})`,
        }}
      >
        <div style={nameStyle}>{data.groomName}</div>
        <div style={{ ...nameStyle, fontSize: 100, color: palette.primary, fontStyle: "italic" }}>&amp;</div>
        <div style={nameStyle}>{data.brideName}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
          textAlign: "center",
          fontFamily: SANS,
          fontVariant: "small-caps",
          fontSize: 42,
          letterSpacing: 8,
          color: palette.text,
          opacity: dateOpacity,
        }}
      >
        {data.weddingDate}
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1720,
          textAlign: "center",
          fontFamily: SANS,
          fontVariant: "small-caps",
          letterSpacing: 8,
          color: palette.text,
          opacity: venueOpacity,
          textShadow: `0 2px 12px ${alpha(palette.background, 0.5)}`,
        }}
      >
        <div style={{ fontSize: 36, lineHeight: 1.4 }}>{data.venueName}</div>
        <div style={{ fontSize: 32, lineHeight: 1.4 }}>{data.city}</div>
      </div>
    </Stage>
  );
}
