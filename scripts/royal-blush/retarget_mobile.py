"""
Builds the "mobile" (1080 x 2340) assets of the royal-blush card from its tall (1080 x 2624)
assets, without cropping anything.

Each screen's background is shortened by 284 px using seam carving (removing the least
noticeable rows of pixels, one wavy line at a time) inside a BAND through its calm middle:
  - everything above the band is untouched,
  - everything below the band moves up by exactly 284 px,
  - the decoration (arches, lanterns, flowers, palace) keeps its exact shape.
The wind masks, water ripple, displacement maps and the screen-2 hands/dupatta cut-out are
carved with exactly the same seams so motion stays aligned with the art. Cut-out layers
that sit outside the band are shifted; text is laid out separately in layout.ts.

Run after prepare_assets.py:  python3 scripts/royal-blush/retarget_mobile.py [screens...]
Writes public/cards/royal-blush/mobile/ and src/.../generated/manifest-mobile.json
"""

import copy
import json
import os
import shutil
import sys

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TALL = os.path.join(ROOT, "public", "cards", "royal-blush")
OUT = os.path.join(TALL, "mobile")
GEN = os.path.join(ROOT, "src", "remotion", "cards", "royal-blush", "generated")

W, H_TALL, H_MOBILE = 1080, 2624, 2340
REMOVE = H_TALL - H_MOBILE  # 284 composition px
SCALE = 1.5  # plate px per composition px
MAP_DIV = 2  # masks/maps are stored at half composition size

# Band (composition px, tall coordinates) in which rows may be removed, and optional
# extra protection: (kind, params, weight). Bands avoid every cut-out layer that moves.
SCREENS = {
    1: {"band": (430, 1965), "protect": []},
    2: {"band": (1235, 2290), "protect": [("ellipse", (60, 1585, 85, 115), 40.0)]},  # dupatta knot
    3: {"band": (400, 1530), "protect": []},
    4: {"band": (420, 2150), "protect": []},
    5: {"band": (230, 1860), "protect": []},
}

MASKS = {1: ["wind"], 2: ["wind"], 3: ["wind"], 4: ["wind"], 5: ["wind", "ripple"]}
MAPS = {1: ["map-a"], 2: ["map-a", "map-b", "map-c"], 3: ["map-da", "map-db", "map-sa", "map-sb"], 4: [], 5: []}


def read(path, flags=cv2.IMREAD_UNCHANGED):
    img = cv2.imread(path, flags)
    if img is None:
        raise FileNotFoundError(path)
    return img


def energy(lum, protect):
    gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)
    e = np.abs(gx) + np.abs(gy)
    e = cv2.GaussianBlur(e, (0, 0), 2.0)
    return e + protect


def carve(stack, ys, protect, n):
    """Remove n horizontal seams. stack: (W, h, C) uint8 (transposed: x first);
    ys: (W, h) int32 original y; protect: (W, h) float32 extra energy."""
    for k in range(n):
        lum = stack[..., :3].astype(np.float32) @ np.array([0.114, 0.587, 0.299], np.float32)
        e = energy(lum, protect)
        Wd, h = e.shape
        M = e.copy()
        back = np.zeros((Wd, h), np.int8)
        inf = np.float32(1e30)
        for x in range(1, Wd):
            prev = M[x - 1]
            up = np.concatenate(([inf], prev[:-1]))
            dn = np.concatenate((prev[1:], [inf]))
            choice = np.stack([up, prev, dn])
            arg = choice.argmin(axis=0)
            M[x] += choice[arg, np.arange(h)]
            back[x] = arg - 1
        seam = np.empty(Wd, np.int64)
        seam[-1] = int(M[-1].argmin())
        for x in range(Wd - 1, 0, -1):
            seam[x - 1] = seam[x] + back[x, seam[x]]
        keep = np.ones((Wd, h), bool)
        keep[np.arange(Wd), seam] = False
        stack = stack[keep].reshape(Wd, h - 1, stack.shape[2])
        ys = ys[keep].reshape(Wd, h - 1)
        protect = protect[keep].reshape(Wd, h - 1)
        if k % 50 == 0:
            print(f"    seam {k}/{n}", flush=True)
    return stack, ys


def retarget(i, manifest_tall, manifest_mobile):
    cfg = SCREENS[i]
    src = os.path.join(TALL, f"s{i}")
    dst = os.path.join(OUT, f"s{i}")
    os.makedirs(dst, exist_ok=True)
    # Everything that isn't carved is shared unchanged
    for f in os.listdir(src):
        shutil.copy2(os.path.join(src, f), os.path.join(dst, f))

    plate = read(os.path.join(src, "plate.jpg"), cv2.IMREAD_COLOR)
    PH, PW = plate.shape[:2]
    up = lambda m: cv2.resize(m, (PW, PH), interpolation=cv2.INTER_LINEAR)

    channels = [plate]
    names = [("plate", 3)]
    for m in MASKS[i]:
        channels.append(up(read(os.path.join(src, f"{m}.png"), cv2.IMREAD_GRAYSCALE))[..., None])
        names.append((m, 1))
    for m in MAPS[i]:
        bgr = read(os.path.join(src, f"{m}.png"), cv2.IMREAD_COLOR)
        channels.append(up(bgr[..., 1:3]))  # G (y), R (x)
        names.append((m, 2))
    if i == 2:
        box = manifest_tall["s2"]["subject"]
        sub = read(os.path.join(src, "subject.png"))
        full = np.zeros((PH, PW, 4), np.uint8)
        x0, y0 = int(round(box["x"] * SCALE)), int(round(box["y"] * SCALE))
        full[y0:y0 + sub.shape[0], x0:x0 + sub.shape[1]] = sub
        channels.append(full)
        names.append(("subject", 4))
    stack = np.concatenate(channels, axis=2)

    b0, b1 = int(cfg["band"][0] * SCALE), int(cfg["band"][1] * SCALE)
    n = int(round(REMOVE * SCALE))
    band = np.ascontiguousarray(stack[b0:b1].transpose(1, 0, 2))
    ys = np.broadcast_to(np.arange(b0, b1, dtype=np.int32)[None, :], (PW, b1 - b0)).copy()
    protect = np.zeros((PH, PW), np.float32)
    yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
    for kind, p, wgt in cfg["protect"]:
        if kind == "ellipse":
            cx, cy, rx, ry = [v * SCALE for v in p]
            protect += wgt * (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1)
    # On screen 2, seams must not cut through the hands (anything opaque in the cut-out
    # above the dupatta) -- strongly prefer the cream and the plain fabric.
    if i == 2:
        a = stack[..., -1].astype(np.float32) / 255
        protect += 25.0 * a * (xx > 330 * SCALE)
    band_protect = np.ascontiguousarray(protect[b0:b1].T)
    print(f"  screen {i}: band {cfg['band']} -> removing {n} plate rows")
    band, ys = carve(band, ys, band_protect, n)
    stack = np.concatenate([stack[:b0], band.transpose(1, 0, 2), stack[b1:]], axis=0)
    assert stack.shape[0] == PH - n, stack.shape

    # orig-y -> mobile-y lookup (composition px) for positioning things inside the band
    mean_orig = ys.mean(axis=0) / SCALE
    new_rows = (np.arange(band.shape[1]) + b0) / SCALE
    ymap = {"band": cfg["band"], "removed": REMOVE, "orig": [round(float(v), 1) for v in mean_orig[::6]], "new": [round(float(v), 1) for v in new_rows[::6]]}

    # write the carved outputs
    c = 0
    PHm = stack.shape[0]
    for name, k in names:
        part = stack[..., c:c + k]
        c += k
        if name == "plate":
            cv2.imwrite(os.path.join(dst, "plate.jpg"), part, [cv2.IMWRITE_JPEG_QUALITY, 90])
        elif name == "subject":
            a = part[..., 3]
            ys_, xs_ = np.where(a > 1)
            bx0, by0, bx1, by1 = xs_.min(), ys_.min(), xs_.max() + 1, ys_.max() + 1
            cv2.imwrite(os.path.join(dst, "subject.png"), part[by0:by1, bx0:bx1])
            manifest_mobile["s2"]["subject"] = {"x": bx0 / SCALE, "y": by0 / SCALE, "w": (bx1 - bx0) / SCALE, "h": (by1 - by0) / SCALE}
        else:
            small = cv2.resize(part, (W // MAP_DIV, H_MOBILE // MAP_DIV), interpolation=cv2.INTER_AREA)
            if small.ndim == 2:
                small = small[..., None]
            if k == 1:
                out = np.repeat(small, 3, axis=2)
            else:  # restore B = 128 (unused), G = y, R = x
                out = np.dstack([np.full(small.shape[:2], 128, np.uint8), small[..., 0], small[..., 1]])
            cv2.imwrite(os.path.join(dst, f"{name}.png"), out)
    return ymap


def map_y(ymap, y):
    b0, b1 = ymap["band"]
    if y <= b0:
        return y
    if y >= b1:
        return y - ymap["removed"]
    return float(np.interp(y, ymap["orig"], ymap["new"]))


def main():
    which = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5]
    with open(os.path.join(GEN, "manifest.json")) as fh:
        tall = json.load(fh)
    mpath = os.path.join(GEN, "manifest-mobile.json")
    mobile = copy.deepcopy(tall)
    if os.path.exists(mpath):
        with open(mpath) as fh:
            old = json.load(fh)
        for k in old:
            if k.startswith("s") and int(k[1:]) not in which:
                mobile[k] = old[k]
    mobile.setdefault("ymaps", {})

    for i in which:
        ymap = retarget(i, tall, mobile)
        mobile["ymaps"][f"s{i}"] = ymap
        if i == 3:
            d = mobile["s3"]["dancers"]
            d["y"] = map_y(ymap, d["y"])
        if i == 5:
            for l in mobile["s5"]["lanterns"]:
                cy = l["y"] + l["h"] / 2
                l["y"] += map_y(ymap, cy) - cy
            mobile["s5"]["lights"]["y"] = map_y(ymap, mobile["s5"]["lights"]["y"])

    with open(mpath, "w") as fh:
        json.dump(mobile, fh, indent=1)
    print("manifest ->", mpath)


if __name__ == "__main__":
    main()
