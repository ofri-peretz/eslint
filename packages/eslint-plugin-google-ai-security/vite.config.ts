import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-plugin-google-ai-security package
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'google-ai-security', color: 'yellow' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary'],
    },
    reporters: ['default', 'verbose'],
  },
});
