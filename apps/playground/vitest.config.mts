import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
// import { codecovVitePlugin } from "@codecov/vite-plugin";
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Ensure coverage directory exists before any plugins run
// try {
//   mkdirSync(join(__dirname, 'coverage', '.tmp'), { recursive: true });
// } catch (err) {
//   // Ignore if already exists
// }

/**
 * Vitest configuration for playground app
 *
 * @description
 * Configures Vitest for testing React components in the playground with the following setup:
 * - jsdom environment for DOM and React component testing
 * - React plugin for JSX support
 * - Nx path aliases for project imports
 * - Coverage tracking with v8 provider (industry standard)
 * - JUnit reporting for CI/CD pipeline integration
 * - Codecov plugin for automatic coverage insights and bundle analysis
 *
 * @environment
 * - jsdom: Simulates browser environment for React component testing
 * - globals: true - Makes test functions globally available (describe, it, expect)
 *
 * @coverage
 * - Provider: v8 (outputs coverage-final.json for Codecov)
 * - Reporters: json (machine-readable), text (console output)
 * - Fail on: Does not fail CI on low coverage, only reports metrics
 * - Excludes: Node modules, dist, and test files themselves
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
    react(),
    nxViteTsPaths(),
    // Codecov plugin for coverage insights and bundle analysis
    // Safe configuration: only analyzes in CI when token is present
    // codecovVitePlugin({
    //   enableBundleAnalysis: process.env['CODECOV_TOKEN'] !== undefined && process.env['CI'] === 'true',
    //   bundleName: "playground",
    //   uploadToken: process.env['CODECOV_TOKEN'],
    // }),
  ],
  test: {
    name: 'playground',
    watch: false,
    globals: true,
    environment: 'jsdom',
    // Include both test and spec files, supporting multiple extensions
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8' as const,
      // json: for Codecov upload, text: for console output
      reporter: ['json', 'text'],
      reportOnFailure: true,
      // Directory where coverage reports are written (relative to project root)
      reportsDirectory: './coverage',
      // Exclude common non-code directories and test files
      exclude: ['node_modules/', 'dist/', '**/*.{test,spec}.ts{,x}'],
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
