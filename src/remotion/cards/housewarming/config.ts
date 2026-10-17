import type { CardConfig } from "@/lib/types";

export const config: CardConfig = {
  id: "housewarming",
  label: "Housewarming",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "light",
  themes: [
    {
      id: "light",
      label: "Light — cream / marigold / red / dark brown",
      palette: {
        background: "#FFFDD0",
        primary: "#FFB81C",
        secondary: "#FFB81C",
        accent: "#C8102E",
        text: "#3E2723",
      },
    },
    {
      id: "dark",
      label: "Dark — terracotta / brass / burnt orange / ivory",
      palette: {
        background: "#E2725B",
        primary: "#B5A642",
        secondary: "#B5A642",
        accent: "#CC5500",
        text: "#FFFFF0",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 90 },
    { id: "frame-02", durationInFrames: 90 },
  ],
};
