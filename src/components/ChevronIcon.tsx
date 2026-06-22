type Props = {
  open?: boolean;
  size?: number;
  className?: string;
};

export function ChevronIcon({ open = false, size = 12, className = '' }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        opacity: 0.5,
      }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}