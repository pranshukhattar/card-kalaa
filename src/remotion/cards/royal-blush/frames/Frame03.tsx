import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { useVariant } from "../variant";
import type { RoyalBlushData } from "../types";
import { Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { Divider, Icon, Lines, Twinkle, progress, rand, wobble } from "./shared";

const DEG = Math.PI / 180;

/** Screen 3 - Ladies Sangeet: swinging lanterns, dancing girls, confetti of petals. */
export default function Frame03({ data }: { data: RoyalBlushData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v = useVariant();
  const L = v.L.s3;
  const LANTERNS = v.manifest.s3.lanterns;
  const DANCERS = v.manifest.s3.dancers;
  const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (x) => x);

  // each lantern swings on its chain with its own period and phase (degrees)
  const swing = (i: number) => [2.0, 1.6, 1.8, 2.4][i] * Math.sin((2 * Math.PI * t) / [3.4, 3.0, 3.7, 2.6][i] + [0, 1.9, 3.6, 0.8][i]);
  // dancers: a sway on the beat (~1.9 s) and skirts that follow a beat behind
  const beat = (2 * Math.PI * t) / 1.9;
  const sway = { da: 1.4 * Math.sin(beat), db: 1.25 * Math.sin(beat + 1.9) };
  const skirt = { sa: 1.2 * Math.sin(beat - 1.0), sb: 1.0 * Math.sin(beat + 0.9) };

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEFE3", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 40%" }}>
        {/* still background (dancers and lanterns removed); only the flowers sway */}
        <WarpedPlate
          id="s3"
          src={v.asset("s3/plate.jpg")}
          wind={{ mask: v.asset("s3/wind.png"), amp: 4.5, freq: "0.006", vx: 28, vy: 8, seed: 9 }}
        />

        {/* hanging lanterns, each cut out and swinging about the top of its chain */}
        {LANTERNS.map((l, i) => {
          const a = swing(i);
          const [px, py] = l.pivot;
          return (
            <Img
              key={i}
              src={v.asset(`s3/lantern-${i}.png`)}
              style={{
                position: "absolute",
                left: l.box.x,
                top: l.box.y,
                width: l.box.w,
                height: l.box.h,
                transformOrigin: `${px - l.box.x}px ${py - l.box.y}px`,
                transform: `rotate(${a}deg)`,
              }}
            />
          );
        })}
        {/* warm, flickering glow that swings with each lantern */}
        <AbsoluteFill style={{ mixBlendMode: "screen" }}>
          {LANTERNS.map((l, i) => {
            const th = swing(i) * DEG;
            const [px, py] = l.pivot;
            const [cx, cy] = l.center;
            const gx = px + (cx - px) * Math.cos(th) - (cy - py) * Math.sin(th);
            const gy = py + (cx - px) * Math.sin(th) + (cy - py) * Math.cos(th);
            const flicker = 0.75 + 0.15 * wobble(t * 3.1, i) + 0.1 * Math.sin(t * 17 + i * 3);
            const r = l.size * 1.5;
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
                  background: "radial-gradient(circle, rgba(255,214,140,0.7) 0%, rgba(255,190,110,0.28) 35%, rgba(255,180,100,0) 70%)",
                  opacity: flicker,
                }}
              />
            );
          })}
        </AbsoluteFill>

        {/* the dancers, cut out as one layer: upper bodies sway, skirts swish */}
        <WarpedPlate
          id="s3-dancers"
          src={v.asset("s3/dancers.png")}
          box={DANCERS}
          base={false}
          maps={[
            { href: v.asset("s3/map-da.png"), weight: sway.da },
            { href: v.asset("s3/map-db.png"), weight: sway.db },
            { href: v.asset("s3/map-sa.png"), weight: skirt.sa },
            { href: v.asset("s3/map-sb.png"), weight: skirt.sb },
          ]}
        />

        {/* gold glitter in the air above the dancers */}
        {Array.from({ length: 18 }, (_, i) => {
          const period = 1.6 + rand(i + 5) * 2;
          const ph = ((t + rand(i) * period) % period) / period;
          const a = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 4;
          return (
            <Twinkle
              key={i}
              x={60 + rand(i + 20) * 960}
              y={L.glitterY + rand(i + 40) * 700 - 30 * ph}
              size={6 + 8 * rand(i + 60)}
              intensity={a * 0.85}
              color="#FFE6A8"
            />
          );
        })}

        <Petals seed={3} count={14} breeze={70} fall={90} />

        <Lines
          text={data.sangeetTitle}
          baseline={L.title}
          lineHeight={L.titleLH}
          fontSize={L.titleSize}
          at={40}
          weight={500}
          letterSpacing={2}
        />
        <Divider y={L.divider} half={235} at={68} ornament={92} />

        {(() => {
          // date / time / venue rows stacked from y = 985; a row may wrap to two lines and
          // the time row disappears when no time is given
          const rows = [
            { kind: "calendar" as const, text: data.sangeetDate },
            { kind: "clock" as const, text: data.sangeetTime },
            { kind: "pin" as const, text: data.sangeetVenue },
          ].filter((r) => r.text.trim());
          const LINE = L.rowLine;
          const GAP = L.rowGap;
          let y = L.rows;
          const out = rows.map((r, i) => {
            const n = r.text.split("\n").length;
            const first = y;
            y += n * LINE + GAP;
            const at = 82 + i * 12;
            return (
              <div key={r.kind}>
                <Icon kind={r.kind} cx={300} cy={first - 21 + ((n - 1) * LINE) / 2} size={64} at={at} />
                <Lines text={r.text} baseline={first} lineHeight={LINE} fontSize={L.rowSize} at={at + 2} cx={625} stagger={6} />
              </div>
            );
          });
          const lastRow = y - GAP - LINE; // baseline of the last row's last line
          const lineY = Math.max(L.line, lastRow + LINE + 48);
          return (
            <>
              {out}
              <Lines text={data.sangeetLine} baseline={lineY} lineHeight={0} fontSize={L.lineSize} italic at={128} />
              <Divider y={lineY + (L.divider2 - L.line)} half={170} at={142} ornament={64} cx={560} />
            </>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
