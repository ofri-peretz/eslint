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
      '#interlace': resolve(__dirname, './.interlace'),
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
    // Setting `exclude` replaces vitest's defaults, so we spread them back in
    // and add build-artifact dirs that can shadow real tests (Next.js standalone
    // output at `.next/standalone/...` regressed pre-commit on 2026-05-16).
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/.next/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/coverage/**',
    ],
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
