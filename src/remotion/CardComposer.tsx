import type { ComponentType } from "react";
import { Sequence } from "remotion";
import type { CardConfig, CardProps, Theme } from "@/lib/types";
import { ThemeContext } from "./ThemeContext";

export type FrameComponent = ComponentType<{ data: CardProps["data"] }>;
// Maps FrameConfig.id (e.g. "frame-01") to its component (e.g. Frame01)
export type FrameMap = Record<string, FrameComponent>;

export type CardComposerProps = {
  config: CardConfig;
  activeTheme: Theme;
  props: CardProps;
  frames: FrameMap;
};

export const CardComposer: React.FC<CardComposerProps> = ({
  config,
  activeTheme,
  props,
  frames,
}) => {
  let from = 0;

  return (
    <ThemeContext.Provider value={activeTheme}>
      {config.frames.map((frame) => {
        const Frame = frames[frame.id];
        if (!Frame) {
          throw new Error(`Card "${config.id}" has no component for frame "${frame.id}"`);
        }
        const start = from;
        from += frame.durationInFrames;
        return (
          <Sequence key={frame.id} from={start} durationInFrames={frame.durationInFrames}>
            <Frame data={props.data} />
          </Sequence>
        );
      })}
    </ThemeContext.Provider>
  );
};
