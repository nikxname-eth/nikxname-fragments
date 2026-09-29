import { useEffect, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FinaleExperience } from '../components/FinaleExperience';
import { SiteNav } from '../components/SiteNav';

/**
 * Culmination experience — served at /fragment and fragment.nikxart.xyz
 * Header matches Fragment mint site nav (limited: mark · theme · sound · wallet).
 */
export default function FragmentFinalePage() {
  const [dark, setDark] = useState(true);

  // Allow full-page vertical scroll for tall claim layout
  useEffect(() => {
    document.documentElement.classList.add('finale-page');
    document.body.classList.add('finale-page');
    return () => {
      document.documentElement.classList.remove('finale-page');
      document.body.classList.remove('finale-page');
    };
  }, []);

  return (
    <>
      <Head>
        <title>Finale · Nikxname</title>
        <meta
          name="description"
          content="Finale claim experience for collectors who hold all 27 Fragments of A Familiar Burn."
        />
        <meta name="robots" content="noindex" />
      </Head>
      <div className={`finale-shell${dark ? '' : ' theme-light'}`}>
        <div className="glow glow-r" />
        <div className="glow glow-b" />
        <SiteNav
          dark={dark}
          onToggleTheme={() => setDark((v) => !v)}
          aboutOpen={false}
          theatreOpen={false}
          collectionOpen={false}
          onToggleAbout={() => {}}
          onToggleTheatre={() => {}}
          onToggleCollection={() => {}}
          limited
        />
        <motion.main
          className="finale-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <FinaleExperience />
        </motion.main>
      </div>
    </>
  );
}
