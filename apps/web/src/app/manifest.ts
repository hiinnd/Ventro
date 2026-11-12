import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VENTRO',
    short_name: 'VENTRO',
    description: 'Every Event. Beyond the Moment.',
    start_url: '/',
    display: 'standalone',
    background_color: '#101B35',
    theme_color: '#101B35',
    icons: [{ src: '/brand/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
