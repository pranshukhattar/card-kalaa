import type { CardConfig } from "@/lib/types";
import type { RoyalBlushData } from "./types";

/**
 * Frame durations are the time each screen owns on the timeline. The transition into a
 * screen overlaps the tail of the previous one (see TRANSITIONS in index.tsx), so the
 * total length is just the sum of these.
 */
export const config: CardConfig = {
  id: "royal-blush",
  label: "Royal Blush",
  fps: 30,
  width: 1080,
  height: 2624,
  defaultThemeId: "blush",
  themes: [
    {
      id: "blush",
      label: "Blush",
      palette: {
        background: "#FBEFE3",
        primary: "#74182A", // maroon text
        secondary: "#C38B4E", // antique gold rules and ornaments
        accent: "#F2A7B5", // petal pink
        text: "#FFF3DE", // cream text on the night screen
      },
    },
  ],
  frames: [
    { id: "frame-01", durationInFrames: 225 },
    { id: "frame-02", durationInFrames: 225 },
    { id: "frame-03", durationInFrames: 255 },
    { id: "frame-04", durationInFrames: 460 },
    { id: "frame-05", durationInFrames: 360 },
  ],
};

export const defaultData: RoyalBlushData = {
  brideName: "Pallavi",
  groomName: "Shubham",
  invocation: "SHREE\nGANESHAYA\nNAMAH",
  blessingIntro: "With the heavenly blessings of\nGrand Parents",
  blessingNames: "Late Smt. Lajwanti\n& Late Dr. Sohan Lal Jain",
  hosts: "Mrs. Asha & Mr. Sanjay Jain",
  welcomeLine: "invite you to the wedding of",
  tagline: "Together in love,\nforever in joy.",
  sangeetTitle: "LADIES\nSANGEET",
  sangeetDate: "Friday,\n11th December, 2026",
  sangeetTime: "",
  sangeetVenue: "Kamaliya Bhavan,\nC-Block, Sirsa",
  sangeetLine: "Let's dance and celebrate!",
  weddingTitle: "WEDDING CEREMONY",
  weddingDate: "Saturday, 12th December, 2026",
  weddingVenue: "The Pearl Resort,\nNear Sikanderpur, Hisar Road, Sirsa",
  events: [
    { title: "RECEPTION OF BARAAT", illustration: "mandap", time: "8:15 PM" },
    { title: "WEDDING DINNER", illustration: "table", time: "8:30 PM" },
    { title: "BIDAI", illustration: "doli", note: "Taron ki chhaon mein" },
  ],
  thankYou: "We await your\ngracious presence",
  rsvpLabel: "R.S.V.P. :",
  rsvp: "Khushboo & Abhishek Garg\nCA Sambhav Jain",
  wbcfLabel: "W.B.C.F. :",
  wbcf: "All Jain Family\nRelatives & Friends",
  signOff: "With Love",
  signature: "Kiara",
};
