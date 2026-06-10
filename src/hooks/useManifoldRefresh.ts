import { useEffect } from 'react';

import { refreshManifoldWidgets } from '../lib/manifoldConnect';

/** Tell Manifold widgets to re-scan the DOM after React renders claim elements. */
export function useManifoldRefresh(...deps: unknown[]) {
  useEffect(() => {
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