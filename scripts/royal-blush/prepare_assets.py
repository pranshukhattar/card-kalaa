"""
Builds every image the "royal-blush" card needs from the 4x-upscaled screens in
assets/royal-blush/upscaled/screen{1..5}.png.

Outputs (public/cards/royal-blush/):
  sN/plate.jpg     the screen with its text (and any separately animated element) removed
  sN/wind.png      grayscale mask: where the wind ripple may move pixels
  sN/map-*.png     displacement maps for "puppet" motion (R = x, G = y, 128 = no motion)
  sN/*.png         cut-out RGBA layers (Ganesha, illustrations, sky lanterns, palace lights)
  petals/*.png     painted petal sprites lifted from the artwork
and src/remotion/cards/royal-blush/generated/manifest.json with every layer's position.

All coordinates in this file are in COMPOSITION space: 1080 x 2624 (the card's size).
Images are written at SCALE x that size so the video stays sharp during slow zooms.

Run:  python3 scripts/royal-blush/prepare_assets.py [screen numbers...]
"""

import json
import math
import os
import sys

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets", "royal-blush", "upscaled")
OUT = os.path.join(ROOT, "public", "cards", "royal-blush")
MANIFEST = os.path.join(ROOT, "src", "remotion", "cards", "royal-blush", "generated", "manifest.json")

W, H = 1080, 2624
SCALE = 1.5
PW, PH = int(W * SCALE), int(H * SCALE)  # plate size
MAP_DIV = 2  # displacement maps are stored at half composition size
MAXPX = 20.0  # a map value of 0 or 255 means +/- MAXPX of displacement at weight 1

rng = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers

def s(v):
    return int(round(v * SCALE))


# Screen 2 comes from a separate, later artwork (screen2v2.png) with a slightly wider aspect.
SOURCES = {1: "screen1.png", 2: "screen2v2.png", 3: "screen3.png", 4: "screen4.png", 5: "screen5.png"}


def frame_to_plate(i, img, interp=cv2.INTER_AREA):
    """Crop/scale a full-size source image (or a mask of it) to the plate."""
    if i == 2:
        # trim a hairline border, fit the height, centre-crop the width
        e = max(1, round(img.shape[1] / 1800 * 10))
        img = img[e:-e, e:-e]
        h, w = img.shape[:2]
        fw = int(round(w * PH / h))
        img = cv2.resize(img, (fw, PH), interpolation=interp)
        off = (fw - PW) // 2
        return img[:, off:off + PW]
    m = 12  # trim the thin frame line around each panel of the original 5-panel artwork
    img = img[m:-m, m:-m]
    return cv2.resize(img, (PW, PH), interpolation=interp)


def load(i):
    img = cv2.imread(os.path.join(SRC, SOURCES[i]), cv2.IMREAD_COLOR)
    return frame_to_plate(i, img).astype(np.float32)


_MASK_TOOL = os.path.join(ROOT, "scripts", "royal-blush", ".bin", "subject_masks")


def subject_mask(i):
    """Soft 0..1 mask of every foreground subject macOS Vision finds (see subject_masks.swift)."""
    import subprocess
    import tempfile

    if not os.path.exists(_MASK_TOOL):
        os.makedirs(os.path.dirname(_MASK_TOOL), exist_ok=True)
        subprocess.run(["swiftc", "-O", "-o", _MASK_TOOL, os.path.join(ROOT, "scripts", "royal-blush", "subject_masks.swift")], check=True)
    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "m")
        subprocess.run([_MASK_TOOL, os.path.join(SRC, SOURCES[i]), prefix], check=True, capture_output=True)
        m = cv2.imread(prefix + "-all.png", cv2.IMREAD_GRAYSCALE)
    return frame_to_plate(i, m, cv2.INTER_LINEAR).astype(np.float32) / 255


def lum(img):
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    return 0.114 * b + 0.587 * g + 0.299 * r


def rect_mask(rects, shape=(PH, PW), feather=0):
    m = np.zeros(shape, np.float32)
    for x0, y0, x1, y1 in rects:
        m[s(y0):s(y1), s(x0):s(x1)] = 1
    if feather:
        m = cv2.GaussianBlur(m, (0, 0), s(feather))
    return m


def poly_mask(points, shape=(PH, PW), feather=0, scale=SCALE):
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
    if empty.any():  # coarsest cells with no known pixel take the mean of the known ones
        mean = (img * known[..., None]).sum(axis=(0, 1)) / max(known.sum(), 1)
        F[empty] = mean
    for I, Wt in reversed(levels):
        up = cv2.pyrUp(F, dstsize=(I.shape[1], I.shape[0]))
        a = np.clip(Wt * 4, 0, 1)[..., None]
        est = I / np.maximum(Wt, 1e-6)[..., None]
        F = a * est + (1 - a) * up
    k = known[..., None]
    out = img * k + F * (1 - k)
    # A touch of grain so filled areas don't look airbrushed
    grain = rng.normal(0, 1.4, img.shape[:2]).astype(np.float32)[..., None]
    return np.clip(out + grain * (1 - k), 0, 255)


def local_bg_lum(L, rect):
    """Smooth background luminance inside rect, ignoring thin dark/light strokes."""
    x0, y0, x1, y1 = s(rect[0]), s(rect[1]), s(rect[2]), s(rect[3])
    pad = s(40)
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(PW, x1 + pad), min(PH, y1 + pad)
    sub = np.clip(L[Y0:Y1, X0:X1], 0, 255).astype(np.uint8)
    small = cv2.resize(sub, (max(8, sub.shape[1] // 4), max(8, sub.shape[0] // 4)), interpolation=cv2.INTER_AREA)
    med = cv2.medianBlur(small, 21)
    med = cv2.medianBlur(med, 21)
    big = cv2.resize(med, (sub.shape[1], sub.shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    return big[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0]


def text_mask(img, rects, mode="dark", thr=22, grow=9):
    """Pixels of text/ornaments inside rects: darker (or lighter) than the local background."""
    L = lum(img)
    m = np.zeros((PH, PW), np.float32)
    for r in rects:
        x0, y0, x1, y1 = s(r[0]), s(r[1]), s(r[2]), s(r[3])
        bg = local_bg_lum(L, r)
        d = (bg - L[y0:y1, x0:x1]) if mode == "dark" else (L[y0:y1, x0:x1] - bg)
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], (d > thr).astype(np.float32))
    m = dilate(m, grow)
    return m


def remove(img, mask):
    """Replace masked pixels with a smooth fill, with a soft seam."""
    hard = (mask > 0.01).astype(np.float32)
    filled = push_pull_fill(img, 1 - hard)
    soft = np.clip(cv2.GaussianBlur(hard, (0, 0), 1.5) * 1.2, 0, 1)[..., None]
    return img * (1 - soft) + filled * soft


def save_jpg(path, img, q=90):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, q])


def save_rgba(path, rgb, alpha, bbox=None):
    """Save an RGBA layer cropped to bbox (plate pixels). Returns the bbox in composition units."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if bbox is None:
        ys, xs = np.where(alpha > 0.004)
        bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    x0, y0, x1, y1 = bbox
    rgba = np.dstack([rgb[y0:y1, x0:x1], (alpha[y0:y1, x0:x1] * 255)[..., None]])
    cv2.imwrite(path, np.clip(rgba, 0, 255).astype(np.uint8))
    return {"x": x0 / SCALE, "y": y0 / SCALE, "w": (x1 - x0) / SCALE, "h": (y1 - y0) / SCALE}


def save_gray(path, m):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    small = cv2.resize(m, (W // MAP_DIV, H // MAP_DIV), interpolation=cv2.INTER_AREA)
    g = np.clip(small * 255, 0, 255).astype(np.uint8)
    cv2.imwrite(path, cv2.merge([g, g, g]))


def wind_mask(img, allow=None, exclude=()):
    """Where foliage and flowers are (green leaves, pink/red petals, strongly saturated
    blooms) -- but not sandstone, sky or text. Feathered."""
    hsv = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, sat, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    green = ((hue > 55) & (hue < 175)).astype(np.float32) * np.clip((sat - 0.15) / 0.15, 0, 1)
    pink = ((hue > 290) | (hue < 14)).astype(np.float32) * np.clip((sat - 0.25) / 0.15, 0, 1)
    vivid = np.clip((sat - 0.55) / 0.15, 0, 1)
    m = np.maximum(np.maximum(green, pink), vivid) * np.clip((0.98 - val) / 0.08, 0, 1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    m = cv2.GaussianBlur(m, (0, 0), s(6))
    if allow is not None:
        m = np.maximum(m, allow)
    for ex in exclude:
        m = m * (1 - ex)
    return np.clip(m, 0, 1)


# ------------------------------------------------- displacement ("puppet") maps

class MapBuilder:
    """Accumulates displacement fields (pixels at weight 1) into one R/G map image."""

    def __init__(self):
        self.h, self.w = H // MAP_DIV, W // MAP_DIV
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype(np.float32)
        self.x, self.y = xx * MAP_DIV, yy * MAP_DIV  # composition units
        self.ux = np.zeros((self.h, self.w), np.float32)
        self.uy = np.zeros((self.h, self.w), np.float32)

    def mask(self, kind, *args, feather=30):
        if kind == "ellipse":
            cx, cy, rx, ry = args
            return ellipse_mask(cx, cy, rx, ry, (self.h, self.w), 1 / MAP_DIV, feather)
        if kind == "poly":
            return poly_mask(args[0], (self.h, self.w), feather, 1 / MAP_DIV)
        raise ValueError(kind)

    def rotate(self, m, px, py, sign=1.0, only_above=None, only_below=None):
        """Rotation by 1 degree about (px, py), within mask m."""
        k = math.radians(1) * sign
        m = m.copy()
        if only_above is not None:
            m *= np.clip((only_above - self.y) / 40 + 0.5, 0, 1)
        if only_below is not None:
            m *= np.clip((self.y - only_below) / 40 + 0.5, 0, 1)
        self.ux += m * -(self.y - py) * k
        self.uy += m * (self.x - px) * k

    def swing(self, m, py, sign=1.0):
        """Horizontal swish growing with distance below py (1 degree of 'swing')."""
        k = math.radians(1) * sign
        self.ux += m * np.clip(self.y - py, 0, None) * k

    def field(self, m, fx, fy):
        self.ux += m * fx
        self.uy += m * fy

    def save(self, path):
        r = np.clip(128 + 127.5 * self.ux / MAXPX, 0, 255)
        g = np.clip(128 + 127.5 * self.uy / MAXPX, 0, 255)
        b = np.full_like(r, 128)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        cv2.imwrite(path, np.dstack([b, g, r]).astype(np.uint8))
        print("  map", os.path.basename(path), "max px", float(np.abs(self.ux).max()), float(np.abs(self.uy).max()))


# ------------------------------------------------------------------- petals

def find_petals(img, region, exclude=()):
    """Small isolated pink blobs on a light background -> list of (x, y, w, h) plate px."""
    f = img
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    pink = ((r - g) > 45) & ((r - b) > 25) & (r > 150) & (b > g * 0.85)
    m = pink.astype(np.uint8) * rect_mask([region]).astype(np.uint8)
    for ex in exclude:
        m = m * (ex < 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if s(10) ** 2 * 0.5 < a < s(60) ** 2 and max(w, h) < s(75) and a / (w * h) > 0.25:
            out.append((x, y, w, h))
    return out


def petal_masks(img, boxes, pad=10):
    m = np.zeros((PH, PW), np.float32)
    for x, y, w, h in boxes:
        p = s(pad)
        m[max(0, y - p):y + h + p, max(0, x - p):x + w + p] = 1
    return m


# ---------------------------------------------------------------- screens

manifest = {}
if os.path.exists(MANIFEST):
    with open(MANIFEST) as fh:
        manifest = json.load(fh)


def screen1():
    img = load(1)
    out = os.path.join(OUT, "s1")
    # Ganesha + swastika + side rules: lift them off as one gold layer
    g_rect = (275, 415, 815, 1232)
    L = lum(img)
    x0, y0, x1, y1 = [s(v) for v in g_rect]
    bgL = local_bg_lum(L, g_rect)
    d = bgL - L[y0:y1, x0:x1]
    hard = np.zeros((PH, PW), np.float32)
    hard[y0:y1, x0:x1] = (d > 14).astype(np.float32)
    glow = np.zeros((PH, PW), np.float32)
    glow[y0:y1, x0:x1] = (d > 5).astype(np.float32)
    hard = np.maximum(dilate(hard, 9), glow * dilate(hard, 16))
    bg = push_pull_fill(img, 1 - hard)
    # alpha by projecting onto the (background -> gold) axis
    gold = np.array([70, 135, 185], np.float32)  # BGR
    dirv = bg - gold[None, None, :]
    num = ((bg - img) * dirv).sum(axis=2)
    den = np.maximum((dirv * dirv).sum(axis=2), 1)
    a = np.clip(num / den, 0, 1) * hard
    a = np.clip((a - 0.04) / 0.96, 0, 1)
    rgb = np.where(a[..., None] > 0.05, (img - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 0.05), gold)
    rgb = np.clip(rgb, 0, 255)
    ganesha = save_rgba(os.path.join(out, "ganesha.png"), rgb, a)
    plate = img * (1 - hard[..., None]) + bg * hard[..., None]

    # Text: heading, divider, blessing
    tm = text_mask(plate, [(215, 1265, 870, 1965)], "dark", thr=20)
    petals = []
    plate = remove(plate, tm)
    save_jpg(os.path.join(out, "plate.jpg"), plate)

    pavilion = poly_mask([(700, 1985), (905, 1985), (1000, 2200), (1000, 2560), (330, 2560), (330, 2370), (700, 2370)], feather=12)
    wm = wind_mask(plate, exclude=[rect_mask([g_rect], feather=10), pavilion, ellipse_mask(190, 2330, 260, 300, (PH, PW), SCALE, 30)])
    save_gray(os.path.join(out, "wind.png"), wm)

    mb = MapBuilder()
    lotus = mb.mask("ellipse", 190, 2330, 260, 300, feather=40)
    mb.rotate(lotus, 170, 2720)
    mb.save(os.path.join(out, "map-a.png"))

    manifest["s1"] = {"ganesha": ganesha, "petals": len(petals)}
    return img, petals


def edge_taper(mb, px=110):
    """1 inside the canvas, falling to 0 at its borders (so warped layers never pull in emptiness)."""
    d = np.minimum.reduce([mb.x, mb.y, (W - 1) - mb.x, (H - 1) - mb.y])
    return np.clip(d / px, 0, 1)


def cut_layer(img, alpha, grow=5):
    """Split img into a clean background plate (subject filled in) and the subject's alpha."""
    hole = dilate((alpha > 0.04).astype(np.float32), grow)
    plate = push_pull_fill(img, 1 - hole)
    return plate


def screen2():
    img = load(2)
    out = os.path.join(OUT, "s2")
    # Text sits right of centre in this artwork; the divider here is maroon
    text_rects = [(230, 1440, 962, 2052), (368, 2040, 860, 2322)]
    tm = text_mask(img, text_rects, "dark", thr=20)
    img = remove(img, tm)

    # Hands, sherwani sleeve and dupatta: one clean cut-out over a filled-in sky/cream plate
    subj = subject_mask(2)
    subj = np.clip((subj - 0.08) / 0.84, 0, 1)
    plate = cut_layer(img, subj, grow=6)
    save_jpg(os.path.join(out, "plate.jpg"), plate)
    subject = save_rgba(os.path.join(out, "subject.png"), img, subj)

    wm = wind_mask(plate, exclude=[cv2.GaussianBlur(dilate(subj, 10), (0, 0), s(8)), rect_mask(text_rects, feather=10)])
    save_gray(os.path.join(out, "wind.png"), wm)

    # map-a: the clasped hands and arms drift together (vertical, with a little sway)
    mb = MapBuilder()
    arms = mb.mask("poly", [(0, 0), (1080, 0), (1080, 760), (820, 960), (740, 1260), (330, 1080), (150, 760), (0, 640)], feather=40)
    taper = edge_taper(mb)
    mb.field(arms * taper, 0.35 * np.ones_like(arms), np.ones_like(arms))
    mb.save(os.path.join(out, "map-a.png"))
    # map-b / map-c: a travelling wave down the dupatta (sin and cos components)
    dupatta = [(0, 600), (90, 600), (260, 900), (330, 1300), (300, 1700), (330, 2100), (520, 2400), (700, 2624), (0, 2624)]
    for name, fn in (("map-b.png", np.sin), ("map-c.png", np.cos)):
        mb = MapBuilder()
        dm = mb.mask("poly", dupatta, feather=35)
        # strongest along the free-hanging middle; still where the dupatta meets the lehenga
        grow = np.clip((mb.y - 620) / 500, 0, 1) * np.clip((2150 - mb.y) / 450, 0, 1) * edge_taper(mb, 60)
        mb.field(dm * grow, fn(2 * math.pi * mb.y / 560), np.zeros_like(dm))
        mb.save(os.path.join(out, name))
    manifest["s2"] = {"subject": subject}
    return img, []


# Hanging lanterns of screen 3: pivot (top of chain) and an outline of chain + lantern
S3_LANTERNS = [
    {"pivot": (110, 175), "poly": [(101, 168), (120, 168), (122, 348), (166, 392), (166, 582), (54, 582), (54, 392), (99, 348)]},
    {"pivot": (341, 0), "poly": [(331, 0), (352, 0), (353, 148), (401, 196), (401, 378), (284, 378), (284, 196), (329, 148)]},
    {"pivot": (926, 0), "poly": [(916, 0), (937, 0), (938, 138), (986, 178), (986, 344), (871, 344), (871, 178), (914, 138)]},
    {"pivot": (1011, 392), "poly": [(1004, 392), (1019, 392), (1021, 438), (1041, 463), (1041, 554), (981, 554), (981, 463), (1001, 438)]},
]
# Dancers of screen 3: hip pivot, upper-body ellipse, skirt ellipse
S3_DANCERS = [
    {"pivot": (140, 2080), "upper": (150, 1830, 165, 300), "skirt": (150, 2340, 190, 280)},
    {"pivot": (300, 2020), "upper": (300, 1890, 80, 135), "skirt": None},
    {"pivot": (520, 2170), "upper": (485, 1905, 215, 300), "skirt": (540, 2420, 480, 230)},
    {"pivot": (790, 2070), "upper": (790, 1880, 170, 255), "skirt": (790, 2310, 200, 250)},
    {"pivot": (965, 2080), "upper": (985, 1880, 110, 235), "skirt": (985, 2320, 115, 250)},
]


def screen3():
    img = load(3)
    out = os.path.join(OUT, "s3")
    tm = text_mask(img, [(232, 495, 885, 1292), (232, 1328, 895, 1505)], "dark", thr=20)
    img = remove(img, tm)

    # Lanterns: their outline, minus any blue sky or green leaf caught inside it
    f = img
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    sky = np.clip(((b - r) + 5) / 20, 0, 1)
    leaf = np.clip(((g - r) - 0) / 20, 0, 1) * np.clip(((g - b) - 10) / 20, 0, 1)
    lanterns = []
    lantern_alpha = np.zeros((PH, PW), np.float32)
    for k, ln in enumerate(S3_LANTERNS):
        poly = poly_mask(ln["poly"], feather=0.8)
        a = poly * (1 - sky) * (1 - leaf)
        a = cv2.GaussianBlur(a, (0, 0), 0.8)
        lantern_alpha = np.maximum(lantern_alpha, a)
        box = save_rgba(os.path.join(out, f"lantern-{k}.png"), img, a)
        xs = [p[0] for p in ln["poly"]]
        ys = [p[1] for p in ln["poly"]]
        lanterns.append({
            "box": box,
            "pivot": ln["pivot"],
            "center": ((min(xs) + max(xs)) / 2, max(ys) - (max(ys) - min(ys)) * 0.3),
            "size": max(xs) - min(xs),
        })

    # Dancers: Vision's subject mask (the four front dancers), cut out as one layer
    dancers = subject_mask(3)
    dancers[: s(1450)] = 0  # Vision also returns nothing above; keep only the dancers
    dancers = np.clip((dancers - 0.08) / 0.84, 0, 1)
    dancer_box = save_rgba(os.path.join(out, "dancers.png"), img, dancers)

    plate = cut_layer(img, np.maximum(lantern_alpha, dancers), grow=5)
    save_jpg(os.path.join(out, "plate.jpg"), plate)

    lantern_ex = [cv2.GaussianBlur(dilate(lantern_alpha, 12), (0, 0), s(6))]
    wm = wind_mask(plate, exclude=lantern_ex + [rect_mask([(0, 1560, 1080, 2624)], feather=30), rect_mask([(232, 495, 885, 1505)], feather=20)])
    save_gray(os.path.join(out, "wind.png"), wm)

    # Dancer motion (applied to the dancers layer only): upper bodies sway, skirts swish
    groups = {"map-da.png": [(0, 1), (3, -1)], "map-db.png": [(2, 1), (4, -1)]}
    for name, members in groups.items():
        mb = MapBuilder()
        for di, sign in members:
            dn = S3_DANCERS[di]
            cx, cy, rx, ry = dn["upper"]
            m = mb.mask("ellipse", cx, cy, rx, ry, feather=35)
            mb.rotate(m, *dn["pivot"], sign=sign, only_above=dn["pivot"][1] + 30)
        mb.save(os.path.join(out, name))
    groups = {"map-sa.png": [(0, 1), (3, -1)], "map-sb.png": [(2, 1), (4, -1)]}
    for name, members in groups.items():
        mb = MapBuilder()
        for di, sign in members:
            dn = S3_DANCERS[di]
            cx, cy, rx, ry = dn["skirt"]
            m = mb.mask("ellipse", cx, cy, rx, ry, feather=40) * edge_taper(mb, 50)
            mb.swing(m, dn["pivot"][1] - 20, sign=sign)
        mb.save(os.path.join(out, name))

    manifest["s3"] = {"lanterns": lanterns, "dancers": dancer_box}
    return img, []


S4_ILLUS = {
    "table": (195, 385, 885, 792),
    "mandap": (55, 1135, 1035, 1585),
    "doli": (135, 1955, 945, 2315),
}


def screen4():
    img = load(4)
    out = os.path.join(OUT, "s4")
    text_rects = [(175, 185, 915, 385), (225, 755, 875, 1150), (165, 1555, 925, 1955), (295, 2295, 805, 2565)]
    tm = text_mask(img, text_rects, "dark", thr=20)
    plate = remove(img, tm)
    petals = []

    layers = {}
    for name, r in S4_ILLUS.items():
        x0, y0, x1, y1 = [s(v) for v in r]
        ring = rect_mask([r])
        # only plain cream counts as "known" background, so border leaves don't bleed in
        cream = (lum(plate) > 205).astype(np.float32)
        bg = push_pull_fill(plate, (1 - ring) * cream)
        a = rect_mask([(r[0] + 22, r[1] + 22, r[2] - 22, r[3] - 22)], feather=9) * ring
        layers[name] = save_rgba(os.path.join(out, f"{name}.png"), plate, a, (x0, y0, x1, y1))
        plate = plate * (1 - a[..., None]) + bg * a[..., None]
    # Events now change in the middle of a fixed background, so make the centre clean cream:
    # anything that isn't the painted flowers/petals is refilled from the plain cream around it.
    hsv = cv2.cvtColor(np.clip(plate, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    flowers = cv2.GaussianBlur(dilate((hsv[..., 1] > 70).astype(np.float32), 5), (0, 0), s(3))
    centre = np.maximum(
        poly_mask([(95, 395), (985, 395), (985, 2470), (95, 2470)], feather=30),
        poly_mask([(30, 1130), (1050, 1130), (1050, 1600), (30, 1600)], feather=20),  # where the mandap's bushes were
    )
    redo = np.clip(centre * (1 - flowers), 0, 1)
    cream = (lum(plate) > 205).astype(np.float32) * (1 - (redo > 0.02))
    clean = push_pull_fill(plate, cream)
    clean = cv2.GaussianBlur(clean, (0, 0), s(6))
    plate = plate * (1 - redo[..., None]) + clean * redo[..., None]
    save_jpg(os.path.join(out, "plate.jpg"), plate)

    wm = wind_mask(plate, exclude=[rect_mask(list(S4_ILLUS.values()), feather=15), rect_mask(text_rects, feather=10)])
    save_gray(os.path.join(out, "wind.png"), wm)
    manifest["s4"] = {"layers": layers, "petals": len(petals)}
    return img, petals


def screen5():
    img = load(5)
    out = os.path.join(OUT, "s5")
    for old in [f for f in os.listdir(out) if f.startswith("lantern-")] if os.path.isdir(out) else []:
        os.remove(os.path.join(out, old))
    tm = text_mask(img, [(195, 725, 885, 1915)], "light", thr=24, grow=6)
    plate = remove(img, tm)

    # Sky lanterns are warm and bright against a navy sky. Find their bodies...
    b, g, r = plate[..., 0], plate[..., 1], plate[..., 2]
    # warm orange/yellow (green above blue); pink petals have blue above green and are skipped
    core = (((r - b) > 60) & (r > 120) & (g > b * 1.05)).astype(np.uint8)
    core[s(1860):, :] = 0  # nothing from the palace or its towers
    core = cv2.morphologyEx(core, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(core)
    keep = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        size = max(w, h) / SCALE
        cx, cy = (x + w / 2) / SCALE, (y + h / 2) / SCALE
        if size < 18 or size > 320 or x <= 2 or y <= 2:
            continue
        if cy > 1640 and (cx < 175 or cx > 905):  # in front of the trees: leave painted
            continue
        keep.append((i, size))
    # ...clear a ROUND area around each lantern (body + its painted glow) and fill it with the
    # sky around it. The glow is then redrawn in code as a soft circle that travels with the
    # lantern, so no irregular, lantern-shaped hole is left in the sky.
    yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
    regions = np.zeros((PH, PW), np.float32)
    for i, size in keep:
        x, y, w, h, _ = stats[i]
        cx, cy = x + w / 2, y + h / 2
        R = s(max(16, size * 1.05))
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        regions = np.maximum(regions, np.clip((R - d) / max(4, R * 0.25), 0, 1))
    sky = push_pull_fill(plate, (regions < 0.01).astype(np.float32))
    sky = cv2.GaussianBlur(sky, (0, 0), s(3))
    # Lantern layer = the whole paper body + flame. Everything clearly different from the sky
    # behind it, joined to the lantern's warm core, made solid (convex hull) and edge-feathered.
    dist = np.sqrt(((plate - sky) ** 2).sum(axis=2))
    lanterns = []
    for k, (i, size) in enumerate(keep):
        x, y, w, h, _ = stats[i]
        pad = s(size * 0.35) + 6
        X0, Y0, X1, Y1 = max(0, x - pad), max(0, y - pad), min(PW, x + w + pad), min(PH, y + h + pad)
        sub = plate[Y0:Y1, X0:X1]
        warmish = (sub[..., 2] - sub[..., 0]) > 18  # paper is orange/pink; clouds are blue
        fg = ((dist[Y0:Y1, X0:X1] > 40) & warmish).astype(np.uint8)
        fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        seed = (lab[Y0:Y1, X0:X1] == i).astype(np.uint8)
        n2, lab2 = cv2.connectedComponents(np.maximum(fg, seed))
        ids = np.unique(lab2[seed > 0])
        blob = np.isin(lab2, ids[ids > 0]).astype(np.uint8)
        pts = cv2.findNonZero(blob)
        hull = np.zeros_like(blob)
        cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
        a_local = cv2.GaussianBlur(hull.astype(np.float32), (0, 0), 1.1)
        a = np.zeros((PH, PW), np.float32)
        a[Y0:Y1, X0:X1] = a_local
        box = save_rgba(os.path.join(out, f"lantern-{k:02d}.png"), plate, a)
        box["size"] = float(size)
        lanterns.append(box)
    plate = plate * (1 - regions[..., None]) + sky * regions[..., None]
    save_jpg(os.path.join(out, "plate.jpg"), plate)

    # Palace window lights (a sharp overlay that only breathes in brightness)
    pal = rect_mask([(110, 1930, 990, 2600)], feather=10)
    Lp = lum(plate)
    la = np.clip((Lp - 175) / 55, 0, 1) * np.clip((plate[..., 2] - plate[..., 0] - 25) / 40, 0, 1) * pal
    lights = save_rgba(os.path.join(out, "lights.png"), plate, la)

    palace = rect_mask([(110, 1860, 980, 2460)], feather=20)
    water = poly_mask([(240, 2440), (840, 2440), (900, 2624), (180, 2624)], feather=18)
    wm = wind_mask(plate, exclude=[palace, water, rect_mask([(195, 725, 885, 1915)], feather=20), cv2.GaussianBlur(regions, (0, 0), s(6))])
    save_gray(os.path.join(out, "wind.png"), wm)
    save_gray(os.path.join(out, "ripple.png"), water)
    manifest["s5"] = {"lanterns": lanterns, "lights": lights}
    print("  sky lanterns:", len(lanterns))
    return img, []


def export_petals(sources):
    """Save each detected petal as a sprite (alpha from difference to its local fill)."""
    out = os.path.join(OUT, "petals")
    os.makedirs(out, exist_ok=True)
    sprites = []
    for img, boxes in sources:
        for x, y, w, h in boxes:
            p = s(8)
            x0, y0, x1, y1 = max(0, x - p), max(0, y - p), min(PW, x + w + p), min(PH, y + h + p)
            crop = img[y0:y1, x0:x1]
            b, g, r = crop[..., 0], crop[..., 1], crop[..., 2]
            pink = np.clip(((r - g) - 20) / 40, 0, 1) * np.clip(((r - b) - 5) / 30, 0, 1)
            a = cv2.GaussianBlur(pink, (0, 0), 1.0)
            rgba = np.dstack([crop, (a * 255)[..., None]])
            k = len(sprites)
            cv2.imwrite(os.path.join(out, f"petal-{k:02d}.png"), np.clip(rgba, 0, 255).astype(np.uint8))
            sprites.append({"w": (x1 - x0) / SCALE, "h": (y1 - y0) / SCALE})
    manifest["petals"] = sprites
    print("petal sprites:", len(sprites))


if __name__ == "__main__":
    which = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5]
    fns = {1: screen1, 2: screen2, 3: screen3, 4: screen4, 5: screen5}
    petal_sources = []
    for i in which:
        print(f"screen {i}")
        img, petals = fns[i]()
        if petals:
            petal_sources.append((img, petals))
        print("  petals removed:", len(petals))
    if petal_sources:
        export_petals(petal_sources)
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, indent=1)
    print("manifest ->", MANIFEST)
