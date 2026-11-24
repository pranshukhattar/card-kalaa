import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { HaldiSangeetData } from "../types";
import { PINKS, Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { DISPLAY, Glow, IconRow, Lines, LotusDivider, Twinkle, caps, mixed, progress, rand, stack, wobble } from "./shared";

const INK = "#853045";

/** Intro: a rose-and-lilac dawn over the lake pavilion; blossoms stir, petals drift, water glints. */
export default function Intro({ data }: { data: HaldiSangeetData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const M = v.manifest.s1;
  const D = M.extra; // everything below the open middle moved down by this much
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);

  // ---- text layout (sizes in px on the 1080-wide card)
  const intro = mixed(68, 2, 90);
  const name = caps(152);
  const events = mixed(80);
  const row = mixed(52);
  const venueLines = data.venue.split("\n").length;
  const venue = mixed(52, venueLines, 66);
  const [yIntro, yDiv1, yName, yEvents, yDiv2, yDate, yVenue] = stack(M.zone as [number, number], [
    { h: intro.h },
    { h: 0, gap: 58 },
    { h: name.h, gap: 66 },
    { h: events.h, gap: 40 },
    { h: 0, gap: 52 },
    { h: row.h, gap: 60 },
    { h: venue.h, gap: 36 },
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEBDD", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 45%" }}>
        <WarpedPlate
          id="intro"
          src={v.asset("s1/plate.jpg")}
          noises={[
            { mask: v.asset("s1/wind.png"), amp: 4.5, freq: "0.006", vx: 26, vy: 8, seed: 5 },
            { mask: v.asset("s1/ripple.png"), amp: 4, freq: "0.004 0.07", vx: 0, vy: -24, seed: 9 },
            { mask: v.asset("s1/drift.png"), amp: 6, freq: "0.0022", vx: 9, vy: 2, seed: 2 },
          ]}
        />

        {/* first light: a warm glow breathing over the far shore */}
        <Glow x={640} y={1585 + D} r={430} color="rgba(255, 214, 170, 0.55)" opacity={0.35 + 0.12 * Math.sin(t * 0.9)} />

        {/* glints on the water */}
        {Array.from({ length: 26 }, (_, i) => {
          const period = 2.6 + rand(i + 7) * 3;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 5;
          return (
            <Twinkle
              key={i}
              x={300 + rand(i + 30) * 500}
              y={1625 + D + rand(i + 60) ** 0.8 * 270}
              size={5 + 7 * rand(i + 90)}
              intensity={a * 0.9}
              color="#FFF1DA"
            />
          );
        })}

        <Petals seed={1} count={10} breeze={42} fall={62} palette={PINKS} />

        {/* ---- text */}
        <Lines text={data.introLine} baseline={yIntro + intro.base} lineHeight={90} fontSize={68} italic font={DISPLAY} weight={500} color={INK} at={34} stagger={12} />
        <LotusDivider y={yDiv1} half={260} at={58} color={INK} size={58} />
        <Lines text={data.brideName} baseline={yName + name.base} lineHeight={0} fontSize={152} font={DISPLAY} weight={600} letterSpacing={8} color={INK} at={70} />
        <Lines text={data.eventsLine} baseline={yEvents + events.base} lineHeight={0} fontSize={80} italic font={DISPLAY} weight={500} color={INK} at={88} />
        <LotusDivider y={yDiv2} half={170} at={104} color={INK} size={46} />
        <IconRow kind="calendar" text={data.date} baseline={yDate + row.base} size={52} at={116} color={INK} />
        <IconRow kind="pin" text={data.venue} baseline={yVenue + venue.base} size={52} lineHeight={66} at={128} color={INK} />

        {/* a faint shimmer that passes over the name once it has settled */}
        <NameShimmer y={yName} h={name.h} at={175} t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** A soft band of light sweeping across the name, once. */
const NameShimmer: React.FC<{ y: number; h: number; at: number; t: number }> = ({ y, h, at, t }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 95, (x) => x);
  if (p <= 0 || p >= 1) return null;
  const x = -300 + p * 1680;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 150,
        top: y - 30,
        width: 300,
        height: h + 60,
        background: "linear-gradient(100deg, rgba(255,240,225,0) 0%, rgba(255,244,232,0.55) 50%, rgba(255,240,225,0) 100%)",
        mixBlendMode: "soft-light",
        opacity: 0.8 + 0.2 * wobble(t, 3),
      }}
    />
  );
};
