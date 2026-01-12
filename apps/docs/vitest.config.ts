import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for docs app
 *
 * @description
 * Configures Vitest for testing documentation integrity:
 * - Mermaid syntax validation tests
 * - Coverage tracking with v8 provider for codecov integration
 * - Node environment for file system operations
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'tests/**/*.test.ts',
    ],
    exclude: [],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'docs', color: 'blue' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['scripts/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.test.ts',
        '**/*.config.ts',
        'tests/**'
      ],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70
      }
    },
    reporters: ['default', 'verbose'],
  },
});
