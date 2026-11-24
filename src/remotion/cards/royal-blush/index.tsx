import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardProps } from "@/lib/types";
import { getTheme } from "@/lib/theme";
import { ThemeContext } from "@/remotion/ThemeContext";
import { config, defaultData } from "./config";
import type { RoyalBlushData } from "./types";
import Frame01 from "./frames/Frame01";
import Frame02 from "./frames/Frame02";
import Frame04 from "./frames/Frame04";
import Frame05 from "./frames/Frame05";
import { Transition, type TransitionKind } from "./frames/transitions";
import { EASE_IN_OUT, RevealSpeed, loadFonts } from "./frames/shared";
import { VARIANTS, VariantContext, type VariantId } from "./variant";

loadFonts();

const FRAMES: Record<string, ComponentType<{ data: RoyalBlushData }>> = {
  "frame-01": Frame01,
  "frame-02": Frame02,
  "frame-04": Frame04,
  "frame-05": Frame05,
};

/**
 * How each screen comes in. A screen's Sequence starts `dur` frames before its slot so it
 * overlaps the end of the previous screen; its own animation timings (frames/FrameNN.tsx)
 * count from the start of its transition.
 */
export const TRANSITIONS: Record<string, { kind: TransitionKind; dur: number }> = {
  "frame-01": { kind: "intro", dur: 30 }, // cross-fade in from black
  "frame-02": { kind: "crossfade", dur: 30 },
  "frame-04": { kind: "wash", dur: 40 },
  "frame-05": { kind: "dusk", dur: 48 },
};

/**
 * Screens 1 and 2 are 1 s shorter than first designed (225 -> 195 frames). Their entrances
 * play faster so each still holds its finished text as long before moving on:
 * screen 1's last line finished at 174 of 225 (51 frames left); 174 / 1.21 = 144 of 195.
 */
const REVEAL_SPEED: Record<string, number> = { "frame-01": 1.21, "frame-02": 1.25 };

/** Background music: the track from the "Pallavi Card V1" edit (see public/cards/royal-blush/audio). */
const MUSIC = "cards/royal-blush/audio/pallavi-card-v1.wav";
const FADE_IN = 9; // 0.3 s

// The card ends on black: the last screen cross-fades to black, black holds briefly, and the
// music fades out over the last 2 s so it stops END_HOLD frames (0.8 s, < 1 s) after the
// picture has gone fully black.
const END_FADE = 30; // 1 s picture -> black
const END_HOLD = 24; // 0.8 s of black
const MUSIC_FADE_OUT = 60; // 2 s, ending on the last frame

const EndToBlack: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const start = total - END_HOLD - END_FADE;
  if (frame < start) return null;
  const o = interpolate(frame, [start, start + END_FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity: o }} />;
};

export type CardCompositionProps = {
  config: typeof config;
  activeThemeId: string;
  props: CardProps;
};

/**
 * This card does not use CardComposer: its screens overlap during transitions, which
 * CardComposer's back-to-back Sequences can't express. Total length is still the sum
 * of config.frames, so Root's duration maths is unchanged.
 */
const makeComposition = (variant: VariantId): React.FC<CardCompositionProps> => {
  const Card: React.FC<CardCompositionProps> = ({ config: cfg, activeThemeId, props }) => {
    const data: RoyalBlushData = { ...defaultData, ...(props.data as Partial<RoyalBlushData>) };
    let slotStart = 0;
    const total = cfg.frames.reduce((s, f) => s + f.durationInFrames, 0);
    return (
      <VariantContext.Provider value={VARIANTS[variant]}>
        <ThemeContext.Provider value={getTheme(cfg, activeThemeId)}>
          <AbsoluteFill style={{ backgroundColor: "#FBEFE3" }}>
            <Audio
              src={staticFile(MUSIC)}
              volume={(f) =>
                interpolate(f, [0, FADE_IN, total - MUSIC_FADE_OUT, total - 1], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
            {cfg.frames.map((f, i) => {
              const Frame = FRAMES[f.id];
              if (!Frame) throw new Error(`royal-blush has no component for "${f.id}"`);
              const tr = TRANSITIONS[f.id];
              const lead = i === 0 ? 0 : tr.dur;
              const from = slotStart - lead;
              slotStart += f.durationInFrames;
              return (
                <Sequence key={f.id} from={from} durationInFrames={f.durationInFrames + lead} name={f.id}>
                  <Transition kind={tr.kind} dur={tr.dur}>
                    <RevealSpeed.Provider value={REVEAL_SPEED[f.id] ?? 1}>
                      <Frame data={data} />
                    </RevealSpeed.Provider>
                  </Transition>
                </Sequence>
              );
            })}
            <EndToBlack total={total} />
          </AbsoluteFill>
        </ThemeContext.Provider>
      </VariantContext.Provider>
    );
  };
  return Card;
};

/** 1080 x 2624: the original artwork proportions. */
export const Composition = makeComposition("tall");
/** 1080 x 2340 (19.5:9): fills the width of nearly every modern phone. */
export const CompositionMobile = makeComposition("mobile");
