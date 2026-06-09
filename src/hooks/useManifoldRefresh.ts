import { useEffect } from 'react';

/** Tell Manifold widgets to re-scan the DOM after React renders claim elements. */
export function useManifoldRefresh(...deps: unknown[]) {
  useEffect(() => {
    const refresh = () => window.dispatchEvent(new Event('m-refresh-widgets'));
    const id = window.setTimeout(refresh, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}