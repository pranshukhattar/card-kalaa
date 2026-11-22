import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { RoyalBlushData } from "../types";
import { Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { CREAM, Divider, EASE_IN_OUT, Lines, SCRIPT, ScriptName, Twinkle, progress, rand, wobble } from "./shared";

const NIGHT_GLOW = "rgba(255, 214, 160, 0.28)";
const LABEL = "#EBCB97"; // soft gold for the R.S.V.P. / W.B.C.F. labels

/** Screen 5 - Thank you: sky lanterns float up into a starry night over the lit palace. */
export default function Frame05({ data }: { data: RoyalBlushData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const L = v.L.s5;
  const SKY = v.manifest.s5.lanterns;
  const LIGHTS = v.manifest.s5.lights;
  const extraLines = Math.max(0, Math.max(data.rsvp.split("\n").length, data.wbcf.split("\n").length) - 2);
  const love = L.love + extraLines * 56;
  const signature = L.signature + extraLines * 56;
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1C2742", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 75%" }}>
        <WarpedPlate
          id="s5"
          src={v.asset("s5/plate.jpg")}
          wind={{ mask: v.asset("s5/wind.png"), amp: 3.5, freq: "0.006", vx: 18, vy: 6, seed: 13 }}
          ripple={{ mask: v.asset("s5/ripple.png"), amp: 5, freq: "0.004 0.07", vx: 0, vy: -26, seed: 17 }}
        />

        {/* twinkling stars */}
        {Array.from({ length: 70 }, (_, i) => {
          const period = 2.5 + rand(i + 3) * 3.5;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = 0.25 + 0.75 * Math.max(0, Math.sin(ph * Math.PI * 2)) ** 3;
          const y = rand(i + 70) ** 1.4 * L.starsMaxY;
          return <Twinkle key={i} x={rand(i + 140) * 1080} y={y} size={3 + 6 * rand(i + 210) ** 2} intensity={a * (1 - y / (L.starsMaxY * 1.37))} color="#FFF4DC" />;
        })}

        {/* palace windows breathing with lamplight */}
        <Img
          src={v.asset("s5/lights.png")}
          style={{
            position: "absolute",
            left: LIGHTS.x,
            top: LIGHTS.y,
            width: LIGHTS.w,
            height: LIGHTS.h,
            mixBlendMode: "screen",
            opacity: 0.18 + 0.12 * wobble(t * 2.3, 4),
          }}
        />

        {/* sky lanterns: nearer (bigger) ones rise faster; each sways, tilts and flickers */}
        {SKY.map((l, i) => {
          const near = Math.min(1, l.size / 160);
          const rise = (5 + 11 * near) * t;
          const sx = 7 * Math.sin(t * (0.5 + rand(i) * 0.4) + i);
          const tilt = 2.2 * Math.sin(t * (0.6 + rand(i + 9) * 0.5) + i * 2);
          const flicker = 0.85 + 0.1 * wobble(t * 4, i) + 0.05 * Math.sin(t * 23 + i);
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
                    "radial-gradient(circle closest-side, rgba(255,200,125,0.62) 0%, rgba(255,184,104,0.34) 28%, rgba(255,172,92,0.12) 58%, rgba(255,170,90,0) 100%)",
                  mixBlendMode: "screen",
                  opacity: flicker,
                }}
              />
              <Img src={v.asset(`s5/lantern-${String(i).padStart(2, "0")}.png`)} style={{ width: "100%", height: "100%", filter: `brightness(${flicker + 0.1})` }} />
            </div>
          );
        })}

        {/* embers drifting up */}
        {Array.from({ length: 22 }, (_, i) => {
          const life = 5 + rand(i + 300) * 4;
          const local = (t + rand(i + 330) * life) % life;
          const a = Math.sin((local / life) * Math.PI);
          return (
            <Twinkle
              key={i}
              x={rand(i + 360) * 1080 + 20 * Math.sin(local + i)}
              y={L.embersY - rand(i + 390) * 900 - local * 45}
              size={3 + 3 * rand(i + 420)}
              intensity={a * 0.8}
              color="#FFB870"
            />
          );
        })}

        <Petals seed={5} count={6} breeze={40} fall={70} opacity={0.85} band={[0, L.petalBand]} />

        <Lines text={data.thankYou} baseline={L.thank} lineHeight={80} fontSize={58} italic color={CREAM} glow={NIGHT_GLOW} at={50} stagger={10} />
        <Divider y={L.divider} half={215} at={80} color="#EADBC6" ornament={76} />
        <ScriptName name={data.brideName} suffix="&" baseline={L.bride} size={150} at={92} color={CREAM} glow={NIGHT_GLOW} weight={500} />
        <ScriptName name={data.groomName} baseline={L.groom} size={150} at={116} color={CREAM} glow={NIGHT_GLOW} weight={500} />

        {/* R.S.V.P. (left) and W.B.C.F. (right) */}
        <Lines text={data.rsvpLabel} baseline={L.labels} lineHeight={0} fontSize={44} italic color={LABEL} glow={NIGHT_GLOW} at={152} cx={95} align="start" />
        <Lines text={data.rsvp} baseline={L.rsvp} lineHeight={56} fontSize={44} italic color={CREAM} glow={NIGHT_GLOW} at={158} cx={95} align="start" stagger={6} maxWidth={495} />
        <Lines text={data.wbcfLabel} baseline={L.labels} lineHeight={0} fontSize={44} italic color={LABEL} glow={NIGHT_GLOW} at={164} cx={985} align="end" />
        <Lines text={data.wbcf} baseline={L.rsvp} lineHeight={56} fontSize={44} italic color={CREAM} glow={NIGHT_GLOW} at={170} cx={985} align="end" stagger={6} maxWidth={495} />

        {/* ---- With Love ---- and the signature */}
        {[-1, 1].map((dir) => {
          const draw = progress(frame, 184, 30, EASE_IN_OUT);
          return (
            <div
              key={dir}
              style={{
                position: "absolute",
                top: love - 16,
                left: dir < 0 ? 300 : 650,
                width: 130,
                height: 2,
                background: `linear-gradient(${dir < 0 ? 90 : 270}deg, rgba(234,219,198,0), rgba(234,219,198,0.9))`,
                transform: `scaleX(${draw})`,
                transformOrigin: dir < 0 ? "100% 50%" : "0% 50%",
              }}
            />
          );
        })}
        <Lines text={data.signOff} baseline={love} lineHeight={0} fontSize={50} italic color={CREAM} glow={NIGHT_GLOW} at={180} />
        <Lines text={data.signature} baseline={signature} lineHeight={0} fontSize={112} font={SCRIPT} weight={400} color={CREAM} glow={NIGHT_GLOW} at={196} />
      </AbsoluteFill>

    </AbsoluteFill>
  );
}
