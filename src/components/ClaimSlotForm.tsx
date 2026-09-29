import { useEffect, useState } from 'react';
import { ManifoldBuyButton } from './ManifoldBuyButton';

type Props = {
  /** Still: 4039463152 · Animated: 4039465200 */
  instanceId: string;
  pieceNumber: number;
  sessionKey: string;
  knownCodes?: string[];
  /** Used + pending + permanent — blocked from re-entry */
  usedCodes?: string[];
  /** Remaining claim rights for this wallet (caps Manifold qty). */
  maxQuantity?: number;
  /** True while a code is reserved awaiting wallet success */
  mintInFlight?: boolean;
  onClaimStarted?: (code: string) => void;
  resetToken?: number;
};

/**
 * On-site gate only (Manifold no longer requires redemption codes):
 * 1) Enter claim code → OK (must match roster, one use)
 * 2) Claim now · Free → immediate code reserve → wallet mint
 *    Qty always starts at 1; max = wallet remaining allotment.
 */
export function ClaimSlotForm({
  instanceId,
  pieceNumber,
  sessionKey,
  knownCodes = [],
  usedCodes = [],
  maxQuantity = 1,
  mintInFlight = false,
  onClaimStarted,
  resetToken = 0,
}: Props) {
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'enter' | 'ready'>('enter');
  const [error, setError] = useState('');
  const maxQty = Math.max(1, Math.floor(maxQuantity) || 1);

  useEffect(() => {
    setCode('');
    setStep('enter');
    setError('');
  }, [resetToken, instanceId]);

  const onOk = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter your claim code to continue.');
      return;
    }
    if (usedCodes.some((c) => c.toUpperCase() === trimmed)) {
      setError('This code is already used or reserved. Enter another code.');
      return;
    }
    if (knownCodes.length > 0 && !knownCodes.some((c) => c.toUpperCase() === trimmed)) {
      setError('That code is not on your list. Check your claim codes under the options.');
      return;
    }
    setCode(trimmed);
    setError('');
    setStep('ready');
  };

  return (
    <div className="finale-claim-slot finale-claim-slot--simple">
      <div className="finale-code-entry">
        <label className="finale-code-entry-label" htmlFor={`claim-code-${sessionKey}`}>
          Enter claim code
        </label>
        <p className="finale-code-entry-hint">
          {maxQty <= 1
            ? 'One mint · code locks on Claim now · one use after success'
            : `Up to ${maxQty} for this wallet · starts at 1 · code locks on Claim now`}
        </p>
        <div className="finale-code-entry-row">
          <input
            id={`claim-code-${sessionKey}`}
            className="finale-code-entry-input"
            type="text"
            name="nikx-claim-code"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
            placeholder="Type your claim code"
            value={code}
            disabled={step === 'ready' || mintInFlight}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onOk();
              }
            }}
          />
          {step === 'enter' ? (
            <button
              type="button"
              className="finale-btn finale-btn--claim finale-code-entry-ok"
              onClick={onOk}
              disabled={mintInFlight}
            >
              OK
            </button>
          ) : (
            <button
              type="button"
              className="finale-btn finale-btn--ghost finale-code-entry-ok"
              onClick={() => {
                if (mintInFlight) return;
                setStep('enter');
                setError('');
              }}
              disabled={mintInFlight}
            >
              Edit
            </button>
          )}
        </div>
        {error ? <p className="finale-code-entry-error">{error}</p> : null}
        {step === 'ready' ? (
          <p className="finale-code-entry-confirmed">
            Code accepted · <code>{code}</code>
            {mintInFlight ? ' · reserved for mint' : ''}
          </p>
        ) : null}
      </div>

      {step === 'ready' && (
        <>
          <div className="finale-claim-slot-gap" aria-hidden />
          <p className="finale-claim-manifold-hint">
            Claim now · Free <strong>locks this code immediately</strong>, then opens checkout at
            quantity <strong>1</strong>
            {maxQty > 1 ? (
              <>
                {' '}
                (max <strong>{maxQty}</strong>)
              </>
            ) : null}
            . After a successful transaction the code is removed permanently.
          </p>
          <div className="mint-card finale-claim-mint-card">
            <ManifoldBuyButton
              instanceId={instanceId}
              pieceNumber={pieceNumber}
              active
              singleControl
              maxQuantity={maxQty}
              claimText={mintInFlight ? 'Mint in progress…' : 'Claim now · Free'}
              sessionKey={`${sessionKey}-${code}`}
              onClaimIntent={() => {
                if (mintInFlight) return;
                onClaimStarted?.(code);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
