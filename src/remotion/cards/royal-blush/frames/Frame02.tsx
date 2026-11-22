import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import manifest from "../generated/manifest.json";
import type { RoyalBlushData } from "../types";
import { Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { Divider, MAROON, Lines, ScriptName, Twinkle, asset, progress, rand } from "./shared";

// Glints on the bride's bangles and the groom's embroidered cuff
const GLINTS = [
  { x: 772, y: 236 }, { x: 905, y: 150 }, { x: 992, y: 330 }, { x: 826, y: 418 },
  { x: 724, y: 512 }, { x: 944, y: 520 }, { x: 1040, y: 92 }, { x: 664, y: 598 },
  { x: 86, y: 205 }, { x: 170, y: 335 }, { x: 236, y: 470 },
];

// The text block in this artwork sits right of centre (the dupatta fills the left)
const CX = 600;

/** Screen 2 - Welcome: the clasped hands, the flowing dupatta and the couple's names. */
export default function Frame02({ data }: { data: RoyalBlushData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);
  const float = Math.sin((2 * Math.PI * t) / 4.2);
  const w = (2 * Math.PI * t) / 2.8; // dupatta wave phase

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEFE3", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "60% 30%" }}>
        {/* background: sky, cream and the roses (which sway in the wind) */}
        <WarpedPlate id="s2" src={asset("s2/plate.jpg")} wind={{ mask: asset("s2/wind.png"), amp: 4.5, freq: "0.006", vx: 24, vy: 10, seed: 5 }} />
        {/* hands + sleeve + dupatta, cut out: the hands drift, the dupatta ripples */}
        <WarpedPlate
          id="s2-subject"
          src={asset("s2/subject.png")}
          box={manifest.s2.subject}
          base={false}
          maps={[
            { href: asset("s2/map-a.png"), weight: 5 * float },
            { href: asset("s2/map-b.png"), weight: 8 * Math.cos(w) },
            { href: asset("s2/map-c.png"), weight: -8 * Math.sin(w) },
          ]}
        />
        {GLINTS.map((g, i) => {
          const period = 2.2 + rand(i + 7) * 1.8;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 6 * progress(frame, 20, 20);
          return <Twinkle key={i} x={g.x} y={g.y - 5 * float} size={16 + 10 * rand(i + 3)} intensity={a} />;
        })}

        <Petals seed={2} count={10} breeze={60} fall={85} />

        <Lines text={data.hosts} baseline={1442} lineHeight={0} fontSize={56} weight={500} at={28} cx={600} />
        <Lines text={data.welcomeLine} baseline={1518} lineHeight={0} fontSize={58} italic at={38} cx={600} />
        <ScriptName name={data.brideName} suffix="&" baseline={1752} size={158} at={52} cx={596} />
        <ScriptName name={data.groomName} baseline={1950} size={158} at={78} cx={612} />
        <Divider y={2083} cx={610} half={222} at={104} ornament={112} color={MAROON} />
        <Lines text={data.tagline} baseline={2212} lineHeight={73} fontSize={60} italic at={114} cx={617} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
