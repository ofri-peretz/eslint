import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for CLI package
 *
 * @description
 * Configures Vitest for testing CLI commands with the following setup:
 * - Node environment for running CLI command tests
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
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    // Global setup runs once before all tests to ensure coverage directories exist
    globalSetup: ['../../vitest.global-setup.ts'],
    coverage: {
      provider: 'v8',
      // json for Codecov, text for console, html for local dev
      reporter: ['json', 'text'],
      reportOnFailure: true,
      // Directory where coverage reports are written (relative to project root)
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
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
