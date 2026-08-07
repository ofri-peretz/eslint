import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-devkit package
 *
 * @description
 * Configures Vitest for testing ESLint devkit with the following setup:
 * - Node environment for running utility function tests
 * - Coverage tracking with v8 provider (industry standard)
 * - JUnit reporting for CI/CD pipeline integration
 *
 * @coverage
 * - Provider: v8 (outputs coverage-final.json for Codecov)
 * - Reporters: json (machine-readable), text (console output), html (local dev)
 * - Fail on: Does not fail CI on low coverage, only reports metrics
 * - ReportsDirectory: ./coverage (local output directory for coverage files)
 *
 * @testReporting
 * - Format: JUnit XML for test analytics
 * - Location: ./test-report.junit.xml
 * - Used by: Codecov for test health tracking
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    // Packaging test, not a unit test: it reads this package's own dist/, so
    // including it here would force `test` to dependOn `build` and make every
    // unit run wait on a compile. The same invariant — emitted JS must not
    // require an uninstalled optional peer — is enforced by
    // `npm run verify:runtime-deps` in the Build job, which reads the real
    // artifacts and covers more cases. Run it directly via `test:dist`.
    // The packaging test reads this package's own dist/, so the default `test`
    // task must skip it — that is what lets `test` declare `dependsOn: []` and
    // run in parallel with Build instead of behind it. `test:dist` sets
    // VITEST_DIST=1 to opt it back in after the build.
    //
    // It has to be conditional rather than a flat exclude: a CLI positional
    // filter does NOT override the config's exclude, so naming the file on the
    // command line matched nothing and vitest exited "No test files found".
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(process.env.VITEST_DIST ? [] : ['**/no-runtime-optional-peer.test.ts']),
    ],
    // Repo-wide floor: pre-push runs 47 turbo tasks concurrently, so I/O-bound
    // tests are routinely starved. Vitest's 5s default is tuned for unit tests on
    // an idle machine and mis-reports contention as failure. A hang still fails,
    // just at 30s instead of 5s.
    testTimeout: 30_000,
    // `hookTimeout` does NOT inherit `testTimeout` — it stays at vitest's 10s
    // default unless set, and that gap fails `git push` on its own: the
    // deep-import-chain suite's `afterEach` deletes the 6,000 files the test
    // wrote, so the file failed on teardown while the test itself finished well
    // inside 30s.
    //
    // Sized off measurement, not guesswork. That delete is 4.1s on an idle
    // machine; under the 61-way parallel `turbo run test` this battery runs it
    // overran both 10s and 30s. 120s is ~30x the idle cost — headroom for the
    // contention above (and for on-access AV scanning, which inflates
    // first-touch file I/O by roughly 30x on managed macOS), while still
    // failing a genuine hang rather than waiting forever.
    hookTimeout: 120_000,

    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.test.ts'],
    passWithNoTests: false,
    // Global setup runs once before all tests to ensure coverage directories exist
    globalSetup: ['../../vitest.global-setup.ts'],
    env: {
      // Add test-mocks to NODE_PATH so resolver tests can find mock modules
      NODE_PATH: './test-mocks/node_modules',
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
      // json for Codecov, text for console, html for local dev
      reporter: ['json', 'text', 'lcov'],
      reportOnFailure: true,
      // Directory where coverage reports are written (relative to project root)
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Benchmarks are excluded like tests: they run under `vitest bench`,
      // not `vitest run`, so the unit suite can never exercise them.
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.bench.ts',
        '**/__benchmarks__/**',
      ],
      // Clean coverage directory on each run (safe now that globalSetup ensures dirs exist)
      clean: true,
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
