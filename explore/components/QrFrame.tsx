import { useMemo } from 'react';
import { qrSvg } from '../lib/qrSvg';

type Props = {
  text: string;
  size?: number;
  label?: string;
};

export function QrFrame({ text, size = 176, label }: Props) {
  const svg = useMemo(() => qrSvg(text, size), [text, size]);
  if (!svg) {
    return <p className="ex-qr-fallback">{text}</p>;
  }
  return (
    <div
      className="ex-qr"
      role="img"
      aria-label={label || 'QR code'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
