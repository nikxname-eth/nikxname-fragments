import type { ExploreWork } from '../config/catalog';
import { WorkCard } from './WorkCard';

type Props = {
  works: ExploreWork[];
  activeId?: string;
  onSelect: (work: ExploreWork) => void;
};

export function AfbEmbers({ works, activeId, onSelect }: Props) {
  if (!works.length) return null;
  return (
    <section className="ex-afb-embers" aria-label="Flutter Into The Embers">
      <header className="ex-afb-embers-head">
        <h2 className="ex-afb-embers-title">Flutter Into The Embers</h2>
        <span className="ex-afb-embers-count">{works.length}</span>
      </header>
      <hr className="ex-afb-embers-rule" />
      <p className="ex-afb-embers-kicker">21 unique butterflies</p>
      <div className="ex-grid ex-grid--embers">
        {works.map((work, i) => (
          <WorkCard
            key={work.id}
            work={work}
            index={i}
            compact
            isActive={activeId === work.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
