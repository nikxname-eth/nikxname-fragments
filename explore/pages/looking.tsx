import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import type { ExploreWork } from '../config/catalog';
import { collectorFor, type CollectorProfile } from '../lib/collectors';
import { asTheatreWork, exploreCatalogue, type GardenToken } from '../lib/gardenWorks';
import { lookingStillUrl } from '../lib/lookingStill';
import { catalogueThumbUrl } from '../lib/mediaUrl';
import { PAIR_ALPHABET, normalizePairCode } from '../lib/pairCode';
import { LookingStage } from '../components/LookingStage';

type Bed = { seriesId: string; label: string; tokens: GardenToken[] };
type GardenPayload = { ok: boolean; wallet?: string; total?: number; beds?: Bed[]; error?: string };

const KEYS = PAIR_ALPHABET.split('');
const ROBOTS = 'noindex,nofollow,noarchive';

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function walletFromPath(path: string): string | null {
  const m = path.split('?')[0].match(/\/looking\/(0x[a-fA-F0-9]{40})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

function lookingOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://explore.nikxart.xyz';
}

export default function LookingPage() {
  const catalog = useMemo(() => exploreCatalogue(), []);
  const [wallet, setWallet] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'resolving' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [note, setNote] = useState('');
  const [payload, setPayload] = useState<GardenPayload | null>(null);
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [focus, setFocus] = useState(0);
  const [keyFocus, setKeyFocus] = useState(0);
  const [opened, setOpened] = useState<ExploreWork | null>(null);
  const [cols, setCols] = useState(4);

  const works = useMemo(() => {
    const out: ExploreWork[] = [];
    const seen = new Set<string>();
    for (const bed of payload?.beds || []) {
      for (const token of bed.tokens) {
        const work = asTheatreWork(token, catalog);
        if (seen.has(work.id)) continue;
        seen.add(work.id);
        out.push(work);
      }
    }
    return out;
  }, [payload, catalog]);

  const loadGarden = useCallback(async (address: string) => {
    setStatus('loading');
    setNote('Opening the garden…');
    try {
      const res = await fetch(`/api/garden?wallet=${encodeURIComponent(address)}`);
      const data = (await res.json()) as GardenPayload;
      if (!data.ok) {
        setStatus('error');
        setNote('This garden could not be read just now.');
        return;
      }
      setPayload(data);
      setWallet(address);
      setStatus((data.total || 0) > 0 ? 'ready' : 'empty');
      setNote('');
      setFocus(0);
      const next = `${lookingOrigin()}/looking/${address}`;
      if (window.location.pathname !== `/looking/${address}`) {
        window.history.replaceState({}, '', next);
      }
    } catch {
      setStatus('error');
      setNote('The room could not be reached.');
    }
  }, []);

  const resolveCode = useCallback(
    async (raw: string) => {
      const next = normalizePairCode(raw);
      if (!next) {
        setNote('Enter the four-character code from the phone.');
        return;
      }
      setStatus('resolving');
      setNote('Finding the garden…');
      try {
        const res = await fetch(`/api/looking/pair?code=${encodeURIComponent(next)}`);
        const data = (await res.json()) as { ok?: boolean; wallet?: string };
        if (!res.ok || !data.wallet) {
          setStatus('idle');
          setNote('That code has expired, or it was mistyped.');
          setCode('');
          return;
        }
        await loadGarden(data.wallet);
      } catch {
        setStatus('idle');
        setNote('The pairing desk could not be reached.');
      }
    },
    [loadGarden],
  );

  useEffect(() => {
    const fromPath = walletFromPath(window.location.pathname);
    const fromQuery = new URLSearchParams(window.location.search).get('code');
    if (fromPath) {
      void loadGarden(fromPath);
      return;
    }
    if (fromQuery) void resolveCode(fromQuery);
  }, [loadGarden, resolveCode]);

  useEffect(() => {
    if (!wallet) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/collectors?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => r.json())
      .then((d: { profile?: CollectorProfile | null }) => {
        if (!cancelled) setProfile(d.profile ?? collectorFor(wallet));
      })
      .catch(() => {
        if (!cancelled) setProfile(collectorFor(wallet));
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      setCols(w >= 1600 ? 5 : w >= 1100 ? 4 : w >= 700 ? 3 : 2);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    document.body.style.overflow = opened ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [opened]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (opened) return;
      if (status === 'idle' || status === 'resolving' || status === 'error') {
        if (e.key === 'Backspace') {
          e.preventDefault();
          setCode((c) => c.slice(0, -1));
          return;
        }
        if (e.key === 'Enter') {
          if (e.target instanceof HTMLButtonElement) return;
          e.preventDefault();
          if (code.length === 4) void resolveCode(code);
          else {
            const glyph = KEYS[keyFocus];
            if (glyph && code.length < 4) {
              const next = code + glyph;
              setCode(next);
              if (next.length === 4) void resolveCode(next);
            }
          }
          return;
        }
        if (e.key === 'ArrowRight') setKeyFocus((i) => (i + 1) % KEYS.length);
        if (e.key === 'ArrowLeft') setKeyFocus((i) => (i - 1 + KEYS.length) % KEYS.length);
        if (e.key === 'ArrowDown') setKeyFocus((i) => Math.min(KEYS.length - 1, i + 8));
        if (e.key === 'ArrowUp') setKeyFocus((i) => Math.max(0, i - 8));
        const glyph = e.key.toUpperCase();
        if (PAIR_ALPHABET.includes(glyph) && code.length < 4) {
          const next = code + glyph;
          setCode(next);
          if (next.length === 4) void resolveCode(next);
        }
        return;
      }
      if (!works.length) return;
      if (e.key === 'Escape') {
        setWallet(null);
        setPayload(null);
        setStatus('idle');
        setCode('');
        window.history.replaceState({}, '', '/looking');
        return;
      }
      const last = works.length - 1;
      if (e.key === 'ArrowRight') setFocus((i) => Math.min(last, i + 1));
      if (e.key === 'ArrowLeft') setFocus((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowDown') setFocus((i) => Math.min(last, i + cols));
      if (e.key === 'ArrowUp') setFocus((i) => Math.max(0, i - cols));
      if (e.key === 'Enter') {
        e.preventDefault();
        setOpened(works[focus] || null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opened, status, code, resolveCode, works, focus, cols, keyFocus]);

  const pressKey = (glyph: string) => {
    if (code.length >= 4) return;
    const next = (code + glyph).slice(0, 4);
    setCode(next);
    if (next.length === 4) void resolveCode(next);
  };

  const inRoom = status === 'ready' || status === 'empty' || status === 'loading';
  const curator = profile ?? collectorFor(wallet);

  return (
    <>
      <Head>
        <title>Looking Room · Nikxname</title>
        <meta name="robots" content={ROBOTS} />
        <meta name="googlebot" content={ROBOTS} />
        <meta name="description" content="A room for looking. Private." key="description" />
        <meta property="og:title" content="Looking Room" key="og-title" />
        <meta property="og:description" content="A room for looking. Private." key="og-desc" />
        <meta property="og:url" content="https://explore.nikxart.xyz/looking" key="og-url" />
        <meta name="twitter:title" content="Looking Room" key="twitter-title" />
        <meta name="twitter:description" content="A room for looking. Private." key="twitter-desc" />
      </Head>

      <div className="ex ex-looking">
        {!inRoom ? (
          <section className="ex-looking-idle">
            <p className="ex-looking-kicker">Television</p>
            <h1 className="ex-looking-title">The Looking Room</h1>
            <p className="ex-looking-quiet">
              This room is for looking. Buying and hanging happen on a phone or computer.
            </p>
            <div className="ex-looking-slots" aria-label="Pairing code">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className={`ex-looking-slot${code[i] ? ' is-on' : ''}`}>
                  {code[i] || ''}
                </span>
              ))}
            </div>
            <div className="ex-looking-keys" role="group" aria-label="On-screen keypad">
              {KEYS.map((glyph, i) => (
                <button
                  key={glyph}
                  type="button"
                  className={`ex-looking-key${i === keyFocus ? ' is-focus' : ''}`}
                  onClick={() => pressKey(glyph)}
                  onFocus={() => setKeyFocus(i)}
                >
                  {glyph}
                </button>
              ))}
            </div>
            <div className="ex-looking-idle-actions">
              <button
                type="button"
                className="ex-looking-hit"
                onClick={() => void resolveCode(code)}
                disabled={code.length !== 4 || status === 'resolving'}
              >
                {status === 'resolving' ? 'Opening…' : 'Open garden'}
              </button>
              <button type="button" className="ex-looking-hit is-quiet" onClick={() => setCode('')}>
                Clear
              </button>
            </div>
            {note ? <p className="ex-looking-note">{note}</p> : null}
            <p className="ex-looking-hint">On the phone: Garden → Open on TV. Type the four characters here.</p>
          </section>
        ) : (
          <section className="ex-looking-room">
            <header className="ex-looking-head">
              <div>
                <p className="ex-looking-kicker">{curator?.kicker || 'A private garden'}</p>
                <h1 className="ex-looking-room-title">{curator?.name || (wallet ? shortAddr(wallet) : 'Garden')}</h1>
              </div>
              <button
                type="button"
                className="ex-looking-hit"
                onClick={() => {
                  setWallet(null);
                  setPayload(null);
                  setOpened(null);
                  setStatus('idle');
                  setCode('');
                  window.history.replaceState({}, '', '/looking');
                }}
              >
                Close
              </button>
            </header>
            {status === 'loading' ? <p className="ex-looking-note">{note}</p> : null}
            {status === 'empty' ? <p className="ex-looking-note">This garden is quiet just now.</p> : null}
            <div className="ex-looking-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {works.map((work, i) => {
                const still = lookingStillUrl(work);
                return (
                  <button
                    key={work.id}
                    type="button"
                    className={`ex-looking-tile${i === focus ? ' is-focus' : ''}`}
                    onClick={() => {
                      setFocus(i);
                      setOpened(work);
                    }}
                    onFocus={() => setFocus(i)}
                  >
                    <span className="ex-looking-tile-media">
                      {still ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={catalogueThumbUrl(still, 720)} alt="" draggable={false} />
                      ) : (
                        <span className="ex-looking-tile-ph" />
                      )}
                    </span>
                    <span className="ex-looking-tile-name">{work.title}</span>
                  </button>
                );
              })}
            </div>
            <p className="ex-looking-quiet ex-looking-foot">
              This room is for looking. Buying and hanging happen on a phone or computer.
            </p>
          </section>
        )}
      </div>

      {opened ? <LookingStage work={opened} onClose={() => setOpened(null)} /> : null}
    </>
  );
}
