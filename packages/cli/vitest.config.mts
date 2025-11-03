import { defineConfig } from 'vitest/config';
import { codecovVitePlugin } from "@codecov/vite-plugin";
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Ensure coverage directory exists before any plugins run
try {
  mkdirSync(join(__dirname, 'coverage', '.tmp'), { recursive: true });
} catch (err) {
  // Ignore if already exists
}

/**
 * Vitest configuration for CLI package
 *
 * @description
 * Configures Vitest for testing CLI commands with the following setup:
 * - Node environment for running CLI command tests
 * - Coverage tracking with v8 provider (industry standard)
 * - JUnit reporting for CI/CD pipeline integration
 * - Codecov plugin for automatic coverage insights and bundle analysis
 *
 * @coverage
 * - Provider: v8 (outputs coverage-final.json for Codecov)
 * - Reporters: json (machine-readable), text (console output)
 * - Fail on: Does not fail CI on low coverage, only reports metrics
 * - ReportsDirectory: ./coverage (local output directory for coverage files)
 *
 * @testReporting
 * - Format: JUnit XML for test analytics
 * - Location: ./test-report.junit.xml
 * - Used by: Codecov for test health tracking
 *
 * @codecov
 * - Plugin: codecovVitePlugin for automatic coverage insights
 * - Only enables bundle analysis in CI environment (with CODECOV_TOKEN)
 * - Provides better coverage visibility and trend analysis
 */
export default defineConfig({
  root: __dirname,
  plugins: [
    // Codecov plugin for coverage insights and bundle analysis
    // Safe configuration: only analyzes in CI when token is present
    codecovVitePlugin({
      enableBundleAnalysis: process.env['CODECOV_TOKEN'] !== undefined && process.env['CI'] === 'true',
      bundleName: "cli",
      uploadToken: process.env['CODECOV_TOKEN'],
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      // json: for Codecov upload, text: for console output
      reporter: ['json', 'text'],
      reportOnFailure: true,
      // Directory where coverage reports are written (relative to project root)
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
