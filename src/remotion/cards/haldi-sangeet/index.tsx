import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import type { CardProps } from "@/lib/types";
import { getTheme } from "@/lib/theme";
import { ThemeContext } from "@/remotion/ThemeContext";
import { config, defaultData } from "./config";
import type { HaldiSangeetData } from "./types";
import Intro from "./frames/Intro";
import Haldi from "./frames/Haldi";
import Sangeet from "./frames/Sangeet";
import Outro from "./frames/Outro";
import { EndToBlack, Transition, type TransitionKind } from "./frames/Watercolor";
import { RevealSpeed, loadFonts } from "./frames/shared";
import { VARIANTS, VariantContext, type VariantId } from "./variant";

loadFonts();

const FRAMES: Record<string, ComponentType<{ data: HaldiSangeetData }>> = {
  intro: Intro,
  haldi: Haldi,
  sangeet: Sangeet,
  outro: Outro,
};

/**
 * How each screen comes in -- every transition is a watercolour bleed. A screen's Sequence
 * starts `dur` frames before its slot so it overlaps the end of the previous screen; its own
 * timings (frames/*.tsx) count from the start of its transition.
 */
export const TRANSITIONS: Record<string, { kind: TransitionKind; dur: number }> = {
  intro: { kind: "fromBlack", dur: 60 },
  haldi: { kind: "toHaldi", dur: 75 },
  sangeet: { kind: "toSangeet", dur: 75 },
  outro: { kind: "toNight", dur: 84 },
};

/**
 * Every text entrance plays at this fraction of its authored speed: lines settle in slowly
 * and one after another, so the card reads unhurried. Ambient motion keeps the real clock.
 */
const REVEAL_SPEED = 0.7;

// The card ends on black: a slow fade, then a short hold.
const END_FADE = 54;
const END_HOLD = 24;

/**
 * Navkar Mantra (from the user's "NAVKAR+MANTRA.mp3"). The 33.5 s chant is repeated once with
 * an equal-power crossfade (the seam falls as the outro's evening sets in) and normalised to a
 * gentle -19 LUFS. It fades in over 1 s and out over the last 2.5 s, so it falls silent
 * 0.8 s after the picture has gone black.
 */
const MUSIC = "cards/haldi-sangeet/audio/navkar-mantra.wav";
const MUSIC_FADE_IN = 30;
const MUSIC_FADE_OUT = 75;

export type CardCompositionProps = {
  config: typeof config;
  activeThemeId: string;
  props: CardProps;
};

const makeComposition = (variant: VariantId): React.FC<CardCompositionProps> => {
  const Card: React.FC<CardCompositionProps> = ({ config: cfg, activeThemeId, props }) => {
    const data: HaldiSangeetData = { ...defaultData, ...(props.data as Partial<HaldiSangeetData>) };
    let slotStart = 0;
    const total = cfg.frames.reduce((s, f) => s + f.durationInFrames, 0);
    return (
      <VariantContext.Provider value={VARIANTS[variant]}>
        <ThemeContext.Provider value={getTheme(cfg, activeThemeId)}>
          <AbsoluteFill style={{ backgroundColor: "#000" }}>
            <Audio
              src={staticFile(MUSIC)}
              volume={(f) =>
                interpolate(f, [0, MUSIC_FADE_IN, total - MUSIC_FADE_OUT, total - 1], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
            {cfg.frames.map((f, i) => {
              const Frame = FRAMES[f.id];
              if (!Frame) throw new Error(`haldi-sangeet has no component for "${f.id}"`);
              const tr = TRANSITIONS[f.id];
              const lead = i === 0 ? 0 : tr.dur;
              const from = slotStart - lead;
              slotStart += f.durationInFrames;
              return (
                <Sequence key={f.id} from={from} durationInFrames={f.durationInFrames + lead} name={f.id}>
                  <Transition kind={tr.kind} dur={tr.dur}>
                    <RevealSpeed.Provider value={REVEAL_SPEED}>
                      <Frame data={data} />
                    </RevealSpeed.Provider>
                  </Transition>
                </Sequence>
              );
            })}
            <EndToBlack start={total - END_HOLD - END_FADE} dur={END_FADE} />
          </AbsoluteFill>
        </ThemeContext.Provider>
      </VariantContext.Provider>
    );
  };
  return Card;
};

/** 1080 x 2624 */
export const Composition = makeComposition("tall");
/** 1080 x 2340 (19.5:9) */
export const CompositionMobile = makeComposition("mobile");
