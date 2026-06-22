const ENTERED_KEY = 'nikxart-entered';

/** True when the user has already passed the intro gate this session. */
export function readSiteEntered(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSiteEntered(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ENTERED_KEY, '1');
  } catch {
    /* private mode */
  }
}