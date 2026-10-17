export type Theme = {
  id: string;
  label: string;
  palette: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
};

export type FrameConfig = {
  id: string;
  durationInFrames: number;
};

export type CardConfig = {
  id: string;
  label: string;
  fps: number;
  width: number;
  height: number;
  defaultThemeId: string;
  themes: Theme[];
  frames: FrameConfig[];
};

// Placeholder for future per-card data (names, dates, venue)
export type CardProps = {
  data: Record<string, unknown>;
};
