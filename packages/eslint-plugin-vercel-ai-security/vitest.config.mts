import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-plugin-vercel-ai-security package
 *
 * @description
 * Configures Vitest for testing Vercel AI SDK security ESLint rules with the following setup:
 * - Node environment for running ESLint rule tests
 * - Coverage tracking with v8 provider
 * - JUnit reporting for CI/CD pipeline integration
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
    ],
    exclude: [],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'vercel-ai-security', color: 'cyan' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 98,
        branches: 75,
        functions: 100,
        statements: 90
      }
    },
    reporters: ['default', 'verbose'],
  },
});
