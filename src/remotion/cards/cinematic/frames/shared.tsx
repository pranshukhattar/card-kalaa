import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../ThemeContext";

// next/font cannot run inside the Remotion bundle and no network fetches are allowed,
// so these are font stacks that fall back to system faces.
export const SERIF = '"Playfair Display", "Bodoni 72", Didot, "Bodoni MT", Georgia, serif';
export const SANS = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

const BLACK = "#000000";

/** Appends an alpha channel to a #RRGGBB palette colour. */
export const alpha = (hex: string, a: number): string =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

/** Clamped interpolate over [inStart, inEnd]. */
export const ramp = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart = 0,
  outEnd = 1,
): number =>
  interpolate(frame, [inStart, inEnd], [outStart, outEnd], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Colour stops for a smooth (eased) gradient. Fades from `peak` alpha to 0 across
 * [from, to] percent, or 0 to `peak` when `reverse`. Many stops avoid visible banding rings.
 */
export const easedStops = (
  color: string,
  peak: number,
  { reverse = false, from = 0, to = 100 }: { reverse?: boolean; from?: number; to?: number } = {},
): string =>
  Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    const a = peak * (reverse ? smooth(t) : 1 - smooth(t));
    return `${alpha(color, a)} ${from + (to - from) * t}%`;
  }).join(", ");

// One static grain tile, built once at module load and reused by every frame.
const GRAIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960">' +
  '<filter id="n" x="0" y="0" width="100%" height="100%">' +
  '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)"/></svg>';
const GRAIN_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;

type StageProps = {
  /** Length of this frame, used to place the closing fade. */
  duration: number;
  /** [from, to, startFrame, endFrame] opacity of the edge vignette. */
  vignette: [number, number, number, number];
  /** Also fade the background to black over the final 15 frames. */
  toBlack?: boolean;
  children: ReactNode;
};

/** Background, vignette, film grain and the closing 15-frame fade of the content layer. */
export const Stage: React.FC<StageProps> = ({ duration, vignette, toBlack = false, children }) => {
  const frame = useCurrentFrame();
  const { palette, id } = useTheme();
  const light = id === "light";
  const fadeOut = ramp(frame, duration - 15, duration, 1, 0);
  // Edge shading: black on dark, a deep plum on light so the cream stays warm instead of going grey.
  const shade = light ? palette.primary : BLACK;
  const [vFrom, vTo, vStart, vEnd] = vignette;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {!light && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 38%, ${easedStops(palette.secondary, 0.95)})`,
          }}
        />
      )}
      {light && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 45%, ${easedStops(palette.accent, 0.5)})`,
          }}
        />
      )}
      <AbsoluteFill style={{ opacity: fadeOut }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: ramp(frame, vStart, vEnd, vFrom, vTo),
          background: `radial-gradient(ellipse at center, ${easedStops(shade, light ? 0.75 : 0.6, { reverse: true, from: 30, to: 100 })})`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: "540px 960px",
          opacity: light ? 0.1 : 0.07,
          // Overlay does nothing on near-black, so the dark theme uses screen to dither its gradients.
          mixBlendMode: light ? "overlay" : "screen",
        }}
      />
      {toBlack && <AbsoluteFill style={{ backgroundColor: BLACK, opacity: ramp(frame, duration - 15, duration) }} />}
    </AbsoluteFill>
  );
};

type TrackedProps = {
  children: ReactNode;
  size: number;
  /** letter-spacing in em */
  spacing: number;
  color: string;
  opacity?: number;
  weight?: number;
  serif?: boolean;
  /** Metallic gradient fill, brightest at the centre of the line. Defaults to on. */
  metal?: boolean;
  style?: CSSProperties;
};

/** Uppercase tracked line. Left padding cancels the trailing letter-space so it centres optically. */
export const Tracked: React.FC<TrackedProps> = ({
  children,
  size,
  spacing,
  color,
  opacity = 1,
  weight = 200,
  serif = false,
  metal = true,
  style,
}) => {
  const { palette, id } = useTheme();
  const stops =
    id === "light"
      ? `${palette.primary} 0%, ${palette.secondary} 35%, ${palette.accent} 50%, ${palette.secondary} 65%, ${palette.primary} 100%`
      : `${palette.accent} 0%, ${palette.primary} 25%, ${palette.text} 50%, ${palette.primary} 75%, ${palette.accent} 100%`;
  const fill: CSSProperties = metal
    ? {
        backgroundImage: `linear-gradient(90deg, ${stops})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }
    : { color };
  return (
  <div
    style={{
      fontFamily: serif ? SERIF : SANS,
      fontWeight: serif ? 400 : weight,
      fontSize: size,
      letterSpacing: `${spacing}em`,
      paddingLeft: `${spacing}em`,
      textTransform: "uppercase",
      textAlign: "center",
      width: "fit-content",
      marginLeft: "auto",
      marginRight: "auto",
      opacity,
      ...fill,
      ...style,
    }}
  >
    {children}
  </div>
  );
};

export const Center: React.FC<{ children: ReactNode; top?: number }> = ({ children, top }) => (
  <AbsoluteFill
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: top === undefined ? "center" : "flex-start",
      paddingTop: top,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Horizontal rule drawn outward from its centre. progress 0 -> 1. */
export const OutwardRule: React.FC<{
  width: number;
  progress: number;
  color: string;
  strokeWidth: number;
  opacity?: number;
}> = ({ width, progress, color, strokeWidth, opacity = 1 }) => {
  const mid = width / 2;
  const reach = mid * progress;
  return (
    <svg width={width} height={strokeWidth + 2} viewBox={`0 0 ${width} ${strokeWidth + 2}`} opacity={opacity}>
      <line x1={mid} y1={(strokeWidth + 2) / 2} x2={mid - reach} y2={(strokeWidth + 2) / 2} stroke={color} strokeWidth={strokeWidth} />
      <line x1={mid} y1={(strokeWidth + 2) / 2} x2={mid + reach} y2={(strokeWidth + 2) / 2} stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
};
