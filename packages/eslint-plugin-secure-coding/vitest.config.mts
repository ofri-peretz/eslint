import { defineConfig } from 'vitest/config';

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
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      clean: true,
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});

