import { resolve } from 'node:path';
import { config } from 'dotenv';
import type { NextConfig } from 'next';

// Next can be started through a root workspace script or directly from
// apps/web. Resolve relative to this config file so server-only API settings
// do not disappear in either path.
config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
const nextConfig: NextConfig = {
  transpilePackages: ['@ventro/ui'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: { qualities: [75, 85], formats: ['image/webp'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
