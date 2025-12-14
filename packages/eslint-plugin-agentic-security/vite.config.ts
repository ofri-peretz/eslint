import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-plugin-agentic-security package
 *
 * @description
 * Configures Vitest for testing agentic security ESLint rules with the following setup:
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
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'agentic-security', color: 'blue' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary'],
    },
    reporters: ['default', 'verbose'],
  },
});
