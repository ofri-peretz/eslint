import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

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
 *
 * @environment
 * - jsdom: Simulates browser environment for React component testing
 * - globals: true - Makes test functions globally available (describe, it, expect)
 *
 * @coverage
 * - Provider: v8 (outputs coverage-final.json for Codecov)
 * - Reporters: json (machine-readable), text (console output), html (local dev)
 * - Fail on: Does not fail CI on low coverage, only reports metrics
 * - Excludes: Node modules, dist, and test files themselves
 * - ReportsDirectory: ./coverage (local output directory for coverage files)
 *
 * @testReporting
 * - Format: JUnit XML for test analytics
 * - Location: ./test-report.junit.xml
 * - Used by: Codecov for test health tracking
 */
export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    nxViteTsPaths(),
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
      // json for Codecov, text for console, html for local dev
      reporter: ['json', 'text', 'html'],
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
