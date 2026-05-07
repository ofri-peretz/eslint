/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * @interlace/docs-baseline — Next.js config factory
 *
 * Provides a hardened, production-ready Next.js configuration
 * with security headers, monorepo webpack aliases, and performance
 * optimizations. Each consuming app calls this factory and adds
 * only app-specific overrides.
 *
 * @example
 * ```mjs
 * import { createDocsConfig } from '@interlace/docs-baseline/config/next.config.base.mjs';
 *
 * export default createDocsConfig({
 *   redirects: [
 *     { source: '/docs', destination: '/docs/getting-started', permanent: true },
 *   ],
 * });
 * ```
 */

import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Create a hardened Next.js config for an Interlace docs site.
 *
 * @param {object} options
 * @param {string} options.configDir - Absolute path to the consuming app's directory (__dirname)
 * @param {Array} [options.redirects] - Additional redirect rules
 * @param {Array} [options.headers] - Additional header rules (merged with baseline)
 * @param {object} [options.images] - Image optimization overrides
 * @param {Array} [options.transpilePackages] - Additional packages to transpile
 * @param {Array} [options.serverExternalPackages] - Additional packages to externalize
 * @param {Array} [options.optimizePackageImports] - Additional packages to optimize
 * @param {object} [options.env] - Additional environment variables
 * @returns {import('next').NextConfig}
 */
export function createDocsConfig({
  configDir,
  redirects = [],
  headers: extraHeaders = [],
  images = {},
  transpilePackages = [],
  serverExternalPackages = [],
  optimizePackageImports = [],
  env = {},
} = {}) {
  const appDir = configDir || path.dirname(fileURLToPath(import.meta.url));
  const monorepoRoot = path.resolve(appDir, '../..');

  const withMDX = createMDX();

  /** @type {import('next').NextConfig} */
  const config = {
    env,
    reactStrictMode: true,
    output: 'standalone',
    poweredByHeader: false,
    compress: true,

    // Monorepo tracing
    outputFileTracingRoot: monorepoRoot,
    transpilePackages: ['motion', 'motion/react', ...transpilePackages],
    serverExternalPackages: ['typescript', 'twoslash', ...serverExternalPackages],

    // Image optimization
    images: {
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 31536000,
      ...images,
    },

    // Experimental features
    experimental: {
      optimizePackageImports: [
        'lucide-react',
        'motion',
        'motion/react',
        'fumadocs-ui',
        'fumadocs-core',
        ...optimizePackageImports,
      ],
    },

    // Webpack aliases for monorepo deduplication
    webpack: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve(monorepoRoot, 'node_modules/react'),
        'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
        'motion/react': 'motion',
        'fumadocs-ui': path.resolve(monorepoRoot, 'node_modules/fumadocs-ui'),
        'fumadocs-core': path.resolve(monorepoRoot, 'node_modules/fumadocs-core'),
        tailwindcss: path.resolve(monorepoRoot, 'node_modules/tailwindcss'),
      };
      return config;
    },

    // Security headers baseline
    headers: async () => [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      ...extraHeaders,
    ],

    // Redirects
    redirects: async () => [...redirects],
  };

  return withMDX(config);
}
