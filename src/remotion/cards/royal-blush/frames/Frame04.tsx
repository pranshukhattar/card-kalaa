import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import manifest from "../generated/manifest.json";
import type { RoyalBlushData } from "../types";
import { Petals } from "./Petals";
import { WarpedPlate } from "./WarpedPlate";
import { Divider, EASE_IN_OUT, GOLD, Icon, Lines, asset, progress } from "./shared";

const L = manifest.s4.layers;

// One event at a time in the middle of the card; the background and date stay put.
// Everything sits well above the bottom ~600 px, which video players cover with controls.
const FIRST = 40; // first event starts as the golden wash finishes
const PERIOD = 155; // frames per event (~5 s)
const OUT_AT = 135; // frame within an event's period where it starts to leave
const ILLUS_BOTTOM = 1500; // illustrations stand on this line
const ILLUS_MAX_W = 900;
const ILLUS_MAX_H = 640;

/** Screen 4 - the day's events: dinner, then ceremony, then bidai, in the same frame. */
export default function Frame04({ data }: { data: RoyalBlushData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const zoom = 1 + 0.02 * progress(frame, 0, durationInFrames, (x) => x);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBEFE3", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 40%" }}>
        <WarpedPlate id="s4" src={asset("s4/plate.jpg")} wind={{ mask: asset("s4/wind.png"), amp: 5, freq: "0.006", vx: 24, vy: 14, seed: 11 }} />

        <Petals seed={4} count={10} breeze={50} fall={80} />

        {/* shared for all three events: heading, date and venue */}
        <Lines text={data.weddingTitle} baseline={470} lineHeight={0} fontSize={72} at={16} letterSpacing={1} />
        <Divider y={532} half={250} at={24} ornament={80} />
        <Lines text={data.weddingDate} baseline={622} lineHeight={0} fontSize={58} at={30} />
        <Icon kind="pin" cx={540} cy={680} size={48} at={36} />
        <Lines text={data.weddingVenue} baseline={762} lineHeight={62} fontSize={54} italic at={38} stagger={6} />

        {data.events.map((ev, i) => {
          const start = FIRST + i * PERIOD;
          const local = frame - start;
          if (local < -2) return null;
          const last = i === data.events.length - 1;
          if (!last && local > OUT_AT + 24) return null;
          const out = last ? 0 : progress(frame, start + OUT_AT, 22, EASE_IN_OUT);

          const name = ev.illustration;
          const box = L[name];
          const scale = Math.min(ILLUS_MAX_W / box.w, ILLUS_MAX_H / box.h);
          const w = box.w * scale;
          const h = box.h * scale;
          const p = progress(frame, start, 32);
          const bob = name === "doli" ? 3 * Math.sin(t * 1.6) : 2 * Math.sin(t * 1.1 + i);
          const tilt = name === "doli" ? 0.35 * Math.sin(t * 1.6 - 0.8) : 0;
          const venue = ev.venue ?? "";
          return (
            <AbsoluteFill
              key={i}
              style={{
                opacity: 1 - out,
                transform: `translateY(${-18 * out}px)`,
                filter: out > 0 ? `blur(${out * 6}px)` : undefined,
              }}
            >
              <Img
                src={asset(`s4/${name}.png`)}
                style={{
                  position: "absolute",
                  left: 540 - w / 2,
                  top: ILLUS_BOTTOM - h,
                  width: w,
                  height: h,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 34 + bob}px) scale(${0.95 + 0.05 * p}) rotate(${tilt}deg)`,
                  transformOrigin: "50% 85%",
                  filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
                }}
              />
              <Lines text={ev.title} baseline={1642} lineHeight={0} fontSize={ev.title.length > 16 ? 66 : 76} at={start + 14} letterSpacing={1} />
              {ev.time && (
                <>
                  <Icon kind="clock" cx={420} cy={1722} size={60} at={start + 24} />
                  <Lines text={ev.time} baseline={1743} lineHeight={0} fontSize={64} at={start + 26} cx={578} />
                </>
              )}
              {venue && (
                <>
                  <Icon kind="pin" cx={300} cy={1810} size={58} at={start + 34} />
                  <Lines text={venue} baseline={1831} lineHeight={64} fontSize={60} at={start + 36} cx={605} stagger={6} />
                </>
              )}
              {ev.note && <Lines text={ev.note} baseline={ev.time ? 1830 : 1743} lineHeight={0} fontSize={66} italic at={start + 30} />}
            </AbsoluteFill>
          );
        })}

        <Divider y={1905} half={240} at={FIRST + 40} ornament={64} />
        {/* which of the three events is showing */}
        <svg width={160} height={30} style={{ position: "absolute", left: 460, top: 1945, opacity: progress(frame, FIRST + 40, 20) }}>
          {data.events.map((_, i) => {
            const at = FIRST + i * PERIOD;
            const on = interpolate(frame, [at + 6, at + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const off = i < data.events.length - 1 ? progress(frame, at + PERIOD, 18) : 0;
            const lit = Math.max(0, on - off);
            return <circle key={i} cx={40 + i * 40} cy={15} r={5 + 2 * lit} fill={GOLD} opacity={0.35 + 0.65 * lit} />;
          })}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
