import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest configuration for eslint-plugin-secure-coding package
 *
 * @description
 * Configures Vitest for testing security ESLint rules with the following setup:
 * - Node environment for running ESLint rule tests
 * - Coverage tracking with v8 provider
 * - JUnit reporting for CI/CD pipeline integration
 */
export default defineConfig({
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: { '@interlace/eslint-devkit': resolve(__dirname, '../eslint-devkit/src/index.ts') },
  },
  root: __dirname,
  plugins: [],
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

    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.test.ts',
    ],
    // Setting `exclude` replaces vitest's defaults — spread them back in and
    // add build-artifact dirs so stale outputs can never shadow real tests.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/.next/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/coverage/**',
    ],
    passWithNoTests: false,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'secure-coding', color: 'green' },
    // Use forks to prevent coverage race conditions
    // pool: 'forks',
    pool: 'vmThreads',
    coverage: {
      enabled: true,
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', 'src/types/**'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
    },
    reporters: ['default', 'verbose'],
    // outputFile: {
    //   // junit: './test-report.junit.xml',

    // },
    // onConsoleLog(log, type) {
    //   if (process.env['VITEST_CONSOLE_LOG'] === 'true') {
    //     return true; // Allow log
    //   }
    //   return false; // Suppress log
    // },
  },
});


