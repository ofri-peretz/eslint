import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
    test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    passWithNoTests: true,
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
      reporter: ['text', 'text-summary', 'html', 'lcov'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
