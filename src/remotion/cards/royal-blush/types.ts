export type RoyalBlushIllustration = "mandap" | "table" | "doli";

export interface RoyalBlushEvent {
  title: string;
  illustration: RoyalBlushIllustration;
  /** Shown with a clock icon. Omit for an event with no set time. */
  time?: string;
  /** Up to two lines; "\n" splits them. Omit for no venue row. */
  venue?: string;
  /** Italic line in place of a time (e.g. "Taron ki chhaon mein"). */
  note?: string;
}

export interface RoyalBlushData {
  /** Shown first on screens 2 and 5 (this card is sent by the bride's parents). */
  brideName: string;
  groomName: string;

  // Screen 1
  invocation: string; // "SHREE\nGANESHAYA\nNAMAH"
  blessingIntro: string; // italic
  blessingNames: string; // upright

  // Screen 2
  hosts: string;
  welcomeLine: string;
  tagline: string;

  // Screen 3
  sangeetTitle: string; // "LADIES\nSANGEET"
  sangeetDate: string; // up to two lines
  /** Leave empty to hide the time row. */
  sangeetTime: string;
  sangeetVenue: string;
  sangeetLine: string;

  // Screen 4
  weddingTitle: string;
  weddingDate: string;
  weddingVenue: string;
  events: [RoyalBlushEvent, RoyalBlushEvent, RoyalBlushEvent];

  // Screen 5
  thankYou: string;
  rsvpLabel: string;
  rsvp: string;
  wbcfLabel: string;
  wbcf: string;
  signOff: string;
  signature: string;
}
