import { useMemo, useState } from 'react';
import { QrFrame } from './QrFrame';

type Props = {
  wallet: string;
};

function lookingUrlFor(wallet: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://explore.nikxart.xyz';
  return `${origin}/looking/${wallet.toLowerCase()}`;
}

export function LookingPair({ wallet }: Props) {
  const lookingUrl = useMemo(() => lookingUrlFor(wallet), [wallet]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  const mint = async () => {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/looking/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok || !data.code) {
        setNote(
          data.error === 'rate' || data.error === 'live_limit' || data.error === 'holdings_busy'
            ? 'Wait a moment, then try again.'
            : 'The television desk could not be reached.',
        );
        return;
      }
      setCode(data.code);
      setOpen(true);
    } catch {
      setNote('The television desk could not be reached.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lookingUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = lookingUrl;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="ex-looking-pair">
      <p className="ex-garden-share-kicker">Open on TV</p>
      <p className="ex-garden-share-lead">
        On the television, open the Looking Room and enter a four-character code. No wallet on the TV.
      </p>
      <div className="ex-garden-share-row">
        <button type="button" className="ex-garden-share-copy" onClick={() => void mint()} disabled={busy}>
          {busy ? 'Preparing…' : code ? 'New code' : 'Open on TV'}
        </button>
        <button type="button" className="ex-garden-share-copy" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy looking URL'}
        </button>
      </div>
      {open && code ? (
        <div className="ex-looking-pair-sheet">
          <p className="ex-looking-pair-code" aria-label={`Pairing code ${code.split('').join(' ')}`}>
            {code.split('').join(' ')}
          </p>
          <p className="ex-looking-pair-help">
            Television browser: explore.nikxart.xyz/looking — then these four characters. Codes last ten minutes.
          </p>
          <QrFrame text={lookingUrl} size={168} label="Looking Room address" />
          <code className="ex-garden-share-url">{lookingUrl}</code>
        </div>
      ) : null}
      {note ? <p className="ex-garden-share-note">{note}</p> : null}
    </div>
  );
}
