import { DROP_SCHEDULE, getDropState } from '../config/artist';
import { useSiteClock } from './useSiteClock';

/** Stable anchor for SSR + first paint — tracks the active drop era, not launch. */
const HYDRATION_NOW = Date.parse(
  DROP_SCHEDULE.find((entry) => entry.piece === 9)?.startsUTC ??
    DROP_SCHEDULE[DROP_SCHEDULE.length - 1]?.startsUTC ??
    DROP_SCHEDULE[0].startsUTC,
);

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