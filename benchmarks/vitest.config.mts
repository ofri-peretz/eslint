import { defineConfig } from 'vitest/config';

/**
 * Lock tests for the bench harness itself (not for the benches — those are
 * long-running and network-heavy, and live behind `npm run ilb:*`).
 *
 * Scoped to `__tests__/` so the corpus fixtures under `suites/` are never
 * picked up as test files.
 */
export default defineConfig({
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

    environment: 'node',
    watch: false,
    include: ['__tests__/**/*.test.ts'],
  },
});
