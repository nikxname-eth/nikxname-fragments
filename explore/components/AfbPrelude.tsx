import type { ExploreWork } from '../config/catalog';
import { WOULD_IT_PANEL_A, WOULD_IT_PANEL_B, WOULD_UNREVEALED } from '../config/would-it';

const PUZZLING_EYE_GIF =
  'https://assets.nikxart.xyz/explore/media/a-familiar-burn/puzzling-eye.gif';

type EyeProps = {
  work: ExploreWork;
  isActive?: boolean;
  onOpen: (work: ExploreWork) => void;
};

export function AfbPuzzlingEye({ work, isActive, onOpen }: EyeProps) {
  const gif =
    (work.originCoverUrl && /\.gif(\?|$)/i.test(work.originCoverUrl) && work.originCoverUrl) ||
    (work.coverUrl && /\.gif(\?|$)/i.test(work.coverUrl) && work.coverUrl) ||
    PUZZLING_EYE_GIF;

  return (
    <section className="ex-afb-prelude" aria-label="Puzzling Eye">
      <div className="ex-section-head">
        <h2 className="ex-section-title">Puzzling Eye</h2>
      </div>
      <button
        type="button"
        className={`ex-afb-eye${isActive ? ' is-active' : ''}`}
        onClick={() => onOpen(work)}
        aria-label="Open Puzzling Eye in Theatre — full view"
      >
        <span className="ex-afb-eye-mat">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gif} alt="" loading="lazy" decoding="async" />
        </span>
      </button>
      <p className="ex-afb-hint">Click for the full view</p>
    </section>
  );
}

export function AfbWillIt() {
  return (
    <section className="ex-afb-will" aria-label="Will It">
      <div className="ex-section-head">
        <h2 className="ex-section-title">Will It..</h2>
      </div>
      <p className="ex-afb-will-sub">A triptych: three canvases, one painting.</p>
      <div className="ex-afb-will-row" aria-hidden="true">
        <span className="ex-afb-will-cell">
          <img src={WOULD_IT_PANEL_A} alt="" loading="lazy" decoding="async" />
          <em>01</em>
        </span>
        <span className="ex-afb-will-cell">
          <img src={WOULD_IT_PANEL_B} alt="" loading="lazy" decoding="async" />
          <em>02</em>
        </span>
        <span className="ex-afb-will-cell">
          <img src={WOULD_UNREVEALED} alt="" loading="lazy" decoding="async" />
          <em>03</em>
        </span>
      </div>
      <hr className="ex-afb-rule" />
      <a className="ex-read-more ex-afb-live" href="https://explore.nikxart.xyz/will-it">
        <span className="ex-nav-live-dot" aria-hidden="true" />
        View Live
      </a>
    </section>
  );
}
