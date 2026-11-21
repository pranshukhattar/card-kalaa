import type { CardConfig } from "@/lib/types";
import type { CinematicData } from "./types";

export const config: CardConfig = {
  id: "cinematic",
  label: "Cinematic Trailer",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "dark",
  themes: [
    {
      id: "dark",
      label: "Dark",
      palette: {
        background: "#0D0D0D",
        primary: "#E8C872",
        secondary: "#4A1A3A",
        accent: "#B87333",
        text: "#F5F0E8",
      },
    },
    {
      id: "light",
      label: "Light",
      palette: {
        background: "#F0DDBC",
        primary: "#5A1747",
        secondary: "#B5541F",
        accent: "#E2A52B",
        text: "#1A0D14",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 75 },
    { id: "frame-02", durationInFrames: 75 },
    { id: "frame-03", durationInFrames: 90 },
    { id: "frame-04", durationInFrames: 105 },
    { id: "frame-05", durationInFrames: 75 },
    { id: "frame-06", durationInFrames: 90 },
  ],
};

export const defaultData: CinematicData = {
  groomName: "AARAV",
  brideName: "PRIYA",
  weddingDate: "14.02.2027",
  venueName: "THE LEELA PALACE",
  city: "NEW DELHI",
  openingLine: "THIS DECEMBER",
  closingLine: "YOU ARE INVITED",
};
