import { ImageResponse } from 'next/og';
import { markPaths, wordmarkPaths } from '@ventro/ui/brand-geometry';
export const dynamic = 'force-static';
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '68px 76px',
        background: 'linear-gradient(135deg, #101B35, #252B42)',
        color: '#F6F7FB',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: -170,
          top: -160,
          width: 700,
          height: 700,
          borderRadius: 350,
          border: '2px solid #9B8CFF',
          opacity: 0.25,
        }}
      />
      <svg width="280" height="58" viewBox="0 0 310 64">
        <g transform="translate(4 8)">
          {markPaths.map((d, index) => (
            <path
              key={d}
              d={d}
              fill={index === 0 ? '#F6F7FB' : index === 1 ? '#9B8CFF' : '#5CE1C6'}
            />
          ))}
        </g>
        <g transform="translate(80 14)" fill="#F6F7FB" fillRule="evenodd">
          {wordmarkPaths.map(({ x, d }) => (
            <path key={x} d={d} transform={'translate(' + x + ' 0)'} />
          ))}
        </g>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -4 }}>Every Event.</div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -4, color: '#9B8CFF' }}>
          Beyond the Moment.
        </div>
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, color: '#C1CADD' }}
      >
        <span>JORDAN / MENA</span>
        <span>PUBLIC PRODUCT PREVIEW</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
