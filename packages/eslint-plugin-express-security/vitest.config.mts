import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: { '@interlace/eslint-devkit': resolve(__dirname, '../eslint-devkit/src/index.ts') },
  },
  root: __dirname,
    test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    passWithNoTests: true,
    pool: 'vmThreads',
    coverage: {
      enabled: true,
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
      reporter: ['text', 'text-summary', 'html', 'lcov'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
