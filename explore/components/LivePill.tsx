const LIVE_HREF = 'https://explore.nikxart.xyz/will-it';

type Props = {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function LivePill({ href = LIVE_HREF, onClick }: Props) {
  return (
    <a className="ex-nav-live is-live" href={href} onClick={onClick} aria-label="Live · Will It..">
      <span className="ex-nav-live-dot" aria-hidden="true" />
      Live
    </a>
  );
}
