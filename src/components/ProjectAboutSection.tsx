import { PROJECT_X_ARTICLE } from '../config/artist';
import { ChevronIcon } from './ChevronIcon';

type Props = {
  open: boolean;
  onToggle: () => void;
};

export function ProjectAboutSection({ open, onToggle }: Props) {
  return (
    <div className="section-pad">
      <button
        type="button"
        className="project-about-trigger"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div className="section-rule" />
        <div className="project-about-inner">
          <span>About the project</span>
          <ChevronIcon open={open} />
        </div>
        <div className="section-rule" />
      </button>
      <div className={`project-about-drawer${open ? ' open' : ''}`}>
        <div className="project-about-content">
          <p className="project-about-title">A Familiar Burn</p>
          <div className="project-about-body">
            <p>
              A Familiar Burn is an on-chain art discovery experience — an experiment
              designed to reward presence.
            </p>
            <br />
            <p>
              It challenges the instant-reveal culture of Web3 by unfolding as a slow burn.
              Twenty-seven fragments are revealed one piece at a time, guided by a public
              countdown. As one window closes, the grid evolves for everyone — and a new
              window opens with the next piece.
            </p>
            <ul className="project-about-features">
              <li>27 fragments · one living puzzle</li>
              <li>Timed release windows · weekend &amp; 48-hour drops</li>
              <li>On-chain collection · mint directly on site</li>
              <li>Evolving banner · the grid grows with every piece you hold</li>
              <li>Complete the journey · claim all 27 for eligibility on the primary work</li>
            </ul>
            <br />
            <p>
              The journey itself — showing up, waiting, discovering — is the art. Every step
              contributes to the living collection.
            </p>
            <a
              href={PROJECT_X_ARTICLE}
              target="_blank"
              rel="noopener noreferrer"
              className="project-about-link"
            >
              Read more on X
            </a>
          </div>
          <p className="project-about-sig">Together It Blooms · A Familiar Burn</p>
        </div>
      </div>
    </div>
  );
}