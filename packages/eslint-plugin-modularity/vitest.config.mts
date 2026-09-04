import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * This package had NO vitest config at all.
 *
 * `test:coverage` ran `vitest run --coverage` against vitest's defaults, whose
 * reporter list does not include lcov — so no `coverage/lcov.info` was ever
 * written, the upload loop (which globs exactly that path) skipped the package
 * every run, and no threshold was enforced on it either.
 *
 * Codecov still showed a number, because `carryforward: true` served the last
 * value the flag had ever received. Once carryforward was turned off and the
 * stray-report sweep was fixed, the component went blank — which is what
 * finally made the gap visible. Five packages were in this state.
 *
 * Mirrors the sibling plugin configs: v8, lcov, and the 100/100/100/100 policy
 * target from docs/QUALITY_STANDARDS.md §2.
 */
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
  test: {
    // Repo-wide floor: pre-push runs turbo tasks concurrently, so I/O-bound
    // tests are routinely starved. Vitest's 5s default mis-reports contention
    // as failure.
    testTimeout: 30_000,
    // hookTimeout does NOT inherit testTimeout and defaults to 10s, which fails
    // as "Hook timed out in 10000ms" rather than as a test failure.
    hookTimeout: 30_000,

    name: 'eslint-plugin-modularity',
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'src/__compatibility__/**'],
    coverage: {
      enabled: true,
      provider: 'v8',
      // Coverage ratchet — policy target 100/100/100/100
      // (docs/QUALITY_STANDARDS.md §2). Measured at 100 on all four before
      // this was pinned, so it starts enforcing rather than aspiring.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/types/**'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
