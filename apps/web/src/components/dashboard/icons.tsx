import type { ComponentProps } from 'react';
const paths = {
  overview: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  events: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',
  registrations: 'M7 3h10v18H7zM10 8h4m-4 4h4m-4 4h2M4 7H2v12h2m16-12h2v12h-2',
  attendees:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m6 1a3 3 0 0 1 0 6m4 7v-2a4 4 0 0 0-3-4',
  sessions: 'M3 4h18v13H3zM8 21h8m-4-4v4M8 8h8m-8 4h5',
  polls: 'M4 21V11m8 10V3m8 18v-7M2 21h20',
  certificates: 'M5 3h14v12H5zM8 7h8m-8 4h4M8 15v6l4-2 4 2v-6',
  analytics: 'M3 3v18h18M7 15l4-5 4 3 5-7',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m5 2h6m-3-3v6m0 4v5',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  switch: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
} as const;
export type DashboardIconName = keyof typeof paths;
export function DashboardIcon({
  name,
  ...props
}: ComponentProps<'svg'> & { name: DashboardIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
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
