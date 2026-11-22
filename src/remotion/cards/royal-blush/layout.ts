import tallManifest from "./generated/manifest.json";

/**
 * Vertical positions (text baselines, composition px) of each screen, per card variant.
 * x positions and sizes are shared; only the vertical rhythm differs between the tall
 * (1080 x 2624) and mobile (1080 x 2340) cards.
 *
 * Mobile spacing rules: text >= 90 px from the sides, nothing in the top 180 px, >= 400 px
 * clear at the bottom (player controls), >= 70 px between text and artwork, ~40 px between
 * related lines, ~80-100 px between blocks, dividers centred between what they separate.
 */
export type Box = { x: number; y: number; w: number; h: number };

export type Layout = {
  s1: {
    ganesha: Box;
    invocation: number;
    invocationLH: number;
    divider: number;
    blessingIntro: number;
    blessingNames: number;
  };
  s2: { hosts: number; welcome: number; bride: number; groom: number; nameSize: number; divider: number; tagline: number };
  s3: {
    title: number;
    titleSize: number;
    titleLH: number;
    divider: number;
    rows: number;
    rowSize: number;
    rowLine: number;
    rowGap: number;
    line: number;
    lineSize: number;
    divider2: number;
    glitterY: number;
  };
  s4: { top: number; illusBottom: number; illusMaxH: number; evTitle: number };
  s5: {
    thank: number;
    divider: number;
    bride: number;
    groom: number;
    labels: number;
    rsvp: number;
    love: number;
    signature: number;
    starsMaxY: number;
    embersY: number;
    petalBand: number;
  };
};

export const TALL: Layout = {
  s1: {
    ganesha: tallManifest.s1.ganesha,
    invocation: 1368,
    invocationLH: 96,
    divider: 1652,
    blessingIntro: 1748,
    blessingNames: 1880,
  },
  s2: { hosts: 1442, welcome: 1518, bride: 1752, groom: 1950, nameSize: 158, divider: 2083, tagline: 2212 },
  s3: {
    title: 618,
    titleSize: 142,
    titleLH: 142,
    divider: 842,
    rows: 985,
    rowSize: 58,
    rowLine: 64,
    rowGap: 40,
    line: 1402,
    lineSize: 66,
    divider2: 1468,
    glitterY: 1500,
  },
  s4: { top: 470, illusBottom: 1500, illusMaxH: 640, evTitle: 1642 },
  s5: {
    thank: 640,
    divider: 822,
    bride: 1015,
    groom: 1190,
    labels: 1345,
    rsvp: 1405,
    love: 1592,
    signature: 1715,
    starsMaxY: 1750,
    embersY: 1900,
    petalBand: 2000,
  },
};

// Positions measured against the shortened backgrounds (scripts/royal-blush/retarget_mobile.py).
// Text that sat below a screen's carved band moved up 284 px with the art.
export const MOBILE: Layout = {
  s1: {
    // Ganesha at 78% so the whole invocation fits between the arch and the pavilion
    ganesha: { x: 540 - (506.67 * 0.78) / 2, y: 250, w: 506.67 * 0.78, h: 809.33 * 0.78 },
    invocation: 1020,
    invocationLH: 92,
    divider: 1268,
    blessingIntro: 1352,
    blessingNames: 1508,
  },
  s2: { hosts: 1310, welcome: 1380, bride: 1579, groom: 1745, nameSize: 136, divider: 1825, tagline: 1931 },
  s3: {
    title: 535,
    titleSize: 120,
    titleLH: 118,
    divider: 708,
    rows: 800,
    rowSize: 54,
    rowLine: 58,
    rowGap: 30,
    line: 1110,
    lineSize: 60,
    divider2: 1160,
    glitterY: 1216,
  },
  s4: { top: 460, illusBottom: 1450, illusMaxH: 540, evTitle: 1592 },
  s5: {
    thank: 520,
    divider: 662,
    bride: 877,
    groom: 1052,
    labels: 1160,
    rsvp: 1218,
    love: 1404,
    signature: 1549,
    starsMaxY: 1500,
    embersY: 1616,
    petalBand: 1716,
  },
};
