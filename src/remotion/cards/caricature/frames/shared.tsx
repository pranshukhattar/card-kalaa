import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../ThemeContext";

export const W = 1080;
export const H = 1920;

// next/font cannot run inside the Remotion bundle and no network fetches are allowed,
// so these are font stacks that fall back to system faces.
export const SERIF = '"Playfair Display", "Cormorant Garamond", Georgia, "Times New Roman", serif';
export const SANS = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Appends an alpha channel to a #RRGGBB palette colour. */
export const alpha = (hex: string, a: number): string =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

/** 0 -> 1 linear ramp between two frames, clamped. */
export const ramp = (frame: number, start: number, end: number): number =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Spring entrance 0 -> 1 starting at `start`, settling over `duration` frames. */
export const useEnter = (start: number, duration: number): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: Math.max(0, frame - start),
    fps,
    durationInFrames: duration,
    config: { damping: 200 },
  });
};

type StageProps = {
  /** Length of this frame, used to place the closing fade. */
  duration: number;
  glowX?: number;
  glowY?: number;
  children: ReactNode;
};

/** Background, ambient glow and the closing 15-frame fade of the content layer. */
export const Stage: React.FC<StageProps> = ({ duration, glowX = 50, glowY = 55, children }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const { background, secondary } = theme.palette;
  const fadeOut = interpolate(frame, [duration - 15, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        backgroundImage: `linear-gradient(180deg, ${background} 0%, ${alpha(secondary, 0.14)} 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${glowX}%`,
          top: `${glowY}%`,
          width: 1300,
          height: 1300,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${alpha(secondary, 0.3)} 0%, ${alpha(secondary, 0)} 65%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: fadeOut }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Canvas: React.FC<{ children: ReactNode }> = ({ children }) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{ position: "absolute", left: 0, top: 0 }}
  >
    {children}
  </svg>
);

type ArmPose = "down" | "up" | "reach";

type FigureProps = {
  kind: "groom" | "bride";
  /** Position of the feet. */
  x: number;
  y: number;
  scale?: number;
  /** Arms are named by screen side. */
  leftArm?: ArmPose;
  rightArm?: ArmPose;
  seated?: boolean;
  /** Rotation in degrees applied to a raised arm. */
  wave?: number;
  opacity?: number;
};

const ARM_END: Record<ArmPose, [number, number]> = {
  down: [62, -170],
  up: [100, -410],
  reach: [65, -190],
};

/** Flat figure, roughly 420 units tall. Draw it inside a <Canvas>. */
export const Figure: React.FC<FigureProps> = ({
  kind,
  x,
  y,
  scale = 1,
  leftArm = "down",
  rightArm = "down",
  seated = false,
  wave = 0,
  opacity = 1,
}) => {
  const { palette } = useTheme();
  const bride = kind === "bride";
  const cloth = bride ? palette.accent : palette.primary;
  const skin = palette.text;
  const hair = palette.secondary;
  const legTop = -100;
  const legBottom = seated ? -30 : -8;

  const arm = (side: -1 | 1, pose: ArmPose) => {
    const [ex, ey] = ARM_END[pose];
    const angle = pose === "up" ? wave * side : 0;
    return (
      <g transform={`rotate(${angle} ${side * 50} -285)`}>
        <line
          x1={side * 50}
          y1={-285}
          x2={side * ex}
          y2={ey}
          stroke={cloth}
          strokeWidth={24}
          strokeLinecap="round"
        />
        <circle cx={side * ex} cy={ey} r={14} fill={skin} />
      </g>
    );
  };

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {!bride && (
        <>
          <rect x={-36} y={legTop} width={30} height={legBottom - legTop} rx={10} fill={hair} />
          <rect x={6} y={legTop} width={30} height={legBottom - legTop} rx={10} fill={hair} />
        </>
      )}
      {bride ? (
        <path d="M-45,-300 Q0,-318 45,-300 L85,-20 Q0,0 -85,-20 Z" fill={cloth} />
      ) : (
        <rect x={-50} y={-300} width={100} height={210} rx={36} fill={cloth} />
      )}
      {arm(-1, leftArm)}
      {arm(1, rightArm)}
      {bride && <rect x={-54} y={-402} width={108} height={112} rx={50} fill={hair} />}
      <circle cx={0} cy={-350} r={46} fill={skin} />
      {bride ? (
        <path d="M-46,-352 A46 46 0 0 1 46,-352 Q0,-380 -46,-352 Z" fill={hair} />
      ) : (
        <path d="M-46,-352 A46 46 0 0 1 46,-352 Q0,-376 -46,-352 Z" fill={hair} />
      )}
    </g>
  );
};
