import type { CardProps } from "@/lib/types";
import { getTheme } from "@/lib/theme";
import { CardComposer, type FrameMap } from "@/remotion/CardComposer";
import { config } from "./config";
import Frame01 from "./frames/Frame01";
import Frame02 from "./frames/Frame02";

const frames: FrameMap = {
  "frame-01": Frame01,
  "frame-02": Frame02,
};

export type CardCompositionProps = {
  config: typeof config;
  activeThemeId: string;
  props: CardProps;
};

export const Composition: React.FC<CardCompositionProps> = ({
  config: cfg,
  activeThemeId,
  props,
}) => (
  <CardComposer
    config={cfg}
    activeTheme={getTheme(cfg, activeThemeId)}
    props={props}
    frames={frames}
  />
);
