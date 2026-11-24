import { AbsoluteFill, Img } from "remotion";
import { wobble } from "./shared";

const DEG = Math.PI / 180;

export type HangingLantern = {
  src: string;
  box: { x: number; y: number; w: number; h: number };
  pivot: number[];
  center: number[];
  size: number;
};

/**
 * Cut-out hanging lanterns, each swinging gently about the top of its chain with its own
 * period, plus a warm flickering glow that travels with the lantern body.
 */
export const HangingLanterns: React.FC<{
  lanterns: HangingLantern[];
  asset: (p: string) => string;
  dir: string;
  t: number;
  /** Swing amplitude per lantern, degrees. */
  amp: number[];
  /** Swing period per lantern, seconds. */
  period: number[];
  glow: string;
}> = ({ lanterns, asset, dir, t, amp, period, glow }) => {
  const swing = (i: number) => (amp[i] ?? 1.4) * Math.sin((2 * Math.PI * t) / (period[i] ?? 3.5) + i * 1.9);
  return (
    <>
      {lanterns.map((l, i) => {
        const [px, py] = l.pivot;
        return (
          <Img
            key={i}
            src={asset(`${dir}/${l.src}`)}
            style={{
              position: "absolute",
              left: l.box.x,
              top: l.box.y,
              width: l.box.w,
              height: l.box.h,
              transformOrigin: `${px - l.box.x}px ${py - l.box.y}px`,
              transform: `rotate(${swing(i)}deg)`,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
        {lanterns.map((l, i) => {
          const th = swing(i) * DEG;
          const [px, py] = l.pivot;
          const [cx, cy] = l.center;
          const gx = px + (cx - px) * Math.cos(th) - (cy - py) * Math.sin(th);
          const gy = py + (cx - px) * Math.sin(th) + (cy - py) * Math.cos(th);
          const flicker = 0.82 + 0.12 * wobble(t * 0.7, i); // a slow candle breath, not a flicker
          const r = l.size * 1.6;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: gx - r,
                top: gy - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${glow} 0%, ${glow.replace(/[\d.]+\)$/, "0.22)")} 38%, ${glow.replace(/[\d.]+\)$/, "0)")} 70%)`,
                opacity: flicker,
              }}
            />
          );
        })}
      </AbsoluteFill>
    </>
  );
};
