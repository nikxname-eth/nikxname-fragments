import { ON_THE_BLOCK_URL, SECONDARY_MARKET_URL } from '../config/house';

type Props = {
  themeClass: string;
  gwei: number | null;
};

export function SiteFooter({ themeClass, gwei }: Props) {
  return (
    <footer className={`footer${themeClass}`}>
      <span className="footer-copy">© 2026 Nikxname</span>
      <div className="footer-right">
        <a className="nav-live is-live" href={ON_THE_BLOCK_URL} aria-label="Live · Voices Of Time">
          <span className="nav-live-dot" aria-hidden="true" />
          Live
        </a>
        <a
          href={SECONDARY_MARKET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Secondary Market
        </a>
        <a
          href="https://manifold.xyz/@nikxnames-art"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Manifold
        </a>
        {gwei !== null ? (
          <a
            href="https://etherscan.io/gastracker"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-gwei"
            title={`Gas: ${gwei} gwei`}
          >
            <span className={`footer-gwei-dot ${gwei < 15 ? 'low' : gwei < 40 ? 'mid' : 'high'}`} />
            <span className="footer-gwei-text">{gwei} gwei</span>
          </a>
        ) : (
          <a
            href="https://etherscan.io/gastracker"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Ethereum
          </a>
        )}
      </div>
    </footer>
  );
}