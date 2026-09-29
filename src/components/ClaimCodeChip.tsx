import { useState } from 'react';

type Props = {
  code: string;
  holder?: string;
  className?: string;
};

/** Display claim code with optional copy (no autofill). */
export function ClaimCodeChip({ code, holder, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`claim-code-chip ${className}`.trim()}>
      {holder ? <span className="claim-code-chip-holder">{holder}</span> : null}
      <code className="claim-code-chip-code" title={code}>
        {code}
      </code>
      <button
        type="button"
        className="claim-code-chip-copy"
        onClick={() => void onCopy()}
        aria-label={`Copy claim code ${code}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
