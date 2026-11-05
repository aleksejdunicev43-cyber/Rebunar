#!/usr/bin/env python3
"""
Browser verification of the avatar frame geometry (all 13 frames).

Renders the REAL avatar.js markup + avatar.css + generated avatar-frames.css in
headless Chromium at several sizes / device pixel ratios, with a solid-colour
photo on a magenta page, and compares against the hole measured from the PNG:

  gap      photo is missing somewhere inside the hole  (must be 0)
  leak     photo visible where the frame/page should show (must be 0)
  (enclosed transparent pinholes already present in a PNG's rim are not counted as leaks)

Run from the repository root:  python3 tests/avatar/verify_frames.py
Exit code is non-zero if any frame fails.
"""
import http.server, json, os, socketserver, sys, tempfile, threading
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
import analyze_frames as af  # noqa: E402

PHOTO = (0, 255, 0)
PAGE = (255, 0, 255)
CASES = [(520, 1), (142, 2), (104, 3), (66, 3), (52, 3), (46, 3), (44, 3), (40, 3), (42, 3)]
OUT = Path(os.environ.get('AVATAR_VERIFY_OUT', ROOT / 'artifacts' / 'avatar'))


def site():
    tmp = Path(tempfile.mkdtemp())
    (tmp / 'new').mkdir()
    os.symlink(ROOT / 'frontend' / 'assets', tmp / 'new' / 'assets')
    os.symlink(ROOT / 'frontend' / 'shared', tmp / 'shared')
    photo = Image.new('RGB', (64, 64), PHOTO)
    photo.save(tmp / 'photo.png')
    (tmp / 'index.html').write_text('''<!doctype html><meta charset=utf-8>
<link rel=stylesheet href=/shared/avatar.css><link rel=stylesheet href=/shared/avatar-frames.css>
<body style="margin:0;background:rgb(255,0,255)"><div id=host style="position:absolute;left:0;top:0"></div>
<script type=module>
import {avatarMarkup} from '/shared/avatar.js';
window.show=(frame,size,withPhoto)=>{
  const h=document.getElementById('host');
  h.innerHTML=avatarMarkup({equipped_frame:frame,avatar:withPhoto?'/photo.png':''},{size:'chat'});
  const a=h.firstChild; a.style.setProperty('--rb-avatar-size',size+'px');
  a.querySelector('.rb-avatar__fallback').style.display='none';
  if(!withPhoto) a.querySelector('.rb-avatar__photo-layer').style.display='none';
  return Promise.all([...h.querySelectorAll('img')].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})));
};
window.ready=true;
</script>''')
    return tmp


def serve(directory):
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=str(directory), **k)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    srv.allow_reuse_address = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def downscale(mask, device_px):
    img = Image.fromarray((mask * 255).astype('uint8')).resize((device_px, device_px), Image.BOX)
    return np.asarray(img).astype(float) / 255


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = site()
    srv = serve(tmp)
    base = f'http://127.0.0.1:{srv.server_address[1]}/'
    records = {i: af.analyse(i) for i in range(1, 14)}
    failures, rows = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size, dpr in CASES:
            ctx = browser.new_context(viewport={'width': max(size + 20, 200), 'height': max(size + 20, 200)}, device_scale_factor=dpr)
            page = ctx.new_page()
            page.goto(base)
            page.wait_for_function('window.ready===true')
            dev = size * dpr
            for i in range(1, 14):
                rec = records[i]
                shots = {}
                for with_photo in (True, False):
                    page.evaluate(f'show("frame-{i}",{size},{str(with_photo).lower()})')
                    page.wait_for_timeout(30)
                    png = page.screenshot(clip={'x': 0, 'y': 0, 'width': size, 'height': size})
                    path = OUT / f'f{i}_{size}x{dpr}_{"photo" if with_photo else "frame"}.png'
                    path.write_bytes(png)
                    shots[with_photo] = np.asarray(Image.open(path).convert('RGB')).astype(int)
                    if size != 520: path.unlink()
                with_img, frame_only = shots[True], shots[False]
                is_photo = (abs(with_img - np.array(PHOTO)).sum(axis=2) < 60)
                is_page = (abs(frame_only - np.array(PAGE)).sum(axis=2) < 60)

                hole = downscale(rec['_hole'], with_img.shape[0])
                px = max(1, int(round(dpr * 1.0)))  # tolerance: 1 CSS px of anti-aliasing
                deep = ndi.binary_erosion(hole > 0.999, iterations=px + 1)
                gap = int((deep & ~is_photo).sum())
                near = ndi.binary_dilation(hole > 0.001, iterations=px + 1)
                # sub-pixel transparent pinholes of the PNG itself that sit inside the rim
                # (enclosed, <= ~7x7 px at 1600 px): the photo showing through them is correct.
                pin = (rec['_alpha'] <= af.ALPHA_EMPTY) & rec['_region'] & ~rec['_hole']
                near |= ndi.binary_dilation(downscale(pin, with_img.shape[0]) > 0.001, iterations=px + 1)
                # photo showing where the bare frame render shows the page background and we are not near the hole
                leak = int((is_photo & is_page & ~near).sum())
                hole_px = int(deep.sum())
                rows.append((i, size, dpr, hole_px, gap, leak))
                if gap or leak:
                    failures.append((i, size, dpr, gap, leak))
            ctx.close()
        browser.close()
    srv.shutdown()

    print(f'{"frame":>5} {"css px":>6} {"dpr":>3} {"hole px":>8} {"gap":>5} {"leak":>5}')
    for r in rows: print(f'{r[0]:>5} {r[1]:>6} {r[2]:>3} {r[3]:>8} {r[4]:>5} {r[5]:>5}')
    print('\nFAILURES:' if failures else '\nALL OK: 13 frames x %d size/DPR combinations, no gaps, no leaks' % len(CASES))
    for f in failures: print('  frame', f[0], f'{f[1]}px@{f[2]}x', 'gap', f[3], 'leak', f[4])
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
