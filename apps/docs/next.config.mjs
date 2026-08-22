import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
// Set to monorepo root (where package-lock.json is)
const monorepoRoot = path.resolve(__dirname, '../..');

const withMDX = createMDX();

/**
 * Content-Security-Policy in *report-only* mode, with violations reported to
 * PostHog's CSP endpoint (`$csp_violation` events) through the same `/ingest`
 * reverse proxy as the rest of analytics.
 *
 * Report-only by design: this policy is a hypothesis, not a contract. The
 * browser evaluates it, reports what would have been blocked, and blocks
 * nothing — so a wrong rule costs a PostHog event, never a broken page. Once
 * the violation stream is quiet the header can be promoted to the enforcing
 * `Content-Security-Policy` name.
 *
 * Omitted entirely when the PostHog key is absent. `headers()` is evaluated
 * once at server startup rather than per request, so that decision is made
 * from the runtime environment at boot — on Vercel both build and runtime
 * carry the var, so in practice it is present or absent for both.
 */
function cspReportOnlyHeaders() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!token) return [];
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Next.js ships inline bootstrap scripts and styles; `unsafe-eval` is
    // required by some fumadocs code-block features in production builds.
    // TODO(csp-promotion): do NOT carry 'unsafe-eval' into the enforcing
    // header. It re-enables eval()/new Function() and undermines the XSS
    // mitigation this policy exists for (CWE-749). It is here only so the
    // report-only stream isn't drowned by it; the violation data will say
    // whether anything actually needs it, and Next's nonce support
    // (experimental.cspHeader) is the replacement if something does.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    // next/image proxies remote hosts through /_next/image (same-origin), but
    // MDX can inline a remote badge directly.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Same-origin covers /ingest (PostHog) and /_vercel (Vercel Analytics).
    "connect-src 'self' https://api.github.com https://api.npmjs.org",
    `report-uri /ingest/report/?token=${token}`,
  ].join('; ');
  return [{ key: 'Content-Security-Policy-Report-Only', value: policy }];
}

/**
 * Source maps for PostHog Error Tracking — generated, uploaded, then deleted.
 *
 * Without them the error inbox reports things like "Minified React error #418"
 * at `/_next/static/chunks/10z666t7-w_5v.js`, which names no file and no line.
 *
 * `deleteAfterUpload` is the load-bearing option, not a default we inherit:
 * the .map files are produced inside the Vercel build, handed to PostHog, and
 * removed from the output before anything is served. Nothing maps our source
 * back together for a visitor — the symbolication lives in PostHog, behind
 * auth, and the deployment ships the same minified bundle it always did.
 * A lock test pins it; flipping it to false would publish our sources.
 *
 * Inert unless both env vars are set, so local builds, forks, and CI stay
 * byte-identical to today and no build can fail for want of a token.
 */
async function withSourcemapUpload(nextConfig) {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!personalApiKey || !projectId) return nextConfig;
  // Imported here rather than at module scope: the package is a
  // devDependency, and a top-level import would make this config
  // unloadable in an --omit=dev install even with the gate off.
  const { withPostHogConfig } = await import('@posthog/nextjs-config');
  return withPostHogConfig(nextConfig, {
    personalApiKey,
    projectId,
    sourcemaps: { enabled: true, deleteAfterUpload: true },
  });
}

/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  reactStrictMode: true,

  // Extra hostnames the DEV server will accept, comma-separated.
  //
  // Next blocks unknown hosts in dev, which breaks any remote sandbox that
  // serves the preview through its own hostname. Vendor-neutral on purpose: a
  // sandbox sets `DEV_ALLOWED_ORIGINS` to whatever host it uses and nothing in
  // this repo learns that vendor's name, its env-var spelling, or its port
  // scheme. The alternative on offer wired one vendor's variable and a
  // hardcoded `3000-` prefix straight into this file.
  //
  // Dev-only, and empty by default: unset, this is exactly the stock behaviour,
  // and `npm run dev` on localhost:3000 never needs it.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // No `output: 'standalone'`. Nothing consumes .next/standalone (the repo's
  // Dockerfile ships the ESLint CLI, not this app), and under Vercel's
  // current builder a standalone build never emits
  // .next/next-server.js.nft.json, so onBuildComplete dies with ENOENT.
  poweredByHeader: false,
  compress: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },

  // Required so file tracing resolves workspace deps from the monorepo root
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['motion', 'motion/react'],

  // Bundle optimization: externalize heavy packages from SSR bundles
  // Required for twoslash TypeScript code hints
  serverExternalPackages: ['katex', 'mermaid', 'typescript', 'twoslash'],

  // Image optimization for maximum performance
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
    // External hosts we render via next/image: badges in plugin READMEs,
    // dev.to article covers + author avatars, GitHub raw README assets.
    remotePatterns: [
      { protocol: 'https', hostname: 'img.shields.io' },
      { protocol: 'https', hostname: 'shields.io' },
      { protocol: 'https', hostname: 'badgen.net' },
      { protocol: 'https', hostname: 'media.dev.to' },
      { protocol: 'https', hostname: 'media2.dev.to' },
      { protocol: 'https', hostname: 'dev-to-uploads.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'user-images.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'motion', 'motion/react', 'fumadocs-ui', 'fumadocs-core'],
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'INP', 'TTFB'],
  },

  // Webpack optimizations for production builds (fallback)
  webpack: (config, { isServer: _isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(monorepoRoot, 'node_modules/react'),
      'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
      'motion/react': 'motion',
      // CSS resolution for workspace-level dependencies
      'fumadocs-ui': path.resolve(monorepoRoot, 'node_modules/fumadocs-ui'),
      'fumadocs-core': path.resolve(monorepoRoot, 'node_modules/fumadocs-core'),
      tailwindcss: path.resolve(monorepoRoot, 'node_modules/tailwindcss'),
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
        ...cspReportOnlyHeaders(),
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

  // PostHog reverse proxy (ANALYTICS_PHILOSOPHY principle 2). Keeps
  // analytics on the same origin — survives ad-blockers, preserves the
  // strict CSP above (no third-party connect-src needed).
  skipTrailingSlashRedirect: true,
  rewrites: async () => [
    {
      source: '/ingest/static/:path*',
      destination: 'https://us-assets.i.posthog.com/static/:path*',
    },
    {
      source: '/ingest/:path*',
      destination: 'https://us.i.posthog.com/:path*',
    },
    {
      source: '/ingest/decide',
      destination: 'https://us.i.posthog.com/decide',
    },
  ],

  redirects: async () => [
    {
      source: '/docs',
      destination: '/docs/getting-started',
      permanent: true,
    },
    // 2026-05-10: top-level pages moved into Concepts / Advanced.
    // URL contract (UX_PHILOSOPHY §2): redirect, never delete.
    {
      source: '/docs/compare',
      destination: '/docs/getting-started/concepts/compare',
      permanent: true,
    },
    {
      source: '/docs/cwe-compatibility',
      destination: '/docs/getting-started/concepts/cwe-compatibility',
      permanent: true,
    },
    {
      source: '/docs/launch',
      destination: '/docs/getting-started/advanced/launch',
      permanent: true,
    },
    // 2026-08-06: docs slugs realigned to the packages they document, after
    // `eslint-plugin-jwt` → `eslint-plugin-jwt-security` and
    // `eslint-plugin-pg` → `eslint-plugin-postgresql-security`. Every other
    // plugin's slug already matched its package name; these two were the
    // holdouts, and their pages still linked to `packages/eslint-plugin-jwt/`
    // and `packages/eslint-plugin-pg/` on GitHub, which now 404.
    //
    // The ESLint rule namespace is deliberately unchanged — findings are still
    // `jwt/no-algorithm-none` and `pg/no-unsafe-query` so no consumer config
    // has to move. Only the docs URLs shift, and per the URL contract
    // (UX_PHILOSOPHY §2) the old ones redirect rather than 404.
    {
      source: '/docs/security/plugin-jwt/:path*',
      destination: '/docs/security/plugin-jwt-security/:path*',
      permanent: true,
    },
    {
      source: '/docs/security/plugin-pg/:path*',
      destination: '/docs/security/plugin-postgresql-security/:path*',
      permanent: true,
    },
  ],
};

export default await withSourcemapUpload(withMDX(config));
