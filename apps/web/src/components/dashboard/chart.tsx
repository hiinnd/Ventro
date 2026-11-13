'use client';
import { useId } from 'react';
import type { Locale } from '@ventro/types';
export function DashboardBarChart({
  title,
  description,
  points,
  locale,
  compact = false,
}: {
  title: string;
  description: string;
  points: { label: string; value: number }[];
  locale: Locale;
  compact?: boolean;
}) {
  const id = useId();
  const max = Math.max(1, ...points.map((point) => point.value));
  const format = new Intl.NumberFormat(locale);
  const width = 640;
  const height = compact ? 174 : 214;
  const step = (width - 24) / Math.max(1, points.length);
  const plot = height - 45;
  return (
    <div className="dash-chart">
      <svg
        viewBox={'0 0 ' + width + ' ' + height}
        role="img"
        aria-labelledby={id + '-title ' + id + '-desc'}
      >
        <title id={id + '-title'}>{title}</title>
        <desc id={id + '-desc'}>
          {description}{' '}
          {points.map((point) => point.label + ': ' + format.format(point.value)).join('; ')}
        </desc>
        {[0, 0.5, 1].map((tick) => (
          <line
            key={tick}
            x1="12"
            x2={width - 12}
            y1={10 + plot * tick}
            y2={10 + plot * tick}
            className="dash-chart-grid"
          />
        ))}
        {points.map((point, index) => {
          const bar = (point.value / max) * (plot - 22);
          const x = 12 + index * step + step * 0.2;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={10 + plot - bar}
                width={step * 0.6}
                height={bar}
                rx={Math.min(5, step * 0.12)}
                className="dash-chart-bar"
              />
              {points.length <= 7 && (
                <text
                  x={x + step * 0.3}
                  y={Math.max(20, plot - bar + 3)}
                  textAnchor="middle"
                  className="dash-chart-value"
                >
                  {format.format(point.value)}
                </text>
              )}
              {(points.length <= 7 || index % 5 === 0 || index === points.length - 1) && (
                <text
                  x={x + step * 0.3}
                  y={height - 6}
                  textAnchor="middle"
                  className="dash-chart-label"
                >
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="dash-chart-data">
        <summary className="ui-focus">
          {locale === 'en' ? 'View chart data' : 'عرض بيانات الرسم'}
        </summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{locale === 'en' ? 'Category' : 'الفئة'}</th>
              <th scope="col">{locale === 'en' ? 'Count' : 'العدد'}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <th scope="row">{point.label}</th>
                <td>{format.format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
