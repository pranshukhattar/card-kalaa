"""
Builds every image the "haldi-sangeet" card needs from the 4x-upscaled artwork in
assets/haldi-sangeet/upscaled/{1-intro,2-haldi,3-sangeet,4-outro}.png.

Self-contained: shares no code or files with any other card.

The artwork is 9:16 (1080 x 1919 at card width). The card is rendered taller -- 1080 x 2624
("tall") and 1080 x 2340 ("mobile") -- WITHOUT cropping: each screen is lengthened inside its
calm middle. Per column, everything above that column's top decoration stays put, everything
below its bottom decoration moves down by the full extra height, and only the soft
watercolour between them is stretched. Paper grain is re-sampled unstretched so the stretched
area keeps the texture of the paper.

Outputs, per variant (public/cards/haldi-sangeet/<variant>/sN/):
  plate.jpg      the screen with its text and every separately animated element removed
  wind.png       grayscale: where the wind may move pixels (flowers, leaves)
  ripple.png     grayscale: water shimmer (intro, outro)
  drift.png      grayscale: slow cloud drift
  *.png          cut-out RGBA layers (lanterns, dancers, sky lanterns, palace lights)
  map-*.png      displacement ("puppet") maps for the dancers (R = x, G = y, 128 = still)
plus public/cards/haldi-sangeet/fields/*.png (transition fields) and
src/remotion/cards/haldi-sangeet/generated/manifest-<variant>.json (positions).

All coordinates in this file are COMPOSITION px at card width 1080. "src" y values are on the
unstretched artwork (0..1919); the Warp maps them to each variant.

Run:  python3 scripts/haldi-sangeet/prepare_assets.py [screen numbers...]
"""

import json
import math
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d, maximum_filter1d, minimum_filter1d

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets", "haldi-sangeet", "upscaled")
OUT = os.path.join(ROOT, "public", "cards", "haldi-sangeet")
GEN = os.path.join(ROOT, "src", "remotion", "cards", "haldi-sangeet", "generated")
MASK_TOOL = os.path.join(ROOT, "scripts", "haldi-sangeet", ".bin", "subject_masks")

W = 1080
SCALE = 1.5  # plate px per composition px
PW = int(W * SCALE)
VARIANTS = {"tall": 2624, "mobile": 2340}
MAP_DIV = 2  # masks / maps are stored at half composition size
MAXPX = 20.0  # map value 0 / 255 = -/+ MAXPX px at weight 1

SOURCES = {1: "1-intro.png", 2: "2-haldi.png", 3: "3-sangeet.png", 4: "4-outro.png"}

rng = np.random.default_rng(11)


# ---------------------------------------------------------------- basics

def s(v):
    return int(round(v * SCALE))


def read_source(i):
    img = cv2.imread(os.path.join(SRC, SOURCES[i]), cv2.IMREAD_COLOR)
    e = 8  # trim a hairline at the edges (the intro has a 1 px light line on its left)
    img = img[e:-e, e:-e]
    h, w = img.shape[:2]
    sh = int(round(PW * h / w))
    return cv2.resize(img, (PW, sh), interpolation=cv2.INTER_AREA).astype(np.float32)


def lum(img):
    return 0.114 * img[..., 0] + 0.587 * img[..., 1] + 0.299 * img[..., 2]


def rect_mask(rects, shape, feather=0):
    m = np.zeros(shape, np.float32)
    for x0, y0, x1, y1 in rects:
        m[max(0, s(y0)):s(y1), max(0, s(x0)):s(x1)] = 1
    if feather:
        m = cv2.GaussianBlur(m, (0, 0), s(feather))
    return m


def poly_mask(points, shape, feather=0, scale=SCALE):
    m = np.zeros(shape, np.uint8)
    pts = np.array([[x * scale, y * scale] for x, y in points], np.int32)
    cv2.fillPoly(m, [pts], 255)
    m = m.astype(np.float32) / 255
    if feather:
        m = cv2.GaussianBlur(m, (0, 0), feather * scale)
    return m


def ellipse_mask(cx, cy, rx, ry, shape, scale, feather=0):
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = ((xx / scale - cx) / rx) ** 2 + ((yy / scale - cy) / ry) ** 2
    m = (d <= 1).astype(np.float32)
    if feather:
        m = cv2.GaussianBlur(m, (0, 0), feather * scale)
    return m


def dilate(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * s(px) + 1, 2 * s(px) + 1))
    return cv2.dilate(mask, k)


def erode(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * s(px) + 1, 2 * s(px) + 1))
    return cv2.erode(mask, k)


def push_pull_fill(img, known):
    """Fill the unknown pixels (known == 0) smoothly from their surroundings."""
    levels = []
    I = img * known[..., None]
    Wt = known.astype(np.float32).copy()
    while min(I.shape[:2]) > 2:
        levels.append((I, Wt))
        I = cv2.pyrDown(I)
        Wt = cv2.pyrDown(Wt)
    F = I / np.maximum(Wt, 1e-6)[..., None]
    empty = Wt < 1e-4
    if empty.any():
        mean = (img * known[..., None]).sum(axis=(0, 1)) / max(known.sum(), 1)
        F[empty] = mean
    for I, Wt in reversed(levels):
        up = cv2.pyrUp(F, dstsize=(I.shape[1], I.shape[0]))
        a = np.clip(Wt * 4, 0, 1)[..., None]
        est = I / np.maximum(Wt, 1e-6)[..., None]
        F = a * est + (1 - a) * up
    k = known[..., None]
    return img * k + F * (1 - k)


def highpass(img, sigma=3.0):
    return img - cv2.GaussianBlur(img, (0, 0), sigma)


def plain_paper(img):
    """1 where the artwork is just paper / soft wash: no edges of leaves, petals, letters."""
    Lb = lum(cv2.GaussianBlur(img, (0, 0), 1.5))
    g = np.abs(cv2.Sobel(Lb, cv2.CV_32F, 1, 0, ksize=3)) + np.abs(cv2.Sobel(Lb, cv2.CV_32F, 0, 1, ksize=3))
    busy = cv2.GaussianBlur(g, (0, 0), s(3)) > 14
    hsv = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    strong = hsv[..., 1] > 110  # saturated paint: flowers, leaves
    bad = dilate((busy | strong).astype(np.float32), 12)
    return 1 - bad


def borrow_grain(original, hole, plain=None):
    """Grain for the hole, copied from shifted positions on untouched paper (or, given
    `plain`, from wherever that mask allows -- e.g. the starry night sky)."""
    hp = highpass(original)
    known = (1 - dilate((hole > 0.01).astype(np.float32), 16)) * (plain_paper(original) if plain is None else plain)
    grain = np.zeros_like(hp)
    have = np.zeros(hole.shape, np.float32)
    for dy, dx in [(s(240), 0), (-s(240), 0), (0, s(300)), (0, -s(300)), (s(480), 0), (-s(480), 0),
                   (s(240), s(300)), (-s(240), -s(300)), (s(720), 0), (-s(720), 0), (s(960), 0), (-s(960), 0),
                   (s(240), -s(300)), (-s(240), s(300)), (0, s(600)), (0, -s(600))]:
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        sh_hp = cv2.warpAffine(hp, M, (hp.shape[1], hp.shape[0]), borderMode=cv2.BORDER_REFLECT)
        sh_ok = cv2.warpAffine(known, M, (hp.shape[1], hp.shape[0]), borderMode=cv2.BORDER_REFLECT)
        take = (have < 0.5) & (sh_ok > 0.99)
        grain[take] = sh_hp[take]
        have[take] = 1
    return grain


def regrain(filled, original, hole, plain=None):
    """Give a smoothly filled hole the paper grain of nearby untouched paper."""
    grain = borrow_grain(original, hole, plain)
    soft = np.clip(cv2.GaussianBlur(hole, (0, 0), 1.5) * 1.2, 0, 1)[..., None]
    smooth = cv2.GaussianBlur(filled, (0, 0), 3.0)
    return filled * (1 - soft) + (smooth + grain) * soft


def text_off(img, rects, protect_polys):
    """Removes the placeholder text. Inside the text areas (never on the decorations) the
    paper is rebuilt from a softened background plus borrowed grain, so no trace of any letter
    -- or of the light halo the artwork paints around its letters -- is left."""
    shape = img.shape[:2]
    tm = text_mask(img, rects, "text", grow=10)
    prot = dilate(np.maximum.reduce([poly_mask(p, shape) for p in protect_polys]), 3) if protect_polys else np.zeros(shape, np.float32)
    tm = tm * (1 - prot)
    filled = push_pull_fill(img, 1 - (tm > 0.01).astype(np.float32))
    R = cv2.GaussianBlur(dilate(rect_mask(rects, shape), 10), (0, 0), s(8)) * (1 - prot)
    R = np.maximum(R, cv2.GaussianBlur(tm, (0, 0), 1.5))
    smooth = cv2.GaussianBlur(filled, (0, 0), s(4))
    grain = borrow_grain(img, (R > 0.02).astype(np.float32))
    R3 = np.clip(R, 0, 1)[..., None]
    return img * (1 - R3) + (smooth + grain) * R3


def remove(img, mask, plain=None):
    """Replace masked pixels with a fill that keeps the look of the paper."""
    hard = (mask > 0.01).astype(np.float32)
    filled = push_pull_fill(img, 1 - hard)
    return regrain(filled, img, hard, plain)


def local_bg_lum(L, rect, shape):
    PH_, PW_ = shape
    x0, y0, x1, y1 = max(0, s(rect[0])), max(0, s(rect[1])), min(PW_, s(rect[2])), min(PH_, s(rect[3]))
    pad = s(40)
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(PW_, x1 + pad), min(PH_, y1 + pad)
    sub = np.clip(L[Y0:Y1, X0:X1], 0, 255).astype(np.uint8)
    small = cv2.resize(sub, (max(8, sub.shape[1] // 4), max(8, sub.shape[0] // 4)), interpolation=cv2.INTER_AREA)
    med = cv2.medianBlur(cv2.medianBlur(small, 21), 21)
    big = cv2.resize(med, (sub.shape[1], sub.shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    return big[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0], (x0, y0, x1, y1)


def text_mask(img, rects, mode="dark", thr=20, grow=8, halo_thr=9):
    """Text / ornament pixels inside rects: darker (or lighter) than the local background.
    mode "text": dark lettering PLUS the faint light halo the artwork paints around it
    (otherwise the halo is left behind as a ghost outline of every letter)."""
    L = lum(img)
    m = np.zeros(L.shape, np.float32)
    for r in rects:
        bg, (x0, y0, x1, y1) = local_bg_lum(L, r, L.shape)
        d = bg - L[y0:y1, x0:x1]
        if mode == "dark":
            hit = d > thr
        elif mode == "light":
            hit = -d > thr
        else:
            core = (d > thr).astype(np.float32)
            near = cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * s(14) + 1, 2 * s(14) + 1)))
            hit = (core > 0) | ((-d > halo_thr) & (near > 0))
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], hit.astype(np.float32))
    return dilate(m, grow)


def unmix(img, bg, a):
    """Colour of a cut-out with the background it was painted over taken out of its soft edge
    (no pale or dark halo when it moves over a different spot)."""
    aa = np.maximum(a, 0.05)[..., None]
    fg = (img - (1 - a[..., None]) * bg) / aa
    fg = np.where(a[..., None] > 0.05, fg, img)
    return np.clip(fg, 0, 255)


def wind_detect(img):
    """Foliage and blooms: green leaves, pink / orange petals, strongly saturated colour."""
    hsv = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, sat, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    green = ((hue > 55) & (hue < 175)).astype(np.float32) * np.clip((sat - 0.15) / 0.15, 0, 1)
    pink = ((hue > 290) | (hue < 14)).astype(np.float32) * np.clip((sat - 0.25) / 0.15, 0, 1)
    vivid = np.clip((sat - 0.5) / 0.15, 0, 1)
    m = np.maximum(np.maximum(green, pink), vivid) * np.clip((0.99 - val) / 0.08, 0, 1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), s(6))


def transplant(img, fill, circles, ok, where=None):
    """Give round filled holes real texture: for each (cx, cy, R) circle (plate px), copy the
    watercolour mottling and stars (everything finer than ~R/3) from a nearby spot of clean
    sky, on top of the smooth fill that already has the right colour."""
    P = int(max(R for _, _, R in circles) * 2.2) + 4 if circles else 0
    pad3 = lambda a: cv2.copyMakeBorder(a, P, P, P, P, cv2.BORDER_REFLECT)
    IMG, OUT = pad3(img), pad3(fill)
    OK = cv2.copyMakeBorder(ok, P, P, P, P, cv2.BORDER_CONSTANT, value=0)
    WH = None if where is None else cv2.copyMakeBorder(where, P, P, P, P, cv2.BORDER_CONSTANT, value=0)
    H_, W_ = OK.shape
    for cx, cy, R in circles:
        cx, cy, R = cx + P, cy + P, max(R, 8)
        r2 = int(R * 1.35)
        pad = int(R * 2)
        found = None
        for need in (0.95, 0.85, 0.72):
            for dist in (2.4, 3.2, 4.2, 5.5, 7.0, 9.0):
                for ang in range(0, 360, 15):
                    sx = int(cx + dist * R * math.cos(math.radians(ang)))
                    sy = int(cy + dist * R * math.sin(math.radians(ang)))
                    if sx - pad < 0 or sy - pad < 0 or sx + pad >= W_ or sy + pad >= H_:
                        continue
                    if OK[sy - r2:sy + r2, sx - r2:sx + r2].mean() > need:
                        found = (sx, sy)
                        break
                if found:
                    break
            if found:
                break
        if not found:
            print("     transplant: no source for circle at", (cx - P) / SCALE, (cy - P) / SCALE)
            continue
        sx, sy = found
        x0, y0, x1, y1 = int(cx) - pad, int(cy) - pad, int(cx) + pad, int(cy) + pad
        src = IMG[sy - pad:sy + pad, sx - pad:sx + pad]
        okw = OK[sy - pad:sy + pad, sx - pad:sx + pad, None]
        detail = (src - cv2.GaussianBlur(src, (0, 0), max(3.0, R * 0.5))) * okw
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        a = np.clip((r2 - d) / max(4, R * 0.3), 0, 1)[..., None]
        if WH is not None:
            a = a * WH[y0:y1, x0:x1, None]
        OUT[y0:y1, x0:x1] = OUT[y0:y1, x0:x1] + detail * a
    return OUT[P:-P, P:-P] if P else OUT


def find_blobs(mask, region_m, min_px, max_px, max_dim, fill=0.25):
    """Small isolated blobs (loose petals): list of (x, y, w, h) plate px."""
    m = (mask * region_m > 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    out = []
    for k in range(1, n):
        x, y, w, h, a = stats[k]
        if s(min_px) ** 2 * 0.5 < a < s(max_px) ** 2 and max(w, h) < s(max_dim) and a / (w * h) > fill:
            out.append((x, y, w, h))
    return out


def boxes_mask(boxes, shape, pad=7):
    m = np.zeros(shape, np.float32)
    p = s(pad)
    for x, y, w, h in boxes:
        m[max(0, y - p):y + h + p, max(0, x - p):x + w + p] = 1
    return m


def subject_mask(i, y_from, shape):
    """macOS Vision foreground mask of the part of the source below comp y = y_from
    (Vision finds nothing on the full, very tall image; it does on the cropped bottom)."""
    if not os.path.exists(MASK_TOOL):
        os.makedirs(os.path.dirname(MASK_TOOL), exist_ok=True)
        subprocess.run(["swiftc", "-O", "-o", MASK_TOOL, os.path.join(ROOT, "scripts", "haldi-sangeet", "subject_masks.swift")], check=True)
    full = cv2.imread(os.path.join(SRC, SOURCES[i]), cv2.IMREAD_COLOR)
    e = 8
    full = full[e:-e, e:-e]
    h, w = full.shape[:2]
    k = w / W  # source px per comp px
    y0 = int(y_from * k)
    crop = full[y0:]
    small = cv2.resize(crop, (PW, int(round(crop.shape[0] * PW / w))), interpolation=cv2.INTER_AREA)
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "in.png")
        cv2.imwrite(p, small)
        r = subprocess.run([MASK_TOOL, p, os.path.join(tmp, "m")], check=True, capture_output=True, text=True)
        print("   vision:", r.stdout.strip())
        m = cv2.imread(os.path.join(tmp, "m-all.png"), cv2.IMREAD_GRAYSCALE)
    out = np.zeros(shape, np.float32)
    m = cv2.resize(m, (PW, small.shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
    top = s(y_from)
    hh = min(shape[0] - top, m.shape[0])
    out[top:top + hh] = m[:hh]
    return out


# ---------------------------------------------------------------- lengthening ("warp")

def envelope(points, kind, smooth=40):
    """Per plate-column y (plate px) of a decoration envelope given as (x, y) comp points.
    'top': the lowest point of the top decoration; 'bottom': the highest of the bottom one.
    Smoothed so neighbouring columns stretch alike, but never cutting into a decoration."""
    xs = np.arange(PW) / SCALE
    raw = np.interp(xs, [p[0] for p in points], [p[1] for p in points]) * SCALE
    k = s(smooth)
    if kind == "top":
        r = gaussian_filter1d(maximum_filter1d(raw, 2 * k + 1, mode="nearest"), k / 2, mode="nearest")
        return np.maximum(r, raw)
    r = gaussian_filter1d(minimum_filter1d(raw, 2 * k + 1, mode="nearest"), k / 2, mode="nearest")
    return np.minimum(r, raw)


class Warp:
    def __init__(self, top, bot, SH, H_out):
        self.top, self.bot = top, bot
        self.SH = SH
        self.HOp = int(round(H_out * SCALE))
        self.D = self.HOp - SH
        yo = np.arange(self.HOp, dtype=np.float32)[:, None]
        t, b = top[None, :].astype(np.float32), bot[None, :].astype(np.float32)
        L = b - t
        Lo = L + self.D
        mid = t + (yo - t) * L / Lo
        self.my = np.where(yo < t, yo, np.where(yo < b + self.D, mid, yo - self.D)).astype(np.float32)
        self.mx = np.broadcast_to(np.arange(PW, dtype=np.float32)[None, :], self.my.shape).copy()

        def refl(d, P):
            d = np.mod(d, 2 * P)
            return np.where(d < P, d, 2 * P - d)

        inband = (yo >= t) & (yo < b + self.D)
        g_top = t + refl(yo - t, L)
        g_bot = b - refl((b + self.D) - yo, L)
        self.g1 = np.where(inband, g_top, self.my).astype(np.float32)
        self.g2 = np.where(inband, g_bot, self.my).astype(np.float32)
        self.w = np.where(inband, np.clip((yo - t) / Lo, 0, 1), 0).astype(np.float32)

    def image(self, img, plain_grain):
        """plain_grain: the plate's grain with everything that is not plain paper replaced by
        borrowed paper grain -- the stretched band re-uses it, so flower or letter edges are
        never repeated into the open paper."""
        low = cv2.GaussianBlur(img, (0, 0), 3.0)
        high = img - low
        rm = lambda a, my: cv2.remap(a, self.mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        lo = rm(low, self.my)
        real = rm(high, self.my)
        h1, h2 = rm(plain_grain, self.g1), rm(plain_grain, self.g2)
        w = self.w[..., None]
        norm = 1 / np.sqrt(w ** 2 + (1 - w) ** 2)
        band = (self.g1 != self.my)[..., None] | (self.w[..., None] > 0)
        return lo + np.where(band, (h1 * (1 - w) + h2 * w) * norm, real)

    def mask(self, m):
        return cv2.remap(m, self.mx, self.my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    def y(self, x, y):
        """Source comp y -> variant comp y, at column x."""
        col = int(np.clip(round(x * SCALE), 0, PW - 1))
        t, b, D = self.top[col] / SCALE, self.bot[col] / SCALE, self.D / SCALE
        if y <= t:
            return float(y)
        if y >= b:
            return float(y + D)
        return float(t + (y - t) * (b - t + D) / (b - t))


# ---------------------------------------------------------------- saving

def save_jpg(path, img, q=90):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, q])


def save_gray(path, m, H):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    small = cv2.resize(m, (W // MAP_DIV, H // MAP_DIV), interpolation=cv2.INTER_AREA)
    g = np.clip(small * 255, 0, 255).astype(np.uint8)
    cv2.imwrite(path, cv2.merge([g, g, g]))


def crop_rgba(rgb, alpha, pad=2):
    """Crop an RGBA layer (plate px) to its alpha. Returns (rgba, box in source comp px)."""
    ys, xs = np.where(alpha > 0.004)
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(alpha.shape[1], xs.max() + 1 + pad), min(alpha.shape[0], ys.max() + 1 + pad)
    rgba = np.dstack([rgb[y0:y1, x0:x1], (alpha[y0:y1, x0:x1] * 255)[..., None]])
    return np.clip(rgba, 0, 255).astype(np.uint8), {"x": x0 / SCALE, "y": y0 / SCALE, "w": (x1 - x0) / SCALE, "h": (y1 - y0) / SCALE}


def save_png(path, rgba):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, rgba)


def moved(box, dy):
    b = dict(box)
    b["y"] = round(b["y"] + dy, 2)
    for k in ("x", "w", "h"):
        b[k] = round(b[k], 2)
    return b


# ------------------------------------------------- displacement ("puppet") maps

class MapBuilder:
    def __init__(self, H):
        self.H = H
        self.h, self.w = H // MAP_DIV, W // MAP_DIV
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype(np.float32)
        self.x, self.y = xx * MAP_DIV, yy * MAP_DIV
        self.ux = np.zeros((self.h, self.w), np.float32)
        self.uy = np.zeros((self.h, self.w), np.float32)

    def ellipse(self, cx, cy, rx, ry, feather=30):
        return ellipse_mask(cx, cy, rx, ry, (self.h, self.w), 1 / MAP_DIV, feather)

    def rotate(self, m, px, py, sign=1.0, only_above=None):
        """Rotation by 1 degree about (px, py) within mask m."""
        k = math.radians(1) * sign
        m = m.copy()
        if only_above is not None:
            m *= np.clip((only_above - self.y) / 40 + 0.5, 0, 1)
        self.ux += m * -(self.y - py) * k
        self.uy += m * (self.x - px) * k

    def swing(self, m, py, sign=1.0):
        """Horizontal swish growing with distance below py (1 degree)."""
        k = math.radians(1) * sign
        self.ux += m * np.clip(self.y - py, 0, None) * k

    def taper(self, px=60):
        d = np.minimum.reduce([self.x, self.y, (W - 1) - self.x, (self.H - 1) - self.y])
        return np.clip(d / px, 0, 1)

    def save(self, path):
        r = np.clip(128 + 127.5 * self.ux / MAXPX, 0, 255)
        g = np.clip(128 + 127.5 * self.uy / MAXPX, 0, 255)
        b = np.full_like(r, 128)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        cv2.imwrite(path, np.dstack([b, g, r]).astype(np.uint8))


# ---------------------------------------------------------------- cut-outs

def cut_polygon(img, outline, thr=30, cap_y=None):
    """A painted object (lantern + chain) inside a generous outline, over a soft wash.
    The background is estimated from outside the outline; pixels that differ from it are
    "paint". The background is then flood-filled in from the outline's edge: whatever it
    cannot reach -- the copper frame and the glass it encloses, the chain -- is the object.
    Returns (alpha, background estimate)."""
    shape = img.shape[:2]
    poly = poly_mask(outline, shape)
    ring_out = dilate(poly, 6)
    bg = push_pull_fill(img, 1 - ring_out)
    bg = cv2.GaussianBlur(bg, (0, 0), 2)
    dist = np.sqrt(((img - bg) ** 2).sum(axis=2))
    paint = ((dist > thr) & (poly > 0.5)).astype(np.uint8)
    if cap_y is not None:
        # chain + hanging loop (above the cap): only the clearly painted metal counts, and
        # the wash seen through the loop stays background
        upper = np.zeros(shape, bool)
        upper[: s(cap_y)] = True
        paint[upper & (dist < thr * 1.7)] = 0
        paint[: s(cap_y)] = cv2.morphologyEx(paint[: s(cap_y)], cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        lower = paint.copy()
        lower[: s(cap_y)] = 0
        lower = cv2.morphologyEx(lower, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        paint[s(cap_y):] = lower[s(cap_y):]
    else:
        paint = cv2.morphologyEx(paint, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # background inside the outline that connects to the outline's edge
    free = ((paint == 0) & (ring_out > 0.5)).astype(np.uint8)
    n, lab = cv2.connectedComponents(free, connectivity=4)
    edge = (ring_out > 0.5) & (poly < 0.5)
    outside_ids = np.unique(lab[edge & (free > 0)])
    outside = np.isin(lab, outside_ids[outside_ids > 0])
    solid = ((poly > 0.5) & ~outside).astype(np.uint8)
    if cap_y is not None:
        top = solid[: s(cap_y)]
        top[(paint[: s(cap_y)] == 0)] = 0  # nothing enclosed above the cap is lantern
    # keep the largest pieces only (drops stray specks of wash)
    n2, lab2, stats2, _ = cv2.connectedComponentsWithStats(solid)
    keep = np.zeros_like(solid)
    for k in range(1, n2):
        if stats2[k][4] > s(6) ** 2:
            keep[lab2 == k] = 1
    a = keep.astype(np.float32)
    # soft, anti-aliased rim: partial alpha from how different the rim pixel is
    rim = (dilate(a, 1.5) - erode(a, 1)) > 0
    soft = np.clip((dist - thr * 0.4) / (thr * 0.8), 0, 1)
    a = np.where(rim, np.minimum(dilate(a, 1), np.maximum(erode(a, 1), soft)), a)
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 0.6)
    return np.clip(a, 0, 1), bg


def lantern_record(name, box, pivot, body_center, size, warp):
    dy = warp.y(pivot[0], pivot[1]) - pivot[1]
    return {
        "src": name,
        "box": moved(box, dy),
        "pivot": [pivot[0], round(pivot[1] + dy, 2)],
        "center": [body_center[0], round(body_center[1] + dy, 2)],
        "size": size,
    }


# ---------------------------------------------------------------- screens
#
# Each screen function works on the unstretched artwork and returns a dict:
#   plate, masks {name: float mask}, layers [(file, rgba, box, anchor)], plus anything the
#   variant writer needs. write_variant() then lengthens it for each card size.

S1 = {
    "text": [(135, 425, 945, 1240), (225, 1275, 855, 1450)],
    "top": [(0, 820), (110, 820), (140, 710), (190, 500), (280, 450), (330, 375), (420, 360), (500, 310), (560, 270), (630, 255), (700, 205), (760, 125), (1080, 115)],
    "bottom": [(0, 1285), (290, 1285), (310, 1470), (500, 1480), (530, 1560), (790, 1560), (820, 1415), (1080, 1415)],
    "zone": (420, 1450),
    # decorations that hold the loose petals off (vine, pavilion, bushes)
    "keep": [
        [(0, 0), (730, 0), (730, 185), (430, 330), (270, 480), (160, 560), (140, 820), (0, 840)],
        [(0, 1275), (170, 1275), (215, 1345), (292, 1385), (335, 1460), (335, 1919), (0, 1919)],
        [(790, 1400), (1080, 1400), (1080, 1919), (760, 1919)],
    ],
}


def screen1():
    img = read_source(1)
    shape = img.shape[:2]
    img = (text_off(img, S1["text"], S1["keep"]))
    keep = np.maximum.reduce([poly_mask(p, shape) for p in S1["keep"]])
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    pink = (((r - g) > 40) & ((r - b) > 15) & (r > 150)).astype(np.float32)
    petals = find_blobs(pink, 1 - keep, 6, 45, 60)
    plate = remove(img, boxes_mask(petals, shape))
    print("   loose petals removed:", len(petals))

    pavilion = poly_mask([(0, 1270), (290, 1270), (295, 1655), (0, 1655)], shape, feather=10)
    lake = poly_mask([(0, 1640), (300, 1625), (540, 1590), (820, 1590), (830, 1919), (0, 1919)], shape, feather=14)
    trees = poly_mask([(230, 1470), (520, 1470), (540, 1600), (230, 1640)], shape, feather=10)
    deco = np.maximum.reduce([poly_mask(p, shape, feather=12) for p in S1["keep"]])
    wind = wind_detect(plate) * np.maximum(deco, trees * 0.6) * (1 - pavilion)
    ripple = lake * (1 - np.clip(wind * 3, 0, 1)) * (1 - pavilion)
    drift = (1 - np.clip(deco * 1.5, 0, 1)) * (1 - lake) * (1 - trees)
    return {"plate": plate, "masks": {"wind": wind, "ripple": ripple, "drift": drift}, "layers": [], "cfg": S1}


S2 = {
    "text": [(150, 560, 890, 1435)],
    "top": [(0, 755), (140, 755), (180, 645), (230, 525), (270, 425), (330, 345), (420, 195), (520, 125), (600, 65), (700, 35), (1080, 35)],
    "bottom": [(0, 1165), (130, 1165), (200, 1375), (260, 1445), (500, 1465), (540, 1590), (790, 1590), (830, 1430), (900, 1125), (950, 1025), (1080, 1025)],
    "zone": (565, 1445),
    "keep": [
        [(0, 0), (610, 0), (610, 125), (340, 335), (240, 520), (175, 770), (0, 790)],
        [(0, 1160), (150, 1160), (240, 1420), (510, 1460), (510, 1919), (0, 1919)],
        [(940, 1015), (1080, 1015), (1080, 1919), (760, 1919), (800, 1440), (900, 1150)],
        [(0, 1585), (1080, 1585), (1080, 1919), (0, 1919)],  # petals lying on the ground stay
    ],
    "lanterns": [
        {"pivot": (788, 0), "center": (791, 262), "size": 90, "cap": 188,
         "poly": [(780, 0), (797, 0), (798, 148), (808, 160), (815, 186), (840, 212), (841, 342), (812, 352), (801, 388), (777, 388), (766, 352), (743, 342), (742, 212), (767, 186), (774, 160), (779, 148)]},
        {"pivot": (930, 0), "center": (935, 425), "size": 115, "cap": 302,
         "poly": [(921, 0), (938, 0), (939, 262), (952, 280), (961, 298), (978, 328), (997, 348), (995, 508), (952, 517), (943, 560), (920, 560), (912, 517), (875, 508), (873, 348), (898, 328), (909, 298), (916, 280), (920, 262)]},
    ],
}


def screen2():
    img = read_source(2)
    shape = img.shape[:2]
    img = (text_off(img, S2["text"], S2["keep"][:3]))

    layers, lantern_alpha = [], np.zeros(shape, np.float32)
    for k, ln in enumerate(S2["lanterns"]):
        a, bg = cut_polygon(img, ln["poly"], cap_y=ln["cap"])
        rgba, box = crop_rgba(unmix(img, bg, a), a)
        layers.append((f"lantern-{k}.png", rgba, box, ln))
        lantern_alpha = np.maximum(lantern_alpha, a)
    img = remove(img, dilate((lantern_alpha > 0.03).astype(np.float32), 5))

    keep = np.maximum.reduce([poly_mask(p, shape) for p in S2["keep"]])
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    marigold = (((r - b) > 80) & (r > 185) & ((r - g) > 20)).astype(np.float32)
    petals = find_blobs(marigold, 1 - keep, 6, 60, 85, fill=0.2)
    plate = remove(img, boxes_mask(petals, shape))
    print("   loose petals removed:", len(petals))

    deco = np.maximum.reduce([poly_mask(p, shape, feather=12) for p in S2["keep"][:3]])
    bowl = poly_mask([(90, 1470), (500, 1470), (500, 1720), (90, 1720)], shape, feather=10)
    ground = poly_mask(S2["keep"][3], shape, feather=10) * (1 - deco)
    wind = wind_detect(plate) * deco * (1 - bowl)
    drift = (1 - np.clip(deco * 1.5, 0, 1)) * (1 - bowl) * (1 - ground)
    return {"plate": plate, "masks": {"wind": wind, "drift": drift}, "layers": layers, "cfg": S2}


S3 = {
    "text": [(140, 465, 905, 1335)],
    "top": [(0, 870), (130, 865), (155, 600), (150, 425), (210, 345), (260, 305), (300, 185), (380, 145), (450, 150), (650, 155), (700, 200), (800, 245), (900, 285), (1080, 290)],
    "bottom": [(0, 1125), (110, 1125), (150, 1295), (230, 1425), (330, 1395), (390, 1360), (440, 1375), (520, 1455), (620, 1430), (690, 1415), (730, 1360), (790, 1365), (860, 1425), (920, 1295), (980, 1145), (1080, 1115)],
    "zone": (440, 1345),
    "keep": [
        [(0, 0), (330, 0), (300, 200), (220, 330), (150, 430), (125, 800), (0, 820)],
        [(0, 1110), (130, 1110), (240, 1440), (240, 1919), (0, 1919)],
        [(960, 1100), (1080, 1100), (1080, 1919), (900, 1919)],
        [(320, 0), (1080, 0), (1080, 300), (320, 160)],  # string lights
        [(0, 1350), (1080, 1350), (1080, 1919), (0, 1919)],  # dancers / ground
    ],
    "lanterns": [
        {"pivot": (701, 114), "center": (702, 222), "size": 70, "cap": 154,
         "poly": [(696, 110), (707, 110), (709, 133), (718, 148), (728, 168), (740, 178), (739, 264), (713, 273), (707, 298), (695, 298), (689, 273), (666, 264), (665, 178), (678, 168), (688, 148), (694, 133)]},
        {"pivot": (904, 70), "center": (904, 305), "size": 95, "cap": 212,
         "poly": [(898, 66), (910, 66), (912, 183), (920, 198), (933, 223), (955, 246), (953, 377), (920, 384), (912, 412), (897, 412), (889, 384), (855, 377), (853, 246), (876, 223), (888, 198), (896, 183)]},
        {"pivot": (1014, 20), "center": (1015, 135), "size": 68, "cap": 70,
         "poly": [(1008, 16), (1020, 16), (1022, 53), (1030, 66), (1038, 83), (1055, 93), (1053, 184), (1031, 190), (1023, 216), (1009, 216), (1001, 190), (979, 184), (977, 93), (994, 83), (1002, 66), (1007, 53)]},
    ],
    # dancers (front three): hip pivot, upper-body ellipse, skirt ellipse
    "dancers": [
        {"pivot": (252, 1650), "upper": (240, 1525, 175, 150), "skirt": (255, 1785, 200, 135)},
        {"pivot": (560, 1660), "upper": (548, 1530, 165, 150), "skirt": (545, 1790, 195, 130)},
        {"pivot": (895, 1650), "upper": (905, 1520, 175, 160), "skirt": (900, 1790, 185, 130)},
    ],
}


def screen3():
    img = read_source(3)
    shape = img.shape[:2]
    img = (text_off(img, S3["text"], S3["keep"][:3]))

    layers, cut = [], np.zeros(shape, np.float32)
    for k, ln in enumerate(S3["lanterns"]):
        a, bg = cut_polygon(img, ln["poly"], cap_y=ln["cap"])
        rgba, box = crop_rgba(unmix(img, bg, a), a)
        layers.append((f"lantern-{k}.png", rgba, box, ln))
        cut = np.maximum(cut, a)

    # little bulbs on the strings (they twinkle in code; the painted ones stay)
    L = lum(img)
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    bright = ((L > 222) & ((r - b) > 25)).astype(np.float32) * rect_mask([(330, 0, 1080, 300)], shape)
    bright *= 1 - dilate(cut, 6)
    n, lab, stats, cents = cv2.connectedComponentsWithStats((bright > 0.5).astype(np.uint8))
    bulbs = [[round(cents[k][0] / SCALE, 1), round(cents[k][1] / SCALE, 1)] for k in range(1, n) if stats[k][4] > s(3) ** 2]
    print("   bulbs:", len(bulbs))

    dancers = subject_mask(3, 1300, shape)
    dancers = np.clip((dancers - 0.08) / 0.84, 0, 1)
    hole = np.maximum(dilate((cut > 0.03).astype(np.float32), 5), dilate((dancers > 0.04).astype(np.float32), 6))
    plate = remove(img, hole)
    d_rgba, d_box = crop_rgba(unmix(img, plate, dancers), dancers)

    keep = np.maximum.reduce([poly_mask(p, shape) for p in S3["keep"]])
    pink = (((r - g) > 60) & ((r - b) > 10) & (r > 150)).astype(np.float32)
    petals = find_blobs(pink, (1 - keep) * (1 - dilate(cut, 8)), 6, 60, 85, fill=0.2)
    plate = remove(plate, boxes_mask(petals, shape))
    print("   loose petals removed:", len(petals))

    deco = np.maximum.reduce([poly_mask(p, shape, feather=12) for p in S3["keep"][:3]])
    dz = cv2.GaussianBlur(dilate(dancers, 14), (0, 0), s(6))
    wind = wind_detect(plate) * deco * (1 - dz)
    drift = (1 - np.clip(deco * 1.5, 0, 1)) * (1 - poly_mask(S3["keep"][3], shape, feather=20)) * (1 - poly_mask(S3["keep"][4], shape, feather=30))
    return {
        "plate": plate,
        "masks": {"wind": wind, "drift": drift},
        "layers": layers,
        "dancers": (d_rgba, d_box),
        "bulbs": bulbs,
        "cfg": S3,
    }


S4 = {
    "text": [(115, 625, 980, 1465)],
    "top": [(0, 640), (110, 640), (140, 490), (170, 385), (220, 335), (300, 300), (330, 205), (400, 65), (450, 25), (1080, 25)],
    "bottom": [(0, 1315), (140, 1315), (200, 1545), (320, 1595), (620, 1595), (660, 1530), (760, 1520), (830, 1470), (900, 1405), (1080, 1405)],
    "zone": (630, 1470),
    "fireworks": [(985, 142, 118), (420, 345, 105), (975, 585, 100)],
    "flowers": [
        [(0, 0), (420, 0), (400, 110), (330, 285), (180, 420), (130, 610), (0, 630)],
        [(0, 1300), (160, 1300), (350, 1700), (420, 1919), (0, 1919)],
    ],
}


def screen4():
    img = read_source(4)
    shape = img.shape[:2]
    lake = poly_mask([(330, 1625), (1080, 1640), (1080, 1919), (330, 1919)], shape, feather=14)
    palace = poly_mask([(620, 1380), (1080, 1380), (1080, 1650), (620, 1650)], shape, feather=10)
    flowers = np.maximum.reduce([poly_mask(p, shape) for p in S4["flowers"]])
    # the night sky's grain is its stars: borrow from anywhere but flowers, palace and water
    sky_ok = 1 - dilate(np.clip(np.maximum.reduce([flowers, palace, lake]) * 2, 0, 1), 10)
    img = (text_off(img, S4["text"], S4["flowers"]))

    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    pinkp = (((r - g) > 40) & ((r - b) > 5) & (r > 150) & (b > g * 0.92)).astype(np.float32)  # pink, not orange lanterns
    petals = find_blobs(pinkp, (1 - dilate(flowers, 6)) * rect_mask([(0, 0, 1080, 1500)], shape), 6, 60, 85, fill=0.2)
    img = remove(img, boxes_mask(petals, shape), sky_ok)
    print("   loose petals removed:", len(petals))

    # fireworks are redrawn in code: their whole circle is cleared like a lantern's (below)
    fw_zone = np.maximum.reduce([ellipse_mask(cx, cy, R, R, shape, SCALE) for cx, cy, R in S4["fireworks"]])

    # sky lanterns: warm bodies against the cooler sky
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    core = (((r - b) > 85) & (r > 175) & (g > b * 1.1)).astype(np.uint8)
    core[s(1380):, :] = 0
    core = (core * (flowers < 0.5) * (fw_zone < 0.5)).astype(np.uint8)
    core = cv2.morphologyEx(core, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(core)
    keep = []
    for k in range(1, n):
        x, y, w, h, a = stats[k]
        size = max(w, h) / SCALE
        if size < 12 or size > 260 or x <= 2 or y <= 2:
            continue
        keep.append((k, size))
    PH_ = shape[0]
    yy, xx = np.mgrid[0:PH_, 0:PW].astype(np.float32)
    regions = np.zeros(shape, np.float32)
    for k, size in keep:
        x, y, w, h, _ = stats[k]
        cx, cy = x + w / 2, y + h / 2
        R = s(max(14, size * 1.05))
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        regions = np.maximum(regions, np.clip((R - d) / max(4, R * 0.25), 0, 1))
    circles = []
    for k, size in keep:
        x, y, w, h, _ = stats[k]
        circles.append((x + w / 2, y + h / 2, s(max(14, size * 1.05))))
    for cx, cy, R in S4["fireworks"]:
        Rp = s(R * 0.78)  # transplant's soft edge reaches 1.35x this
        circles.append((s(cx), s(cy), Rp))
        d = np.sqrt((xx - s(cx)) ** 2 + (yy - s(cy)) ** 2)
        regions = np.maximum(regions, np.clip((s(R) * 1.04 - d) / s(18), 0, 1))
    sky = push_pull_fill(img, (regions < 0.01).astype(np.float32))
    sky = cv2.GaussianBlur(sky, (0, 0), s(3))
    sky_tex = transplant(img, sky, circles, sky_ok * (dilate((regions > 0.01).astype(np.float32), 20) < 0.5))
    dist = np.sqrt(((img - sky) ** 2).sum(axis=2))
    sky_lanterns = []
    for j, (k, size) in enumerate(keep):
        x, y, w, h, _ = stats[k]
        pad = s(size * 0.35) + 6
        X0, Y0, X1, Y1 = max(0, x - pad), max(0, y - pad), min(PW, x + w + pad), min(PH_, y + h + pad)
        sub = img[Y0:Y1, X0:X1]
        warmish = (sub[..., 2] - sub[..., 0]) > 30
        fg = ((dist[Y0:Y1, X0:X1] > 34) & warmish).astype(np.uint8)
        fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        seed = (lab[Y0:Y1, X0:X1] == k).astype(np.uint8)
        _, lab2 = cv2.connectedComponents(np.maximum(fg, seed))
        ids = np.unique(lab2[seed > 0])
        blob = np.isin(lab2, ids[ids > 0]).astype(np.uint8)
        hull = np.zeros_like(blob)
        cv2.fillConvexPoly(hull, cv2.convexHull(cv2.findNonZero(blob)), 1)
        a = np.zeros(shape, np.float32)
        a[Y0:Y1, X0:X1] = cv2.GaussianBlur(hull.astype(np.float32), (0, 0), 1.1)
        rgba, box = crop_rgba(unmix(img, sky, a), a)
        sky_lanterns.append((f"sky-{j:02d}.png", rgba, box, float(size)))
    plate = img * (1 - regions[..., None]) + sky_tex * regions[..., None]
    print("   sky lanterns:", len(sky_lanterns))

    # palace window lights: a sharp overlay that breathes
    pal = rect_mask([(630, 1400, 1080, 1730)], shape, feather=8)
    la = np.clip((lum(plate) - 185) / 50, 0, 1) * np.clip((plate[..., 2] - plate[..., 0] - 25) / 40, 0, 1) * pal
    lights = crop_rgba(plate, la)

    deco = np.maximum.reduce([poly_mask(p, shape, feather=12) for p in S4["flowers"]])
    wind = wind_detect(plate) * deco
    ripple = lake * (1 - np.clip(wind * 3, 0, 1))
    drift = (1 - np.clip(deco * 1.5, 0, 1)) * (1 - lake) * (1 - palace) * (1 - rect_mask([(0, 1500, 1080, 1919)], shape, feather=30))
    return {
        "plate": plate,
        "masks": {"wind": wind, "ripple": ripple, "drift": drift},
        "layers": [],
        "sky": sky_lanterns,
        "plain": sky_ok,
        "lights": lights,
        "cfg": S4,
    }


# ---------------------------------------------------------------- variants

def write_variant(i, data, variant, H, manifest):
    cfg = data["cfg"]
    plate = data["plate"]
    SH = plate.shape[0]
    top, bot = envelope(cfg["top"], "top"), envelope(cfg["bottom"], "bottom")
    warp = Warp(top, bot, SH, H)
    out = os.path.join(OUT, variant, f"s{i}")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))

    save_jpg(os.path.join(out, "plate.jpg"), warp.image(plate, data["grain"]))
    for name, m in data["masks"].items():
        save_gray(os.path.join(out, f"{name}.png"), np.clip(warp.mask(m), 0, 1), H)

    zt, zb = cfg["zone"]
    rec = {"zone": [round(warp.y(540, zt), 1), round(warp.y(540, zb), 1)], "extra": round(warp.D / SCALE, 1)}

    if data["layers"]:
        lanterns = []
        for k, (fname, rgba, box, ln) in enumerate(data["layers"]):
            save_png(os.path.join(out, fname), rgba)
            lanterns.append(lantern_record(fname, box, ln["pivot"], ln["center"], ln["size"], warp))
        rec["lanterns"] = lanterns

    if "bulbs" in data:
        rec["bulbs"] = [[x, round(warp.y(x, y), 1)] for x, y in data["bulbs"]]

    if "dancers" in data:
        rgba, box = data["dancers"]
        save_png(os.path.join(out, "dancers.png"), rgba)
        dy = warp.D / SCALE  # the dancers are below every column's stretch
        rec["dancers"] = moved(box, dy)
        for k, dn in enumerate(cfg["dancers"]):
            px, py = dn["pivot"][0], dn["pivot"][1] + dy
            mb = MapBuilder(H)
            cx, cy, rx, ry = dn["upper"]
            mb.rotate(mb.ellipse(cx, cy + dy, rx, ry, feather=35), px, py, only_above=py + 30)
            mb.save(os.path.join(out, f"map-u{k}.png"))
            mb = MapBuilder(H)
            cx, cy, rx, ry = dn["skirt"]
            mb.swing(mb.ellipse(cx, cy + dy, rx, ry, feather=40) * mb.taper(50), py - 20)
            mb.save(os.path.join(out, f"map-s{k}.png"))
        rec["dancerPivots"] = [[d["pivot"][0], round(d["pivot"][1] + dy, 1)] for d in cfg["dancers"]]

    if "sky" in data:
        sky = []
        for fname, rgba, box, size in data["sky"]:
            save_png(os.path.join(out, fname), rgba)
            cx, cy = box["x"] + box["w"] / 2, box["y"] + box["h"] / 2
            b = moved(box, warp.y(cx, cy) - cy)
            b["size"] = round(size, 1)
            sky.append(b)
        rec["sky"] = sky
        rgba, box = data["lights"]
        save_png(os.path.join(out, "lights.png"), rgba)
        rec["lights"] = moved(box, warp.D / SCALE)
        rec["fireworks"] = [[x, round(warp.y(x, y), 1), r] for x, y, r in cfg["fireworks"]]

    manifest[f"s{i}"] = rec
    print(f"   {variant}: zone {rec['zone']}, +{rec['extra']} px")


def write_fields():
    """Grayscale 'arrival time' fields for the watercolour transitions (0 = first)."""
    out = os.path.join(OUT, "fields")
    os.makedirs(out, exist_ok=True)
    w, h = 270, 600
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    fields = {
        # from the middle outwards
        "bloom": np.sqrt(((u - 0.5) * 1.0) ** 2 + ((v - 0.45) * 2.2) ** 2),
        # top-left down to bottom-right
        "diagonal": 0.45 * u + 0.55 * v,
        # bottom-right up to top-left
        "rise": 0.4 * (1 - u) + 0.6 * (1 - v),
        # from the edges inwards
        "vignette": 1 - np.sqrt(((u - 0.5) * 1.0) ** 2 + ((v - 0.5) * 2.2) ** 2),
    }
    for name, f in fields.items():
        f = (f - f.min()) / (f.max() - f.min())
        g = np.clip(f * 255, 0, 255).astype(np.uint8)
        cv2.imwrite(os.path.join(out, f"{name}.png"), cv2.merge([g, g, g]))


if __name__ == "__main__":
    which = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4]
    fns = {1: screen1, 2: screen2, 3: screen3, 4: screen4}
    os.makedirs(GEN, exist_ok=True)
    manifests = {}
    for v in VARIANTS:
        p = os.path.join(GEN, f"manifest-{v}.json")
        manifests[v] = json.load(open(p)) if os.path.exists(p) else {}
    for i in which:
        print(f"screen {i}")
        data = fns[i]()
        plain = data.get("plain")
        P = cv2.GaussianBlur(plain_paper(data["plate"]) if plain is None else plain, (0, 0), 2)[..., None]
        hp = highpass(data["plate"])
        data["grain"] = hp * P + borrow_grain(data["plate"], (P[..., 0] < 0.98).astype(np.float32), plain) * (1 - P)
        for v, H in VARIANTS.items():
            write_variant(i, data, v, H, manifests[v])
    write_fields()
    for v in VARIANTS:
        with open(os.path.join(GEN, f"manifest-{v}.json"), "w") as fh:
            json.dump(manifests[v], fh, indent=1)
    print("done")
