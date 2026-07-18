import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for eslint-plugin-pg package
 *
 * @description
 * Configures Vitest for testing PostgreSQL ESLint rules with the following setup:
 * - Node environment for running ESLint rule tests
 * - Coverage tracking with v8 provider
 * - JUnit reporting for CI/CD pipeline integration
 */
export default defineConfig({
  root: __dirname,
  // ponytail: alias devkit to source so vitest-direct runs don't need a pre-built dist
  resolve: {
    alias: { '@interlace/eslint-devkit': resolve(__dirname, '../eslint-devkit/src/index.ts') },
  },
    test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts'],
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
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'pg', color: 'cyan' },
    // Use vmThreads for better performance
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
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      watermarks: {
        lines: [80, 90],
        branches: [70, 80],
        functions: [80, 90],
        statements: [80, 90],
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
