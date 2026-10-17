import type { CardConfig } from "@/lib/types";

export const config: CardConfig = {
  id: "multi-event",
  label: "Multi Event",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "light",
  themes: [
    {
      id: "light",
      label: "Light — cream / sage / copper / dark brown",
      palette: {
        background: "#FFFDD0",
        primary: "#9CAF88",
        secondary: "#9CAF88",
        accent: "#B87333",
        text: "#3E2723",
      },
    },
    {
      id: "dark",
      label: "Dark — espresso / teal / gold / ivory",
      palette: {
        background: "#3C2415",
        primary: "#008080",
        secondary: "#008080",
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
