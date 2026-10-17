import type { CardConfig } from "@/lib/types";

export const config: CardConfig = {
  id: "palace",
  label: "Palace",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "light",
  themes: [
    {
      id: "light",
      label: "Light — ivory / gold / maroon / burgundy",
      palette: {
        background: "#FFFFF0",
        primary: "#D4AF37",
        secondary: "#D4AF37",
        accent: "#800000",
        text: "#800020",
      },
    },
    {
      id: "dark",
      label: "Dark — burgundy / pale gold / black cherry / ivory",
      palette: {
        background: "#800020",
        primary: "#E6D690",
        secondary: "#E6D690",
        accent: "#2B0A10",
        text: "#FFFFF0",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 90 },
    { id: "frame-02", durationInFrames: 90 },
  ],
};
