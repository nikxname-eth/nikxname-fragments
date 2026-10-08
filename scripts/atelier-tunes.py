#!/usr/bin/env python3
"""Short original tunes for the Atelier, played with a sampled piano and bass.

The list is meant to grow. Add a score, render, and drop the file in
explore/public/atelier/sound.
"""

import subprocess
import urllib.request
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "explore" / "public" / "atelier" / "sound"
CACHE = Path("/tmp/atelier-notes")
CDN = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM"

PIANO = "acoustic_grand_piano-mp3"
BASS = "acoustic_bass-mp3"


def load_note(kind: str, name: str) -> np.ndarray:
    CACHE.mkdir(parents=True, exist_ok=True)
    mp3 = CACHE / f"{kind}-{name}.mp3"
    if not mp3.exists() or mp3.stat().st_size < 1000:
        url = f"{CDN}/{kind}/{name}.mp3"
        urllib.request.urlretrieve(url, mp3)
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
    )
    note = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    peak = np.max(np.abs(note)) or 1
    return note / peak


def place(buf, note, start, vel, hold):
    if start < 0 or vel <= 0:
        return
    y = note * vel
    n = int(hold * SR)
    if 0 < n < len(y):
        y = y[:n].copy()
        fade = min(len(y), int(0.09 * SR))
        y[-fade:] *= np.linspace(1, 0, fade)
    i = int(start * SR)
    if i >= len(buf):
        return
    end = min(len(buf), i + len(y))
    buf[i:end] += y[: end - i]


def room(x):
    out = x.copy()
    for delay, gain in ((0.037, 0.18), (0.053, 0.1), (0.081, 0.06)):
        d = int(delay * SR)
        wet = np.zeros_like(x)
        wet[d:] = x[:-d]
        out += gain * wet
    return out


def render(events, seconds, piano, bass):
    buf = np.zeros(int(seconds * SR) + SR)
    for inst, pitch, beat, dur, vel, bpm in events:
        bank = piano if inst == "p" else bass
        if pitch not in bank:
            raise SystemExit(f"missing {inst} {pitch}")
        place(buf, bank[pitch], beat * 60 / bpm, vel, dur * 60 / bpm + 0.15)
    y = room(buf)
    # Leave a little air, then trim the silence at the end.
    peak_i = int(np.max(np.nonzero(np.abs(y) > 0.002)[0])) if np.any(np.abs(y) > 0.002) else len(y) - 1
    y = y[: peak_i + int(2.4 * SR)]
    rms = float(np.sqrt(np.mean(y * y))) or 1
    y *= min(6, (10 ** (-20 / 20)) / rms)
    peak = float(np.max(np.abs(y))) or 1
    if peak > 0.72:
        y *= 0.72 / peak
    fade = int(0.04 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-int(1.2 * SR) :] *= np.linspace(1, 0, int(1.2 * SR))
    return y


def write(name, mono):
    rng = np.random.default_rng(3)
    delay = int(0.012 * SR)
    right = np.concatenate([np.zeros(delay), mono[:-delay]])
    side = 0.015 * rng.normal(0, 1, len(mono))
    stereo = np.stack(
        [np.clip(mono + side, -1, 1), np.clip(right - side * 0.6, -1, 1)],
        axis=1,
    )
    pcm = (stereo * 32767).astype(np.int16)
    wav = OUT / f"{name}.wav"
    m4a = OUT / f"{name}.m4a"
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav), "w") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(m4a)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wav.unlink()
    print(f"{name:10} {len(mono) / SR:5.1f}s  {m4a.stat().st_size // 1024}kb")


def n(inst, pitch, beat, dur, vel, bpm):
    return (inst, pitch, beat, dur, vel, bpm)


def prelude():
    bpm = 66
    ev = []
    # A tune in C. Four bars, then an answer, then once more, then a close.
    phrase = [
        (0, "E4", 1, 0.72),
        (1, "G4", 1, 0.64),
        (2, "C5", 2, 0.78),
        (4, "B4", 1, 0.6),
        (5, "A4", 1, 0.58),
        (6, "G4", 2, 0.7),
        (8, "A4", 1, 0.62),
        (9, "F4", 1, 0.55),
        (10, "D4", 2, 0.66),
        (12, "E4", 1, 0.58),
        (13, "D4", 1, 0.5),
        (14, "C4", 2, 0.74),
    ]
    answer = [
        (0, "E4", 1, 0.7),
        (1, "G4", 1, 0.62),
        (2, "C5", 1, 0.74),
        (3, "D5", 1, 0.68),
        (4, "C5", 1, 0.6),
        (5, "B4", 1, 0.58),
        (6, "A4", 2, 0.7),
        (8, "G4", 1, 0.55),
        (9, "A4", 1, 0.55),
        (10, "B4", 2, 0.64),
        (12, "C5", 1, 0.6),
        (13, "G4", 1, 0.52),
        (14, "E4", 2, 0.72),
    ]
    bass = [(0, "C3", 4), (4, "A2", 4), (8, "F2", 4), (12, "G2", 4)]
    beat = 0
    for block in (phrase, answer, phrase, answer, phrase, answer):
        for b, pitch, dur, vel in block:
            ev.append(n("p", pitch, beat + b, dur, vel, bpm))
        for b, pitch, dur in bass:
            ev.append(n("b", pitch, beat + b, dur, 0.34, bpm))
        beat += 16
    # Close.
    for b, pitch, dur, vel in (
        (0, "G4", 1, 0.5),
        (1, "E4", 1, 0.48),
        (2, "D4", 2, 0.55),
        (4, "C4", 4, 0.7),
    ):
        ev.append(n("p", pitch, beat + b, dur, vel, bpm))
    ev.append(n("p", "E4", beat + 4, 4, 0.42, bpm))
    ev.append(n("p", "G4", beat + 4, 4, 0.36, bpm))
    ev.append(n("b", "C2", beat, 8, 0.4, bpm))
    return ev, (beat + 10) * 60 / bpm


def waltz():
    bpm = 72
    ev = []
    # A slow waltz. The strain, then again, a turn, then home.
    right = [
        (0, "E4", 1, 0.7),
        (1, "G4", 1, 0.62),
        (2, "C5", 1, 0.74),
        (3, "D5", 1, 0.66),
        (4, "C5", 1, 0.58),
        (5, "B4", 1, 0.6),
        (6, "C5", 1, 0.64),
        (7, "A4", 1, 0.55),
        (8, "F4", 1, 0.58),
        (9, "G4", 2, 0.68),
        (12, "E4", 1, 0.62),
        (13, "F4", 1, 0.55),
        (14, "G4", 1, 0.6),
        (15, "A4", 1, 0.58),
        (16, "G4", 1, 0.52),
        (17, "E4", 1, 0.55),
        (18, "F4", 2, 0.62),
        (20, "D4", 1, 0.5),
        (21, "C4", 3, 0.72),
    ]
    # Left hand: bass on 1, a quiet chord tone on 2 and 3.
    left = [
        (0, "C3", 1, 0.4),
        (1, "E3", 1, 0.16),
        (2, "G3", 1, 0.14),
        (3, "G2", 1, 0.36),
        (4, "B2", 1, 0.14),
        (5, "D3", 1, 0.12),
        (6, "A2", 1, 0.36),
        (7, "C3", 1, 0.14),
        (8, "E3", 1, 0.12),
        (9, "F2", 1, 0.36),
        (10, "A2", 1, 0.14),
        (11, "C3", 1, 0.12),
        (12, "C3", 1, 0.4),
        (13, "G2", 1, 0.16),
        (14, "E3", 1, 0.14),
        (15, "F2", 1, 0.34),
        (16, "A2", 1, 0.13),
        (17, "C3", 1, 0.12),
        (18, "G2", 1, 0.34),
        (19, "B2", 1, 0.13),
        (20, "D3", 1, 0.12),
        (21, "C3", 3, 0.42),
    ]
    turn = [
        (0, "G4", 1, 0.62),
        (1, "A4", 1, 0.56),
        (2, "B4", 1, 0.66),
        (3, "C5", 1, 0.7),
        (4, "B4", 1, 0.54),
        (5, "A4", 1, 0.52),
        (6, "G4", 2, 0.64),
        (9, "E4", 1, 0.54),
        (10, "F4", 1, 0.5),
        (11, "G4", 1, 0.56),
        (12, "A4", 1, 0.6),
        (13, "G4", 1, 0.5),
        (14, "F4", 1, 0.48),
        (15, "E4", 1, 0.54),
        (16, "D4", 2, 0.6),
        (18, "E4", 1, 0.5),
        (19, "F4", 1, 0.48),
        (20, "G4", 1, 0.54),
        (21, "C4", 3, 0.7),
    ]
    beat = 0
    for melody, soften in ((right, 1), (right, 0.96), (turn, 0.92), (right, 0.88)):
        for b, pitch, dur, vel in melody:
            ev.append(n("p", pitch, beat + b, dur, vel * soften, bpm))
        for b, pitch, dur, vel in left:
            ev.append(n("p", pitch, beat + b, dur, vel * soften, bpm))
        beat += 24
    ev.append(n("p", "C4", beat, 3, 0.66, bpm))
    ev.append(n("p", "E4", beat, 3, 0.4, bpm))
    ev.append(n("p", "G4", beat, 3, 0.32, bpm))
    return ev, (beat + 6) * 60 / bpm


def nocturne():
    bpm = 52
    ev = []
    # A line you can hum. Minor, unhurried.
    line = [
        (0, "C5", 2, 0.7),
        (2, "B4", 1, 0.55),
        (3, "A4", 1, 0.55),
        (4, "G4", 2, 0.64),
        (6, "E4", 2, 0.6),
        (8, "F4", 2, 0.58),
        (10, "E4", 1, 0.5),
        (11, "D4", 1, 0.5),
        (12, "C4", 4, 0.72),
    ]
    answer = [
        (0, "E4", 2, 0.62),
        (2, "G4", 2, 0.66),
        (4, "A4", 2, 0.6),
        (6, "G4", 1, 0.5),
        (7, "E4", 1, 0.5),
        (8, "F4", 2, 0.55),
        (10, "D4", 2, 0.52),
        (12, "C4", 3, 0.7),
        (15, "D4", 1, 0.4),
    ]
    hold = [(0, "C3", 8, 0.28), (8, "A2", 8, 0.26)]
    beat = 0
    for block, bass in (
        (line, "C2"),
        (answer, "A2"),
        (line, "F2"),
        (answer, "C2"),
        (line, "A2"),
        (answer, "C2"),
    ):
        for b, pitch, dur, vel in block:
            ev.append(n("p", pitch, beat + b, dur, vel, bpm))
        ev.append(n("b", bass, beat, 16, 0.36, bpm))
        for b, pitch, dur, vel in hold:
            ev.append(n("p", pitch, beat + b, dur, vel, bpm))
        beat += 16
    ev.append(n("p", "C4", beat, 6, 0.64, bpm))
    ev.append(n("p", "G4", beat, 6, 0.36, bpm))
    ev.append(n("b", "C2", beat, 6, 0.4, bpm))
    return ev, (beat + 8) * 60 / bpm


def ballad():
    bpm = 60
    ev = []
    # Simple jazz ballad in F. Melody first, bass on the roots only.
    tune = [
        (0, "A4", 1, 0.68),
        (1, "C5", 1, 0.64),
        (2, "D5", 1, 0.7),
        (3, "C5", 1, 0.58),
        (4, "A4", 2, 0.66),
        (6, "G4", 2, 0.6),
        (8, "F4", 1, 0.62),
        (9, "G4", 1, 0.55),
        (10, "A4", 2, 0.68),
        (12, "G4", 1, 0.5),
        (13, "E4", 1, 0.48),
        (14, "F4", 2, 0.72),
    ]
    turn = [
        (0, "C5", 1, 0.66),
        (1, "D5", 1, 0.62),
        (2, "C5", 1, 0.55),
        (3, "Bb4", 1, 0.58),
        (4, "A4", 2, 0.64),
        (6, "G4", 2, 0.58),
        (8, "A4", 1, 0.55),
        (9, "Bb4", 1, 0.52),
        (10, "C5", 2, 0.66),
        (12, "A4", 2, 0.6),
        (14, "F4", 2, 0.74),
    ]
    changes = ["F2", "C2", "Bb2", "C2"]
    beat = 0
    for block in (tune, turn, tune, turn, tune, turn):
        for b, pitch, dur, vel in block:
            ev.append(n("p", pitch, beat + b, dur, vel, bpm))
        for i, root in enumerate(changes):
            ev.append(n("b", root, beat + i * 4, 4, 0.4, bpm))
            # A quiet fifth above the bass, on the piano, so the harmony reads.
            fifth = {"F2": "C3", "C2": "G2", "Bb2": "F2"}[root]
            ev.append(n("p", fifth, beat + i * 4, 4, 0.16, bpm))
        beat += 16
    ev.append(n("p", "F4", beat, 4, 0.7, bpm))
    ev.append(n("p", "A4", beat, 4, 0.42, bpm))
    ev.append(n("p", "C5", beat, 4, 0.32, bpm))
    ev.append(n("b", "F2", beat, 4, 0.42, bpm))
    return ev, (beat + 6) * 60 / bpm


def air():
    bpm = 64
    ev = []
    # Lighter, higher, still a tune.
    line = [
        (0, "G4", 1, 0.6),
        (1, "B4", 1, 0.58),
        (2, "D5", 1, 0.66),
        (3, "C5", 1, 0.55),
        (4, "B4", 2, 0.62),
        (6, "G4", 2, 0.58),
        (8, "A4", 1, 0.55),
        (9, "B4", 1, 0.55),
        (10, "C5", 2, 0.64),
        (12, "B4", 1, 0.5),
        (13, "A4", 1, 0.48),
        (14, "G4", 2, 0.66),
    ]
    beat = 0
    roots = ["G2", "D2", "C2", "D2"]
    for _ in range(5):
        for b, pitch, dur, vel in line:
            ev.append(n("p", pitch, beat + b, dur, vel, bpm))
        for i, root in enumerate(roots):
            ev.append(n("b", root, beat + i * 4, 4, 0.3, bpm))
        beat += 16
    ev.append(n("p", "G4", beat, 4, 0.64, bpm))
    ev.append(n("p", "B4", beat, 4, 0.38, bpm))
    ev.append(n("p", "D5", beat, 4, 0.28, bpm))
    ev.append(n("b", "G2", beat, 4, 0.36, bpm))
    return ev, (beat + 6) * 60 / bpm


def main():
    pitches = {
        PIANO: [
            "C2", "D2", "F2", "G2", "A2", "Bb2", "B2",
            "C3", "D3", "E3", "F3", "G3", "A3", "B3",
            "C4", "D4", "E4", "F4", "G4", "A4", "Bb4", "B4",
            "C5", "D5", "E5",
        ],
        BASS: ["C2", "D2", "F2", "G2", "A2", "Bb2", "C3"],
    }
    piano = {p: load_note(PIANO, p) for p in pitches[PIANO]}
    bass = {p: load_note(BASS, p) for p in pitches[BASS]}
    scores = {
        "prelude": prelude,
        "waltz": waltz,
        "nocturne": nocturne,
        "ballad": ballad,
        "air": air,
    }
    for name, fn in scores.items():
        events, seconds = fn()
        write(name, render(events, seconds, piano, bass))


if __name__ == "__main__":
    main()
