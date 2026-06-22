import { ABOUT_COLLECTIONS } from '../config/artist';

type Props = {
  open: boolean;
  bioExpanded: boolean;
  onToggleBio: () => void;
  onScrollToLivePiece: () => void;
};

export function AboutDrawer({ open, bioExpanded, onToggleBio, onScrollToLivePiece }: Props) {
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
            <p className="about-name">Nikxname</p>
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
            {ABOUT_COLLECTIONS.map((collection) =>
              'onSite' in collection ? (
                <button
                  key={collection.label}
                  type="button"
                  className="about-collection-tag"
                  onClick={onScrollToLivePiece}
                >
                  {collection.label}
                </button>
              ) : (
                <a
                  key={collection.label}
                  href={collection.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-collection-tag about-collection-tag--external"
                >
                  {collection.label}
                </a>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}