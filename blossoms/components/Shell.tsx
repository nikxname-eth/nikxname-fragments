import { useEffect, useState, type ReactNode } from 'react';
import { EXPLORE_SITE, LIVE_SITE } from '../config/season';

export function Shell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bl-theme');
      if (saved === 'light') setDark(false);
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', !dark);
    try {
      localStorage.setItem('bl-theme', dark ? 'dark' : 'light');
    } catch {
      /* private mode */
    }
  }, [dark]);

  return (
    <div className="bl">
      <div className="glow glow-r" aria-hidden />
      <div className="glow glow-b" aria-hidden />
      <header className="bl-nav">
        <a className="bl-mark" href="/">
          Blossoms
        </a>
        <div className="bl-nav-right">
          <a className="bl-nav-link" href={LIVE_SITE}>
            Nikxart
          </a>
          <a className="bl-nav-link" href={EXPLORE_SITE}>
            Explore
          </a>
          <button type="button" className="bl-theme" onClick={() => setDark((v) => !v)}>
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
