import { useEffect, useMemo, useState } from 'react';
import { ATELIER_MESSAGE } from '../lib/collectors';
import type { WouldPanelRow } from '../config/would-it';
import { editionIdentity } from '../lib/editionIdentity';

type CatalogueWork = {
  title: string;
  collection: string;
  seriesId: string;
  tokenId?: number;
  contract?: string;
  qty: number;
  cover?: string;
  openSeaUrl?: string;
};

type BedToken = {
  seriesId: string;
  tokenId: string;
  name: string;
  quantity: number;
  contract: string;
};

type Props = {
  mode: 'book' | 'offers';
  wallet: string;
  holdings: BedToken[];
  onClose: () => void;
};

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function CatalogueBook({ mode, wallet, holdings, onClose }: Props) {
  const [collections, setCollections] = useState<{ id: string; label: string; works: CatalogueWork[] }[]>(
    [],
  );
  const [panels, setPanels] = useState<Record<string, WouldPanelRow>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/catalogue').then((r) => r.json()),
      fetch('/api/will-it').then((r) => r.json()),
    ])
      .then(([book, live]) => {
        if (!alive) return;
        if (book?.ok) setCollections(book.collections || []);
        if (live?.ok) setPanels(live.panels || {});
      })
      .catch(() => setNote('The book could not be read just now.'));
    return () => {
      alive = false;
    };
  }, []);

  const mine = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of holdings) {
      const { key } = editionIdentity(t.name, t.seriesId);
      map.set(key, (map.get(key) || 0) + (t.quantity || 1));
      map.set(`${t.seriesId}:id:${t.tokenId}`, (map.get(`${t.seriesId}:id:${t.tokenId}`) || 0) + (t.quantity || 1));
    }
    return map;
  }, [holdings]);

  const offers = useMemo(() => {
    return Object.values(panels)
      .filter((p) => p.offer)
      .map((p) => ({
        key: p.key,
        title: `Will It.. ${p.letter}${p.panel}`,
        amount: p.offer!,
        href: p.href,
      }));
  }, [panels]);

  const sign = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) throw new Error('wallet');
    const hex =
      '0x' +
      Array.from(new TextEncoder().encode(ATELIER_MESSAGE))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return String(await eth.request({ method: 'personal_sign', params: [hex, wallet] }));
  };

  const refresh = async (work: CatalogueWork) => {
    if (!work.contract || work.tokenId == null) return;
    setBusy(`${work.contract}:${work.tokenId}`);
    setNote('');
    try {
      const signature = await sign();
      const res = await fetch('/api/catalogue-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet,
          signature,
          contract: work.contract,
          tokenId: work.tokenId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      setNote(data.ok ? `Refresh asked for ${work.title}` : 'Refresh was not accepted.');
    } catch {
      setNote('Signature cancelled.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ex-book" role="dialog" aria-modal="true" aria-label={mode === 'offers' ? 'Offers' : 'Catalogue'}>
      <div className="ex-book-panel" onClick={(e) => e.stopPropagation()}>
        <header className="ex-book-bar">
          <p>{mode === 'offers' ? 'Live offers' : 'Studio catalogue'}</p>
          <button type="button" className="ex-look-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {note ? <p className="ex-book-note">{note}</p> : null}
        {mode === 'offers' ? (
          <div className="ex-book-offers">
            {offers.length === 0 ? (
              <p className="ex-book-empty">No live offers indexed just now.</p>
            ) : (
              offers.map((o) => (
                <a key={o.key} className="ex-book-offer" href={o.href} target="_blank" rel="noopener noreferrer">
                  <span className="ex-would-status-dot" style={{ background: '#7dd3fc' }} />
                  <span>{o.title}</span>
                  <em>{o.amount}</em>
                </a>
              ))
            )}
          </div>
        ) : (
          <div className="ex-book-scroll">
            {collections.map((col) => (
              <section key={col.id} className="ex-book-col">
                <h3>{col.label}</h3>
                <table>
                  <thead>
                    <tr>
                      <th />
                      <th>Work</th>
                      <th>Qty</th>
                      <th>Mine</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {col.works.map((w) => {
                      const held =
                        mine.get(`${w.seriesId}:id:${w.tokenId}`) ||
                        mine.get(editionIdentity(w.title, w.seriesId).key) ||
                        0;
                      const live = Object.values(panels).find((p) => p.tokenId === w.tokenId);
                      return (
                        <tr key={`${w.seriesId}-${w.tokenId}-${w.title}`}>
                          <td>
                            <span className="ex-book-dots" aria-hidden="true">
                              {held > 0 ? <i className="is-mine" /> : <i className="is-other" />}
                              {live?.status === 'available' ? <i className="is-list" /> : null}
                              {live?.offer ? <i className="is-offer" /> : null}
                            </span>
                          </td>
                          <td>
                            {w.openSeaUrl ? (
                              <a href={w.openSeaUrl} target="_blank" rel="noopener noreferrer">
                                {w.title}
                              </a>
                            ) : (
                              w.title
                            )}
                          </td>
                          <td>{w.qty > 1 ? `×${w.qty}` : '1'}</td>
                          <td>{held ? `×${held}` : '—'}</td>
                          <td>
                            {w.contract && w.tokenId != null ? (
                              <button
                                type="button"
                                className="ex-book-refresh"
                                disabled={busy === `${w.contract}:${w.tokenId}`}
                                onClick={() => void refresh(w)}
                              >
                                Refresh
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
