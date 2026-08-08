import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // No `passWithNoTests` escape hatch: this package went uncovered for its
    // whole life precisely because nothing failed when nothing ran. If the
    // include glob ever stops matching, the suite must go red.
    passWithNoTests: false,
    // Intentionally no `test:coverage` script for this package. The only suite
    // here is a structural export-map lock that executes no component code, so
    // a coverage number would be a misleading ~0% rather than a signal. Add
    // coverage together with the first behavioural component tests.
  },
});
