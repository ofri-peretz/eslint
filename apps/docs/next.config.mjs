import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  distDir: 'dist',
  // Output static files for low-bandwidth hosting
  output: 'standalone',
};

export default withMDX(config);
