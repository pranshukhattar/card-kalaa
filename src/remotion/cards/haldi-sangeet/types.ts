export interface HaldiSangeetData {
  /** Printed in capitals on every screen (as in the artwork). */
  brideName: string;

  // Intro -- the only screen with date and venue (both events share them)
  introLine: string; // italic, two lines
  eventsLine: string; // "Haldi & Ladies Sangeet"
  date: string;
  /** Up to two lines; "\n" splits them. */
  venue: string;

  // Haldi
  haldiInvite: string; // "You're invited to the"
  haldiTitle: string; // "HALDI"
  haldiOf: string; // "of our beautiful bride"
  haldiLine: string; // italic, two lines
  haldiTime: string;

  // Ladies Sangeet (the artwork's own words)
  sangeetTitle: string; // "LADIES\nSANGEET"
  sangeetLine: string; // italic, two lines
  sangeetTime: string;

  // Outro (the artwork's own words)
  outroHeading: string; // "WITH LOVE & GRATITUDE"
  outroThanks: string; // italic, two lines
  outroPresence: string; // italic, one line
  outroSignOff: string; // script
}
