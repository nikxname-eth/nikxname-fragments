type Props = {
  themeClass: string;
  gwei: number | null;
};

export function SiteFooter({ themeClass, gwei }: Props) {
  return (
    <footer className={`footer${themeClass}`}>
      <span className="footer-copy">© 2026 Nikxname</span>
      <div className="footer-right">
        <a
          href="https://www.raster.art/artwork/a-familiar-burn-by-nikxname"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Raster
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