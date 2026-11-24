import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import tallManifest from "./generated/manifest-tall.json";
import mobileManifest from "./generated/manifest-mobile.json";

/**
 * Two shapes share all screen code:
 *  - tall   1080 x 2624
 *  - mobile 1080 x 2340 (19.5:9)
 * Both are lengthened from the 9:16 artwork by scripts/haldi-sangeet/prepare_assets.py, which
 * also writes where every element ended up (the manifest) and each screen's open text "zone".
 */
export type VariantId = "tall" | "mobile";

export type Manifest = typeof tallManifest;

export type Variant = {
  id: VariantId;
  height: number;
  manifest: Manifest;
  asset: (path: string) => string;
};

export const VARIANTS: Record<VariantId, Variant> = {
  tall: { id: "tall", height: 2624, manifest: tallManifest, asset: (p) => staticFile(`cards/haldi-sangeet/tall/${p}`) },
  mobile: {
    id: "mobile",
    height: 2340,
    manifest: mobileManifest as unknown as Manifest,
    asset: (p) => staticFile(`cards/haldi-sangeet/mobile/${p}`),
  },
};

export const VariantContext = createContext<Variant>(VARIANTS.tall);
export const useVariant = () => useContext(VariantContext);
