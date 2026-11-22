import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { rand, wobble } from "./shared";

/**
 * Rose petals carried by the wind. Each petal drifts across and down the card along its
 * own path: a steady breeze, gusts that come and go, a sideways flutter, and a 3D tumble
 * (rotation plus a flip that narrows the petal as it turns edge-on).
 */

type Props = {
  seed: number;
  count: number;
  /** Mean breeze in px/s (positive = to the right). */
  breeze?: number;
  /** Mean fall speed in px/s. */
  fall?: number;
  /** Size multiplier. */
  scale?: number;
  /** Optional vertical band where petals are visible (fade in/out at the edges). */
  band?: [number, number];
  palette?: string[][];
  opacity?: number;
};

const PINKS = [
  ["#FBC7CF", "#EE8DA0", "#D9647E"],
  ["#FAD3D6", "#F2A2AF", "#E07A8F"],
  ["#F7B5C0", "#E57489", "#C9506C"],
  ["#FCE0DC", "#F4B3B5", "#E58E98"],
];

const W = 1080;

export const Petals: React.FC<Props> = ({
  seed,
  count,
  breeze = 55,
  fall = 95,
  scale = 1,
  band,
  palette = PINKS,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const t = frame / fps;

  const petals = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(seed * 1000 + i * 17 + k);
    const life = 14 + r(1) * 8; // seconds to cross the card
    const phase = r(2) * life; // so the card starts already populated
    const local = (t + phase) % life;
    const cycle = Math.floor((t + phase) / life);
    const rr = (k: number) => rand(seed * 1000 + i * 17 + k + cycle * 7.13);

    const size = (22 + rr(3) * 22) * scale;
    const vx = breeze * (0.6 + rr(4) * 0.8);
    const vy = fall * (0.7 + rr(5) * 0.6) * (0.75 + 0.25 * scale);
    // start above the top edge or off the left edge, so petals blow in across the card
    const fromLeft = rr(6) < 0.35;
    const x0 = fromLeft ? -80 : -200 + rr(7) * (W + 150);
    const y0 = fromLeft ? rr(8) * H * 0.7 : -80 - rr(9) * 200;
    // gusts: integrated sine so speed varies smoothly
    const gust = 26 * Math.sin(local * 0.7 + rr(10) * 6) + 18 * wobble(local * 0.5, i + seed);
    const x = x0 + vx * local + gust * 3 + 22 * Math.sin(local * (1.3 + rr(11)) + rr(12) * 6);
    const y = y0 + vy * local + 14 * Math.sin(local * (1.1 + rr(13)) + rr(14) * 6);
    if (x < -120 || x > W + 120 || y < -120 || y > H + 120) continue;

    const spin = (rr(15) - 0.5) * 140 * local + rr(16) * 360;
    const flip = Math.cos(local * (1.6 + rr(17) * 1.8) + rr(18) * 6); // edge-on when ~0
    const [light, mid, deep] = palette[Math.floor(rr(19) * palette.length)];
    let fade = Math.min(1, local / 1.2);
    if (band) {
      const [top, bottom] = band;
      fade *= Math.max(0, Math.min(1, (y - top) / 120, (bottom - y) / 120));
    }
    if (fade <= 0.01) continue;
    const gid = `pg-${seed}-${i}`;
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
          filter: "drop-shadow(0 3px 3px rgba(120, 40, 60, 0.18))",
        }}
      >
        <defs>
          <radialGradient id={gid} cx="0.42" cy="0.3" r="0.85">
            <stop offset="0" stopColor={flip > 0 ? light : mid} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={deep} />
          </radialGradient>
        </defs>
        {/* a rounded petal with a small notch at the top and a pinched base */}
        <path
          d="M0,0.95 C-0.55,0.62 -0.86,0.05 -0.7,-0.45 C-0.56,-0.86 -0.2,-0.95 0,-0.72 C0.2,-0.95 0.56,-0.86 0.7,-0.45 C0.86,0.05 0.55,0.62 0,0.95Z"
          fill={`url(#${gid})`}
        />
        <path d="M0,0.85 C-0.05,0.3 -0.02,-0.2 0,-0.6" stroke={light} strokeOpacity={0.55} strokeWidth={0.05} fill="none" />
      </svg>,
    );
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{petals}</AbsoluteFill>;
};
