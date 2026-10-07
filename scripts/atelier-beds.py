#!/usr/bin/env python3
"""Original quiet beds for the Atelier. Not recordings of existing works."""

import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[1] / "explore" / "public" / "atelier" / "sound"
FADE = int(2.2 * SR)


def brown(n, rng):
    x = np.cumsum(rng.normal(0, 1, n))
    x -= x.mean()
    peak = np.max(np.abs(x)) or 1
    return x / peak


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, sample in enumerate(x):
        acc = (1 - a) * sample + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def reverb(x):
    out = x.copy()
    for delay, gain in ((0.031, 0.22), (0.047, 0.16), (0.073, 0.1), (0.109, 0.06)):
        d = int(delay * SR)
        out[d:] += gain * x[:-d]
    return out


def seamless(x):
    n = FADE
    if len(x) <= n * 2:
        return x
    ramp = np.linspace(0, 1, n)
    head = x[:n] * ramp + x[-n:] * (1 - ramp)
    body = x[n:-n]
    return np.concatenate([head, body])


def stereo(x, rng, width=0.08):
    delay = int(0.011 * SR)
    right = np.concatenate([np.zeros(delay), x[:-delay]])
    side = width * rng.normal(0, 1, len(x))
    left = np.clip(x + side, -1, 1)
    right = np.clip(right - side, -1, 1)
    return np.stack([left, right], axis=1)


def piano_note(freq, dur, vel):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, 7):
        f = freq * k * (1 + 0.00012 * k * k)
        decay = np.exp(-t * (0.85 + 0.72 * k))
        y += (vel / (k ** 1.15)) * np.sin(2 * np.pi * f * t + 0.2 * k) * decay
    h = int(0.01 * SR)
    hammer = np.linspace(1, 0, h) ** 2
    y[:h] += vel * 0.08 * np.random.randn(h) * hammer
    return y


def place(buf, note, at):
    i = int(at * SR)
    end = min(len(buf), i + len(note))
    buf[i:end] += note[: end - i]


def room(rng):
    n = int(78 * SR)
    bed = lowpass(brown(n, rng), 280)
    air = lowpass(brown(n, rng), 900) * 0.18
    t = np.arange(n) / SR
    swell = 0.85 + 0.15 * np.sin(2 * np.pi * t / 23)
    y = (bed * 0.72 + air) * swell
    return y * 0.16


def night(rng):
    n = int(84 * SR)
    t = np.arange(n) / SR
    bed = lowpass(brown(n, rng), 160)
    drone = 0.035 * np.sin(2 * np.pi * 55 * t) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 31))
    y = bed * 0.2 + drone
    for at in (11, 29, 47, 66):
        i = int(at * SR)
        length = int(7 * SR)
        env = np.sin(np.linspace(0, np.pi, length)) ** 2
        gust = lowpass(brown(length, rng), 500) * 0.05 * env
        y[i : i + length] += gust
    return y


def air(rng):
    n = int(76 * SR)
    t = np.arange(n) / SR
    noise = highpass(lowpass(brown(n, rng), 2400), 700)
    sweep = 0.55 + 0.45 * np.sin(2 * np.pi * t / 19)
    y = noise * 0.09 * sweep
    for at, freq in ((8, 880), (27, 1174), (46, 784), (63, 988)):
        place(y, piano_note(freq, 9, 0.045), at)
    return reverb(y) * 0.85


def piano(rng):
    del rng
    n = int(90 * SR)
    y = np.zeros(n)
    # Slow, original, lots of air. Not a known melody.
    notes = [
        (4.0, 220.00, 0.34),
        (11.5, 329.63, 0.22),
        (18.0, 174.61, 0.28),
        (26.5, 261.63, 0.2),
        (27.2, 392.00, 0.12),
        (36.0, 196.00, 0.3),
        (44.5, 293.66, 0.18),
        (53.0, 220.00, 0.16),
        (53.8, 349.23, 0.1),
        (62.5, 164.81, 0.26),
        (71.0, 246.94, 0.18),
        (79.0, 329.63, 0.12),
    ]
    for at, freq, vel in notes:
        place(y, piano_note(freq, 14, vel), at)
    return reverb(y) * 0.9


def brush(rng):
    n = int(80 * SR)
    y = np.zeros(n)
    beat = 60 / 46
    for i in range(int(78 / beat)):
        if i % 4 not in (0, 2):
            continue
        if i % 8 == 2 and rng.random() < 0.35:
            continue
        at = 2 + i * beat
        length = int(0.18 * SR)
        env = np.linspace(1, 0, length) ** 1.6
        tick = highpass(rng.normal(0, 1, length), 1800) * env * 0.045
        place(y, tick, at)
        if i % 8 == 0:
            place(y, piano_note(98, 3.2, 0.07), at)
    return reverb(y)


def write(name, mono, rng):
    y = seamless(mono.astype(np.float64))
    rms = float(np.sqrt(np.mean(y * y))) or 1.0
    y *= min(4.0, (10 ** (-23 / 20)) / rms)
    peak = float(np.max(np.abs(y))) or 1.0
    if peak > 0.62:
        y *= 0.62 / peak
    st = stereo(y, rng)
    pcm = (st * 32767).astype(np.int16)
    wav = OUT / f"{name}.wav"
    m4a = OUT / f"{name}.m4a"
    with wave.open(str(wav), "w") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav),
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(m4a),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wav.unlink()
    print(name, round(len(y) / SR, 1), "s", m4a.stat().st_size)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(7)
    beds = {
        "room": room,
        "piano": piano,
        "night": night,
        "brush": brush,
        "air": air,
    }
    for name, fn in beds.items():
        write(name, fn(rng), rng)


if __name__ == "__main__":
    main()
