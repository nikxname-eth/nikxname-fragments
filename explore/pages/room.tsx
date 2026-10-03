import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { MaisonStage } from '../components/MaisonStage';
import { exploreCatalogue } from '../lib/gardenWorks';
import type { MaisonPage } from '../lib/maison/types';

const ROBOTS = 'noindex,nofollow,noarchive';

function slugFromPath(path: string): string | null {
  const m = path.split('?')[0].match(/^\/room\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

export default function RoomPage() {
  const catalog = useMemo(() => exploreCatalogue(), []);
  const [page, setPage] = useState<MaisonPage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'locked' | 'missing'>('loading');

  useEffect(() => {
    const slug = slugFromPath(window.location.pathname);
    const key = new URLSearchParams(window.location.search).get('k') || '';
    if (!slug) {
      setStatus('missing');
      return;
    }
    let cancelled = false;
    void fetch(`/api/maison/pages?slug=${encodeURIComponent(slug)}&k=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; page?: MaisonPage }) => {
        if (cancelled) return;
        if (!d.ok || !d.page) {
          setStatus(key ? 'missing' : 'locked');
          return;
        }
        setPage(d.page);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const title = page?.title ? `${page.title} · Maison` : 'A private room · Maison';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content={ROBOTS} />
        <meta name="googlebot" content={ROBOTS} />
        <meta name="description" content="A private room in the house." key="description" />
        <meta property="og:title" content={title} key="og-title" />
        <meta property="og:description" content="A private room in the house." key="og-desc" />
        <meta property="og:url" content="https://explore.nikxart.xyz/room" key="og-url" />
        <meta name="twitter:title" content={title} key="twitter-title" />
        <meta name="twitter:description" content="A private room in the house." key="twitter-desc" />
      </Head>
      <div className="ex ex-room">
        {status === 'loading' ? <p className="ex-looking-note">Opening the room…</p> : null}
        {status === 'locked' ? (
          <section className="ex-looking-idle">
            <p className="ex-looking-kicker">Maison</p>
            <h1 className="ex-looking-title">This room is private.</h1>
            <p className="ex-looking-quiet">A guest key is required. Ask the artist for the link.</p>
          </section>
        ) : null}
        {status === 'missing' ? (
          <section className="ex-looking-idle">
            <p className="ex-looking-kicker">Maison</p>
            <h1 className="ex-looking-title">No room here.</h1>
          </section>
        ) : null}
        {status === 'ready' && page ? (
          <div className="ex-room-body">
            <MaisonStage page={page} works={catalog} />
          </div>
        ) : null}
      </div>
    </>
  );
}
