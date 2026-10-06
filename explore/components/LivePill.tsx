const LIVE_HREF = '/on-the-block';

type Props = {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function LivePill({ href = LIVE_HREF, onClick }: Props) {
  return (
    <a className="ex-nav-live is-live" href={href} onClick={onClick} aria-label="Auction · Voices Of Time">
      <span className="ex-nav-live-dot" aria-hidden="true" />
      Auction
    </a>
  );
}
