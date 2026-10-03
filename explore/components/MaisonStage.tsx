import { useMemo, useState } from 'react';
import type { ExploreWork } from '../config/catalog';
import { exploreCatalogue } from '../lib/gardenWorks';
import { lookingStillUrl } from '../lib/lookingStill';
import { catalogueThumbUrl, observeStillUrl } from '../lib/mediaUrl';
import type { MaisonBlock, MaisonPage } from '../lib/maison/types';
import { CanvasLook } from './CanvasLook';

type Props = {
  page: MaisonPage;
  works?: ExploreWork[];
};

function workById(works: ExploreWork[], id: string) {
  return works.find((w) => w.id === id) ?? null;
}

function Still({
  work,
  onOpen,
  className,
}: {
  work: ExploreWork;
  onOpen?: (work: ExploreWork) => void;
  className?: string;
}) {
  const src = catalogueThumbUrl(lookingStillUrl(work), 900);
  return (
    <button type="button" className={className || 'ex-maison-still'} onClick={() => onOpen?.(work)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={work.title} draggable={false} />
      ) : (
        <span className="ex-maison-still-ph" />
      )}
      <span>{work.title}</span>
    </button>
  );
}

function BlockView({
  block,
  works,
  onOpen,
}: {
  block: MaisonBlock;
  works: ExploreWork[];
  onOpen: (work: ExploreWork) => void;
}) {
  const d = block.data;
  if (block.kind === 'lead') {
    return (
      <header className="ex-maison-lead">
        {d.kicker ? <p className="ex-maison-kicker">{String(d.kicker)}</p> : null}
        {d.title ? <h1 className="ex-maison-title">{String(d.title)}</h1> : null}
        {d.line ? <p className="ex-maison-line">{String(d.line)}</p> : null}
      </header>
    );
  }
  if (block.kind === 'copy') {
    return <p className="ex-maison-copy">{String(d.body || '')}</p>;
  }
  if (block.kind === 'quote') {
    return (
      <blockquote className="ex-maison-quote">
        <p>{String(d.text || '')}</p>
        {d.cite ? <cite>{String(d.cite)}</cite> : null}
      </blockquote>
    );
  }
  if (block.kind === 'work') {
    const work = workById(works, String(d.workId || ''));
    if (!work) return <p className="ex-maison-missing">A work is waiting to be chosen.</p>;
    return <Still work={work} onOpen={onOpen} className="ex-maison-work" />;
  }
  if (block.kind === 'hang' || block.kind === 'strip') {
    const ids = Array.isArray(d.workIds) ? d.workIds.map(String) : [];
    const row = ids.map((id) => workById(works, id)).filter((w): w is ExploreWork => Boolean(w));
    if (!row.length) return <p className="ex-maison-missing">Works will sit here once chosen.</p>;
    return (
      <div className={block.kind === 'hang' ? 'ex-maison-hang' : 'ex-maison-strip'}>
        {row.map((work) => (
          <Still key={work.id} work={work} onOpen={onOpen} />
        ))}
      </div>
    );
  }
  if (block.kind === 'looking') {
    const wallet = String(d.wallet || '');
    const href = wallet ? `/looking/${wallet}` : '/looking';
    return (
      <a className="ex-maison-looking" href={href}>
        {String(d.label || 'Open the Looking Room')}
      </a>
    );
  }
  return <hr className="ex-maison-divider" />;
}

export function MaisonStage({ page, works }: Props) {
  const catalog = useMemo(() => works || exploreCatalogue(), [works]);
  const [opened, setOpened] = useState<ExploreWork | null>(null);

  return (
    <article className="ex-maison-stage">
      {page.kicker && !page.blocks.some((b) => b.kind === 'lead') ? (
        <p className="ex-maison-kicker">{page.kicker}</p>
      ) : null}
      {page.blocks.map((block) => (
        <BlockView key={block.id} block={block} works={catalog} onOpen={setOpened} />
      ))}
      {opened ? (
        <CanvasLook
          src={observeStillUrl(opened) || lookingStillUrl(opened)}
          alt={opened.title}
          title={opened.title}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </article>
  );
}
