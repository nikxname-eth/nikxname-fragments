import type { ExploreWork } from '../config/catalog';
import { getVoidSectionLabel, type VoidSubgroup } from '../lib/chainWorks';
import { catalogueThumbUrl, stillMasterUrl } from '../lib/mediaUrl';
import { getFeatureCacheUrl } from '../lib/previews';
import { WorkCard } from './WorkCard';

type Props = {
  works: ExploreWork[];
  activeId?: string;
  onSelect: (work: ExploreWork) => void;
};

function titleKey(w: ExploreWork) {
  return w.title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function splitArtworks(works: ExploreWork[]) {
  const intoVoid = works.find((w) => titleKey(w) === 'into the void') ?? works[0] ?? null;
  const abyss = works.find((w) => titleKey(w) === 'into the abyss') ?? null;
  const middle = works.filter((w) => w.id !== intoVoid?.id && w.id !== abyss?.id);
  return { intoVoid, middle, abyss };
}

function heroSrc(work: ExploreWork) {
  const cached =
    work.seriesId && work.id ? getFeatureCacheUrl(work.seriesId, work.id) : null;
  const base = cached || work.coverUrl || stillMasterUrl(work) || work.originCoverUrl || '';
  return catalogueThumbUrl(base, 1000) || base;
}

function heroFallback(work: ExploreWork) {
  return work.coverUrl || work.originCoverUrl || stillMasterUrl(work) || '';
}

function VoidBanner({
  work,
  onSelect,
}: {
  work: ExploreWork;
  onSelect: (w: ExploreWork) => void;
}) {
  return (
    <div className="ex-void-hero">
      <h4 className="ex-void-hero-title">{work.title}</h4>
      <button
        type="button"
        className="ex-void-hero-frame"
        onClick={() => onSelect(work)}
        aria-label={`Open ${work.title} in Theatre`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc(work)}
          alt=""
          decoding="async"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            const next = heroFallback(work);
            if (next && img.src !== next) img.src = next;
            else img.onerror = null;
          }}
        />
      </button>
    </div>
  );
}

export function VoidCollection({ works, activeId, onSelect }: Props) {
  const groups: VoidSubgroup[] = ['artwork', 'flutter-editions', 'guardians'];
  return (
    <>
      {groups.map((group) => {
        const sectionWorks = works.filter((w) => (w.voidSubgroup ?? 'artwork') === group);
        if (!sectionWorks.length) return null;
        const art = group === 'artwork' ? splitArtworks(sectionWorks) : null;
        return (
          <section key={group} className="ex-section" aria-label={getVoidSectionLabel(group)}>
            <div className="ex-section-head">
              <h3 className="ex-section-title">{getVoidSectionLabel(group)}</h3>
              <span className="ex-section-count">{sectionWorks.length}</span>
            </div>
            {art?.intoVoid ? (
              <VoidBanner work={art.intoVoid} onSelect={onSelect} />
            ) : null}
            {group === 'flutter-editions' && sectionWorks[0] ? (
              <div className="ex-void-feature">
                <button
                  type="button"
                  className={`ex-afb-eye${activeId === sectionWorks[0].id ? ' is-active' : ''}`}
                  onClick={() => onSelect(sectionWorks[0])}
                  aria-label={`Open ${sectionWorks[0].title} in Theatre`}
                >
                  <span className="ex-afb-eye-mat">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroSrc(sectionWorks[0])}
                      alt=""
                      decoding="async"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        const next = heroFallback(sectionWorks[0]);
                        if (next && img.src !== next) img.src = next;
                        else img.onerror = null;
                      }}
                    />
                  </span>
                </button>
              </div>
            ) : null}
            {group !== 'flutter-editions' || sectionWorks.length > 1 ? (
              <div className="ex-grid ex-grid--void3">
                {(art ? art.middle : group === 'flutter-editions' ? sectionWorks.slice(1) : sectionWorks).map(
                  (work, i) => (
                    <WorkCard
                      key={work.id}
                      work={work}
                      index={i}
                      isActive={activeId === work.id}
                      onSelect={onSelect}
                    />
                  ),
                )}
              </div>
            ) : null}
            {art?.abyss ? (
              <VoidBanner work={art.abyss} onSelect={onSelect} />
            ) : null}
          </section>
        );
      })}
    </>
  );
}
