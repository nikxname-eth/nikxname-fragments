import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { EMBERS, type EmberButterfly } from '../config/embers';
import { LivePill } from '../components/LivePill';

const SLOT_COUNT = 5;

export default function FlutterIntoTheEmbersPage() {
  const [dark, setDark] = useState(true);
  const [picked, setPicked] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null));
  const [look, setLook] = useState<EmberButterfly | null>(null);
  const swipe = useRef<{ x: number } | null>(null);

  const lookIndex = look ? EMBERS.findIndex((b) => b.id === look.id) : -1;

  const stepLook = useCallback((dir: -1 | 1) => {
    setLook((current) => {
      if (!current) return current;
      const i = EMBERS.findIndex((b) => b.id === current.id);
      if (i < 0) return current;
      return EMBERS[(i + dir + EMBERS.length) % EMBERS.length];
    });
  }, []);

  useEffect(() => {
    if (!look) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLook(null);
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLook(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLook(1);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [look, stepLook]);

  const setSlot = useCallback((index: number, value: string) => {
    setPicked((prev) => {
      const next = [...prev];
      next[index] = value.trim() || null;
      return next;
    });
  }, []);

  const addToList = useCallback((name: string) => {
    setPicked((prev) => {
      const empty = prev.findIndex((v) => !v);
      if (empty === -1) return prev;
      const next = [...prev];
      next[empty] = name;
      return next;
    });
  }, []);

  return (
    <>
      <Head>
        <title>Flutter Into The Embers · Nikxname</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="googlebot" content="noindex,nofollow,noarchive" />
        <meta property="og:title" content="Flutter Into The Embers · Nikxname" key="og-title" />
        <meta property="og:image" content="https://explore.nikxart.xyz/embers/share.jpg" key="og-image" />
        <meta property="og:image:width" content="1024" key="og-image-w" />
        <meta property="og:image:height" content="576" key="og-image-h" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content="Flutter Into The Embers · Nikxname" key="twitter-title" />
        <meta name="twitter:image" content="https://explore.nikxart.xyz/embers/share.jpg" key="twitter-image" />
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
              <a className="ex-nav-link" href="https://explore.nikxart.xyz">
                Explore
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
            <a className="ex-nav-garden" href="https://explore.nikxart.xyz/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-embers-intro">
          <h1 className="ex-embers-intro-title">Flutter Into The Embers</h1>
          <p className="ex-embers-intro-sub">
            A special thank you to everyone who diligently collected all{' '}
            <strong>27 Fragments</strong> and the final <strong>Masterwork</strong>.
          </p>
          <p>
            In appreciation of your time and patience, I have created{' '}
            <strong>21 unique Butterflies</strong> looking for safe homes.
          </p>
          <p>
            These butterflies are part of a larger artwork, which will be personalized and delivered
            to you based on your selections.
          </p>
        </section>

        <div className="ex-grid-wrap">
          <div className="ex-embers-grid" aria-label="21 Butterflies">
            {EMBERS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="ex-card"
                onClick={() => setLook(b)}
                aria-label={`Look closer at ${b.name}`}
              >
                <span className="ex-card-media ex-embers-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.thumb} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="ex-card-meta">
                  <span className="ex-card-title">{b.name}</span>
                </span>
              </button>
            ))}
          </div>

          <section className="ex-embers-picks" aria-label="Your selection">
            <p className="ex-series-label">Your selection</p>
            <h2 className="ex-embers-picks-title">Write your order, then screenshot</h2>
            <p className="ex-embers-picks-lead">
              Type a colour, or choose from the list. One Full Set: fill 1–3. Two or more: fill 1–5.
            </p>
            <ol className="ex-embers-slots">
              {picked.map((value, i) => (
                <li key={i} className="ex-embers-slot">
                  <label htmlFor={`ember-slot-${i}`}>
                    <span className="ex-embers-slot-n">{i + 1}</span>
                    <input
                      id={`ember-slot-${i}`}
                      list="ember-colours"
                      value={value ?? ''}
                      placeholder="Colour"
                      autoComplete="off"
                      onChange={(e) => setSlot(i, e.target.value)}
                    />
                  </label>
                </li>
              ))}
            </ol>
            <datalist id="ember-colours">
              {EMBERS.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
            <p className="ex-embers-picks-note">
              *1st choice selections are not guaranteed, though aiming to allocate as fairly as
              possible
            </p>
          </section>

          <section className="ex-embers-allot" aria-labelledby="embers-allot-title">
            <h2 id="embers-allot-title">The Allotment</h2>
            <p>Your reward is tied directly to the number of completed sets in your collection:</p>
            <ul>
              <li>
                <strong>1 Full Set</strong> matches to 1 Butterfly
              </li>
              <li>
                <strong>2 Full Sets</strong> match to 2 Butterflies
              </li>
              <li>
                <strong>3 Full Sets</strong> match to 3 Butterflies
              </li>
            </ul>
            <p>
              Because we cannot always guarantee your first pick, our goal is to thoughtfully place
              each butterfly with the patron who loves them most. We kindly request that you review
              your choices without rush, but submit them relatively promptly so we do not keep our
              other friends and patrons waiting.
            </p>
            <p>
              Please send your final preferences directly to me through our private channel{' '}
              <strong>by Sunday, September 13th, 2026.</strong>
            </p>
            <div className="ex-embers-table" role="table" aria-label="Selections required">
              <div className="ex-embers-table-head" role="row">
                <span role="columnheader">Your Total Completed Sets</span>
                <span role="columnheader">Selections Required</span>
              </div>
              <div className="ex-embers-table-row" role="row">
                <span role="cell">
                  <strong>1 Full Set</strong>
                </span>
                <span role="cell">
                  Submit your <strong>Top 3</strong> choices in order of preference
                </span>
              </div>
              <div className="ex-embers-table-row" role="row">
                <span role="cell">
                  <strong>2+ Full Sets</strong>
                </span>
                <span role="cell">
                  Submit your <strong>Top 5</strong> choices in order of preference
                </span>
              </div>
            </div>
          </section>

          <p className="ex-embers-close">Happy selecting your favorites!</p>
          <p className="ex-embers-ps">
            P.S. If you think this all ends with your selection.. think again.
          </p>
          <footer className="ex-footer">
            <LivePill />
          </footer>
        </div>
      </div>

      {look ? (
        <div
          className="ex-embers-look"
          onClick={() => setLook(null)}
          onTouchStart={(e) => {
            swipe.current = { x: e.changedTouches[0]?.clientX ?? 0 };
          }}
          onTouchEnd={(e) => {
            const start = swipe.current?.x;
            swipe.current = null;
            if (start == null) return;
            const dx = (e.changedTouches[0]?.clientX ?? start) - start;
            if (dx > 48) stepLook(-1);
            else if (dx < -48) stepLook(1);
          }}
          role="presentation"
        >
          <button
            type="button"
            className="ex-embers-look-arrow is-prev"
            aria-label="Previous butterfly"
            onClick={(e) => {
              e.stopPropagation();
              stepLook(-1);
            }}
          >
            ‹
          </button>
          <div
            className="ex-embers-look-panel"
            role="dialog"
            aria-modal="true"
            aria-label={look.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ex-embers-look-close"
              onClick={() => setLook(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="ex-embers-look-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={look.close} alt={look.name} />
              <span className="ex-embers-noise" aria-hidden="true" />
            </div>
            <p className="ex-embers-look-name">
              {look.name}
              {lookIndex >= 0 ? (
                <span className="ex-embers-look-count">
                  {' '}
                  · {lookIndex + 1} / {EMBERS.length}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              className="ex-embers-look-add"
              onClick={() => {
                addToList(look.name);
                setLook(null);
              }}
            >
              Add to selection
            </button>
          </div>
          <button
            type="button"
            className="ex-embers-look-arrow is-next"
            aria-label="Next butterfly"
            onClick={(e) => {
              e.stopPropagation();
              stepLook(1);
            }}
          >
            ›
          </button>
        </div>
      ) : null}
    </>
  );
}
