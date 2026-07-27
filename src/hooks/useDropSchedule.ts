import { DROP_SCHEDULE, getDropState } from '../config/artist';
import { useSiteClock } from './useSiteClock';

/**
 * Anchor to the outgoing live piece so the next fragment (mint + Theatre canvas)
 * does not appear before its window opens. Bump to the current live piece number
 * when evolving for the next drop — not the incoming piece.
 */
const HYDRATION_NOW = Date.parse(
  DROP_SCHEDULE.find((entry) => entry.piece === 20)?.startsUTC ??
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