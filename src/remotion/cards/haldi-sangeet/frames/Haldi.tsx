import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { HaldiSangeetData } from "../types";
import { MARIGOLDS, Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { DISPLAY, Glow, IconRow, Lines, LotusDivider, Twinkle, caps, mixed, progress, rand, stack, wobble } from "./shared";
import { HangingLanterns } from "./Lanterns";

const INK = "#A26125";

/** Haldi: sunlit marigolds sway, lanterns swing, petals blow past, haldi dust glows over the bowl. */
export default function Haldi({ data }: { data: HaldiSangeetData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const M = v.manifest.s2;
  const D = M.extra;
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);

  // the haldi mound in the brass bowl (artwork coordinates, moved down with the bottom)
  const bowl = { x: 270, y: 1492 + D };

  const invite = mixed(64);
  const title = caps(232);
  const of = mixed(64);
  const tagLines = data.haldiLine.split("\n").length;
  const tag = mixed(62, tagLines, 84);
  const time = mixed(56);
  const [yInvite, yTitle, yOf, yTag, yDiv, yTime] = stack(M.zone as [number, number], [
    { h: invite.h },
    { h: title.h, gap: 40 },
    { h: of.h, gap: 40 },
    { h: tag.h, gap: 66 },
    { h: 0, gap: 70 },
    { h: time.h, gap: 70 },
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEAD2", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 40%" }}>
        <WarpedPlate
          id="haldi"
          src={v.asset("s2/plate.jpg")}
          noises={[
            { mask: v.asset("s2/wind.png"), amp: 4.5, freq: "0.006", vx: 30, vy: 9, seed: 7 },
            { mask: v.asset("s2/drift.png"), amp: 6, freq: "0.0022", vx: 10, vy: 3, seed: 4 },
          ]}
        />

        {/* warm sunlight pooling over the bowl, and the haldi's own glow */}
        <Glow x={bowl.x + 40} y={bowl.y - 40} r={330} color="rgba(255, 214, 120, 0.6)" opacity={0.32 + 0.1 * Math.sin(t * 1.1)} />

        <HangingLanterns
          lanterns={M.lanterns}
          asset={v.asset}
          dir="s2"
          t={t}
          amp={[1.5, 1.2]}
          period={[4.8, 5.6]}
          glow="rgba(255, 210, 130, 0.62)"
        />

        <HaldiDust x={bowl.x} y={bowl.y} t={t} />

        {/* dust motes in the sunlight */}
        {Array.from({ length: 16 }, (_, i) => {
          const period = 3.4 + rand(i + 3) * 3;
          const ph = ((t + rand(i) * period) % period) / period;
          return (
            <Twinkle
              key={i}
              x={80 + rand(i + 20) * 920 + 14 * Math.sin(t * 0.6 + i)}
              y={250 + rand(i + 40) * (v.height - 700) - 12 * t * (0.3 + rand(i + 5))}
              size={5 + 6 * rand(i + 60)}
              intensity={Math.max(0, Math.sin(ph * Math.PI * 2)) ** 4 * 0.75}
              color="#FFE9A8"
            />
          );
        })}

        <Petals seed={2} count={12} breeze={48} fall={64} palette={MARIGOLDS} shape="marigold" />

        {/* ---- text */}
        <Lines text={data.haldiInvite} baseline={yInvite + invite.base} lineHeight={0} fontSize={64} italic font={DISPLAY} weight={500} color={INK} at={44} />
        <Lines text={data.haldiTitle} baseline={yTitle + title.base} lineHeight={0} fontSize={232} font={DISPLAY} weight={600} letterSpacing={12} color={INK} at={56} />
        <Lines text={data.haldiOf} baseline={yOf + of.base} lineHeight={0} fontSize={64} italic font={DISPLAY} weight={500} color={INK} at={70} />
        <Lines text={data.haldiLine} baseline={yTag + tag.base} lineHeight={84} fontSize={62} italic font={DISPLAY} weight={500} color={INK} at={86} stagger={12} />
        <LotusDivider y={yDiv} half={260} at={110} color={INK} size={58} />
        <IconRow kind="clock" text={data.haldiTime} baseline={yTime + time.base} size={56} at={122} color={INK} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Fine golden haldi powder lifting off the mound in the bowl: soft specks that rise, drift
 * with the breeze, spread and fade.
 */
const HaldiDust: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  const specks = [];
  for (let i = 0; i < 34; i++) {
    const life = 5 + rand(i + 11) * 3.5;
    const local = (t + rand(i) * life) % life;
    const k = local / life;
    const sx = x - 120 + rand(i + 22) * 240;
    const px = sx + 40 * k * (0.5 + rand(i + 33)) + 16 * wobble(local * 0.8, i);
    const py = y + 10 - k * (150 + 160 * rand(i + 44));
    const size = (3 + 6 * rand(i + 55)) * (1 + 0.8 * k);
    const a = Math.sin(Math.PI * k) * (0.45 + 0.4 * rand(i + 66));
    specks.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: px - size,
          top: py - size,
          width: size * 2,
          height: size * 2,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 196, 64, 0.95) 0%, rgba(250, 176, 40, 0.5) 45%, rgba(250, 176, 40, 0) 100%)",
          opacity: a,
        }}
      />,
    );
  }
  return <>{specks}</>;
};
