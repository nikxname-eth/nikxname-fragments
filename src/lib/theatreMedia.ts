const PRELOAD_TIMEOUT_MS = 22_000;

function probeVideo(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      resolve(ok);
    };

    const timeoutId = window.setTimeout(() => finish(false), PRELOAD_TIMEOUT_MS);

    video.addEventListener('loadeddata', () => finish(true), { once: true });
    video.addEventListener('canplay', () => finish(true), { once: true });
    video.addEventListener('error', () => finish(false), { once: true });

    video.src = url;
    video.load();
  });
}

/** Pick the first theatre URL that actually loads; prefers primary when available. */
export async function resolveTheatrePlaybackUrl(
  primaryUrl: string,
  fallbackUrl?: string,
): Promise<string> {
  if (await probeVideo(primaryUrl)) return primaryUrl;
  if (fallbackUrl && fallbackUrl !== primaryUrl && (await probeVideo(fallbackUrl))) {
    return fallbackUrl;
  }
  return fallbackUrl ?? primaryUrl;
}

export function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';

    const timeoutId = window.setTimeout(() => resolve(false), PRELOAD_TIMEOUT_MS);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve(true);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      resolve(false);
    };

    image.src = url;
  });
}