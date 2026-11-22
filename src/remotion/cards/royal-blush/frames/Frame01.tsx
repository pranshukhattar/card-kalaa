import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { RoyalBlushData } from "../types";
import { Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { Divider, EASE_IN_OUT, Lines, Twinkle, progress, rand, useRevealFrame, wobble } from "./shared";


/** Screen 1 - Shree Ganeshaya Namah: the gold Ganesha is painted in, then the invocation. */
export default function Frame01({ data }: { data: RoyalBlushData }) {
  const frame = useCurrentFrame();
  const rf = useRevealFrame(); // entrances (sped up on this screen); ambient motion uses frame / t
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const L = v.L.s1;
  const G = L.ganesha;

  const zoom = 1 + 0.035 * progress(frame, 0, durationInFrames, (x) => x);

  // Ganesha: a soft edge sweeps down the figure (as if painted), then a light glint crosses it
  const draw = progress(rf, 14, 62, EASE_IN_OUT);
  const edge = -10 + draw * 125;
  const drawMask = `linear-gradient(180deg, #000 ${edge - 12}%, transparent ${edge}%)`;
  const glow = 0.35 + 0.25 * progress(rf, 60, 30) + 0.1 * Math.sin(t * 1.7);
  const shine = ((rf - 78) % 120) / 55; // a glint every 4 s
  const shineX = -40 + Math.min(1, Math.max(0, shine)) * 180;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEFE3", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 42%" }}>
        <WarpedPlate
          id="s1"
          src={v.asset("s1/plate.jpg")}
          wind={{ mask: v.asset("s1/wind.png"), amp: 4.5, freq: "0.0065", vx: 26, vy: 9, seed: 3 }}
          maps={[{ href: v.asset("s1/map-a.png"), weight: 0.9 * Math.sin((2 * Math.PI * t) / 3.8) }]}
        />

        {/* sunlight falling through the arch */}
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.55 + 0.15 * wobble(t * 0.4, 2) }}>
          {[
            { x: 380, r: 13, w: 120, o: 0.5 },
            { x: 520, r: 9, w: 70, o: 0.4 },
            { x: 640, r: 5, w: 150, o: 0.35 },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: b.x + 30 * Math.sin(t * 0.25 + i),
                top: -100,
                width: b.w,
                height: 1500,
                transform: `rotate(${b.r}deg)`,
                transformOrigin: "50% 0%",
                background: "linear-gradient(180deg, rgba(255,240,215,0.55), rgba(255,240,215,0) 85%)",
                filter: "blur(28px)",
                opacity: b.o * (0.75 + 0.25 * Math.sin(t * 0.9 + i * 2)),
              }}
            />
          ))}
        </AbsoluteFill>

        {/* gold Ganesha */}
        <div
          style={{
            position: "absolute",
            left: G.x,
            top: G.y,
            width: G.w,
            height: G.h,
            WebkitMaskImage: drawMask,
            maskImage: drawMask,
            filter: `drop-shadow(0 0 ${10 + 8 * glow}px rgba(232, 180, 110, ${glow}))`,
          }}
        >
          <Img src={v.asset("s1/ganesha.png")} style={{ width: "100%", height: "100%" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${v.asset("s1/ganesha.png")})`,
              WebkitMaskSize: "100% 100%",
              maskImage: `url(${v.asset("s1/ganesha.png")})`,
              maskSize: "100% 100%",
              background: `linear-gradient(115deg, transparent ${shineX - 18}%, rgba(255, 246, 214, 0.95) ${shineX}%, transparent ${shineX + 18}%)`,
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* gold dust rising around the figure */}
        {Array.from({ length: 14 }, (_, i) => {
          const life = 4 + rand(i) * 3;
          const local = (t + rand(i + 40) * life) % life;
          const x = G.x + G.w * (0.05 + 0.9 * rand(i + 80)) + 14 * Math.sin(local * 1.2 + i);
          const y = G.y + G.h * 0.95 - local * (40 + 30 * rand(i + 120));
          const a = Math.sin((local / life) * Math.PI) * progress(rf, 40, 30);
          return <Twinkle key={i} x={x} y={y} size={5 + 6 * rand(i + 160)} intensity={a * 0.9} color="#FFE7B0" />;
        })}

        <Petals seed={1} count={9} breeze={45} fall={80} />

        <Lines text={data.invocation} baseline={L.invocation} lineHeight={L.invocationLH} fontSize={100} at={72} letterSpacing={1} />
        <Divider y={L.divider} half={212} at={100} ornament={84} />
        <Lines text={data.blessingIntro} baseline={L.blessingIntro} lineHeight={62} fontSize={56} italic at={116} stagger={10} />
        <Lines text={data.blessingNames} baseline={L.blessingNames} lineHeight={64} fontSize={57} weight={500} at={138} stagger={10} />
      </AbsoluteFill>

    </AbsoluteFill>
  );
}
