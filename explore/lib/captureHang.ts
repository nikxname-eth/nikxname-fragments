import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import type { ExploreWork } from '../config/catalog';
import { contrastFinish, type FrameTone } from './frameFinish';
import {
  HI_LONG_EDGE,
  defaultTierId,
  isVideoWork,
  mediaTiersFor,
  stillMasterUrl,
  theatreStillUrl,
} from './mediaUrl';

export type { FrameTone };

function resolveFrameTone(frameTone?: FrameTone, pale?: boolean): FrameTone {
  if (frameTone) return frameTone;
  return pale ? 'light' : 'med';
}

const MAX_STILL_EDGE = 3840;
const MAX_VIDEO_EDGE = 1920;
const FPS_STEPS = [12, 15, 24, 25, 30] as const;
const PROXY = '/api/download';

function even(n: number): number {
  const r = Math.max(2, Math.round(n));
  return r - (r % 2);
}

function isGifUrl(url?: string | null): boolean {
  return Boolean(url && /\.gif(\?|$)/i.test(url));
}

function workHasMotion(
  work: ExploreWork,
  media: HTMLImageElement | HTMLVideoElement | null,
): boolean {
  if (media instanceof HTMLVideoElement) return true;
  if (isVideoWork(work)) return true;
  return [work.mediaUrl, work.coverUrl, work.originCoverUrl].some((u) => isGifUrl(u));
}

function snapFps(raw: number): number {
  if (!Number.isFinite(raw) || raw < 8) return 24;
  if (Math.abs(raw - 24) <= 4) return 24;
  let best = 24;
  let diff = Infinity;
  for (const step of FPS_STEPS) {
    const d = Math.abs(step - raw);
    if (d < diff) {
      best = step;
      diff = d;
    }
  }
  return best;
}

/** Prefer 1080p/2K for encode — 4K/11K is wasted work at 1920 output. */
function encodeVideoUrl(work: ExploreWork, live?: HTMLVideoElement | null): string {
  const videos = mediaTiersFor(work).filter((t) => t.kind === 'video');
  const prefer =
    videos.find((t) => t.id === '1080') ||
    videos.find((t) => t.id === '2k') ||
    videos.find((t) => t.id === '720') ||
    videos.find((t) => t.id === defaultTierId(videos)) ||
    videos[0];
  return prefer?.url || live?.currentSrc || live?.src || '';
}

function gifUrlFor(work: ExploreWork): string | null {
  if (isVideoWork(work)) return null;
  const hit = [work.coverUrl, work.originCoverUrl, work.mediaUrl].find((u) => isGifUrl(u));
  return hit || null;
}

export type HangCapturePiece = {
  work: ExploreWork;
  ar: number;
  media: HTMLImageElement | HTMLVideoElement | null;
};

type FrameRect = {
  x: number;
  y: number;
  fw: number;
  fh: number;
  ix: number;
  iy: number;
  iw: number;
  ih: number;
};

type HangLayout = {
  canvasW: number;
  canvasH: number;
  s: number;
  frames: FrameRect[];
};

function stillUrlFor(work: ExploreWork): string {
  if (work.mediaType !== 'video') {
    const src = stillMasterUrl(work);
    if (src.includes('assets.nikxart.xyz') && !/\.gif(\?|$)/i.test(src)) {
      return theatreStillUrl(src, HI_LONG_EDGE) || src;
    }
    return src;
  }
  const still = [work.originCoverUrl, work.coverUrl].find(
    (u) => u && !/\.gif(\?|$)/i.test(u) && !/\.(mp4|webm|mov)(\?|$)/i.test(u),
  );
  return still || work.coverUrl || work.originCoverUrl || '';
}

function isStillUrl(url: string): boolean {
  return Boolean(url) && !/\.(mp4|webm|mov)(\?|$)/i.test(url);
}

async function canvasFromBlob(blob: Blob): Promise<HTMLCanvasElement | null> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('still decode failed'));
      img.src = url;
    });
    if (img.decode) {
      try {
        await img.decode();
      } catch {
        /* draw anyway */
      }
    }
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return c;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function bitmapFromProxy(url: string): Promise<HTMLCanvasElement | ImageBitmap | null> {
  if (!url || !isStillUrl(url)) return null;
  try {
    const res = await fetch(
      `${PROXY}?url=${encodeURIComponent(url)}&name=hang-still.jpg`,
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size || blob.type.startsWith('video/') || blob.type.startsWith('text/')) {
      return null;
    }
    try {
      const bmp = await createImageBitmap(blob);
      if (bmp.width > 1 && bmp.height > 1) return bmp;
    } catch {
      /* some GIFs / HEIC fail createImageBitmap */
    }
    return canvasFromBlob(blob);
  } catch {
    return null;
  }
}

function liveFrame(
  el: HTMLImageElement | HTMLVideoElement,
): HTMLCanvasElement | null {
  try {
    const w =
      'videoWidth' in el && el.videoWidth
        ? el.videoWidth
        : (el as HTMLImageElement).naturalWidth;
    const h =
      'videoHeight' in el && el.videoHeight
        ? el.videoHeight
        : (el as HTMLImageElement).naturalHeight;
    if (!w || !h) return null;
    if ('complete' in el && el instanceof HTMLImageElement && !el.complete) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return null;
    ctx.drawImage(el, 0, 0, w, h);
    ctx.getImageData(0, 0, 1, 1);
    return c;
  } catch {
    return null;
  }
}

type Source = CanvasImageSource & { width?: number; height?: number };

function rasterize(src: Source): HTMLCanvasElement | null {
  const { w, h } = sourceSize(src);
  if (!w || !h) return null;
  const max = 1920;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * scale));
  const ch = Math.max(2, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  return c;
}

async function stillSource(piece: HangCapturePiece): Promise<Source | null> {
  const urls = [
    stillUrlFor(piece.work),
    piece.work.originCoverUrl,
    piece.work.coverUrl,
    piece.work.mediaUrl,
  ].filter((u, i, all): u is string => Boolean(u) && isStillUrl(u ?? '') && all.indexOf(u) === i);

  for (const url of urls) {
    const bmp = await bitmapFromProxy(url);
    if (bmp) {
      const snap = rasterize(bmp);
      if ('close' in bmp && typeof bmp.close === 'function') bmp.close();
      if (snap) return snap;
    }
  }

  const el = piece.media;
  if (el instanceof HTMLImageElement) {
    try {
      if (el.decode) await el.decode();
    } catch {
      /* draw if the browser already has pixels */
    }
    const live = liveFrame(el);
    if (live) return live;
  }
  return null;
}

async function sourceFor(piece: HangCapturePiece): Promise<Source | null> {
  if (piece.media instanceof HTMLVideoElement) return piece.media;
  return stillSource(piece);
}

function sourceSize(src: Source): { w: number; h: number } {
  if (src instanceof HTMLVideoElement) {
    return { w: src.videoWidth || src.width, h: src.videoHeight || src.height };
  }
  if (src instanceof HTMLImageElement) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
  }
  return { w: src.width || 1, h: src.height || 1 };
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  src: Source,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const { w: iw, h: ih } = sourceSize(src);
  if (!iw || !ih) return;
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y, x, y + h, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function saveBlob(blob: Blob, filename: string) {
  if (!blob.size) throw new Error('Empty file');
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }, 10_000);
}

function computeLayout(
  pieces: HangCapturePiece[],
  hang: number,
  step: 0 | 1 | 2,
  maxW: number,
  maxH: number,
  deepMat = false,
): HangLayout {
  const artH = 1800;
  const moulding = Math.max(18, Math.round(artH * 0.028));
  const mat = Math.max(10, Math.round(artH * (deepMat ? 0.048 : 0.016)));
  const gap = artH * (0.01 + 0.1 * (1 - hang));
  const chrome = (moulding + mat) * 2;
  const widths = pieces.map((p) => artH * p.ar);
  const hangW = widths.reduce((n, w) => n + w + chrome, 0) + gap * (pieces.length - 1);
  const hangH = artH + chrome;
  const pad = [0.1, 0.18, 0.28][step] ?? 0.1;
  const multi = pieces.length >= 2;
  const side = pad * (multi ? 1.55 : 2);
  const vert = pad * (multi ? 2.2 : 1.35) + (multi ? 0.16 : 0);
  let canvasW = hangW * (1 + side);
  let canvasH = hangH * (1 + vert);
  const scale = Math.min(1, maxW / canvasW, maxH / canvasH);
  canvasW = Math.round(canvasW * scale);
  canvasH = Math.round(canvasH * scale);
  canvasW -= canvasW % 2;
  canvasH -= canvasH % 2;

  const s = scale;
  const x0 = (canvasW - hangW * s) / 2;
  const y0 = (canvasH - hangH * s) / 2;
  const frames: FrameRect[] = [];
  let x = x0;
  for (let i = 0; i < pieces.length; i++) {
    const artW = widths[i] * s;
    const aH = artH * s;
    const moul = moulding * s;
    const mt = mat * s;
    const fw = artW + (moul + mt) * 2;
    const fh = aH + (moul + mt) * 2;
    frames.push({
      x,
      y: y0,
      fw,
      fh,
      ix: x + moul + mt,
      iy: y0 + moul + mt,
      iw: fw - (moul + mt) * 2,
      ih: fh - (moul + mt) * 2,
    });
    x += fw + gap * s;
  }
  return { canvasW, canvasH, s, frames };
}

function fillWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  wallColor: string,
  wallPaper: CanvasImageSource | null | undefined,
) {
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, w, h);
  if (!wallPaper) return;
  const iw =
    wallPaper instanceof HTMLImageElement
      ? wallPaper.naturalWidth || wallPaper.width
      : wallPaper instanceof HTMLCanvasElement
        ? wallPaper.width
        : (wallPaper as ImageBitmap).width || 0;
  const ih =
    wallPaper instanceof HTMLImageElement
      ? wallPaper.naturalHeight || wallPaper.height
      : wallPaper instanceof HTMLCanvasElement
        ? wallPaper.height
        : (wallPaper as ImageBitmap).height || 0;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(wallPaper, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function paintHang(
  ctx: CanvasRenderingContext2D,
  layout: HangLayout,
  pieces: HangCapturePiece[],
  sources: (Source | null)[],
  wallColor: string,
  frameTone: FrameTone,
  wallPaper?: CanvasImageSource | null,
) {
  fillWall(ctx, layout.canvasW, layout.canvasH, wallColor, wallPaper);
  const finish = contrastFinish(frameTone, wallColor);
  const { s, frames } = layout;
  for (let i = 0; i < pieces.length; i++) {
    const f = frames[i];
    const rad = Math.max(1.5, 2 * s);

    ctx.save();
    ctx.fillStyle = finish.shadow;
    roundRect(ctx, f.x + 1.6 * s, f.y + 2.8 * s, f.fw, f.fh, rad);
    ctx.fill();
    ctx.restore();

    const metal = ctx.createLinearGradient(f.x, f.y, f.x + f.fw * 0.2, f.y + f.fh);
    for (const [stop, color] of finish.metal) metal.addColorStop(stop, color);
    roundRect(ctx, f.x, f.y, f.fw, f.fh, rad);
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = finish.edge;
    ctx.lineWidth = Math.max(1, 0.9 * s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(f.x + 1.4 * s, f.y + f.fh - 2.2 * s);
    ctx.lineTo(f.x + 1.4 * s, f.y + 1.4 * s);
    ctx.lineTo(f.x + f.fw - 2.2 * s, f.y + 1.4 * s);
    ctx.strokeStyle = finish.highlight;
    ctx.lineWidth = Math.max(1.2, 1.5 * s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(f.x + 2.2 * s, f.y + f.fh - 1.4 * s);
    ctx.lineTo(f.x + f.fw - 1.4 * s, f.y + f.fh - 1.4 * s);
    ctx.lineTo(f.x + f.fw - 1.4 * s, f.y + 2.2 * s);
    ctx.strokeStyle = finish.shade;
    ctx.lineWidth = Math.max(1.2, 1.7 * s);
    ctx.stroke();

    const moulding = f.ix - f.x;
    const innerMat = moulding * 0.55;
    ctx.fillStyle = finish.mat;
    ctx.fillRect(
      f.x + innerMat,
      f.y + innerMat,
      f.fw - innerMat * 2,
      f.fh - innerMat * 2,
    );
    ctx.fillStyle = finish.well;
    ctx.fillRect(f.ix, f.iy, f.iw, f.ih);

    const live = pieces[i].media;
    const src =
      sources[i] ??
      (live instanceof HTMLVideoElement && live.readyState >= 2 ? live : null);
    if (src) drawContain(ctx, src, f.ix, f.iy, f.iw, f.ih);
  }
}

function hangHasMotion(pieces: HangCapturePiece[]): boolean {
  return pieces.some((p) => workHasMotion(p.work, p.media));
}

function canvasSafe(src: CanvasImageSource): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(src, 0, 0, 2, 2);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function loadVideo(url: string, cors: boolean): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    if (cors) v.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => reject(new Error('Video load timeout')), 20_000);
    v.onloadeddata = () => {
      window.clearTimeout(timer);
      resolve(v);
    };
    v.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Video load failed'));
    };
    v.src = url;
  });
}

async function videoForEncode(
  src: string,
  fallback?: HTMLVideoElement | null,
): Promise<{ video: HTMLVideoElement; cleanup: () => void } | null> {
  if (!src && fallback) return { video: fallback, cleanup: () => {} };
  if (!src) return null;

  try {
    const clone = await loadVideo(src, true);
    if (canvasSafe(clone)) {
      return {
        video: clone,
        cleanup: () => {
          clone.removeAttribute('src');
          clone.load();
        },
      };
    }
  } catch {
    /* proxy */
  }

  try {
    const res = await fetch(`${PROXY}?url=${encodeURIComponent(src)}&name=hang.mp4`);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size && (blob.type.startsWith('video/') || !blob.type)) {
        const obj = URL.createObjectURL(blob);
        const clone = await loadVideo(obj, false);
        return {
          video: clone,
          cleanup: () => {
            clone.removeAttribute('src');
            clone.load();
            URL.revokeObjectURL(obj);
          },
        };
      }
    }
  } catch {
    /* live fallback */
  }

  if (fallback) return { video: fallback, cleanup: () => {} };
  return null;
}

type GifFeed = {
  bitmaps: ImageBitmap[];
  starts: number[];
  duration: number;
  fps: number;
  cleanup: () => void;
};

async function decodeGifFeed(url: string): Promise<GifFeed | null> {
  const Decoder = (window as unknown as { ImageDecoder?: new (init: { data: BufferSource; type: string }) => {
    decode: (opts: { frameIndex: number }) => Promise<{ image: VideoFrame; duration?: number }>;
    tracks: { selectedTrack?: { frameCount: number } };
    complete: Promise<void>;
  } }).ImageDecoder;
  if (!Decoder) return null;
  try {
    const res = await fetch(`${PROXY}?url=${encodeURIComponent(url)}&name=hang.gif`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const decoder = new Decoder({ data: buf, type: 'image/gif' });
    await decoder.complete?.catch(() => undefined);
    const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (count < 2) return null;
    const bitmaps: ImageBitmap[] = [];
    const starts: number[] = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      const frame = await decoder.decode({ frameIndex: i });
      const delay = Math.max(0.02, (frame.duration ?? 100_000) / 1_000_000);
      starts.push(t);
      t += delay;
      bitmaps.push(await createImageBitmap(frame.image));
      frame.image.close();
    }
    const duration = t || count / 12;
    const fps = snapFps(count / duration);
    return {
      bitmaps,
      starts,
      duration,
      fps,
      cleanup: () => bitmaps.forEach((b) => b.close()),
    };
  } catch {
    return null;
  }
}

function gifBitmapAt(feed: GifFeed, time: number): ImageBitmap {
  const u = ((time % feed.duration) + feed.duration) % feed.duration;
  let i = 0;
  while (i + 1 < feed.starts.length && feed.starts[i + 1] <= u) i += 1;
  return feed.bitmaps[i];
}

async function detectVideoFps(v: HTMLVideoElement): Promise<number> {
  type Meta = { mediaTime: number };
  const rvfc = (
    v as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: Meta) => void) => number;
    }
  ).requestVideoFrameCallback;
  if (typeof rvfc !== 'function') return 24;
  const samples: number[] = [];
  const wasMuted = v.muted;
  v.muted = true;
  try {
    await v.play();
    await new Promise<void>((resolve) => {
      const stop = window.setTimeout(() => resolve(), 800);
      const tick = (_now: number, meta: Meta) => {
        samples.push(meta.mediaTime);
        if (samples.length >= 14) {
          window.clearTimeout(stop);
          resolve();
          return;
        }
        rvfc.call(v, tick);
      };
      rvfc.call(v, tick);
    });
  } catch {
    return 24;
  } finally {
    v.pause();
    v.muted = wasMuted;
    try {
      v.currentTime = 0;
    } catch {
      /* */
    }
  }
  const dts: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i] - samples[i - 1];
    if (d > 0.008 && d < 0.2) dts.push(d);
  }
  if (dts.length < 4) return 24;
  dts.sort((a, b) => a - b);
  return snapFps(1 / dts[Math.floor(dts.length / 2)]);
}

function seekVideo(v: HTMLVideoElement, time: number, waitMs = 80): Promise<void> {
  const duration = v.duration;
  if (!Number.isFinite(duration) || duration <= 0) return Promise.resolve();
  const target = ((time % duration) + duration) % duration;
  if (Math.abs(v.currentTime - target) < 0.012) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener('seeked', done);
      resolve();
    };
    v.addEventListener('seeked', done);
    try {
      v.currentTime = target;
    } catch {
      done();
      return;
    }
    window.setTimeout(done, waitMs);
  });
}

async function videoDuration(v: HTMLVideoElement): Promise<number> {
  const ready = v.duration;
  if (Number.isFinite(ready) && ready > 0 && ready !== Infinity) return ready;
  await new Promise<void>((resolve) => {
    const done = () => {
      v.removeEventListener('loadedmetadata', done);
      v.removeEventListener('durationchange', done);
      resolve();
    };
    v.addEventListener('loadedmetadata', done);
    v.addEventListener('durationchange', done);
    window.setTimeout(done, 2500);
  });
  const d = v.duration;
  return Number.isFinite(d) && d > 0 && d !== Infinity ? d : 0;
}

/** Encode length from the hung videos' own durations (X: 0.5–140s). */
function hangSeconds(durs: number[]): number {
  const longest = durs.reduce((n, d) => Math.max(n, d), 0);
  if (longest <= 0) return 4;
  if (longest <= 1.2) {
    const loops = Math.max(3, Math.round(4 / longest));
    return Math.min(8, Math.max(2.5, Math.round(longest * loops * 10) / 10));
  }
  if (longest < 2.5) return 2.5;
  return Math.min(140, longest);
}

function silentStereo(seconds: number): AudioBuffer {
  const rate = 44100;
  const frames = Math.max(1, Math.round(rate * seconds));
  const buffer = new AudioBuffer({
    length: frames,
    numberOfChannels: 2,
    sampleRate: rate,
  });
  return buffer;
}

async function ensureEncodeSize(
  w: number,
  h: number,
): Promise<{ w: number; h: number; bitrate: number }> {
  const width = even(w);
  const height = even(h);
  const pixels = width * height;
  const bitrate = pixels > 1_800_000 ? 6_000_000 : pixels > 900_000 ? 5_000_000 : 4_000_000;
  const videoQ = new Quality({ bitrate, bitrateMode: 'constant' });
  if (await canEncodeVideo('avc', { width, height, quality: videoQ })) {
    return { w: width, h: height, bitrate };
  }
  const scale = Math.min(1920 / width, 1080 / height, 1);
  const sw = even(width * scale);
  const sh = even(height * scale);
  if (await canEncodeVideo('avc', { width: sw, height: sh, quality: videoQ })) {
    return { w: sw, h: sh, bitrate: 5_000_000 };
  }
  throw new Error('This browser cannot encode H.264. Try Chrome or Safari 17+.');
}

type MotionFeed = {
  still: Source | null;
  video: HTMLVideoElement | null;
  gif: GifFeed | null;
  cleanup: () => void;
};

async function motionFeedFor(piece: HangCapturePiece): Promise<MotionFeed> {
  const live = piece.media instanceof HTMLVideoElement ? piece.media : null;
  const mp4 = encodeVideoUrl(piece.work, live);
  if (mp4) {
    const clone = await videoForEncode(mp4, live);
    if (clone) {
      return {
        still: null,
        video: clone.video,
        gif: null,
        cleanup: clone.cleanup,
      };
    }
  }
  if (!live) {
    const gifUrl = gifUrlFor(piece.work);
    if (gifUrl) {
      const gif = await decodeGifFeed(gifUrl);
      if (gif) {
        return { still: gif.bitmaps[0], video: null, gif, cleanup: gif.cleanup };
      }
    }
  }
  const still = await stillSource(piece);
  return { still, video: live, gif: null, cleanup: () => {} };
}

function feedAt(feed: MotionFeed, time: number): Source | null {
  if (feed.gif) return gifBitmapAt(feed.gif, time);
  if (feed.video) return feed.video;
  return feed.still;
}

async function captureHangVideo(opts: {
  wallColor: string;
  frameTone?: FrameTone;
  pale?: boolean;
  hang: number;
  step: 0 | 1 | 2;
  pieces: HangCapturePiece[];
  filename: string;
  wallPaper?: CanvasImageSource | null;
  deepMat?: boolean;
}): Promise<void> {
  const { wallColor, hang, step, pieces, wallPaper, deepMat } = opts;
  const frameTone = resolveFrameTone(opts.frameTone, opts.pale);
  const audioQ = new Quality({ bitrate: 192_000, bitrateMode: 'constant' });
  if (!(await canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 44100, quality: audioQ }))) {
    throw new Error('This browser cannot encode AAC audio required by X.');
  }

  const draft = computeLayout(pieces, hang, step, MAX_VIDEO_EDGE, MAX_VIDEO_EDGE, deepMat);
  const size = await ensureEncodeSize(draft.canvasW, draft.canvasH);
  const layout =
    size.w === draft.canvasW && size.h === draft.canvasH
      ? draft
      : computeLayout(pieces, hang, step, size.w, size.h, deepMat);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasW;
  canvas.height = layout.canvasH;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const feeds = await Promise.all(pieces.map((p) => motionFeedFor(p)));
  const missing = pieces.find((p, i) => !feedAt(feeds[i], 0) && !feeds[i].still);
  if (missing) {
    feeds.forEach((f) => f.cleanup());
    throw new Error(`Could not capture “${missing.work.title}” for this hang.`);
  }

  const videos = feeds.map((f) => f.video).filter((v): v is HTMLVideoElement => Boolean(v));
  const durs = await Promise.all([
    ...videos.map((v) => videoDuration(v)),
    ...feeds.map((f) => f.gif?.duration ?? 0),
  ]);
  const fpsList = await Promise.all([
    ...videos.map((v) => detectVideoFps(v)),
    ...feeds.map((f) => Promise.resolve(f.gif?.fps ?? 0)),
  ]);
  const declared = pieces
    .filter((p) => workHasMotion(p.work, p.media))
    .map((p) => p.work.nativeFps || 0)
    .filter((n) => n > 0);
  const native = fpsList.filter((n) => n > 0);
  const embersHang = pieces.some(
    (p) => p.work.tags?.includes('embers') || p.work.nativeFps === 24,
  );
  const fps = embersHang
    ? 24
    : snapFps(declared.length ? Math.max(...declared) : native.length ? Math.max(...native) : 24);
  const seconds = hangSeconds(durs);
  const frameCount = Math.max(1, Math.round(seconds * fps));
  const duration = frameCount / fps;
  const bitrate =
    seconds > 24 ? Math.min(4_000_000, size.bitrate) : seconds > 10 ? 5_000_000 : size.bitrate;
  const keyEvery = seconds > 10 ? 2 : 1;
  const seekWait = Math.max(16, Math.round(1000 / fps / 2));

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });

  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    quality: new Quality({ bitrate, bitrateMode: 'constant' }),
    bitrateMode: 'constant',
    latencyMode: 'quality',
    keyFrameInterval: keyEvery,
    contentHint: 'detail',
  });
  const audioSource = new AudioBufferSource({
    codec: 'aac',
    quality: audioQ,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });
  output.addAudioTrack(audioSource);
  output.setMetadataTags({
    title: 'nikxart hang',
    artist: 'nikxart',
  });

  try {
    await output.start();
    await audioSource.add(silentStereo(duration));

    for (let i = 0; i < frameCount; i++) {
      const t = i / fps;
      await Promise.all(videos.map((v) => seekVideo(v, t, seekWait)));
      const sources = feeds.map((f) => feedAt(f, t) ?? f.still);
      paintHang(ctx, layout, pieces, sources, wallColor, frameTone, wallPaper);
      const key = i === 0 || i % (fps * keyEvery) === 0;
      await videoSource.add(t, 1 / fps, key ? { keyFrame: true } : undefined);
    }

    await output.finalize();
  } catch (err) {
    try {
      await output.cancel();
    } catch {
      /* already failed */
    }
    throw err;
  } finally {
    feeds.forEach((f) => f.cleanup());
  }

  const buffer = target.buffer;
  if (!buffer || !buffer.byteLength) throw new Error('Encode produced an empty file');
  const base = opts.filename.replace(/\.(jpg|jpeg|png|mp4|webm)$/i, '');
  saveBlob(new Blob([buffer], { type: 'video/mp4' }), `${base}.mp4`);
}

export async function captureHang(opts: {
  wallColor: string;
  frameTone?: FrameTone;
  pale?: boolean;
  hang: number;
  step: 0 | 1 | 2;
  pieces: HangCapturePiece[];
  filename: string;
  wallPaper?: CanvasImageSource | null;
  deepMat?: boolean;
}): Promise<void> {
  const { wallColor, hang, step, pieces, filename, wallPaper, deepMat } = opts;
  const frameTone = resolveFrameTone(opts.frameTone, opts.pale);
  if (!pieces.length) throw new Error('Nothing hung');

  if (hangHasMotion(pieces)) {
    await captureHangVideo(opts);
    return;
  }

  const layout = computeLayout(pieces, hang, step, MAX_STILL_EDGE, MAX_STILL_EDGE, deepMat);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasW;
  canvas.height = layout.canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sources = await Promise.all(pieces.map((p) => sourceFor(p)));
  paintHang(ctx, layout, pieces, sources, wallColor, frameTone, wallPaper);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encode failed'))),
      'image/jpeg',
      0.92,
    );
  });
  saveBlob(blob, filename);
}
