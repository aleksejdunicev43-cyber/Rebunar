#!/usr/bin/env python3
"""
Rebunar avatar frames: measure the real inner hole of every PNG frame and
generate the per-frame geometry used by the avatar renderer.

The PNG files are only READ, never modified.

Outputs
  frontend/shared/avatar-frames.json  - measured geometry (documentation / tests)
  frontend/shared/avatar-frames.css   - generated CSS, one block per frame

Run from the repository root:
  python3 tools/analyze_frames.py

How the hole is found
  * Frames 1-9 and 11-13 have a transparent hole. The hole is the transparent
    region (alpha <= 8) that contains the image centre. To stop the flood from
    leaking through openwork gaps in the ring, the transparent mask is first
    eroded, the centre component is taken, then it is grown back inside the
    original transparent mask (morphological reconstruction).
  * Frame 10 has an opaque dark-purple disc instead of a transparent hole. The
    disc is segmented by colour, cleaned up, and the photo is drawn ABOVE the
    frame for this frame only (layer = "over").

The photo region ("clip") is the hole plus a small bleed that tucks the photo
under the frame, so there is neither a gap nor visible anti-aliasing seam:
  1. grow through the anti-aliased edge band (8 < alpha < 250), and
  2. grow BLEED_PX more into fully opaque frame pixels (never into
     transparent/semi-transparent pixels, so nothing can peek through the ring).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / 'frontend' / 'assets' / 'frames'
OUT_JSON = ROOT / 'frontend' / 'shared' / 'avatar-frames.json'
OUT_CSS = ROOT / 'frontend' / 'shared' / 'avatar-frames.css'

FRAME_COUNT = 13
ALPHA_EMPTY = 8        # alpha <= this is "transparent"
ALPHA_SOLID = 250      # alpha >= this is "opaque"
BAND_STEPS = 14        # max px to follow the anti-aliased edge band
BLEED_FRACTION = 0.0035  # tuck under the frame: fraction of image width (~5.6px at 1600)
SIMPLIFY_FRACTION = 0.0006  # polygon simplification tolerance (fraction of width)


def disk(radius):
    y, x = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    return x * x + y * y <= radius * radius


def transparent_hole(alpha):
    """Transparent region containing the centre, robust against narrow leaks."""
    h, w = alpha.shape
    empty = alpha <= ALPHA_EMPTY
    guard = max(3, round(w * 0.004))
    core = ndi.binary_erosion(empty, structure=disk(guard))
    labels, _ = ndi.label(core)
    centre_label = labels[h // 2, w // 2]
    if centre_label == 0:
        # centre not inside the eroded mask: take the biggest component near it
        ys, xs = np.nonzero(core)
        d = (ys - h / 2) ** 2 + (xs - w / 2) ** 2
        centre_label = labels[ys[d.argmin()], xs[d.argmin()]]
    core = labels == centre_label
    # grow back, limited to the original transparent pixels
    hole = ndi.binary_propagation(core, mask=empty & ndi.binary_dilation(core, structure=disk(guard + 2)))
    hole = hole | core
    return ndi.binary_fill_holes(hole)


def filled_disc_hole(rgba):
    """Frame 10: opaque dark-purple disc used instead of a transparent hole."""
    a = rgba.astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    h, w = al.shape
    fill = (al > 200) & (r - g >= 7) & (b - g >= 3) & (r >= 9)
    fill = ndi.binary_opening(fill, structure=disk(3))
    labels, _ = ndi.label(fill)
    fill = labels == labels[h // 2, w // 2]
    fill = ndi.binary_fill_holes(fill)
    # smooth ragged edge (blood drips, thorn tips): close then open with a larger disk
    k = disk(max(6, round(w * 0.008)))
    fill = ndi.binary_closing(fill, structure=k)
    fill = ndi.binary_opening(fill, structure=k)
    labels, _ = ndi.label(fill)
    fill = labels == labels[h // 2, w // 2]
    return ndi.binary_fill_holes(fill)


def grow_photo_region(hole, alpha, bleed_px):
    """hole + anti-aliased edge band + bleed into fully opaque pixels."""
    band = (alpha > ALPHA_EMPTY) & (alpha < ALPHA_SOLID)
    region = hole.copy()
    cross = ndi.generate_binary_structure(2, 1)
    for _ in range(BAND_STEPS):
        grown = ndi.binary_dilation(region, structure=cross) & (band | region)
        if grown.sum() == region.sum():
            break
        region = grown
    solid = alpha >= ALPHA_SOLID
    for _ in range(bleed_px):
        region = ndi.binary_dilation(region, structure=cross) & (solid | region)
    return ndi.binary_fill_holes(region)


def contour_polygon(mask, tolerance):
    """Largest outer contour of the mask, as a simplified polygon in pixel coords."""
    padded = np.pad(mask.astype(float), 1)
    contours = measure.find_contours(padded, 0.5)
    contour = max(contours, key=lambda c: len(c))
    contour = measure.approximate_polygon(contour, tolerance)
    return [(float(x - 1), float(y - 1)) for y, x in contour[:-1]]


def polygon_area(points):
    x = np.array([p[0] for p in points])
    y = np.array([p[1] for p in points])
    return 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))


def analyse(index):
    path = FRAMES_DIR / f'rebunar_avatar_{index}.png'
    rgba = np.array(Image.open(path).convert('RGBA'))
    alpha = rgba[..., 3]
    h, w = alpha.shape
    over = index == 10

    if over:
        hole = filled_disc_hole(rgba)
        # photo is drawn above this frame: only a hairline overlap onto the ring
        region = ndi.binary_dilation(hole, structure=disk(2))
    else:
        hole = transparent_hole(alpha)
        region = grow_photo_region(hole, alpha, max(2, round(w * BLEED_FRACTION)))

    poly = contour_polygon(region, max(0.6, w * SIMPLIFY_FRACTION))
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bw, bh = x1 - x0, y1 - y0

    # clip-path polygon in % of the photo box
    pts = ', '.join(f'{(x - x0) / bw * 100:.3f}% {(y - y0) / bh * 100:.3f}%' for x, y in poly)
    return {
        'id': f'frame-{index}',
        'file': path.name,
        'imageSize': [w, h],
        'layer': 'over' if over else 'under',
        # photo box, % of the avatar box (frame image fills the avatar box exactly)
        'box': {
            'left': round(x0 / w * 100, 4), 'top': round(y0 / h * 100, 4),
            'width': round(bw / w * 100, 4), 'height': round(bh / h * 100, 4),
        },
        'holeAreaPx': int(hole.sum()),
        'regionAreaPx': int(region.sum()),
        'polygonPoints': len(poly),
        'polygon': poly,
        'clip': f'polygon({pts})',
        '_hole': hole,
        '_region': region,
        '_alpha': alpha,
    }


def build_css(records):
    lines = [
        '/* GENERATED by tools/analyze_frames.py - do not edit by hand.',
        ' * Per-frame photo geometry measured from the real transparent hole of each PNG.',
        ' * box  = photo area in % of the avatar box (frame PNG fills the avatar box)',
        ' * clip = exact hole outline (+ tiny bleed under the frame) in % of that box */',
    ]
    for r in records:
        b = r['box']
        sel = f'.rb-avatar[data-frame="{r["id"]}"]'
        lines.append(
            f'{sel}{{--rb-photo-left:{b["left"]}%;--rb-photo-top:{b["top"]}%;'
            f'--rb-photo-width:{b["width"]}%;--rb-photo-height:{b["height"]}%;'
            f'--rb-photo-clip:{r["clip"]}}}'
        )
        if r['layer'] == 'over':
            lines.append(f'{sel} .rb-avatar__photo-layer{{z-index:3}}')
    return '\n'.join(lines) + '\n'


def main():
    records = [analyse(i) for i in range(1, FRAME_COUNT + 1)]
    OUT_CSS.write_text(build_css(records), encoding='utf-8')
    public = [{k: v for k, v in r.items() if not k.startswith('_') and k not in ('polygon', 'clip')} for r in records]
    OUT_JSON.write_text(json.dumps(public, ensure_ascii=False, indent=1), encoding='utf-8')
    for r in records:
        b = r['box']
        print(f'{r["id"]:9s} layer={r["layer"]:5s} box=({b["left"]:.2f}%,{b["top"]:.2f}%) '
              f'{b["width"]:.2f}%x{b["height"]:.2f}%  pts={r["polygonPoints"]}')
    return records


if __name__ == '__main__':
    sys.exit(0 if main() else 1)
