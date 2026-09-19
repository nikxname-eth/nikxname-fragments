import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  ATELIER_MESSAGE,
  isArtistWallet,
  isAtelierAdmin,
  seedAtelierRows,
  type AtelierRow,
} from '../lib/collectors';
import { listKnownAssets } from '../lib/assetDirectory';
import { LivePill } from '../components/LivePill';
import { AtelierDesk } from '../components/AtelierDesk';

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function emptyRow(): AtelierRow {
  return {
    id: `c-${Date.now().toString(36)}`,
    address: '0x' as `0x${string}`,
    name: '',
    title: '',
    kicker: '',
    lead: '',
    admin: false,
    enabled: true,
    notes: '',
    ens: '',
  };
}

async function signAtelier(eth: Eth, address: string): Promise<string> {
  const hex =
    '0x' +
    Array.from(new TextEncoder().encode(ATELIER_MESSAGE))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const sig = await eth.request({
    method: 'personal_sign',
    params: [hex, address],
  });
  return String(sig);
}

export default function AtelierPage() {
  const [dark, setDark] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [rows, setRows] = useState<AtelierRow[]>(seedAtelierRows());
  const [status, setStatus] = useState<'locked' | 'loading' | 'ready' | 'saving' | 'error'>('locked');
  const [note, setNote] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [panel, setPanel] = useState<'book' | 'desk' | 'assets'>('desk');
  const [pulling, setPulling] = useState(false);
  const assets = useMemo(() => listKnownAssets(), []);

  const admin = isAtelierAdmin(wallet);

  const loadBook = useCallback(async (address: string, sig: string) => {
    setStatus('loading');
    try {
      const res = await fetch(
        `/api/atelier?address=${encodeURIComponent(address)}&signature=${encodeURIComponent(sig)}`,
      );
      const data = (await res.json()) as { ok?: boolean; rows?: AtelierRow[]; updatedAt?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'locked');
      setRows(data.rows?.length ? data.rows : seedAtelierRows());
      setUpdatedAt(data.updatedAt || '');
      setStatus('ready');
      setNote('');
    } catch {
      setStatus('error');
      setNote('Could not open the book. Sign again from this wallet.');
    }
  }, []);

  const connect = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) {
      setNote('Open this page in a wallet browser.');
      return;
    }
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      const next = accounts?.[0]?.toLowerCase() ?? null;
      if (!next) return;
      setWallet(next);
      if (!isAtelierAdmin(next)) {
        setStatus('locked');
        setNote('This room is for the artist’s hand only.');
        return;
      }
      const sig = await signAtelier(eth, next);
      setSignature(sig);
      await loadBook(next, sig);
    } catch {
      setNote('Signature was cancelled.');
    }
  };

  const pullCollectors = async () => {
    if (!wallet || !signature) return;
    setPulling(true);
    setNote('Reading holders…');
    try {
      const res = await fetch(
        `/api/atelier-collectors?address=${encodeURIComponent(wallet)}&signature=${encodeURIComponent(signature)}`,
      );
      const data = (await res.json()) as { ok?: boolean; rows?: AtelierRow[]; count?: number; error?: string };
      if (!res.ok || !data.ok || !data.rows) throw new Error(data.error || 'pull');
      setRows((prev) => mergeCollectorRows(prev, data.rows!));
      setNote(`Pulled ${data.count ?? data.rows.length} holders. Review, then save the book.`);
    } catch {
      setNote('Could not pull collectors just now.');
    } finally {
      setPulling(false);
    }
  };

  const save = async () => {
    if (!wallet || !signature) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/atelier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet, signature, rows }),
      });
      const data = (await res.json()) as { ok?: boolean; rows?: AtelierRow[]; updatedAt?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'save');
      if (data.rows) setRows(data.rows);
      setUpdatedAt(data.updatedAt || '');
      setStatus('ready');
      setNote('Saved.');
    } catch {
      setStatus('ready');
      setNote('Save failed. Try signing again.');
    }
  };

  const patch = (i: number, field: keyof AtelierRow, value: string | boolean) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) return;
    void eth.request({ method: 'eth_accounts' }).then((accs) => {
      const a = (accs as string[])?.[0]?.toLowerCase();
      if (a) setWallet(a);
    });
  }, []);

  return (
    <>
      <Head>
        <title>Atelier · Nikxname</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className={`ex ex-atelier${dark ? '' : ' theme-light'}`}>
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <a className="ex-nav-link" href="/garden">
              Garden
            </a>
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
          </div>
        </header>

        <section className="ex-atelier-hero">
          <p className="ex-atelier-kicker">Private book</p>
          <h1 className="ex-atelier-title">Atelier</h1>
          <p className="ex-atelier-lead">
            A card for each collector you know. The garden reads this book when they connect.
            Pull collectors to load everyone who currently holds a Nikxname work — .eth names
            included when they have one.
          </p>
          {status === 'locked' || status === 'error' ? (
            <button type="button" className="ex-garden-enter" onClick={() => void connect()}>
              {admin ? 'Sign to open' : 'Enter with wallet'}
            </button>
          ) : null}
          {note ? <p className="ex-atelier-note">{note}</p> : null}
        </section>

        {(status === 'ready' || status === 'saving') && (
          <div className="ex-atelier-book">
            <div className="ex-atelier-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'book'}
                className={`ex-atelier-tab${panel === 'book' ? ' is-on' : ''}`}
                onClick={() => setPanel('book')}
              >
                Collectors
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'desk'}
                className={`ex-atelier-tab${panel === 'desk' ? ' is-on' : ''}`}
                onClick={() => setPanel('desk')}
              >
                Desk
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'assets'}
                className={`ex-atelier-tab${panel === 'assets' ? ' is-on' : ''}`}
                onClick={() => setPanel('assets')}
              >
                Assets
              </button>
            </div>
            {panel === 'desk' && wallet && signature ? (
              <AtelierDesk wallet={wallet} signature={signature} readOnly={!isArtistWallet(wallet)} />
            ) : panel === 'book' ? (
            <>
            <div className="ex-atelier-toolbar">
              <p className="ex-atelier-meta">
                {rows.length} collector{rows.length === 1 ? '' : 's'}
                {updatedAt ? ` · saved ${new Date(updatedAt).toLocaleString()}` : ''}
              </p>
              <div className="ex-atelier-actions">
                <button
                  type="button"
                  className="ex-atelier-btn"
                  disabled={pulling}
                  onClick={() => void pullCollectors()}
                >
                  {pulling ? 'Pulling…' : 'Pull collectors'}
                </button>
                <button
                  type="button"
                  className="ex-atelier-btn"
                  onClick={() => setRows((prev) => [...prev, emptyRow()])}
                >
                  Add row
                </button>
                <button
                  type="button"
                  className="ex-atelier-btn is-save"
                  disabled={status === 'saving'}
                  onClick={() => void save()}
                >
                  {status === 'saving' ? 'Saving…' : 'Save book'}
                </button>
              </div>
            </div>
            <div className="ex-atelier-table-wrap">
              <table className="ex-atelier-table">
                <thead>
                  <tr>
                    <th>Wallet</th>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Kicker</th>
                    <th>Lead</th>
                    <th>Notes</th>
                    <th>On</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id + i}>
                      <td>
                        <input
                          value={row.address}
                          onChange={(e) => patch(i, 'address', e.target.value)}
                          spellCheck={false}
                          aria-label="Wallet"
                        />
                        {row.ens ? <span className="ex-atelier-ens">{row.ens}</span> : null}
                      </td>
                      <td>
                        <input
                          value={row.name}
                          onChange={(e) => patch(i, 'name', e.target.value)}
                          aria-label="Name"
                        />
                      </td>
                      <td>
                        <input
                          value={row.title}
                          onChange={(e) => patch(i, 'title', e.target.value)}
                          aria-label="Title"
                        />
                      </td>
                      <td>
                        <input
                          value={row.kicker}
                          onChange={(e) => patch(i, 'kicker', e.target.value)}
                          aria-label="Kicker"
                        />
                      </td>
                      <td>
                        <input
                          value={row.lead}
                          onChange={(e) => patch(i, 'lead', e.target.value)}
                          aria-label="Lead"
                        />
                      </td>
                      <td>
                        <input
                          value={row.notes}
                          onChange={(e) => patch(i, 'notes', e.target.value)}
                          aria-label="Notes"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => patch(i, 'enabled', e.target.checked)}
                          aria-label="Enabled"
                        />
                      </td>
                      <td>
                        {!row.admin ? (
                          <button
                            type="button"
                            className="ex-atelier-remove"
                            onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                            aria-label={`Remove ${row.name || 'row'}`}
                          >
                            ✕
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
            ) : (
            <div className="ex-atelier-assets">
              <p className="ex-atelier-meta">
                {assets.length} known masters · Arweave / IPFS / CDN. Pinning and backup come next.
              </p>
              <div className="ex-atelier-table-wrap">
                <table className="ex-atelier-table ex-atelier-table--assets">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Collection</th>
                      <th>Type</th>
                      <th>Store</th>
                      <th>Indexed</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => (
                      <tr key={a.url}>
                        <td>{a.name}</td>
                        <td>{a.collection}</td>
                        <td>{a.kind}</td>
                        <td>{a.store}</td>
                        <td>{a.indexed || '—'}</td>
                        <td>
                          <a href={a.url} target="_blank" rel="noopener noreferrer">
                            {a.url.replace(/^https:\/\//, '').slice(0, 56)}
                            {a.url.replace(/^https:\/\//, '').length > 56 ? '…' : ''}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}
        <footer className="ex-footer">
          <LivePill />
        </footer>
      </div>
    </>
  );
}

function mergeCollectorRows(current: AtelierRow[], incoming: AtelierRow[]): AtelierRow[] {
  const map = new Map<string, AtelierRow>();
  for (const row of current) map.set(row.address.toLowerCase(), row);
  for (const row of incoming) {
    const key = row.address.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      ...existing,
      ens: row.ens || existing.ens,
      name:
        existing.name && existing.name !== 'Collector'
          ? existing.name
          : row.name || existing.name,
    });
  }
  return [...map.values()].sort((a, b) => {
    if (Boolean(a.admin) !== Boolean(b.admin)) return a.admin ? -1 : 1;
    return (a.ens || a.name).localeCompare(b.ens || b.name, undefined, { sensitivity: 'base' });
  });
}
