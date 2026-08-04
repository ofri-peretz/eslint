import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Config for the workspace-level lock tests under scripts/__tests__/.
 *
 * Mirrors the per-plugin configs' devkit alias so the oxlint-export lock can
 * import every plugin's src/oxlint.ts without a pre-built
 * @interlace/eslint-devkit dist. Run from the repo root:
 *
 *   npm run test:oxlint-exports
 */
export default defineConfig({
  resolve: {
    alias: {
      '@interlace/eslint-devkit': resolve(
        __dirname,
        '../../packages/eslint-devkit/src/index.ts',
      ),
    },
  },
  root: resolve(__dirname, '../..'),
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
    include: ['scripts/__tests__/**/*.test.ts'],
    pool: 'vmThreads',
  },
});
