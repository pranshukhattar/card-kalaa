import type { CardConfig } from "@/lib/types";

export const config: CardConfig = {
  id: "cinematic",
  label: "Cinematic",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "light",
  themes: [
    {
      id: "light",
      label: "Light — off-white / plum / copper / near black",
      palette: {
        background: "#FAF9F6",
        primary: "#8E4585",
        secondary: "#8E4585",
        accent: "#B87333",
        text: "#111111",
      },
    },
    {
      id: "dark",
      label: "Dark — near black / pale gold / plum / ivory",
      palette: {
        background: "#111111",
        primary: "#E6D690",
        secondary: "#E6D690",
        accent: "#8E4585",
        text: "#FFFFF0",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 90 },
    { id: "frame-02", durationInFrames: 90 },
  ],
};
