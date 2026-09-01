import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // No `passWithNoTests` escape hatch: this package went uncovered for its
    // whole life precisely because nothing failed when nothing ran. If the
    // include glob ever stops matching, the suite must go red.
    passWithNoTests: false,
    // 20s, not vitest's 5s default.
    //
    // `no-external-registry-references` walks four source trees and reads every
    // matching file to grep it. That is legitimate I/O — it is a lock over the
    // whole first-party surface — and it costs ~240ms idle, ~900ms with a few
    // packages running, and past 5s inside a full `turbo run test` where ~30
    // package suites compete for the same disk.
    //
    // It failed the pre-push hook repeatedly while passing every time it was
    // run alone, which is the signature of a resource limit rather than a
    // broken assertion. The redundant work was already removed (it used to read
    // every file once per forbidden pattern, three times over); what is left is
    // the reading it has to do, so the honest fix is a ceiling that reflects
    // contention rather than an idle machine.
    testTimeout: 20_000,
    // Intentionally no `test:coverage` script for this package. The only suite
    // here is a structural export-map lock that executes no component code, so
    // a coverage number would be a misleading ~0% rather than a signal. Add
    // coverage together with the first behavioural component tests.
  },
});
