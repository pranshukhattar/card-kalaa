import type { CardConfig } from "@/lib/types";

export const config: CardConfig = {
  id: "caricature",
  label: "Caricature",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "light",
  themes: [
    {
      id: "light",
      label: "Light — ivory / blush / marigold / burgundy",
      palette: {
        background: "#FFFFF0",
        primary: "#F4C2C2",
        secondary: "#F4C2C2",
        accent: "#FFB81C",
        text: "#800020",
      },
    },
    {
      id: "dark",
      label: "Dark — aubergine / copper / gold / ivory",
      palette: {
        background: "#3B1F3A",
        primary: "#B87333",
        secondary: "#B87333",
        accent: "#D4AF37",
        text: "#FFFFF0",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 90 },
    { id: "frame-02", durationInFrames: 90 },
  ],
};
