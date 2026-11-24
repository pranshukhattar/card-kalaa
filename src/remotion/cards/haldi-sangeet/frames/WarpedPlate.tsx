import { useEffect, useState } from "react";
import { AbsoluteFill, Img, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Draws a painted plate and makes parts of it move without cutting anything out: an SVG
 * displacement filter shifts pixels by a small, smoothly varying amount.
 *
 *  - noises: flowing fractal noise, each limited by a grayscale mask (white = moves):
 *            wind in the flowers, shimmer on water, a slow drift of the clouds
 *  - maps:   "puppet" displacement maps baked by scripts/haldi-sangeet/prepare_assets.py
 *            (e.g. a dancer's upper body turning 1 degree about her hips); `weight` scales
 *            it per frame.
 *
 * All maps share one encoding: 128 = still, 0/255 = -/+ MAXPX at weight 1.
 */

const MAXPX = 20;
const W = 1080;
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
  box?: Box;
  /** Draw an unwarped copy underneath (right for a full plate, wrong for a cut-out). */
  base?: boolean;
  noises?: NoiseSpec[];
  maps?: MapSpec[];
};

// feImage loads asynchronously and Chrome may paint before it arrives (a whole-screen jump),
// so every map / mask is fetched once, turned into a decoded data: URL, and only then used.
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

export function useInlined(urls: string[]): boolean {
  const key = urls.join("|");
  const [ready, setReady] = useState(() => urls.every((u) => resolved.has(u)));
  useEffect(() => {
    if (ready) return;
    const handle = delayRender(`haldi-sangeet maps ${key}`);
    Promise.all(urls.map(toDataUrl))
      .then(() => setReady(true))
      .catch((err) => console.error("haldi-sangeet: map load failed", err))
      .finally(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return ready;
}

export const inlined = (u: string) => resolved.get(u) ?? u;

export const WarpedPlate: React.FC<Props> = ({ id, src, box: boxProp, base = true, noises = [], maps = [] }) => {
  const frame = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const box = boxProp ?? { x: 0, y: 0, w: W, h: H };
  const ready = useInlined([...noises.map((n) => n.mask), ...maps.map((m) => m.href)]);
  const t = frame / fps;

  // feComposite "arithmetic" applies k1..k4 to ALPHA too; every composite keeps
  // k1 + k2 + k3 + k4 >= 1 with opaque inputs so alpha stays 1. Weights are applied with
  // feColorMatrix (alpha kept explicitly), never with k3/k4.
  const scaleAround = (w: number) => {
    const o = 0.5 - 0.5 * w;
    return `${w} 0 0 0 ${o}  0 ${w} 0 0 ${o}  0 0 0 0 0.5  0 0 0 0 1`;
  };
  const gainFor = (amp: number) => amp / (2 * MAXPX * 0.15);
  const steps: JSX.Element[] = [];
  let acc = "acc0";
  let n = 0;
  const addToAcc = (input: string, key: string) => {
    steps.push(<feComposite key={key} in={acc} in2={input} operator="arithmetic" k1={0} k2={1} k3={1} k4={-0.5} result={`acc${++n}`} />);
    acc = `acc${n}`;
  };
  noises.forEach((spec, i) => {
    const key = `n${i}`;
    const dx = (spec.vx * t) % PAD;
    const dy = (spec.vy * t) % PAD;
    steps.push(
      <feTurbulence key={`${key}t`} type="fractalNoise" baseFrequency={spec.freq} numOctaves={2} seed={spec.seed} result={`${key}n`} />,
      <feOffset key={`${key}o`} in={`${key}n`} dx={dx} dy={dy} result={`${key}no`} />,
      <feColorMatrix key={`${key}c`} in={`${key}no`} type="matrix" values={scaleAround(gainFor(spec.amp))} result={`${key}na`} />,
      <feImage key={`${key}m`} href={inlined(spec.mask)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result={`${key}mask`} />,
      <feComposite key={`${key}k`} in={`${key}na`} in2={`${key}mask`} operator="arithmetic" k1={1} k2={0} k3={-0.5} k4={0.5} result={`${key}d`} />,
    );
    addToAcc(`${key}d`, `${key}a`);
  });
  maps.forEach((m, i) => {
    steps.push(
      <feImage key={`m${i}`} href={inlined(m.href)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result={`map${i}`} />,
      <feColorMatrix key={`s${i}`} in={`map${i}`} type="matrix" values={scaleAround(m.weight)} result={`mapw${i}`} />,
    );
    addToAcc(`mapw${i}`, `c${i}`);
  });

  const filterId = `hs-warp-${id}`;
  return (
    <AbsoluteFill>
      {base ? (
        <Img src={src} style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }} />
      ) : (
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
