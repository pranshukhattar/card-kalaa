import type { ComponentType } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { CardProps } from "@/lib/types";
import { getTheme } from "@/lib/theme";
import { ThemeContext } from "@/remotion/ThemeContext";
import { config, defaultData } from "./config";
import type { RoyalBlushData } from "./types";
import Frame01 from "./frames/Frame01";
import Frame02 from "./frames/Frame02";
import Frame03 from "./frames/Frame03";
import Frame04 from "./frames/Frame04";
import Frame05 from "./frames/Frame05";
import { Transition, type TransitionKind } from "./frames/transitions";
import { loadFonts } from "./frames/shared";

loadFonts();

const FRAMES: Record<string, ComponentType<{ data: RoyalBlushData }>> = {
  "frame-01": Frame01,
  "frame-02": Frame02,
  "frame-03": Frame03,
  "frame-04": Frame04,
  "frame-05": Frame05,
};

/**
 * How each screen comes in. A screen's Sequence starts `dur` frames before its slot so it
 * overlaps the end of the previous screen; its own animation timings (frames/FrameNN.tsx)
 * count from the start of its transition.
 */
export const TRANSITIONS: Record<string, { kind: TransitionKind; dur: number }> = {
  "frame-01": { kind: "intro", dur: 30 },
  "frame-02": { kind: "crossfade", dur: 30 },
  "frame-03": { kind: "splash", dur: 42 },
  "frame-04": { kind: "wash", dur: 40 },
  "frame-05": { kind: "dusk", dur: 48 },
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
export const Composition: React.FC<CardCompositionProps> = ({ config: cfg, activeThemeId, props }) => {
  const data: RoyalBlushData = { ...defaultData, ...(props.data as Partial<RoyalBlushData>) };
  let slotStart = 0;
  return (
    <ThemeContext.Provider value={getTheme(cfg, activeThemeId)}>
      <AbsoluteFill style={{ backgroundColor: "#FBEFE3" }}>
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
                <Frame data={data} />
              </Transition>
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};
