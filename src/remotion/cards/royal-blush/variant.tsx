import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import tallManifest from "./generated/manifest.json";
import mobileManifest from "./generated/manifest-mobile.json";
import { MOBILE, TALL, type Layout } from "./layout";

/**
 * The card exists in two shapes that share all screen code:
 *  - tall   1080 x 2624, the original artwork proportions
 *  - mobile 1080 x 2340 (19.5:9), fills the width of nearly every modern phone. Its
 *    backgrounds are the tall ones shortened by scripts/royal-blush/retarget_mobile.py.
 */
export type VariantId = "tall" | "mobile";

export type Variant = {
  id: VariantId;
  height: number;
  manifest: typeof tallManifest;
  L: Layout;
  asset: (path: string) => string;
};

export const VARIANTS: Record<VariantId, Variant> = {
  tall: {
    id: "tall",
    height: 2624,
    manifest: tallManifest,
    L: TALL,
    asset: (p) => staticFile(`cards/royal-blush/${p}`),
  },
  mobile: {
    id: "mobile",
    height: 2340,
    manifest: mobileManifest as unknown as typeof tallManifest,
    L: MOBILE,
    asset: (p) => staticFile(`cards/royal-blush/mobile/${p}`),
  },
};

export const VariantContext = createContext<Variant>(VARIANTS.tall);
export const useVariant = () => useContext(VariantContext);
