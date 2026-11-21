import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Center, OutwardRule, Stage, Tracked, easedStops, ramp } from "./shared";

export default function Frame05({ data }: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { palette, id } = useTheme();
  const light = id === "light";
  const beam = light ? palette.accent : palette.primary;

  const spot = ramp(frame, 0, 30);
  const spotScale = ramp(frame, 0, 30, 0.9, 1);
  const closing = ramp(frame, 20, 45);
  const closingScale = ramp(frame, 20, 45, 0.94, 1);
  const rule = ramp(frame, 35, 55);
  const diamond = ramp(frame, 45, 55);
  const venueOpacity = ramp(frame, 45, 70);

  return (
    <Stage duration={75} vignette={[0.35, 0.35, 0, 1]}>
      <AbsoluteFill style={{ opacity: spot, transform: `scale(${spotScale})`, transformOrigin: "50% 0%" }}>
        {/* Light pool at the top and the beam falling from it */}
        <div
          style={{
            position: "absolute",
            left: width / 2 - 700,
            top: -700,
            width: 1400,
            height: 1400,
            background: `radial-gradient(circle closest-side, ${easedStops(beam, 0.4)})`,
          }}
        />
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", left: 0, top: 0, filter: "blur(28px)" }}
        >
          <defs>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={beam} stopOpacity={0.4} />
              <stop offset="0.5" stopColor={beam} stopOpacity={0.14} />
              <stop offset="1" stopColor={beam} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={`${width / 2 - 60},0 ${width / 2 + 60},0 ${width / 2 + 460},1250 ${width / 2 - 460},1250`} fill="url(#beam)" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: width / 2 - 800,
            top: height / 2 - 800,
            width: 1600,
            height: 1600,
            background: `radial-gradient(circle closest-side, ${easedStops(beam, 0.16)})`,
          }}
        />
      </AbsoluteFill>

      <Center>
        <Tracked
          size={64}
          spacing={0.15}
          color={palette.primary}
          serif
          opacity={closing}
          style={{ transform: `scale(${closingScale})` }}
        >
          {data.closingLine}
        </Tracked>
        <div style={{ position: "relative", margin: "56px 0" }}>
          <OutwardRule width={400} progress={rule} color={palette.primary} strokeWidth={1} />
          <svg
            width={24}
            height={24}
            viewBox="-12 -12 24 24"
            style={{ position: "absolute", left: 188, top: -11, opacity: diamond }}
          >
            <polygon points="0,-8 8,0 0,8 -8,0" fill={palette.primary} />
          </svg>
        </div>
        <div style={{ marginTop: 160, display: "flex", flexDirection: "column", gap: 14 }}>
          <Tracked size={32} spacing={0.25} color={palette.primary} opacity={venueOpacity}>
            {data.venueName},
          </Tracked>
          <Tracked size={32} spacing={0.25} color={palette.primary} opacity={venueOpacity}>
            {data.city}
          </Tracked>
        </div>
      </Center>
    </Stage>
  );
}
