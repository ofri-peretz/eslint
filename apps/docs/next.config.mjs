import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Set to monorepo root (where pnpm-lock.yaml is)
const monorepoRoot = path.resolve(__dirname, '../..');

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'standalone',

  // Required for monorepo standalone output tracing
  outputFileTracingRoot: monorepoRoot,
};

export default withMDX(config);
