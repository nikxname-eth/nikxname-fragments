/** Unlisted sit key. Production /studio is empty without it. Localhost stays open. */
export const STUDIO_GATE = 'n4x-sit-k9';

const STORE = 'bl-studio-gate';

export function isStudioOpen(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  const k = new URLSearchParams(window.location.search).get('k');
  if (k === STUDIO_GATE) {
    try {
      localStorage.setItem(STORE, STUDIO_GATE);
    } catch {
      /* private mode */
    }
    return true;
  }
  try {
    return localStorage.getItem(STORE) === STUDIO_GATE;
  } catch {
    return false;
  }
}
