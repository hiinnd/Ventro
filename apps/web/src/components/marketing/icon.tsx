import type { ComponentProps } from 'react';
const paths = {
  calendar: 'M7 2v4m10-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 14h3m4 0h3m-10 4h3',
  ticket: 'M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Zm11 0v2m0 3v2m0 3v2',
  scan: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 12h10m-5-5v10',
  people:
    'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-3.87M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7a4 4 0 0 1 0 7',
  passport: 'M5 3h14v18H5V3Zm3 14h8M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3-3v6M9 9h6',
  connection:
    'M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 8v7a4 4 0 0 0 4 4h3M17 16V9a4 4 0 0 0-4-4h-3',
} as const;
export function MarketingIcon({
  name,
  ...props
}: ComponentProps<'svg'> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
