import { configDefaults, defineConfig } from 'vitest/config';
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
    // SDK interface-compat suites (src/__compatibility__/) import third-party
    // SDKs, not our code, and cost minutes on a cold module cache. They run via
    // vitest.compat.config.mts / sdk-compatibility.yml — never in the default
    // run that backs `turbo run test` and the lefthook pre-commit hook.
    exclude: [...configDefaults.exclude, 'src/__compatibility__/**'],
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
