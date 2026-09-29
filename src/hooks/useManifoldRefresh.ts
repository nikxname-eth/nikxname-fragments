import { useEffect } from 'react';

import { refreshManifoldWidgets } from '../lib/manifoldConnect';

/**
 * Tell Manifold widgets to re-scan the DOM after React renders claim elements.
 * Pass `'single'` as a dep flag for finale slots — one delayed refresh only
 * (repeated refreshes re-hydrate and spawn twin Claim buttons).
 */
export function useManifoldRefresh(...deps: unknown[]) {
  const single = deps.includes('single');

  useEffect(() => {
    if (single) {
      const t = window.setTimeout(refreshManifoldWidgets, 80);
      return () => window.clearTimeout(t);
    }
    refreshManifoldWidgets();
    const t1 = window.setTimeout(refreshManifoldWidgets, 300);
    const t2 = window.setTimeout(refreshManifoldWidgets, 1_200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}