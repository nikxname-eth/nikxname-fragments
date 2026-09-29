import { ABOUT_COLLECTIONS, ABOUT_X_URL } from '../config/artist';

type Props = {
  open: boolean;
  bioExpanded: boolean;
  onToggleBio: () => void;
};

/** Official X (Twitter) mark — currentColor so it matches the name line. */
function XLogoIcon({ className = 'about-x-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function AboutDrawer({ open, bioExpanded, onToggleBio }: Props) {
  return (
    <div className={`about-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="about-drawer-inner">
        <div className="about-portrait">
          <img
            src="https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg"
            alt="Nikxname"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="about-text">
          <div className="about-heading">
            <p className="about-name">
              <span>Nikxname</span>
              <span className="about-name-sep" aria-hidden="true">
                |
              </span>
              <a
                href={ABOUT_X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="about-x-link"
                aria-label="Nikxname on X"
              >
                <XLogoIcon />
              </a>
            </p>
            <p className="about-tagline">Telling Human Stories</p>
          </div>
          <p className={`about-bio${bioExpanded ? ' expanded' : ''}`}>
            Nik is a visionary digital artist whose journey in creation spans decades,
            beginning in his youth with acrylic painting, sculpting, and intricate model
            building. These early explorations fostered a profound, multifaceted
            perspective — one that weaves emotional depth with documentary-like precision,
            capturing both the chaos of existence and the quiet beauty of fleeting moments.
            Today, he channels this into digital painting, leveraging blockchain technology
            to immortalise the present&apos;s ephemeral essence, turning virtual brushstrokes
            into timeless Life Impressions. At the heart of his ethos is a commitment to
            iterative growth and stillness amid turmoil — urging creators to &quot;create more
            than you consume.&quot; His art serves as a bridge between personal introspection
            and communal connection.
          </p>
          <button className="about-read-more" type="button" onClick={onToggleBio}>
            {bioExpanded ? 'Read less' : 'Read more'}
          </button>
          <div className="about-collections">
            {ABOUT_COLLECTIONS.map((collection) => (
              <a
                key={collection.label}
                href={collection.href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-collection-tag about-collection-tag--external"
              >
                {collection.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
