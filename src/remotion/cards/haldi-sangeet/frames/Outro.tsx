import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { HaldiSangeetData } from "../types";
import { PINKS, Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { DISPLAY, EASE_IN_OUT, Glow, Lines, LotusDivider, SCRIPT, SERIF, Twinkle, caps, mixed, progress, rand, stack, useRevealFrame, wobble } from "./shared";

const INK = "#843A55";

/**
 * Outro: dusk over the lake palace. Sky lanterns rise, fireworks bloom and fade, stars
 * twinkle, the palace windows glow and the water shimmers.
 */
export default function Outro({ data }: { data: HaldiSangeetData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const M = v.manifest.s4;
  const D = M.extra;
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);

  const head = caps(54);
  const thanksLines = data.outroThanks.split("\n").length;
  const thanks = mixed(62, thanksLines, 84);
  const presence = mixed(58);
  const sign = mixed(116);
  const [yDiv1, yHead, yDiv2, yThanks, yPresence, ySign] = stack(M.zone as [number, number], [
    { h: 0 },
    { h: head.h, gap: 56 },
    { h: 0, gap: 56 },
    { h: thanks.h, gap: 70 },
    { h: presence.h, gap: 44 },
    { h: sign.h, gap: 76 },
  ]);
  const skyTop = M.zone[0];

  return (
    <AbsoluteFill style={{ backgroundColor: "#4E5C9C", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 60%" }}>
        <WarpedPlate
          id="outro"
          src={v.asset("s4/plate.jpg")}
          noises={[
            { mask: v.asset("s4/wind.png"), amp: 4, freq: "0.006", vx: 22, vy: 7, seed: 12 },
            { mask: v.asset("s4/ripple.png"), amp: 5, freq: "0.004 0.07", vx: 0, vy: -26, seed: 17 },
            { mask: v.asset("s4/drift.png"), amp: 6, freq: "0.0022", vx: 9, vy: 2, seed: 6 },
          ]}
        />

        {/* stars twinkling in the upper sky */}
        {Array.from({ length: 64 }, (_, i) => {
          const period = 2.4 + rand(i + 3) * 3.4;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = 0.2 + 0.8 * Math.max(0, Math.sin(ph * Math.PI * 2)) ** 3;
          const y = rand(i + 70) ** 1.3 * (skyTop + 120);
          const fade = Math.max(0, 1 - y / (skyTop + 160));
          return <Twinkle key={i} x={rand(i + 140) * 1080} y={y} size={3 + 6 * rand(i + 210) ** 2} intensity={a * fade} color="#FFF4DC" />;
        })}

        {M.fireworks.map(([x, y, r], i) => (
          <Firework key={i} x={x} y={y} r={r * 1.05} t={t} period={6 + i * 1.1} delay={1.2 + i * 2} seed={i} />
        ))}

        {/* palace windows breathing with lamplight */}
        <Img
          src={v.asset("s4/lights.png")}
          style={{
            position: "absolute",
            left: M.lights.x,
            top: M.lights.y,
            width: M.lights.w,
            height: M.lights.h,
            mixBlendMode: "screen",
            opacity: 0.25 + 0.15 * wobble(t * 2.1, 4),
          }}
        />
        <Glow x={840} y={1530 + D} r={260} color="rgba(255, 205, 140, 0.5)" opacity={0.3 + 0.08 * wobble(t * 1.7, 2)} />

        {/* the setting sun's path on the water: glints */}
        {Array.from({ length: 24 }, (_, i) => {
          const period = 2.6 + rand(i + 7) * 3;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 5;
          const yy = 1650 + D + rand(i + 60) * 240;
          return <Twinkle key={i} x={400 + rand(i + 30) * 620} y={yy} size={5 + 7 * rand(i + 90)} intensity={a * 0.85} color="#FFE9C8" />;
        })}

        {/* sky lanterns: nearer (bigger) ones rise faster; each sways, tilts and flickers */}
        {M.sky.map((l, i) => {
          const near = Math.min(1, l.size / 150);
          const rise = (4 + 9 * near) * t;
          const sx = 7 * Math.sin(t * (0.5 + rand(i) * 0.4) + i);
          const tilt = 2.2 * Math.sin(t * (0.6 + rand(i + 9) * 0.5) + i * 2);
          const flicker = 0.9 + 0.07 * wobble(t * 0.6, i); // a slow, soft breath of light
          const r = l.size * 1.3;
          return (
            <div key={i} style={{ position: "absolute", left: l.x + sx, top: l.y - rise, width: l.w, height: l.h, transform: `rotate(${tilt}deg)` }}>
              <div
                style={{
                  position: "absolute",
                  left: l.w / 2 - r,
                  top: l.h / 2 - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle closest-side, rgba(255,200,125,0.6) 0%, rgba(255,184,104,0.32) 28%, rgba(255,172,92,0.1) 58%, rgba(255,170,90,0) 100%)",
                  mixBlendMode: "screen",
                  opacity: flicker,
                }}
              />
              <Img src={v.asset(`s4/sky-${String(i).padStart(2, "0")}.png`)} style={{ width: "100%", height: "100%", filter: `brightness(${flicker + 0.08})` }} />
            </div>
          );
        })}

        {/* embers drifting up from the lanterns */}
        {Array.from({ length: 20 }, (_, i) => {
          const life = 5 + rand(i + 300) * 4;
          const local = (t + rand(i + 330) * life) % life;
          const a = Math.sin((local / life) * Math.PI);
          return (
            <Twinkle
              key={i}
              x={rand(i + 360) * 1080 + 20 * Math.sin(local + i)}
              y={skyTop + 200 - rand(i + 390) * (skyTop + 100) - local * 40}
              size={3 + 3 * rand(i + 420)}
              intensity={a * 0.75}
              color="#FFC27A"
            />
          );
        })}

        <Petals seed={4} count={6} breeze={34} fall={52} opacity={0.9} palette={PINKS} />

        {/* ---- text (the artwork's own words) */}
        <LotusDivider y={yDiv1} half={270} at={56} color={INK} size={58} />
        <Lines text={data.outroHeading} baseline={yHead + head.base} lineHeight={0} fontSize={54} font={SERIF} weight={500} letterSpacing={9} color={INK} at={64} />
        <LotusDivider y={yDiv2} half={270} at={80} color={INK} size={58} />
        <Lines text={data.outroThanks} baseline={yThanks + thanks.base} lineHeight={84} fontSize={62} italic font={DISPLAY} weight={500} color={INK} at={92} stagger={12} />
        <Lines text={data.outroPresence} baseline={yPresence + presence.base} lineHeight={0} fontSize={58} italic font={DISPLAY} weight={500} color={INK} at={120} />
        <SignOff text={data.outroSignOff} baseline={ySign + sign.base} at={140} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** "With love" in script, then a flourish that draws itself into a small heart. */
const SignOff: React.FC<{ text: string; baseline: number; at: number }> = ({ text, baseline, at }) => {
  const frame = useRevealFrame();
  const draw = progress(frame, at + 16, 56, EASE_IN_OUT);
  // the flourish: from under the words, up into a heart, and out to the right
  const path = "M0,0 C40,10 90,8 120,-6 C138,-15 150,-40 132,-48 C118,-54 110,-38 116,-28 C104,-46 84,-44 86,-28 C88,-12 108,-2 124,6 C160,22 230,10 300,-4";
  const len = 720;
  return (
    <>
      <Lines text={text} baseline={baseline} lineHeight={0} fontSize={116} font={SCRIPT} weight={400} color={INK} at={at} cx={500} />
      <svg
        width={340}
        height={120}
        viewBox="-10 -70 330 110"
        style={{ position: "absolute", left: 650, top: baseline - 70, overflow: "visible", filter: "drop-shadow(0 0 5px rgba(255,248,238,0.9))" }}
      >
        <path d={path} fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      </svg>
    </>
  );
};

/**
 * A firework in the painted style: thin gold rays that burst out from a point, droop a
 * little, then fade, leaving sparkling tips. Repeats every `period` seconds.
 */
const Firework: React.FC<{ x: number; y: number; r: number; t: number; period: number; delay: number; seed: number }> = ({
  x,
  y,
  r,
  t,
  period,
  delay,
  seed,
}) => {
  if (t < delay) return null;
  const local = (t - delay) % period;
  const burst = 2.8; // seconds of visible burst
  if (local > burst) return null;
  const k = local / burst;
  const reach = 1 - Math.pow(1 - Math.min(1, k * 1.8), 3); // shoots out fast, slows
  const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
  const rays = 34;
  const lines = [];
  const tips = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rand(seed * 50 + i) * 0.12;
    const len = r * (0.75 + 0.3 * rand(seed * 70 + i)) * reach;
    const droop = 14 * k * k;
    const x1 = Math.cos(a) * len * 0.25;
    const y1 = Math.sin(a) * len * 0.25;
    const x2 = Math.cos(a) * len;
    const y2 = Math.sin(a) * len + droop;
    const tail = Math.max(0, (k - 0.25) * 1.3); // the inner part burns out first
    const xs = Math.cos(a) * len * (0.25 + 0.6 * Math.min(1, tail));
    const ys = Math.sin(a) * len * (0.25 + 0.6 * Math.min(1, tail)) + droop * tail;
    lines.push(<line key={i} x1={tail > 0 ? xs : x1} y1={tail > 0 ? ys : y1} x2={x2} y2={y2} stroke="url(#hs-fw-ray)" strokeWidth={2.2} strokeLinecap="round" />);
    if (i % 2 === 0) tips.push(<circle key={i} cx={x2} cy={y2} r={2.4 + 1.6 * rand(seed + i)} fill="#FFF1C8" />);
  }
  return (
    <svg
      width={r * 2.6}
      height={r * 2.6}
      viewBox={`${-r * 1.3} ${-r * 1.3} ${r * 2.6} ${r * 2.6}`}
      style={{ position: "absolute", left: x - r * 1.3, top: y - r * 1.3, overflow: "visible", opacity: fade, mixBlendMode: "screen" }}
    >
      <defs>
        <radialGradient id="hs-fw-ray" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r}>
          <stop offset="0" stopColor="#FFE3A0" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#FFD685" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFF2CF" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="hs-fw-core">
          <stop offset="0" stopColor="#FFF4D8" stopOpacity="1" />
          <stop offset="1" stopColor="#FFD685" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={r * 0.35 * (1 - k)} fill="url(#hs-fw-core)" opacity={1 - k} />
      <g>{lines}</g>
      <g opacity={0.7 + 0.3 * Math.sin(local * 5)}>{tips}</g>
    </svg>
  );
};
