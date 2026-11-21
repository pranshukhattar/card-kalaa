import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Center, OutwardRule, Stage, Tracked, alpha, easedStops, ramp } from "./shared";

// Soft ghost discs along the line from the sun towards the lower left (fractions of the sun->centre vector).
const GHOSTS = [
  { t: 0.35, r: 70, a: 0.22 },
  { t: 0.55, r: 120, a: 0.14 },
  { t: 0.8, r: 50, a: 0.2 },
  { t: 1.15, r: 160, a: 0.1 },
];

export default function Frame02(_: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { palette, id } = useTheme();
  const light = id === "light";

  const textOpacity = ramp(frame, 10, 35);
  const spacing = ramp(frame, 10, 35, 0.35, 0.5);
  const ruleOpacity = ramp(frame, 40, 60) * 0.6;

  // The sun drifts slowly in from beyond the top-right corner and swells.
  const sunX = ramp(frame, 0, 75, width + 200, width - 30);
  const sunY = ramp(frame, 0, 75, -100, 10);
  const swell = ramp(frame, 0, 40, 0.5, 1);
  const blend = light ? "normal" : "screen";
  const core = light ? palette.accent : palette.text;
  const cx = width / 2 - sunX;
  const cy = height / 2 - sunY;

  const disc = (r: number, color: string, a: number, x: number, y: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        background: `radial-gradient(circle closest-side, ${easedStops(color, a)})`,
      }}
    />
  );

  return (
    <Stage duration={75} vignette={[0.5, 0.6, 0, 75]}>
      <AbsoluteFill style={{ mixBlendMode: blend, opacity: swell }}>
        {disc(1100, palette.accent, light ? 0.45 : 0.4, sunX, sunY, "wide")}
        {disc(560, palette.accent, 0.85, sunX, sunY, "mid")}
        {disc(240, core, 0.95, sunX, sunY, "core")}
        {GHOSTS.map((g, i) =>
          disc(g.r, i % 2 ? palette.primary : palette.accent, g.a, sunX + cx * g.t * 1.6, sunY + cy * g.t * 1.6, `g${i}`),
        )}
        {/* Anamorphic streak across the sun */}
        <div
          style={{
            position: "absolute",
            left: sunX - 900,
            top: sunY - 6,
            width: 1800,
            height: 12,
            background: `linear-gradient(90deg, ${alpha(core, 0)}, ${alpha(core, 0.35)} 50%, ${alpha(core, 0)})`,
            filter: "blur(5px)",
          }}
        />
      </AbsoluteFill>
      <Center>
        <Tracked size={42} spacing={spacing} color={palette.primary} opacity={textOpacity}>
          TWO FAMILIES
        </Tracked>
        <div style={{ marginTop: 48, opacity: ruleOpacity }}>
          <OutwardRule width={200} progress={1} color={palette.primary} strokeWidth={2} />
        </div>
      </Center>
    </Stage>
  );
}
