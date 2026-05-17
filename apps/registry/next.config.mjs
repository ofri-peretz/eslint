import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Registry-app config.
 *
 * - `output: 'standalone'` is NOT used — Vercel runs Next.js natively.
 * - JSON files in `public/r/*.json` are served as static assets by Next.js
 *   (no rewrite needed; same path becomes URL).
 * - `turbopack.root` set to the workspace root because `next` is hoisted to
 *   the monorepo root's node_modules in npm workspaces — Turbopack's package
 *   resolver needs to know to walk up.
 * - Headers below mirror the contract from the previous static deploy:
 *   permissive CORS for `/r/*.json` so the shadcn CLI can fetch cross-origin.
 *
 * `.mjs` (not `.ts`) because `package.json` declares `"type": "module"` and
 * Next compiles `next.config.ts` to a `.js` sibling that ends up parsed as
 * CJS — `ReferenceError: exports is not defined in ES module scope`. The
 * sibling `apps/docs/next.config.mjs` uses the same pattern.
 *
 * @type {import('next').NextConfig}
 */
const config = {
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
            value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
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
