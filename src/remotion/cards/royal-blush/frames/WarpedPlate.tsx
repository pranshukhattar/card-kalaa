import { useEffect, useState } from "react";
import { AbsoluteFill, Img, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Draws a screen's painted plate and makes parts of it move without cutting anything out:
 * an SVG displacement filter shifts pixels by a small, smoothly varying amount.
 *
 *  - wind:   flowing fractal noise, limited to foliage by a grayscale mask (white = moves)
 *  - ripple: a second, horizontally stretched noise (water shimmer)
 *  - maps:   "puppet" displacement maps baked by scripts/royal-blush/prepare_assets.py.
 *            Each map stores a motion (e.g. a lantern rotating 1 degree about its chain);
 *            `weight` scales it per frame, so weight = 2 * sin(t) swings it +/- 2 degrees.
 *
 * All maps share one encoding: 128 = still, 0/255 = -/+ MAXPX at weight 1 (see the script).
 */

const MAXPX = 20;
const W = 1080;
// The filter region is larger than the image so the flowing noise can slide in from outside.
const PAD = 420;

export type NoiseSpec = {
  mask: string;
  /** Typical displacement in px. */
  amp: number;
  /** feTurbulence baseFrequency ("fx fy" or one number). */
  freq: string;
  /** px per second the noise field drifts. */
  vx: number;
  vy: number;
  seed: number;
};

export type MapSpec = { href: string; weight: number };

type Box = { x: number; y: number; w: number; h: number };

type Props = {
  id: string;
  src: string;
  /** Where the image sits on the canvas (default: fills it). */
  box?: Box;
  /**
   * Draw an unwarped copy underneath (default true). Right for a full background plate;
   * turn it off for a cut-out layer, or its unmoved silhouette would show through.
   */
  base?: boolean;
  wind?: NoiseSpec;
  ripple?: NoiseSpec;
  maps?: MapSpec[];
};

// feImage loads its picture asynchronously and Chrome may paint a frame before it arrives,
// which shows up as a whole-screen jump. So every map/mask is fetched once, turned into a
// data: URL and fully decoded before any frame that uses it is rendered.
const dataUrls = new Map<string, Promise<string>>();
const resolved = new Map<string, string>();
const toDataUrl = (url: string) => {
  let p = dataUrls.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          }),
      )
      .then(async (data) => {
        const img = new Image();
        img.src = data;
        await img.decode();
        resolved.set(url, data);
        return data;
      });
    dataUrls.set(url, p);
  }
  return p;
};

function useInlined(urls: string[]): boolean {
  const key = urls.join("|");
  const [ready, setReady] = useState(() => urls.every((u) => resolved.has(u)));
  useEffect(() => {
    if (ready) return;
    const handle = delayRender(`royal-blush maps ${key}`);
    Promise.all(urls.map(toDataUrl))
      .then(() => setReady(true))
      .catch((err) => console.error("royal-blush: map load failed", err))
      .finally(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return ready;
}

export const WarpedPlate: React.FC<Props> = ({ id, src, box: boxProp, base = true, wind, ripple, maps = [] }) => {
  const frame = useCurrentFrame();
  const H = useVideoConfig().height;
  const box = boxProp ?? { x: 0, y: 0, w: W, h: H };
  const ready = useInlined([wind?.mask, ripple?.mask, ...maps.map((m) => m.href)].filter(Boolean) as string[]);
  const inline = (u: string) => resolved.get(u) ?? u;
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // feComposite "arithmetic" applies its k1..k4 to the ALPHA channel too. Every composite
  // below is arranged so that, with opaque inputs, k1 + k2 + k3 + k4 >= 1: alpha stays 1
  // (clamped). Otherwise the intermediate turns translucent, Chrome un-premultiplies it and
  // the whole picture jumps. Scaling by a weight is therefore done with feColorMatrix
  // (which keeps alpha explicitly), never with k3/k4.
  const scaleAround = (w: number) => {
    const o = 0.5 - 0.5 * w; // v' = 0.5 + w * (v - 0.5)
    return `${w} 0 0 0 ${o}  0 ${w} 0 0 ${o}  0 0 0 0 0.5  0 0 0 0 1`;
  };
  // fractalNoise sits mostly within 0.5 +/- 0.15; gain turns that into ~amp px.
  const gainFor = (amp: number) => amp / (2 * MAXPX * 0.15);
  const steps: JSX.Element[] = [];
  let acc = "acc0";
  let n = 0;
  const addToAcc = (input: string, key: string) => {
    // acc + (input - 0.5): k2 + k3 + k4 = 1.5 -> alpha clamps to 1
    steps.push(
      <feComposite key={key} in={acc} in2={input} operator="arithmetic" k1={0} k2={1} k3={1} k4={-0.5} result={`acc${++n}`} />,
    );
    acc = `acc${n}`;
  };
  const addNoise = (spec: NoiseSpec, key: string) => {
    const dx = (spec.vx * t) % PAD;
    const dy = (spec.vy * t) % PAD;
    steps.push(
      <feTurbulence key={`${key}t`} type="fractalNoise" baseFrequency={spec.freq} numOctaves={2} seed={spec.seed} result={`${key}n`} />,
      <feOffset key={`${key}o`} in={`${key}n`} dx={dx} dy={dy} result={`${key}no`} />,
      // opaque, and scaled about 0.5 by the gain
      <feColorMatrix key={`${key}c`} in={`${key}no`} type="matrix" values={scaleAround(gainFor(spec.amp))} result={`${key}na`} />,
      <feImage key={`${key}m`} href={inline(spec.mask)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result={`${key}mask`} />,
      // 0.5 + mask * (noise - 0.5): k1 + k3 + k4 = 1 -> alpha 1
      <feComposite key={`${key}k`} in={`${key}na`} in2={`${key}mask`} operator="arithmetic" k1={1} k2={0} k3={-0.5} k4={0.5} result={`${key}d`} />,
    );
    addToAcc(`${key}d`, `${key}a`);
  };
  if (wind) addNoise(wind, "w");
  if (ripple) addNoise(ripple, "r");
  maps.forEach((m, i) => {
    steps.push(
      <feImage key={`m${i}`} href={inline(m.href)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result={`map${i}`} />,
      // 0.5 + w * (map - 0.5)
      <feColorMatrix key={`s${i}`} in={`map${i}`} type="matrix" values={scaleAround(m.weight)} result={`mapw${i}`} />,
    );
    addToAcc(`mapw${i}`, `c${i}`);
  });

  const filterId = `warp-${id}`;
  return (
    <AbsoluteFill>
      {/* Unfiltered copy underneath: anything the warp samples from outside the image shows this. */}
      {base ? (
        <Img src={src} style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }} />
      ) : (
        // still preload it so Remotion waits for the image
        <Img src={src} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      )}
      {ready && (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x={-PAD}
            y={-PAD}
            width={W + 2 * PAD}
            height={H + 2 * PAD}
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodColor="rgb(128,128,128)" result="acc0" />
            {steps}
            <feDisplacementMap in="SourceGraphic" in2={acc} scale={2 * MAXPX} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <image href={src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="none" filter={`url(#${filterId})`} />
      </svg>
      )}
    </AbsoluteFill>
  );
};
