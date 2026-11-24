import type { CardConfig } from "@/lib/types";
import type { HaldiSangeetData } from "./types";

/**
 * Haldi + Ladies Sangeet: one video, four screens.
 *   black -> Intro -> Haldi -> Ladies Sangeet -> Outro -> black
 * Frame durations are the time each screen owns on the timeline; the watercolour transition
 * into a screen overlaps the end of the previous one (TRANSITIONS in index.tsx), so the total
 * length is the sum of these.
 */
export const config: CardConfig = {
  id: "haldi-sangeet",
  label: "Haldi & Sangeet",
  fps: 30,
  width: 1080,
  height: 2624,
  defaultThemeId: "watercolour",
  themes: [
    {
      id: "watercolour",
      label: "Watercolour",
      palette: {
        background: "#FBEBDD",
        primary: "#853045", // intro rose-maroon
        secondary: "#A26125", // haldi amber
        accent: "#8E3B60", // sangeet plum
        text: "#843A55", // outro
      },
    },
  ],
  frames: [
    { id: "intro", durationInFrames: 410 },
    { id: "haldi", durationInFrames: 330 },
    { id: "sangeet", durationInFrames: 325 },
    // includes the fade to black and 24 frames of black at the very end
    { id: "outro", durationInFrames: 405 },
  ],
};

/** Same card at 1080 x 2340 (19.5:9), filling the width of modern phones. */
export const configMobile: CardConfig = {
  ...config,
  id: "haldi-sangeet-mobile",
  label: "Haldi & Sangeet (Mobile)",
  height: 2340,
};

export const defaultData: HaldiSangeetData = {
  brideName: "PALLAVI",

  introLine: "Before the pheras begin,\ncome celebrate our girl",
  eventsLine: "Haldi & Ladies Sangeet",
  date: "Friday, 11th December, 2026",
  venue: "Kamaliya Bhavan, C-Block, Sirsa",

  haldiInvite: "You’re invited to the",
  haldiTitle: "HALDI",
  haldiOf: "of our beautiful bride",
  haldiLine: "A little haldi, a lot of love —\ncome help her glow!",
  haldiTime: "2:00 PM",

  sangeetTitle: "LADIES\nSANGEET",
  sangeetLine: "An evening of music,\ndance & celebration.",
  sangeetTime: "8:00 PM",

  outroHeading: "WITH LOVE & GRATITUDE",
  outroThanks: "Thank you for being a part\nof my special celebration.",
  outroPresence: "Your presence means the world to me.",
  outroSignOff: "With love",
};
