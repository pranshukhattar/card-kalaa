import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Center, Stage, Tracked, ramp } from "./shared";

const DURATION = 90;
// Teardrop petal, ~60px tall, centred on the origin.
const PETAL_PATH = "M0,-30 C20,-20 26,10 4,30 C-18,24 -26,-6 0,-30 Z";

export default function Frame03(_: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();

  const textOpacity = ramp(frame, 0, 25) * ramp(frame, 60, 90, 1, 0);
  const petalX = width / 2 + 60 * Math.sin((2 * Math.PI * frame) / 120);
  const petalY = interpolate(frame, [0, DURATION], [-80, height + 80]);
  const petalRotation = 25 * Math.sin((Math.PI * frame) / DURATION);

  return (
    <Stage duration={DURATION} vignette={[0.6, 0.7, 0, DURATION]}>
      <Center>
        <Tracked size={46} spacing={0.5} color={theme.palette.primary} opacity={textOpacity}>
          ONE CELEBRATION
        </Tracked>
      </Center>
      <AbsoluteFill>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(${petalX} ${petalY}) rotate(${petalRotation})`}>
            <path d={PETAL_PATH} fill={theme.palette.secondary} opacity={0.8} />
          </g>
        </svg>
      </AbsoluteFill>
    </Stage>
  );
}
