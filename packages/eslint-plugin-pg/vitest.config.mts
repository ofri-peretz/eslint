import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

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
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    exclude: [],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'pg', color: 'cyan' },
    // Use vmThreads for better performance
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
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
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80
      }
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
