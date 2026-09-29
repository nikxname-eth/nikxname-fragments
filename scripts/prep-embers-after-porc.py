from pathlib import Path
from PIL import Image

session = Path(
    '/Users/nicholasvanniekerk/.grok/sessions/%2FUsers%2Fnicholasvanniekerk/019ef074-7441-75f3-9a9a-7adde119e274/assets'
)
thumbs = Path('/Users/nicholasvanniekerk/nikxart-puzzle/explore/public/embers/thumbs')
close = Path('/Users/nicholasvanniekerk/nikxart-puzzle/explore/public/embers/close')


def save_pair(img: Image.Image, slug: str):
    w, h = img.size

    def fit(long_edge: int) -> Image.Image:
        scale = long_edge / max(w, h)
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        return img.resize((nw, nh), Image.Resampling.LANCZOS)

    t = fit(720)
    c = fit(1800)
    t.save(thumbs / f'{slug}.webp', 'WEBP', quality=88, method=4)
    c.save(close / f'{slug}.webp', 'WEBP', quality=90, method=4)
    print(slug, 'thumb', t.size, (thumbs / f'{slug}.webp').stat().st_size // 1024, 'k')
    print(slug, 'close', c.size, (close / f'{slug}.webp').stat().st_size // 1024, 'k')


def lift(path: Path, floor: float, fade: float, boost: float, pad: int):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum <= floor:
                px[x, y] = (r, g, b, 0)
            elif lum < floor + fade:
                a = int(((lum - floor) / fade) * 255)
                if boost != 1:
                    r = min(255, int(r * boost + 10))
                    g = min(255, int(g * boost + 8))
                    b = min(255, int(b * boost + 6))
                px[x, y] = (r, g, b, a)
            else:
                if boost != 1:
                    r = min(255, int(r * boost + 10))
                    g = min(255, int(g * boost + 8))
                    b = min(255, int(b * boost + 6))
                px[x, y] = (r, g, b, 255)
    bb = im.getbbox()
    if not bb:
        raise SystemExit(f'no content: {path}')
    l, t, r, b = bb
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(w, r + pad), min(h, b + pad)
    return im.crop((l, t, r, b))


after = lift(
    session / 'image-d1b8faf4-ef26-4b96-b3e2-34ee6609bbe1.jpg',
    floor=7,
    fade=18,
    boost=1.55,
    pad=80,
)
save_pair(after, 'after-black')

porc = lift(
    session / 'image-e5540de9-9a5b-4ba0-a932-adb67ba900ca.jpg',
    floor=10,
    fade=14,
    boost=1.0,
    pad=48,
)
save_pair(porc, 'porcelain')
print('done', after.size, porc.size)
