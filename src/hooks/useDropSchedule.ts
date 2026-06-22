import { DROP_SCHEDULE, getDropState } from '../config/artist';
import { useSiteClock } from './useSiteClock';

/** Stable anchor for SSR + first paint — avoids countdown hydration mismatch. */
const HYDRATION_NOW = Date.parse(DROP_SCHEDULE[5]?.startsUTC ?? DROP_SCHEDULE[0].startsUTC);

/** Live drop schedule driven by a single site clock tick. */
export function useDropSchedule() {
  const now = useSiteClock();
  const effectiveNow = now ?? HYDRATION_NOW;

  return {
    now: effectiveNow,
    clockReady: now !== null,
    ...getDropState(effectiveNow),
  };
}