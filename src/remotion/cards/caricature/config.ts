import type { CardConfig } from "@/lib/types";
import type { CaricatureData } from "./types";

export const config: CardConfig = {
  id: "caricature",
  label: "Caricature Love Story",
  fps: 30,
  width: 1080,
  height: 1920,
  defaultThemeId: "dark",
  themes: [
    {
      id: "dark",
      label: "Dark",
      palette: {
        background: "#2E1A2E",
        primary: "#C48B9F",
        secondary: "#B87333",
        accent: "#C9A227",
        text: "#F5F0E8",
      },
    },
    {
      id: "light",
      label: "Light",
      palette: {
        background: "#F5F0E8",
        primary: "#F4C2C2",
        secondary: "#B2C2A8",
        accent: "#E6A817",
        text: "#5B1A2A",
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 90 },
    { id: "frame-02", durationInFrames: 90 },
    { id: "frame-03", durationInFrames: 90 },
    { id: "frame-04", durationInFrames: 90 },
    { id: "frame-05", durationInFrames: 90 },
    { id: "frame-06", durationInFrames: 120 },
  ],
};

export const defaultData: CaricatureData = {
  groomName: "Aarav",
  brideName: "Priya",
  weddingDate: "12 December 2026",
  venueName: "The Grand Ballroom",
  city: "Jaipur",
  parentsLine: "With the blessings of Mr. & Mrs. Sharma and Mr. & Mrs. Mehta",
};
