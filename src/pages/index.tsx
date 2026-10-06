import { useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  EXPLORE_ORIGIN,
  GARDEN_URL,
  HOUSE_ROOMS,
  SECONDARY_MARKET_URL,
  ON_THE_BLOCK_URL,
  houseImage,
} from '../config/house';

const fadeUp = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
};

function destinationForHost(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (host === 'fragment.nikxart.xyz' || host.startsWith('fragment.')) {
    return '/fragment';
  }
  return null;
}

export default function Home() {
  useEffect(() => {
    const dest = destinationForHost(window.location.hostname);
    if (dest) window.location.replace(dest);
  }, []);

  return (
    <>
      <Head>
        <title>La Maison · Nikxname</title>
        <meta
          name="description"
          content="La Maison — a living house of digital paintings. Walk the rooms. Collectors enter the Garden."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://nikxart.xyz/" />
      </Head>

      <div className="house">
        <nav className="nav house-nav" aria-label="La Maison">
          <div className="nav-left">
            <a className="nav-mark" href="/">
              Nikxname
            </a>
            <div className="nav-links">
              <a className="house-nav-explore" href={EXPLORE_ORIGIN}>
                Explore
              </a>
            </div>
          </div>
          <div className="nav-right">
            <a className="nav-live is-live" href={ON_THE_BLOCK_URL} aria-label="Auction · Voices Of Time">
              <span className="nav-live-dot" aria-hidden="true" />
              Auction
            </a>
            <a className="house-nav-garden" href={GARDEN_URL}>
              Garden
            </a>
          </div>
        </nav>

        <motion.section
          className="house-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="house-kicker">Welcome</p>
          <h1 className="house-title">La Maison</h1>
          <p className="house-lead">
            A quiet entrance. The rooms hold the work. If you collect, the Garden and Atelier wait
            beyond.
          </p>
        </motion.section>

        <main className="house-rooms" aria-label="The Rooms">
          {HOUSE_ROOMS.map((room, i) => (
            <motion.article key={room.id} className="house-panel" {...fadeUp}>
              <a className="house-panel-frame" href={room.href} aria-label={`Discover ${room.label}`}>
                <img
                  src={houseImage(room.image, i === 0 ? 2200 : 1800)}
                  alt={room.imageAlt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  style={room.objectPosition ? { objectPosition: room.objectPosition } : undefined}
                />
                <span className="house-panel-veil" aria-hidden="true" />
                <span className="house-panel-copy">
                  <span className="house-panel-tagline">{room.tagline}</span>
                  <span className="house-panel-title">{room.label}</span>
                  <span className="house-discover">Discover</span>
                </span>
              </a>
            </motion.article>
          ))}
        </main>

        <motion.section className="house-close" {...fadeUp}>
          <p className="house-kicker">Patrons</p>
          <h2 className="house-close-title">
            The{' '}
            <span className="house-garden-word">
              Gard
              <span className="house-garden-en">
                en
                <span className="house-garden-fly" aria-hidden="true">
                  <img src="/garden/butterfly-dark.png" alt="" draggable={false} />
                </span>
              </span>
            </span>
          </h2>
          <p className="house-lead">
            Hold a work, and a garden opens — beds of what you keep, and an Atelier to hang them.
          </p>
          <a className="house-discover" href={GARDEN_URL}>
            Enter the Garden
          </a>
        </motion.section>

        <footer className="house-footer">
          <span>© {new Date().getFullYear()} Nikxname</span>
          <div className="house-footer-right">
            <a className="nav-live is-live" href={ON_THE_BLOCK_URL} aria-label="Auction · Voices Of Time">
              <span className="nav-live-dot" aria-hidden="true" />
              Auction
            </a>
            <a href={SECONDARY_MARKET_URL} target="_blank" rel="noopener noreferrer">
              Secondary Market
            </a>
            <a href={EXPLORE_ORIGIN}>Explore</a>
          </div>
        </footer>
      </div>
    </>
  );
}
