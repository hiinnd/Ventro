import { resolve } from 'node:path';
import { config } from 'dotenv';
import type { NextConfig } from 'next';
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
const nextConfig: NextConfig = {
  transpilePackages: ['@ventro/ui'],
  poweredByHeader: false,
  reactStrictMode: true,
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
