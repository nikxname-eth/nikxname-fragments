import { motion, AnimatePresence } from 'framer-motion';
import { ManifoldConnect } from './ManifoldConnect';
import { WalletButton } from './WalletButton';

import { useWallet } from '../providers/WalletProvider';
import { ON_THE_BLOCK_URL } from '../config/house';

type Props = {
  dark: boolean;
  onToggleTheme: () => void;
  aboutOpen: boolean;
  theatreOpen: boolean;
  collectionOpen: boolean;
  onToggleAbout: () => void;
  onToggleTheatre: () => void;
  onToggleCollection: () => void;
  /** Post-F27 lockdown: hide About / Theatre / Collection */
  limited?: boolean;
};

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0110.5 5 7 7 0 1020 14.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteNav({
  dark,
  onToggleTheme,
  aboutOpen,
  theatreOpen,
  collectionOpen,
  onToggleAbout,
  onToggleTheatre,
  onToggleCollection,
  limited = false,
}: Props) {
  const { address, shortAddress } = useWallet();
  const themeClass = dark ? '' : ' theme-light';

  return (
    <>
      <nav className={`nav${limited ? ' nav--limited' : ''}`}>
        <div className="nav-left">
          {limited ? (
            <motion.a
              href="https://nikxart.xyz"
              className="nav-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
            >
              Nikxname
            </motion.a>
          ) : (
            <motion.span
              className="nav-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
            >
              Nikxname
            </motion.span>
          )}
          {!limited && (
            <div className="nav-links">
              <motion.button
                type="button"
                className="nav-about"
                onClick={onToggleAbout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                aria-expanded={aboutOpen}
              >
                About
                <svg
                  className={`nav-about-chevron${aboutOpen ? ' open' : ''}`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.button>
              <motion.button
                type="button"
                className="nav-theatre"
                onClick={onToggleTheatre}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.22, duration: 0.8 }}
                aria-expanded={theatreOpen}
              >
                Theatre
                <svg
                  className={`nav-theatre-chevron${theatreOpen ? ' open' : ''}`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.button>
              <AnimatePresence>
                {address && (
                  <motion.button
                    type="button"
                    className="nav-collection"
                    onClick={onToggleCollection}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.7 }}
                    aria-expanded={collectionOpen}
                  >
                    Collection
                    <svg
                      className={`nav-collection-chevron${collectionOpen ? ' open' : ''}`}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="nav-right">
          <a className="nav-live is-live" href={ON_THE_BLOCK_URL} aria-label="Auction · Voices Of Time">
            <span className="nav-live-dot" aria-hidden="true" />
            Auction
          </a>
          <motion.button
            type="button"
            className={`nav-utility-toggle nav-theme-toggle${themeClass}`}
            onClick={onToggleTheme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.8 }}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
            <span className="nav-utility-label">{dark ? 'Light' : 'Dark'}</span>
          </motion.button>

          <motion.div
            className="nav-connect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* Always mount Manifold so connect + disconnect controls stay available */}
            <ManifoldConnect visible={!address} variant="nav" />
            {address ? (
              <WalletButton address={address} shortAddress={shortAddress} />
            ) : null}
          </motion.div>
        </div>
      </nav>
    </>
  );
}