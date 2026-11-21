import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Stage, Tracked, easedStops, ramp } from "./shared";

const DURATION = 105;
// Palace body with a central arch cut out (even-odd), three domes on top.
const PALACE_BODY = "M120,1650 H960 V1920 H120 Z M470,1920 V1780 A70,70 0 0 1 610,1780 V1920 Z";
const DOME_CENTER = "M410,1650 C410,1520 480,1470 540,1440 C600,1470 670,1520 670,1650 Z";
const DOME_LEFT = "M180,1650 C180,1560 230,1530 270,1510 C310,1530 360,1560 360,1650 Z";
const DOME_RIGHT = "M720,1650 C720,1560 770,1530 810,1510 C850,1530 900,1560 900,1650 Z";

export default function Frame04({ data }: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();
  const { palette } = theme;

  const palaceShift = ramp(frame, 0, DURATION, 20, 0);
  const glowOpacity = 0.185 + 0.035 * Math.sin((2 * Math.PI * frame) / 90);
  const reveal = ramp(frame, 20, 70);
  const eased = Easing.out(Easing.cubic)(reveal);
  const nameScale = 0.9 + 0.1 * eased;
  const dateOpacity = ramp(frame, 60, 90) * 0.7;

  const name = { size: 140, spacing: 0.05, color: palette.primary, serif: true } as const;

  return (
    <Stage duration={DURATION} vignette={[0.7, 0.35, 0, 20]}>
      <AbsoluteFill style={{ filter: "blur(40px)" }}>
        <div
          style={{
            position: "absolute",
            left: width / 2 - 700,
            top: 1300 - 700,
            width: 1400,
            height: 1400,
            opacity: glowOpacity,
            background: `radial-gradient(circle closest-side, ${easedStops(palette.primary, 1)})`,
          }}
        />
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(0 ${palaceShift})`} fill={palette.secondary} fillOpacity={0.4}>
            <path d={PALACE_BODY} fillRule="evenodd" />
            <path d={DOME_CENTER} />
            <path d={DOME_LEFT} />
            <path d={DOME_RIGHT} />
          </g>
        </svg>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 520 }}>
        <div style={{ opacity: eased, transform: `scale(${nameScale})` }}>
          <Tracked {...name} style={{ lineHeight: 1.1 }}>
            {data.groomName}
          </Tracked>
          <Tracked size={60} spacing={0.05} color={palette.primary} serif style={{ lineHeight: 1.5 }}>
            &amp;
          </Tracked>
          <Tracked {...name} style={{ lineHeight: 1.1 }}>
            {data.brideName}
          </Tracked>
        </div>
        <Tracked
          size={48}
          spacing={0.3}
          color={palette.primary}
          opacity={dateOpacity}
          style={{ marginTop: 70 }}
        >
          {data.weddingDate}
        </Tracked>
      </AbsoluteFill>
    </Stage>
  );
}
