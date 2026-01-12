import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
// Set to monorepo root (where pnpm-lock.yaml is)
const monorepoRoot = path.resolve(__dirname, '../..');

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },

  // Required for monorepo standalone output tracing
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['motion', 'motion/react'],

  // Bundle optimization: externalize heavy packages from SSR bundles
  serverExternalPackages: ['katex', 'mermaid'],

  // Image optimization for maximum performance
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000, 
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'motion', 'motion/react', 'fumadocs-ui', 'fumadocs-core'],
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'INP', 'TTFB'],
  },

  // Webpack optimizations for production builds (fallback)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(monorepoRoot, 'node_modules/react'),
      'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
      'motion/react': 'motion',
    };
    return config;
  },

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
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' 
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
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/public/:path*',
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
  ],
};

export default withMDX(config);
