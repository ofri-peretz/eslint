import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for eslint-plugin-dependencies package
 *
 * @description
 * Configures Vitest for testing dependency ESLint rules with the following setup:
 * - Node environment for running ESLint rule tests
 * - Coverage tracking with v8 provider
 * - JUnit reporting for CI/CD pipeline integration
 */
export default defineConfig({
  root: __dirname,
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: {
      '@interlace/eslint-devkit': resolve(
        __dirname,
        '../eslint-devkit/src/index.ts',
      ),
    },
  },
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.test.ts'],
    /*
     * `__coherence-probe.test.ts` is written into this package by
     * `benchmarks/__tests__/sealed-vs-open-lock.test.ts`, which needs a file
     * the rule-case ledger will reject in order to prove the ledger rejects
     * it. It is deleted in a `finally`, and any orphan is cleared before the
     * next write — but a run killed between write and cleanup leaves one
     * behind, and until someone deletes it by hand THIS package's own test
     * task fails on it, which takes the whole pre-push gate down for a reason
     * that has nothing to do with the push. It is deliberately invalid; it is
     * not a test of this package; it does not belong in this package's run.
     */
    exclude: ['**/node_modules/**', '**/__coherence-probe.test.ts'],
    passWithNoTests: false,
    testTimeout: 30000, // Increase timeout for tests that require file system resolution
    // Same rationale as testTimeout above, for setup/teardown: hookTimeout
    // defaults to 10s and is NOT covered by testTimeout, so a beforeAll/afterEach
    // starved by the parallel turbo fan-out fails as "Hook timed out in 10000ms".
    hookTimeout: 30_000,
    globalSetup: ['../../vitest.global-setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
      reporter: ['json', 'text', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      clean: true,
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
