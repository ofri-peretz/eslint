import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(() => ({
  root: __dirname,
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: { '@interlace/eslint-devkit': resolve(__dirname, '../eslint-devkit/src/index.ts') },
  },
  cacheDir: '../../node_modules/.vite/packages/eslint-plugin-conventions',
    // Uncomment this if you are using workers.
  // worker: {
  //    // },
  test: {
    name: 'eslint-plugin-conventions',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: '../../coverage/packages/eslint-plugin-conventions',
      provider: 'v8' as const,
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
      reporter: ['text', 'lcov'],
    },
  },
}));
