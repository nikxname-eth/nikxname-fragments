import { useState } from 'react';

const LIMIT = 150;

type Props = {
  text: string;
  className?: string;
};

export function SeriesCopy({ text, className }: Props) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();
  if (trimmed.length <= LIMIT) {
    return <p className={className}>{trimmed}</p>;
  }
  const clipped = trimmed.slice(0, LIMIT).replace(/\s+\S*$/, '').trimEnd();
  return (
    <div className="ex-series-copy">
      <p className={className}>{open ? trimmed : `${clipped}…`}</p>
      <button type="button" className="ex-series-more" onClick={() => setOpen((v) => !v)}>
        {open ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
}
