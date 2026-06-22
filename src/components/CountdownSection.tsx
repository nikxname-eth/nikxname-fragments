import { motion } from 'framer-motion';
import {
  DROP_SCHEDULE,
  formatDropArrivalNote,
  getDropWindowNote,
  PIECE_NAMES,
  type DropScheduleEntry,
} from '../config/artist';

type CountdownUnits = { d: number; h: number; m: number; s: number };

type Props = {
  dropsStarted: boolean;
  countdownPhase: {
    piece: number;
    activeDrop: DropScheduleEntry;
  } | null;
  units: CountdownUnits;
};

function CountdownRow({ units }: { units: CountdownUnits }) {
  const rows = [
    { label: 'Days', val: units.d },
    { label: 'Hours', val: units.h },
    { label: 'Minutes', val: units.m },
    { label: 'Seconds', val: units.s },
  ];

  return (
    <div className="cd-row">
      {rows.map(({ label, val }, index) => (
        <div key={label} style={{ display: 'contents' }}>
          {index > 0 && <span className="cd-sep">·</span>}
          <div className="cd-unit">
            <span className="cd-num">{String(val).padStart(2, '0')}</span>
            <span className="cd-unit-lbl">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CountdownSection({
  dropsStarted,
  countdownPhase,
  units,
}: Props) {
  return (
    <motion.section
      className="cd-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55, duration: 0.9 }}
    >
      {!dropsStarted ? (
        <>
          <p className="cd-lbl">The experience begins in</p>
          <CountdownRow units={units} />
          <p className="cd-note">{formatDropArrivalNote(DROP_SCHEDULE[0])}</p>
        </>
      ) : countdownPhase ? (
        <>
          <p className="cd-lbl">
            Fragment {String(countdownPhase.piece).padStart(2, '0')} closes in
          </p>
          <CountdownRow units={units} />
          <p className="cd-note">
            {PIECE_NAMES[countdownPhase.piece] ?? `Fragment ${countdownPhase.piece}`} ·{' '}
            {getDropWindowNote(countdownPhase.activeDrop)}
          </p>
        </>
      ) : (
        <p className="cd-note cd-note--complete">The collection is complete.</p>
      )}
    </motion.section>
  );
}