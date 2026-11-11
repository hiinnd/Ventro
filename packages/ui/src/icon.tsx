import type { ComponentProps } from 'react';
import { cn } from './utils';
const paths = {
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  down: 'm6 9 6 6 6-6',
  next: 'm9 6 6 6-6 6',
  previous: 'm15 6-6 6 6 6',
  info: 'M12 11v6m0-10v.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z',
  alert: 'm12 3 10 18H2L12 3Zm0 5v6m0 3v.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  theme: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  empty: 'M3 8h18v13H3V8Zm0 0 4-5h10l4 5M8 12h8',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
} as const;
export function Icon({ name, className, ...props }: ComponentProps<'svg'> & { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" className={cn('size-4 shrink-0', className)} {...props}><path d={paths[name]} /></svg>;
}
