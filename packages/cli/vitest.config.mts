import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['json'],
      reportOnFailure: true,
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
  },
});
