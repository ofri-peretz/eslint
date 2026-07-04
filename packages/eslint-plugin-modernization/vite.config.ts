import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/eslint-plugin-modernization',
    test: {
    name: 'eslint-plugin-modernization',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: '../../coverage/packages/eslint-plugin-modernization',
      provider: 'v8' as const,
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Floors = measured coverage on 2026-07-04, floored to whole %. Never lower — only raise toward 100.
      thresholds: { lines: 94, statements: 92, functions: 100, branches: 92 },
    },
  },
}));
