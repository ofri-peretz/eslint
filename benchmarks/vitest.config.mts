import { defineConfig } from 'vitest/config';

/**
 * Lock tests for the bench harness itself (not for the benches — those are
 * long-running and network-heavy, and live behind `npm run ilb:*`).
 *
 * Scoped to `__tests__/` so the corpus fixtures under `suites/` are never
 * picked up as test files.
 */
export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    include: ['__tests__/**/*.test.ts'],
  },
});
