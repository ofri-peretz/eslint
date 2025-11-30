import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * Vitest configuration for eslint-plugin package
 *
 * @description
 * Configures Vitest for testing ESLint plugin rules with the following setup:
 * - Node environment for running ESLint rule tests
  * - Coverage tracking with v8 provider (industry standard)
 * - JUnit reporting for CI/CD pipeline integration
 * - Coverage upload handled by CI workflows instead of Vite plugin
 * - Nx TypeScript path resolution for monorepo imports
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
 * @note
 * Codecov plugin disabled - coverage upload is handled by CI workflows instead
 * for better control and multi-package support
 */
export default defineConfig({
  root: __dirname,
  plugins: [
    /**
     * Resolves TypeScript path aliases from tsconfig.base.json
     * 
     * @why-needed
     * Vitest runs in Node.js and doesn't automatically resolve TypeScript path aliases
     * (like @forge-js/eslint-plugin-utils) defined in tsconfig.base.json.
     * Without this plugin, tests fail with "Cannot read properties of undefined" errors
     * when importing from monorepo packages.
     * 
     * @note
     * This is only needed for the test environment. Production builds use TypeScript
     * compilation which resolves paths during build time, and published packages use
     * normal Node.js module resolution.
     * 
     * @see
     * - tsconfig.base.json for path alias definitions
     * - @nx/vite/plugins/nx-tsconfig-paths.plugin for implementation details
     */
    nxViteTsPaths(),
    // Codecov plugin disabled - using CI workflow for coverage upload instead
  ],
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
      // Exclude utils package - it has its own test suite and coverage
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '../eslint-plugin-utils/**',
        '**/eslint-plugin-utils/**',
        '**/node_modules/**',
      ],
      // Clean coverage directory on each run (safe now that globalSetup ensures dirs exist)
      clean: true,
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit', 'json', 'tree'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
