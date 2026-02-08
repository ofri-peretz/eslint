import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

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
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom', // Changed from 'node' to support React component testing
    watch: false,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx', // Include TSX test files
      'src/__tests__/**/*.test.ts', // Include src-level tests
      'src/__tests__/**/*.test.tsx',
    ],
    exclude: [],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: 'docs',
    pool: 'forks',
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
