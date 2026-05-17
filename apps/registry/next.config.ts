import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Registry-app config.
 *
 * - `turbopack.root` set to the workspace root because `next` is hoisted to
 *   the monorepo root's `node_modules` in npm workspaces — Turbopack's package
 *   resolver needs to walk up.
 * - Headers below mirror the previous static-deploy contract:
 *   permissive CORS for `/r/*.json` so the shadcn CLI can fetch cross-origin.
 * - Security headers on all other paths.
 */
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
  async headers() {
    return [
      {
        source: '/r/:path*.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          {
            key: 'Cache-Control',
            value:
              'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default config;
