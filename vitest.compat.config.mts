import { defineConfig } from 'vitest/config';

/**
 * Config for the SDK interface-compatibility suites under
 * `packages/*&#47;src/__compatibility__/`.
 *
 * These suites import the third-party SDK under test (express, @nestjs/common,
 * mongodb, pg, ai, …) and assert its export surface still matches what our
 * rules key off. They test *upstream* packages, not our plugin code, so they
 * are deliberately excluded from every package's `vitest.config.mts` include
 * and never run as part of `turbo run test` / the lefthook `tests-affected`
 * pre-commit hook. Their home is `.github/workflows/sdk-compatibility.yml`,
 * which installs each SDK at `@latest` first — the only run that produces new
 * signal.
 *
 * Why they can't gate a commit: loading these SDK graphs on a genuinely cold
 * module cache (fresh worktree + `npm ci`, before the OS page cache is warm)
 * has been measured at 82s for express and 209s for @nestjs/common. That cost
 * is environmental and unbounded, so no fixed timeout makes it a safe gate.
 * Timeouts here are sized off the observed cold numbers, not the warm ones.
 *
 *   npm run test:compat                                  # every SDK
 *   npm run test:compat -- packages/eslint-plugin-pg      # one plugin
 */
export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    include: ['packages/*/src/__compatibility__/**/*.spec.ts'],
    passWithNoTests: false,
    // Cold SDK loads have been measured at 209s (@nestjs/common). Sized off
    // that, not off the ~6s warm case.
    testTimeout: 300_000,
    hookTimeout: 300_000,
    // Deliberately NOT the `pool: 'vmThreads'` every per-package config uses.
    // These suites exist to observe how a real SDK resolves and what it exports;
    // `forks` gives them plain Node module semantics, whereas vmThreads loads
    // through a VM context that can distort exactly the resolution behavior
    // under test. Stated rather than left to the default so the divergence from
    // the other configs reads as intent.
    pool: 'forks',
    // ponytail: no coverage — these assert upstream export surface, and cover
    // none of our src/.
    coverage: { enabled: false },
  },
});
