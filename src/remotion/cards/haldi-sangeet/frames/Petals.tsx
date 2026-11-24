import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { rand, wobble } from "./shared";

/**
 * Petals carried by the wind. Each drifts across and down the card on its own path: a
 * steady breeze, gusts that come and go, a sideways flutter, and a 3D tumble (rotation plus
 * a flip that narrows the petal as it turns edge-on).
 */

type Props = {
  seed: number;
  count: number;
  /** Mean breeze in px/s (positive = to the right). */
  breeze?: number;
  /** Mean fall speed in px/s. */
  fall?: number;
  scale?: number;
  /** Vertical band where petals are visible (they fade at its edges). */
  band?: [number, number];
  palette?: string[][];
  opacity?: number;
  /** Petal outline: rounded rose petal or a slimmer marigold petal. */
  shape?: "rose" | "marigold";
};

export const PINKS = [
  ["#FBC7CF", "#EE8DA0", "#D9647E"],
  ["#FAD3D6", "#F2A2AF", "#E07A8F"],
  ["#F7B5C0", "#E57489", "#C9506C"],
  ["#FCE0DC", "#F4B3B5", "#E58E98"],
];

export const MARIGOLDS = [
  ["#FFE08A", "#FDBA3A", "#EE8F17"],
  ["#FFD27A", "#F9A62B", "#E2780F"],
  ["#FFE9A6", "#FCC64F", "#F0A021"],
  ["#FFC97A", "#F59A3C", "#DB6F1B"],
];

const W = 1080;

export const Petals: React.FC<Props> = ({ seed, count, breeze = 55, fall = 95, scale = 1, band, palette = PINKS, opacity = 1, shape = "rose" }) => {
  const frame = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const t = frame / fps;

  const petals = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(seed * 1000 + i * 17 + k);
    const life = 14 + r(1) * 8;
    const phase = r(2) * life;
    const local = (t + phase) % life;
    const cycle = Math.floor((t + phase) / life);
    const rr = (k: number) => rand(seed * 1000 + i * 17 + k + cycle * 7.13);

    const size = (22 + rr(3) * 22) * scale;
    const vx = breeze * (0.6 + rr(4) * 0.8);
    const vy = fall * (0.7 + rr(5) * 0.6) * (0.75 + 0.25 * scale);
    const fromLeft = rr(6) < 0.35;
    const x0 = fromLeft ? -80 : -200 + rr(7) * (W + 150);
    const y0 = fromLeft ? rr(8) * H * 0.7 : -80 - rr(9) * 200;
    const gust = 26 * Math.sin(local * 0.7 + rr(10) * 6) + 18 * wobble(local * 0.5, i + seed);
    const x = x0 + vx * local + gust * 3 + 22 * Math.sin(local * (1.3 + rr(11)) + rr(12) * 6);
    const y = y0 + vy * local + 14 * Math.sin(local * (1.1 + rr(13)) + rr(14) * 6);
    if (x < -120 || x > W + 120 || y < -120 || y > H + 120) continue;

    const spin = (rr(15) - 0.5) * 140 * local + rr(16) * 360;
    const flip = Math.cos(local * (1.6 + rr(17) * 1.8) + rr(18) * 6);
    const [light, mid, deep] = palette[Math.floor(rr(19) * palette.length)];
    let fade = Math.min(1, local / 1.2);
    if (band) {
      const [top, bottom] = band;
      fade *= Math.max(0, Math.min(1, (y - top) / 120, (bottom - y) / 120));
    }
    if (fade <= 0.01) continue;
    const gid = `hs-pg-${seed}-${i}`;
    petals.push(
      <svg
        key={i}
        width={size * 2}
        height={size * 2}
        viewBox="-1 -1 2 2"
        style={{
          position: "absolute",
          left: x - size,
          top: y - size,
          opacity: fade * opacity,
          transform: `rotate(${spin}deg) scaleX(${0.25 + 0.75 * Math.abs(flip)})`,
          overflow: "visible",
          filter: shape === "rose" ? "drop-shadow(0 3px 3px rgba(120, 40, 60, 0.16))" : "drop-shadow(0 3px 3px rgba(140, 80, 20, 0.16))",
        }}
      >
        <defs>
          <radialGradient id={gid} cx="0.42" cy="0.3" r="0.85">
            <stop offset="0" stopColor={flip > 0 ? light : mid} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={deep} />
          </radialGradient>
        </defs>
        {shape === "rose" ? (
          <path
            d="M0,0.95 C-0.55,0.62 -0.86,0.05 -0.7,-0.45 C-0.56,-0.86 -0.2,-0.95 0,-0.72 C0.2,-0.95 0.56,-0.86 0.7,-0.45 C0.86,0.05 0.55,0.62 0,0.95Z"
            fill={`url(#${gid})`}
          />
        ) : (
          // a narrower petal with a ruffled tip, like a single marigold ray
          <path
            d="M0,0.95 C-0.34,0.6 -0.5,0.05 -0.44,-0.5 C-0.4,-0.82 -0.22,-0.96 -0.1,-0.84 C-0.02,-0.98 0.06,-0.98 0.12,-0.86 C0.24,-0.97 0.42,-0.84 0.45,-0.5 C0.5,0.05 0.34,0.6 0,0.95Z"
            fill={`url(#${gid})`}
          />
        )}
        <path d="M0,0.85 C-0.05,0.3 -0.02,-0.2 0,-0.6" stroke={light} strokeOpacity={0.55} strokeWidth={0.05} fill="none" />
      </svg>,
    );
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{petals}</AbsoluteFill>;
};
