import type { CardProps } from "@/lib/types";
import { getTheme } from "@/lib/theme";
import { CardComposer, type FrameMap } from "@/remotion/CardComposer";
import { config, defaultData } from "./config";
import type { CinematicData } from "./types";
import Frame01 from "./frames/Frame01";
import Frame02 from "./frames/Frame02";
import Frame03 from "./frames/Frame03";
import Frame04 from "./frames/Frame04";
import Frame05 from "./frames/Frame05";
import Frame06 from "./frames/Frame06";

// Frames take CinematicData; CardComposer is typed against the generic CardProps data.
const frames = {
  "frame-01": Frame01,
  "frame-02": Frame02,
  "frame-03": Frame03,
  "frame-04": Frame04,
  "frame-05": Frame05,
  "frame-06": Frame06,
} as unknown as FrameMap;

export type CardCompositionProps = {
  config: typeof config;
  activeThemeId: string;
  props: CardProps;
};

export const Composition: React.FC<CardCompositionProps> = ({
  config: cfg,
  activeThemeId,
  props,
}) => {
  const merged: CinematicData = { ...defaultData, ...(props.data as Partial<CinematicData>) };
  return (
    <CardComposer
      config={cfg}
      activeTheme={getTheme(cfg, activeThemeId)}
      props={{ data: { ...merged } }}
      frames={frames}
    />
  );
};
