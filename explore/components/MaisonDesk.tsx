import { useCallback, useEffect, useMemo, useState } from 'react';
import { atelierAuthHeaders } from '../lib/atelierAuth';
import { exploreCatalogue } from '../lib/gardenWorks';
import { createBlock, MAISON_REGISTRY, maisonKind } from '../lib/maison/registry';
import { cleanSlug, emptyPage, newGuestKey } from '../lib/maison/schema';
import type { MaisonBlock, MaisonIndexItem, MaisonPage, MaisonStatus } from '../lib/maison/types';
import { lookingStillUrl } from '../lib/lookingStill';
import { catalogueThumbUrl } from '../lib/mediaUrl';
import { MaisonStage } from './MaisonStage';

type Props = {
  wallet: string;
  signature: string;
};

function privateUrl(page: MaisonPage) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://explore.nikxart.xyz';
  return `${origin}/room/${page.slug}?k=${page.guestKey}`;
}

function lookingUrl(wallet: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://explore.nikxart.xyz';
  return `${origin}/looking/${wallet.toLowerCase()}`;
}

export function MaisonDesk({ wallet, signature }: Props) {
  const catalog = useMemo(() => exploreCatalogue(), []);
  const [pages, setPages] = useState<MaisonIndexItem[]>([]);
  const [page, setPage] = useState<MaisonPage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const auth = useCallback(
    (extra?: HeadersInit) => atelierAuthHeaders(wallet, signature, extra),
    [wallet, signature],
  );

  const loadList = useCallback(async () => {
    const res = await fetch('/api/maison/pages', { headers: auth() });
    const data = (await res.json()) as { ok?: boolean; pages?: MaisonIndexItem[] };
    if (res.ok && data.pages) setPages(data.pages);
  }, [auth]);

  const loadPage = useCallback(
    async (slug: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/maison/pages?slug=${encodeURIComponent(slug)}`, { headers: auth() });
        const data = (await res.json()) as { ok?: boolean; page?: MaisonPage };
        if (!res.ok || !data.page) {
          setNote('That room could not be opened.');
          return;
        }
        setPage(data.page);
        setSelected(data.page.blocks[0]?.id ?? null);
        setNote('');
      } finally {
        setBusy(false);
      }
    },
    [auth],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const save = async (next = page) => {
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch('/api/maison/pages', {
        method: 'PUT',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ address: wallet, signature, page: next }),
      });
      const data = (await res.json()) as { ok?: boolean; page?: MaisonPage; error?: string };
      if (!res.ok || !data.page) {
        setNote('The room could not be saved.');
        return;
      }
      setPage(data.page);
      setNote('Saved.');
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const slug = cleanSlug(`room-${Date.now().toString(36).slice(-5)}`) || `room-${Date.now().toString(36).slice(-5)}`;
    const next = emptyPage(slug, 'Untitled room');
    setPage(next);
    setSelected(next.blocks[0]?.id ?? null);
    await save(next);
  };

  const duplicate = async () => {
    if (!page) return;
    const slug = cleanSlug(`${page.slug}-copy`) || `room-${Date.now().toString(36).slice(-5)}`;
    const next: MaisonPage = {
      ...page,
      slug,
      title: `${page.title} (template)`,
      status: 'draft',
      guestKey: newGuestKey(),
      updatedAt: new Date().toISOString(),
      blocks: page.blocks.map((b) => ({ ...b, id: createBlock(b.kind).id, data: { ...b.data } })),
    };
    setPage(next);
    await save(next);
  };

  const remove = async () => {
    if (!page) return;
    setBusy(true);
    try {
      await fetch(`/api/maison/pages?slug=${encodeURIComponent(page.slug)}`, {
        method: 'DELETE',
        headers: auth(),
      });
      setPage(null);
      setSelected(null);
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const patchPage = (partial: Partial<MaisonPage>) => {
    setPage((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const patchBlock = (id: string, data: Record<string, unknown>) => {
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b)),
      };
    });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setPage((prev) => {
      if (!prev) return prev;
      const i = prev.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.blocks.length) return prev;
      const blocks = [...prev.blocks];
      const [item] = blocks.splice(i, 1);
      blocks.splice(j, 0, item);
      return { ...prev, blocks };
    });
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const current = page?.blocks.find((b) => b.id === selected) ?? null;
  const def = current ? maisonKind(current.kind) : null;

  return (
    <div className="ex-maison-desk">
      <p className="ex-desk-lead">
        Compose a private room from blocks. The registry is how the house grows — add a kind once,
        and the desk, the stage, and the skill all see it. Links stay private for now.
      </p>
      <p className="ex-maison-looking-url">
        Looking Room for this garden:{' '}
        <button type="button" className="ex-maison-linkbtn" onClick={() => void copyText(lookingUrl(wallet), 'looking')}>
          {copied === 'looking' ? 'Copied' : lookingUrl(wallet)}
        </button>
      </p>

      <div className="ex-maison-toolbar">
        <button type="button" className="ex-atelier-btn" onClick={() => void create()}>
          New room
        </button>
        <button type="button" className="ex-atelier-btn is-save" disabled={!page || busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ex-atelier-btn" disabled={!page} onClick={() => void duplicate()}>
          Duplicate as template
        </button>
        {page ? (
          <button
            type="button"
            className="ex-atelier-btn"
            onClick={() => void copyText(privateUrl(page), 'link')}
          >
            {copied === 'link' ? 'Copied' : 'Copy private link'}
          </button>
        ) : null}
        {page ? (
          <button type="button" className="ex-atelier-btn" onClick={() => void remove()}>
            Delete
          </button>
        ) : null}
      </div>
      {note ? <p className="ex-atelier-note">{note}</p> : null}

      <div className="ex-maison-layout">
        <aside className="ex-maison-rail">
          <p className="ex-maison-rail-kicker">Rooms</p>
          <ul className="ex-maison-pages">
            {pages.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  className={page?.slug === item.slug ? 'is-on' : ''}
                  onClick={() => void loadPage(item.slug)}
                >
                  <strong>{item.title}</strong>
                  <span>
                    {item.status} · {item.slug}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!pages.length ? <p className="ex-atelier-meta">No rooms yet.</p> : null}
        </aside>

        <div className="ex-maison-editor">
          {page ? (
            <>
              <div className="ex-maison-meta">
                <label>
                  Title
                  <input value={page.title} onChange={(e) => patchPage({ title: e.target.value })} />
                </label>
                <label>
                  Kicker
                  <input value={page.kicker} onChange={(e) => patchPage({ kicker: e.target.value })} />
                </label>
                <label>
                  Slug
                  <input
                    value={page.slug}
                    spellCheck={false}
                    onChange={(e) => patchPage({ slug: e.target.value.toLowerCase() })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={page.status}
                    onChange={(e) => patchPage({ status: e.target.value as MaisonStatus })}
                  >
                    <option value="draft">Draft</option>
                    <option value="private">Private</option>
                    <option value="published">Published (still noindex)</option>
                  </select>
                </label>
              </div>

              <div className="ex-maison-palette" role="toolbar" aria-label="Block palette">
                {MAISON_REGISTRY.map((kind) => (
                  <button
                    key={kind.kind}
                    type="button"
                    title={kind.blurb}
                    onClick={() => {
                      const block = createBlock(kind.kind);
                      setPage((prev) => (prev ? { ...prev, blocks: [...prev.blocks, block] } : prev));
                      setSelected(block.id);
                    }}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>

              <ol className="ex-maison-blocks">
                {page.blocks.map((block, i) => (
                  <li key={block.id}>
                    <button
                      type="button"
                      className={`ex-maison-block${selected === block.id ? ' is-on' : ''}`}
                      onClick={() => setSelected(block.id)}
                    >
                      <span>{maisonKind(block.kind)?.label || block.kind}</span>
                      <em>{previewBlock(block)}</em>
                    </button>
                    <span className="ex-maison-block-tools">
                      <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={i === 0} aria-label="Move up">
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 1)}
                        disabled={i === page.blocks.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPage((prev) =>
                            prev ? { ...prev, blocks: prev.blocks.filter((b) => b.id !== block.id) } : prev,
                          );
                          if (selected === block.id) setSelected(null);
                        }}
                        aria-label="Remove block"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ol>

              {current && def ? (
                <div className="ex-maison-inspect">
                  <p className="ex-maison-rail-kicker">{def.label}</p>
                  <p className="ex-atelier-meta">{def.blurb}</p>
                  {def.fields.map((field) => (
                    <Field
                      key={field.key}
                      field={field}
                      value={current.data[field.key]}
                      catalog={catalog}
                      onChange={(value) => patchBlock(current.id, { [field.key]: value })}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="ex-atelier-meta">Choose a room, or begin a new one.</p>
          )}
        </div>

        <div className="ex-maison-preview">
          <p className="ex-maison-rail-kicker">Preview</p>
          {page ? <MaisonStage page={page} works={catalog} /> : <div className="ex-maison-preview-empty" />}
        </div>
      </div>
    </div>
  );
}

function previewBlock(block: MaisonBlock) {
  const d = block.data;
  if (block.kind === 'lead') return String(d.title || d.line || '');
  if (block.kind === 'copy') return String(d.body || '').slice(0, 48);
  if (block.kind === 'quote') return String(d.text || '').slice(0, 48);
  if (block.kind === 'work') return String(d.workId || '');
  if (block.kind === 'hang' || block.kind === 'strip') {
    const ids = Array.isArray(d.workIds) ? d.workIds : [];
    return `${ids.length} work${ids.length === 1 ? '' : 's'}`;
  }
  if (block.kind === 'looking') return String(d.label || '');
  return '';
}

function Field({
  field,
  value,
  catalog,
  onChange,
}: {
  field: { key: string; label: string; kind: string; max?: number; hint?: string };
  value: unknown;
  catalog: ReturnType<typeof exploreCatalogue>;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === 'textarea') {
    return (
      <label className="ex-maison-field">
        {field.label}
        <textarea value={String(value || '')} maxLength={field.max} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  if (field.kind === 'work') {
    return (
      <label className="ex-maison-field">
        {field.label}
        <select value={String(value || '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose a work</option>
          {catalog.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.kind === 'works') {
    const ids = Array.isArray(value) ? value.map(String) : [];
    const max = field.max ?? 3;
    return (
      <div className="ex-maison-field">
        <span>{field.label}</span>
        {field.hint ? <em>{field.hint}</em> : null}
        {ids.map((id, i) => (
          <div key={`${id}-${i}`} className="ex-maison-workpick">
            <select
              value={id}
              onChange={(e) => {
                const next = [...ids];
                next[i] = e.target.value;
                onChange(next.filter(Boolean));
              }}
            >
              {catalog.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => onChange(ids.filter((_, j) => j !== i))} aria-label="Remove work">
              ✕
            </button>
            {(() => {
              const work = catalog.find((w) => w.id === id);
              const src = work ? catalogueThumbUrl(lookingStillUrl(work), 72) : '';
              return src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" />
              ) : null;
            })()}
          </div>
        ))}
        {ids.length < max ? (
          <button
            type="button"
            className="ex-atelier-btn"
            onClick={() => onChange([...ids, catalog[0]?.id].filter(Boolean))}
          >
            Add work
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <label className="ex-maison-field">
      {field.label}
      <input value={String(value || '')} maxLength={field.max} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
