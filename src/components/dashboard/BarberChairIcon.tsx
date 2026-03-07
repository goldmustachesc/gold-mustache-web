export function BarberChairIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 18v2a1 1 0 0 0 1 1h2" />
      <path d="M19 18v2a1 1 0 0 1-1 1h-2" />
      <path d="M5 18H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2" />
      <path d="M5 14v-3a7 7 0 0 1 14 0v3" />
      <path d="M7 8h10" />
      <rect x="7" y="14" width="10" height="4" rx="1" />
    </svg>
  );
}
