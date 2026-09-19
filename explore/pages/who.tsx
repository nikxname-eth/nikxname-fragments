import { useEffect, useState } from 'react';
import Head from 'next/head';
import { AnimatePresence, motion } from 'framer-motion';
import { ARTIST, X_PROFILE, rasterMarketUrl } from '../config/catalog';
import { LivePill } from '../components/LivePill';

export default function WhoPage() {
  const [dark, setDark] = useState(true);
  const [expandedGem, setExpandedGem] = useState<string | null>(null);
  const activeGem = ARTIST.gems.find((g) => g.title === expandedGem);

  useEffect(() => {
    if (!expandedGem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedGem(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expandedGem]);

  return (
    <>
      <Head>
        <title>Who? · Nikxname</title>
        <meta
          name="description"
          content="Nikxname — artist. Brushstrokes as memory, stillness amid turmoil."
        />
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <div className={`ex${dark ? '' : ' theme-light'}`}>
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <nav className="ex-nav-links" aria-label="Primary">
              <a className="ex-nav-link" href="/">
                Explore
              </a>
              <a className="ex-nav-link is-active" href="/who">
                Who?
              </a>
            </nav>
          </div>
          <div className="ex-nav-right">
            <LivePill />
            <button
              type="button"
              className="ex-theme-btn"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            <a className="ex-nav-garden" href="/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-world" id="who" aria-labelledby="world-title">
          <div className="ex-world-inner">
            <p className="ex-world-kicker">{ARTIST.worldKicker}</p>
            <h1 className="ex-world-title" id="world-title">
              {ARTIST.worldTitle}
            </h1>
            <p className="ex-world-lead">{ARTIST.worldLead}</p>

            <div className="ex-artist-inline">
              <div className="ex-portrait" aria-hidden="true">
                <img src={ARTIST.portrait} alt="" />
              </div>
              <div className="ex-artist-copy">
                <h2 className="ex-artist-name">{ARTIST.name}</h2>
                <p className="ex-hero-x">
                  <a
                    href={X_PROFILE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ex-hero-x-link"
                    aria-label="Nikxname on X"
                  >
                    <svg className="ex-x-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                    <span className="ex-hero-handle">{ARTIST.handle}</span>
                  </a>
                  <span className="ex-hero-x-sep"> | </span>
                  <span className="ex-hero-role">{ARTIST.role}</span>
                </p>
                <div className="ex-hero-bio">
                  {ARTIST.bioParagraphs.map((para) => (
                    <p key={para.slice(0, 40)}>{para}</p>
                  ))}
                </div>
                <p className="ex-hero-quote">&ldquo;{ARTIST.quoteSecondary}&rdquo;</p>
              </div>
            </div>

            <div className="ex-gems">
              {ARTIST.gems.map((gem) => (
                <button
                  key={gem.title}
                  type="button"
                  className="ex-gem"
                  onClick={() => setExpandedGem(gem.title)}
                >
                  <h3 className="ex-gem-title">{gem.title}</h3>
                  <p className="ex-gem-body">{gem.body}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <AnimatePresence>
          {activeGem && (
            <motion.div
              className="ex-gem-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="gem-modal-title"
              onClick={() => setExpandedGem(null)}
            >
              <motion.div
                className="ex-gem-modal-card"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="ex-gem-modal-close"
                  onClick={() => setExpandedGem(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
                <p className="ex-gem-modal-kicker">{ARTIST.worldKicker}</p>
                <h3 className="ex-gem-modal-title" id="gem-modal-title">
                  {activeGem.title}
                </h3>
                <p className="ex-gem-modal-body">
                  {activeGem.body} This thread runs through the archive. Open the Theatre to walk the
                  works slowly, or use Random inside the Theatre for the next encounter.
                </p>
                <button
                  type="button"
                  className="ex-pill ex-pill--accent"
                  onClick={() => setExpandedGem(null)}
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="ex-ethos" id="ethos">
          <blockquote className="ex-ethos-quote">
            <p>&ldquo;{ARTIST.ethos}&rdquo;</p>
            <footer>- {ARTIST.name}</footer>
          </blockquote>
        </section>

        <footer className="ex-footer">
          <span className="ex-footer-copy">© {new Date().getFullYear()} Nikxname</span>
          <div className="ex-footer-links">
            <LivePill />
            <a href={rasterMarketUrl()} target="_blank" rel="noopener noreferrer">
              Secondary Market
            </a>
            <a href={X_PROFILE} target="_blank" rel="noopener noreferrer">
              X · {ARTIST.handle}
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
