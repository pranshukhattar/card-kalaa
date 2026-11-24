import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { HaldiSangeetData } from "../types";
import { PINKS, Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { DISPLAY, IconRow, Lines, LotusDivider, Twinkle, caps, mixed, progress, rand, stack, wobble } from "./shared";
import { HangingLanterns } from "./Lanterns";

const INK = "#8E3B60";

/** Bulbs found by the asset script, thinned out so neighbours closer than this merge. */
const BULB_SPACING = 18;

/**
 * Ladies Sangeet: the three dancers sway to the beat, clouds of colour fly up around them,
 * lanterns swing on the string lights and the bulbs twinkle in a chase.
 */
export default function Sangeet({ data }: { data: HaldiSangeetData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const M = v.manifest.s3;
  const zoom = 1 + 0.025 * progress(frame, 0, durationInFrames, (x) => x);

  // a dance beat (~1.8 s per sway); each dancer has her own phase, skirts follow a beat behind
  const beat = (2 * Math.PI * t) / 2.6;
  const phases = [0, 2.1, 4.0];
  const sway = phases.map((ph, i) => [1.7, 1.5, 1.8][i] * Math.sin(beat + ph));
  const skirt = phases.map((ph, i) => [1.4, 1.3, 1.5][i] * Math.sin(beat + ph - 0.9));

  const bulbs: number[][] = [];
  for (const b of M.bulbs) if (!bulbs.some((o) => Math.hypot(o[0] - b[0], o[1] - b[1]) < BULB_SPACING)) bulbs.push(b);

  const titleLines = data.sangeetTitle.split("\n").length;
  const title = { h: 172 * 0.7 + (titleLines - 1) * 190, base: 172 * 0.7 };
  const lineLines = data.sangeetLine.split("\n").length;
  const line = mixed(66, lineLines, 88);
  const time = mixed(56);
  const [yTitle, yLine, yDiv, yTime] = stack(M.zone as [number, number], [
    { h: title.h },
    { h: line.h, gap: 64 },
    { h: 0, gap: 70 },
    { h: time.h, gap: 70 },
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#F9E2E0", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 40%" }}>
        <WarpedPlate
          id="sangeet"
          src={v.asset("s3/plate.jpg")}
          noises={[
            { mask: v.asset("s3/wind.png"), amp: 4.5, freq: "0.006", vx: 30, vy: 8, seed: 3 },
            { mask: v.asset("s3/drift.png"), amp: 6, freq: "0.0022", vx: 10, vy: 3, seed: 8 },
          ]}
        />

        {/* string-light bulbs twinkling in a slow chase along the strings */}
        {bulbs.map(([x, y], i) => {
          const chase = 0.5 + 0.5 * Math.sin(t * 1.1 - x / 90);
          const a = 0.4 + 0.42 * chase + 0.15 * wobble(t * 0.8, i);
          return <Twinkle key={i} x={x} y={y} size={13 + 4 * rand(i)} intensity={Math.min(1, a)} color="#FFE7B0" />;
        })}

        <HangingLanterns
          lanterns={M.lanterns}
          asset={v.asset}
          dir="s3"
          t={t}
          amp={[1.3, 1.1, 1.4]}
          period={[4.6, 5.3, 4.2]}
          glow="rgba(255, 205, 140, 0.6)"
        />

        {/* clouds of colour (gulal) thrown up by the dancers, drifting and dissolving */}
        <ColourClouds pivots={M.dancerPivots} t={t} />

        {/* the three dancers, one cut-out: upper bodies sway about the hips, skirts swish */}
        <WarpedPlate
          id="sangeet-dancers"
          src={v.asset("s3/dancers.png")}
          box={M.dancers}
          base={false}
          maps={[0, 1, 2].flatMap((k) => [
            { href: v.asset(`s3/map-u${k}.png`), weight: sway[k] },
            { href: v.asset(`s3/map-s${k}.png`), weight: skirt[k] },
          ])}
        />

        {/* colour dust in front of the dancers too, so they dance inside it */}
        <ColourDust pivots={M.dancerPivots} t={t} />

        <Petals seed={3} count={11} breeze={46} fall={62} palette={PINKS} />

        {/* ---- text (the artwork's own words) */}
        <Lines
          text={data.sangeetTitle}
          baseline={yTitle + title.base}
          lineHeight={190}
          fontSize={172}
          font={DISPLAY}
          weight={600}
          letterSpacing={7}
          color={INK}
          at={50}
          stagger={16}
        />
        <Lines text={data.sangeetLine} baseline={yLine + line.base} lineHeight={88} fontSize={66} italic font={DISPLAY} weight={500} color={INK} at={80} stagger={12} />
        <LotusDivider y={yDiv} half={260} at={102} color={INK} size={58} />
        <IconRow kind="clock" text={data.sangeetTime} baseline={yTime + time.base} size={56} at={114} color={INK} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const GULAL = [
  [236, 122, 168], // rani pink
  [176, 132, 214], // lilac
  [250, 190, 92], // marigold
  [242, 150, 120], // coral
  [140, 170, 230], // soft blue
];

/**
 * Soft watercolour clouds of colour powder. Each puff starts small near a dancer's raised
 * hands, swells as it rises and drifts with the breeze, then dissolves; puffs re-launch on the
 * beat so the air stays alive.
 */
const ColourClouds: React.FC<{ pivots: number[][]; t: number }> = ({ pivots, t }) => {
  const puffs = [];
  for (let i = 0; i < 15; i++) {
    const life = 5.5 + rand(i + 1) * 2.5;
    const local = (t + rand(i + 2) * life) % life;
    const cycle = Math.floor((t + rand(i + 2) * life) / life);
    const r = (k: number) => rand(i * 31 + k + cycle * 3.7);
    const k = local / life;
    const [hx, hy] = pivots[i % pivots.length];
    const x0 = hx - 90 + r(3) * 180;
    const y0 = hy - 210 - r(4) * 80;
    const x = x0 + (r(5) - 0.35) * 220 * k + 20 * wobble(local * 0.7, i);
    const y = y0 - (160 + 180 * r(6)) * k;
    const rad = 60 + 150 * k + 40 * r(7);
    const [cr, cg, cb] = GULAL[Math.floor(r(8) * GULAL.length)];
    const a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.22 + 0.12 * r(9));
    if (a <= 0.01) continue;
    puffs.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x - rad,
          top: y - rad * 0.8,
          width: rad * 2,
          height: rad * 1.6,
          borderRadius: "50%",
          background: `radial-gradient(ellipse closest-side, rgba(${cr},${cg},${cb},0.85) 0%, rgba(${cr},${cg},${cb},0.45) 45%, rgba(${cr},${cg},${cb},0) 100%)`,
          opacity: a,
          transform: `rotate(${(r(10) - 0.5) * 60}deg)`,
          mixBlendMode: "multiply",
        }}
      />,
    );
  }
  return <>{puffs}</>;
};

/** Fine specks of colour powder and glitter swirling around the dancers. */
const ColourDust: React.FC<{ pivots: number[][]; t: number }> = ({ pivots, t }) => {
  const specks = [];
  for (let i = 0; i < 46; i++) {
    const life = 4.5 + rand(i + 100) * 2.5;
    const local = (t + rand(i + 101) * life) % life;
    const cycle = Math.floor((t + rand(i + 101) * life) / life);
    const r = (k: number) => rand(i * 13 + k + cycle * 5.3);
    const k = local / life;
    const [hx, hy] = pivots[i % pivots.length];
    const ang = r(2) * Math.PI * 2;
    const spin = ang + k * (1.0 + 0.6 * r(3)) * (r(4) < 0.5 ? 1 : -1);
    const rad = 60 + 200 * k * (0.6 + r(5));
    const x = hx + Math.cos(spin) * rad * 1.2;
    const y = hy - 160 - k * (220 + 120 * r(6)) + Math.sin(spin) * rad * 0.35;
    const size = 3 + 5 * r(7);
    const a = Math.sin(Math.PI * k) * (0.5 + 0.4 * r(8));
    const glitter = r(9) < 0.3;
    if (glitter) {
      specks.push(<Twinkle key={i} x={x} y={y} size={size * 2.4} intensity={a} color="#FFE7AE" />);
      continue;
    }
    const [cr, cg, cb] = GULAL[Math.floor(r(10) * GULAL.length)];
    specks.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x - size,
          top: y - size,
          width: size * 2,
          height: size * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${cr},${cg},${cb},0.95) 0%, rgba(${cr},${cg},${cb},0) 100%)`,
          opacity: a,
        }}
      />,
    );
  }
  return <>{specks}</>;
};
