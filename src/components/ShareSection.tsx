import { ChevronIcon } from './ChevronIcon';

type SharePiece = {
  number: number;
  label: string;
  downloadUrl: string;
  downloadName: string;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  pieces: SharePiece[];
};

export function ShareSection({ open, onToggle, pieces }: Props) {
  return (
    <div className="section-pad">
      <button type="button" className="share-trigger" onClick={onToggle} aria-expanded={open}>
        <div className="share-trigger-line" />
        <div className="share-trigger-inner">
          <span>Share the work</span>
          <ChevronIcon open={open} className={`share-chevron${open ? ' open' : ''}`} />
        </div>
        <div className="share-trigger-line" />
      </button>
      <div className={`share-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="share-drawer-inner">
          <p className="share-intro">
            Download optimised files for sharing on Instagram, X, or sending to a friend.
          </p>
          {pieces.length === 0 ? (
            <p className="share-empty">Assets will appear here as pieces are released.</p>
          ) : (
            <div className="share-tags">
              {pieces.map((piece) => (
                <a
                  key={piece.number}
                  href={piece.downloadUrl}
                  download={piece.downloadName}
                  className="share-tag"
                >
                  <span>{piece.label}</span>
                  <span className="share-tag-hint">click here</span>
                  <svg
                    className="share-tag-icon"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3v12M12 15l4-4M12 15L8 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}