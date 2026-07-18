import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-plugin-react-features package
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    coverage: {
      // NOTE: `enabled: true` is deliberately NOT set here (unlike sibling
      // packages): component-api-lint.yml runs a filtered subset
      // (`npx vitest run src/tests/component-api/`) from this package dir,
      // and always-on coverage would fail the ratchet thresholds on any
      // partial run. Coverage is enforced via the `--coverage` flag in this
      // package's `test` script instead, so `turbo run test` still gates.
      provider: 'v8',
      // Coverage ratchet — policy target is 100/100/100/100 (docs/QUALITY_STANDARDS.md §2).
      // Pinned at the 100% policy target — this branch is the integration target for the test wave.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
      reporter: ['json', 'text', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      clean: true,
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
