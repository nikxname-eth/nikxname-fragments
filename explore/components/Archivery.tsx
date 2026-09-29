import { useMemo, useState } from 'react';
import {
  catalogueCensus,
  listKnownAssets,
  type AssetRecord,
  type AssetStore,
} from '../lib/assetDirectory';
import { MEDIA_PINS } from '../lib/mediaPin';

type PinState = 'ok' | 'fail' | 'wait';
type Shelf = 'arweave' | 'hot' | 'missing' | 'all';

function abs(url: string) {
  if (url.startsWith('/')) return `https://explore.nikxart.xyz${url}`;
  return url;
}

function slug(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'file';
}

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function isHot(store: AssetStore) {
  return store === 'R2' || store === 'CDN' || store === 'IPFS';
}

type Props = { wallet: string; signature: string };

export function Archivery({ wallet, signature }: Props) {
  const assets = useMemo(() => listKnownAssets(), []);
  const census = useMemo(() => catalogueCensus(), []);
  const [pins, setPins] = useState<Record<string, PinState>>({});
  const [shelf, setShelf] = useState<Shelf>('arweave');
  const [busy, setBusy] = useState<'check' | 'pack' | null>(null);
  const [note, setNote] = useState('');

  const live = Object.values(pins).filter((s) => s === 'ok').length;
  const dead = Object.values(pins).filter((s) => s === 'fail').length;
  const arweaveN = assets.filter((a) => a.store === 'Arweave').length;
  const hotN = assets.filter((a) => isHot(a.store)).length;

  const shown = assets.filter((a) => {
    if (shelf === 'arweave') return a.store === 'Arweave';
    if (shelf === 'hot') return isHot(a.store);
    if (shelf === 'missing') return pins[abs(a.url)] === 'fail';
    return true;
  });

  const checkPins = async () => {
    setBusy('check');
    setNote('Reading Arweave gateways first, then R2…');
    const urls = assets.map((a) => abs(a.url));
    const next: Record<string, PinState> = {};
    for (const url of urls) next[url] = 'wait';
    setPins({ ...next });
    try {
      const arweave = urls.filter((u) => /arweave/i.test(u));
      const rest = urls.filter((u) => !/arweave/i.test(u));
      const order = [...arweave, ...rest];
      for (let i = 0; i < order.length; i += 16) {
        const slice = order.slice(i, i + 16);
        const res = await fetch('/api/archivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: wallet, signature, urls: slice }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          results?: { url: string; ok: boolean }[];
        };
        if (!res.ok || !data.ok) throw new Error('check');
        for (const row of data.results || []) next[row.url] = row.ok ? 'ok' : 'fail';
        setPins({ ...next });
      }
      const ok = Object.values(next).filter((s) => s === 'ok').length;
      const fail = Object.values(next).filter((s) => s === 'fail').length;
      setNote(
        `${ok} reachable · ${fail} not answering. Arweave red often means the gateway, not a lost pin — R2 is the hot copy.`,
      );
    } catch {
      setNote('Pin check could not finish. Sign in again if the desk locked.');
    } finally {
      setBusy(null);
    }
  };

  const packCold = () => {
    setBusy('pack');
    const day = new Date().toISOString().slice(0, 10);
    const items = assets.map((a) => ({
      name: a.name,
      collection: a.collection,
      kind: a.kind,
      store: a.store,
      url: abs(a.url),
      file: `${slug(a.store)}/${slug(a.collection)}/${slug(a.name)}`,
    }));
    const manifest = {
      product: 'The Archivery',
      packed: new Date().toISOString(),
      copies: ['Arweave (chain master)', 'R2 (hot)', 'SSD cold folder (this pack)'],
      census,
      pins: MEDIA_PINS,
      count: items.length,
      items,
    };
    const sh = [
      '#!/bin/sh',
      `# The Archivery cold pull — ${day}`,
      `# Folders: Arweave / R2 / CDN. Run on the SSD: sh archivery-pull.sh`,
      `ROOT="archivery-${day}"`,
      'mkdir -p "$ROOT"',
      ...items.map(
        (it) =>
          `mkdir -p "$ROOT/${slug(it.store)}/${slug(it.collection)}" && curl -L --fail --retry 2 -o "$ROOT/${it.file}" "${it.url.replace(/"/g, '')}" || echo "FAIL ${it.name}"`,
      ),
      'echo "Cold folder packed into $ROOT"',
      '',
    ].join('\n');
    download(`archivery-${day}.json`, JSON.stringify(manifest, null, 2), 'application/json');
    download(`archivery-pull-${day}.sh`, sh, 'text/x-sh');
    setNote(`Cold pack saved · ${items.length} files, split by Arweave / R2. Run the .sh on the SSD.`);
    setBusy(null);
  };

  const pinMark = (a: AssetRecord) => pins[abs(a.url)] || '';

  return (
    <div className="ex-atelier-assets">
      <div className="ex-archivery-lead">
        <h2>The Archivery</h2>
        <p>
          Nikxname art + archiving. Arweave is the chain master. R2 is the hot copy for the site.
          The cold folder is for the SSD when you ask.
        </p>
      </div>

      <div className="ex-archivery-census" aria-label="Catalogue vs archive">
        {census.map((c) => (
          <p key={c.label}>
            <strong>{c.label}</strong>
            <span>
              {c.minted} minted · {c.arweave} Arweave · {c.r2} R2
            </span>
          </p>
        ))}
      </div>

      <div className="ex-atelier-toolbar">
        <p className="ex-atelier-meta">
          {assets.length} files · {arweaveN} Arweave · {hotN} R2/CDN
          {live || dead ? ` · ${live} reachable · ${dead} not answering` : ''}
        </p>
        <div className="ex-atelier-actions">
          <button
            type="button"
            className="ex-atelier-btn"
            disabled={busy !== null}
            onClick={() => void checkPins()}
          >
            {busy === 'check' ? 'Checking pins…' : 'Check pins'}
          </button>
          <button
            type="button"
            className="ex-atelier-btn is-save"
            disabled={busy !== null}
            onClick={packCold}
          >
            Pack cold folder
          </button>
        </div>
      </div>

      <div className="ex-archivery-shelves" role="tablist" aria-label="Shelves">
        {(
          [
            ['arweave', `Arweave · ${arweaveN}`],
            ['hot', `R2 / CDN · ${hotN}`],
            ['missing', `Not answering · ${dead}`],
            ['all', `All · ${assets.length}`],
          ] as [Shelf, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={shelf === id}
            className={`ex-atelier-tab${shelf === id ? ' is-on' : ''}`}
            onClick={() => setShelf(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {note ? <p className="ex-atelier-note">{note}</p> : null}

      <div className="ex-atelier-table-wrap">
        <table className="ex-atelier-table ex-atelier-table--assets">
          <thead>
            <tr>
              <th>Pin</th>
              <th>Name</th>
              <th>Collection</th>
              <th>Type</th>
              <th>Store</th>
              <th>Indexed</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const st = pinMark(a);
              return (
                <tr key={a.url}>
                  <td>
                    <i
                      className={`ex-archivery-pin${st ? ` is-${st}` : ''}`}
                      title={st === 'ok' ? 'Reachable' : st === 'fail' ? 'Not answering' : 'Unchecked'}
                    />
                  </td>
                  <td>{a.name}</td>
                  <td>{a.collection}</td>
                  <td>{a.kind}</td>
                  <td>{a.store}</td>
                  <td>{a.indexed || '—'}</td>
                  <td>
                    <a href={abs(a.url)} target="_blank" rel="noopener noreferrer">
                      {abs(a.url).replace(/^https:\/\//, '').slice(0, 52)}
                      {abs(a.url).replace(/^https:\/\//, '').length > 52 ? '…' : ''}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
