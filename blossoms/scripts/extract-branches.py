#!/usr/bin/env python3
"""Isolate painted branches from Branches-Ref into stampable plates.

This is not a trained model. It cuts the ink from the black ground, splits
disconnected strokes, records trunk/tip so a compositor can rotate and
restamp the same brush texture into new arrangements.

Drop more Branch-*.png into the source folder and re-run.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path("/Users/nicholasvanniekerk/Downloads/Branches-Ref")
ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "library" / "extracted" / "branches"
PUBLIC = ROOT / "public" / "library" / "branches"
CATALOG = ROOT / "public" / "library" / "catalog.json"

MIN_AREA = 3500
PAD = 28
MAX_SIDE = 1600
LUM_CUT = 14.0

SHEET_KIND = {
    "Branch-.png": "fork",
    "Branch- 2.png": "thicket",
    "Branch- 3.png": "rise",
    "Branch- 4.png": "sweep",
    "Branch- 5.png": "hang",
    "Branch- 6.png": "sweep",
}


def luminance(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    return 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]


def kind_for(sheet: str, axis: float, box: tuple[int, int, int, int], n_comp: int) -> str:
    base = SHEET_KIND.get(sheet, "fork")
    y0, y1, x0, x1 = box
    h = max(1, y1 - y0)
    w = max(1, x1 - x0)
    deg = (math.degrees(axis) + 360) % 360
    vertical = min(abs(deg - 90), abs(deg - 270)) < 28
    if n_comp >= 6 and w * h > 0:
        return "thicket"
    if base == "rise" or (vertical and h > w * 1.35):
        return "rise"
    if base == "hang":
        return "hang"
    if base == "thicket":
        return "thicket"
    if w > h * 1.25:
        return "sweep"
    return base


def thickness(mask: np.ndarray, pt: np.ndarray, r: int = 28) -> int:
    x, y = int(pt[0]), int(pt[1])
    y0, y1 = max(0, y - r), min(mask.shape[0], y + r)
    x0, x1 = max(0, x - r), min(mask.shape[1], x + r)
    return int(mask[y0:y1, x0:x1].sum())


def trunk_tip(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    ys, xs = np.nonzero(mask)
    coords = np.stack([xs.astype(np.float64), ys.astype(np.float64)], axis=1)
    mean = coords.mean(axis=0)
    centered = coords - mean
    if len(coords) < 8:
        lo = coords[0]
        return lo, lo, 0.0
    cov = np.cov(centered.T)
    if cov.ndim < 2:
        axis_vec = np.array([1.0, 0.0])
    else:
        evals, evecs = np.linalg.eigh(cov)
        axis_vec = evecs[:, int(np.argmax(evals))]
    proj = centered @ axis_vec
    lo = coords[int(np.argmin(proj))]
    hi = coords[int(np.argmax(proj))]
    if thickness(mask, lo) >= thickness(mask, hi):
        trunk, tip = lo, hi
    else:
        trunk, tip = hi, lo
    axis = math.atan2(tip[1] - trunk[1], tip[0] - trunk[0])
    return trunk, tip, axis


def plate_from_mask(rgba: np.ndarray, lum: np.ndarray, mask: np.ndarray, pad: int = PAD):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(rgba.shape[0], int(ys.max()) + pad + 1)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(rgba.shape[1], int(xs.max()) + pad + 1)
    crop = rgba[y0:y1, x0:x1].copy()
    crop_lum = lum[y0:y1, x0:x1]
    crop_mask = mask[y0:y1, x0:x1]
    alpha = np.clip((crop_lum - (LUM_CUT - 4.0)) * 3.1, 0, 255).astype(np.uint8)
    alpha[~crop_mask] = 0
    # keep faint halo just outside the hard mask so the brush edge stays
    dil = ndimage.binary_dilation(crop_mask, iterations=2)
    halo = dil & ~crop_mask
    alpha[halo] = np.clip((crop_lum[halo] - 6.0) * 2.2, 0, 90).astype(np.uint8)
    crop[:, :, 3] = alpha
    local = crop_mask
    trunk, tip, axis = trunk_tip(local)
    tw = max(1, x1 - x0)
    th = max(1, y1 - y0)
    rec = {
        "axis": round(float(axis), 4),
        "trunk": [round(float(trunk[0] / tw), 4), round(float(trunk[1] / th), 4)],
        "tip": [round(float(tip[0] / tw), 4), round(float(tip[1] / th), 4)],
        "box": [y0, y1, x0, x1],
        "area": int(local.sum()),
    }
    return crop, rec


def save_plate(arr: np.ndarray, dest: Path) -> None:
    im = Image.fromarray(arr, "RGBA")
    w, h = im.size
    scale = min(1.0, MAX_SIDE / max(w, h))
    if scale < 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest.with_suffix(".png"))
    im.save(dest.with_suffix(".webp"), "WEBP", quality=86, method=4)


def main() -> None:
    EXTRACT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for old in list(EXTRACT.glob("*")) + list(PUBLIC.glob("*")):
        if old.is_file():
            old.unlink()

    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() == ".png")
    plates: list[dict] = []
    n = 0

    for src in files:
        print("read", src.name)
        rgba = np.asarray(Image.open(src).convert("RGBA"))
        lum = luminance(rgba)
        alpha = rgba[:, :, 3]
        mask = (lum > LUM_CUT) & (alpha > 8)
        labeled, nlab = ndimage.label(mask)
        sizes = ndimage.sum(mask, labeled, index=range(1, nlab + 1)) if nlab else []
        keep = [i + 1 for i, s in enumerate(sizes) if s >= MIN_AREA]
        print(f"  components {nlab} keep {len(keep)}")

        full = plate_from_mask(rgba, lum, mask, pad=40)
        if full:
            n += 1
            pid = f"branch-sheet-{n:02d}"
            crop, rec = full
            kind = kind_for(src.name, rec["axis"], rec["box"], len(keep))
            if src.name == "Branch- 2.png":
                kind = "thicket"
            save_plate(crop, EXTRACT / pid)
            save_plate(crop, PUBLIC / pid)
            plates.append(
                {
                    "id": pid,
                    "src": f"/library/branches/{pid}.webp",
                    "kind": kind,
                    "axis": rec["axis"],
                    "trunk": rec["trunk"],
                    "tip": rec["tip"],
                    "area": rec["area"],
                    "sheet": src.name,
                }
            )
            print("  sheet", pid, kind, "area", rec["area"])

        for lab in keep:
            comp = labeled == lab
            # skip components that are basically the whole sheet
            if full and int(comp.sum()) > full[1]["area"] * 0.92:
                continue
            piece = plate_from_mask(rgba, lum, comp)
            if not piece:
                continue
            crop, rec = piece
            n += 1
            pid = f"branch-{n:02d}"
            kind = kind_for(src.name, rec["axis"], rec["box"], 1)
            save_plate(crop, EXTRACT / pid)
            save_plate(crop, PUBLIC / pid)
            plates.append(
                {
                    "id": pid,
                    "src": f"/library/branches/{pid}.webp",
                    "kind": kind,
                    "axis": rec["axis"],
                    "trunk": rec["trunk"],
                    "tip": rec["tip"],
                    "area": rec["area"],
                    "sheet": src.name,
                }
            )
            print("  part", pid, kind, "area", rec["area"])

        del rgba, lum, mask, labeled

    EXTRACT.joinpath("index.json").write_text(json.dumps(plates, indent=2))
    if CATALOG.exists():
        cat = json.loads(CATALOG.read_text())
    else:
        cat = {"heroes": [], "marks": []}
    cat["branches"] = [
        {
            "id": p["id"],
            "src": p["src"],
            "kind": p["kind"],
            "axis": p["axis"],
            "trunk": p["trunk"],
        }
        for p in plates
    ]
    CATALOG.write_text(json.dumps(cat, indent=2))
    print("wrote", len(plates), "plates")


if __name__ == "__main__":
    main()
