import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: {
      '@interlace/eslint-devkit': resolve(
        __dirname,
        '../eslint-devkit/src/index.ts',
      ),
    },
  },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/eslint-plugin-node-security',
  test: {
    // Repo-wide floor: pre-push runs 47 turbo tasks concurrently, so I/O-bound
    // tests are routinely starved. Vitest's 5s default is tuned for unit tests on
    // an idle machine and mis-reports contention as failure. A hang still fails,
    // just at 30s instead of 5s.
    testTimeout: 30_000,
    // Same rationale as testTimeout above, for setup/teardown: hookTimeout
    // defaults to 10s and is NOT covered by testTimeout, so a beforeAll/afterEach
    // starved by the parallel turbo fan-out fails as "Hook timed out in 10000ms".
    hookTimeout: 30_000,

    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      /*
       * `./coverage`, like every other package.
       *
       * This wrote to the REPO ROOT — `../../coverage/packages/…` — and the
       * upload workflow looks for `packages/*​/coverage/lcov.info`. So
       * node-security's coverage has never been uploaded to Codecov. Its 99.80%
       * there is a fossil: `carryforward: true` on every flag means Codecov
       * keeps showing the last value it ever received for a flag that stops
       * reporting, so the number looked plausible and simply stopped moving.
       *
       * The path arrived in a "chore: organize repo" commit, not a decision.
       */
      reportsDirectory: './coverage',
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
