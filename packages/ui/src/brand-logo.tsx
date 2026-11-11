import type { ComponentProps } from 'react';
import { markPaths, wordmarkPaths } from './brand-geometry';
export function BrandLogo({ variant = 'horizontal', decorative = false, label = 'VENTRO', ...props }:
  Omit<ComponentProps<'svg'>, 'children'> & { variant?: 'horizontal' | 'symbol'; decorative?: boolean; label?: string }) {
  const horizontal = variant === 'horizontal';
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={horizontal ? '0 0 310 64' : '0 0 48 48'}
    width={horizontal ? 310 : 48} height={horizontal ? 64 : 48}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label}
    aria-hidden={decorative || undefined} focusable="false" {...props}>
    <g transform={horizontal ? 'translate(4 8)' : undefined}>
      <path d={markPaths[0]} fill="currentColor" />
      <path d={markPaths[1]} fill="#9B8CFF" />
      <path d={markPaths[2]} fill="#5CE1C6" />
    </g>
    {horizontal && <g transform="translate(80 14)" fill="currentColor" fillRule="evenodd">
      {wordmarkPaths.map(({ x, d }) => <path key={x} transform={'translate(' + x + ' 0)'} d={d} />)}
    </g>}
  </svg>;
}
