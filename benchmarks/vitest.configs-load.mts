import { defineConfig } from 'vitest/config';

/**
 * The one suite the default `test` task excludes, because it only means
 * anything on a BUILT tree. See the header of `__tests__/configs-load.test.ts`.
 *
 * Standalone, NOT `mergeConfig(base, ...)`. mergeConfig concatenates arrays
 * rather than replacing them, so a base `exclude` survives every attempt to
 * override it: `include` became both globs, `exclude` kept
 * `configs-load.test.ts`, and this suite silently ran zero of its assertions
 * while the job reported "41 passed" — those 41 were `methodology-lock`. A
 * config-load gate that never loads a config is the same silent pass the suite
 * it guards was written to stop.
 *
 * A CLI filter (`vitest run __tests__/configs-load.test.ts`) has the same
 * problem from the other direction: the base `exclude` is applied on top of
 * positional filters, so that form matches zero files and exits reporting
 * "No test files found".
 */
export default defineConfig({
  test: {
    // Same rationale as the base config: pre-push runs dozens of turbo tasks
    // concurrently and vitest's 5s default mis-reports contention as failure.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    environment: 'node',
    watch: false,
    include: ['__tests__/configs-load.test.ts'],
  },
});
