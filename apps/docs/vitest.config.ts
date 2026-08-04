import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for docs app
 *
 * @description
 * Configures Vitest for testing documentation integrity:
 * - Mermaid syntax validation tests
 * - Coverage tracking with v8 provider for codecov integration
 * - Node environment for file system operations
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '#interlace': resolve(__dirname, './.interlace'),
    },
  },
  test: {
    globals: true,
    // Node by default; the handful of suites that actually render opt in with a
    // `// @vitest-environment jsdom` docblock. jsdom is constructed per test
    // FILE, and only ~9 of the 74 files here touch a DOM — the rest are
    // structural / repo-scan locks. Measured on the 55 node-safe .ts files:
    // jsdom spent 192.70s of CPU building environments (22.25s wall) against
    // 3ms (6.59s wall) on node, for identical results (822/822 passing, test
    // time unchanged at ~41s). That CPU is not free under the 58-task
    // `turbo run test` fan-out — it starves the I/O-bound scan suites, which is
    // how they end up near their timeouts in the lefthook pre-push battery.
    environment: 'node',
    watch: false,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx', // Include TSX test files
      'src/__tests__/**/*.test.ts', // Include src-level tests
      'src/__tests__/**/*.test.tsx',
    ],
    // Setting `exclude` replaces vitest's defaults, so we spread them back in
    // and add build-artifact dirs that can shadow real tests (Next.js standalone
    // output at `.next/standalone/...` regressed pre-commit on 2026-05-16).
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
    // Most of this suite is structural lock tests that glob + read the whole
    // monorepo (mermaid-syntax alone reads ~940 markdown files). That is ~0.3s
    // warm but ~6s cold, so vitest's 5s default turned a cold page cache into a
    // "failure" — reliably, under the 44-task `turbo run test` fan-out that the
    // lefthook pre-push `tests` hook runs, which starves every task for I/O.
    // These tests are I/O-bound, not compute-bound; give them room.
    testTimeout: 30_000,
    // Same rationale as testTimeout above, for setup/teardown: hookTimeout
    // defaults to 10s and is NOT covered by testTimeout, so a beforeAll/afterEach
    // starved by the parallel turbo fan-out fails as "Hook timed out in 10000ms".
    hookTimeout: 30_000,
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: 'docs',
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['scripts/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.test.ts',
        '**/*.config.ts',
        'tests/**'
      ],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70
      }
    },
    reporters: ['default', 'verbose'],
  },
});
