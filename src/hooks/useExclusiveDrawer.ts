import { useCallback, useEffect, useState } from 'react';

export type DrawerId = 'about' | 'theatre' | 'collection' | 'projectAbout' | 'share';

const OUTSIDE_SELECTOR =
  '.nav-about,.about-drawer,.nav-theatre,.theatre-drawer,.theatre-stage,.nav-collection,.collection-drawer,.project-about-trigger,.project-about-drawer,.share-trigger,.share-drawer,.share-modal,.share-modal-panel';

export function useExclusiveDrawer() {
  const [active, setActive] = useState<DrawerId | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  const closeAll = useCallback(() => setActive(null), []);

  const toggle = useCallback((drawer: DrawerId) => {
    setActive((prev) => (prev === drawer ? null : drawer));
  }, []);

  useEffect(() => {
    if (!active) return;

    const onPointerDown = (event: PointerEvent) => {
      if (active === 'share') return;
      const target = event.target as Element;
      if (target.closest(OUTSIDE_SELECTOR)) return;
      closeAll();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [active, closeAll]);

  return {
    aboutOpen: active === 'about',
    theatreOpen: active === 'theatre',
    collectionOpen: active === 'collection',
    projectAboutOpen: active === 'projectAbout',
    shareOpen: active === 'share',
    toggleAbout: () => toggle('about'),
    toggleTheatre: () => toggle('theatre'),
    toggleCollection: () => toggle('collection'),
    toggleProjectAbout: () => toggle('projectAbout'),
    toggleShare: () => toggle('share'),
    closeAll,
    bioExpanded,
    setBioExpanded,
  };
}