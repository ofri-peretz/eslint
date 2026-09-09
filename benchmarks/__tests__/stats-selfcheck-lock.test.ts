/**
 * Makes the significance self-check part of `npm test`.
 *
 * `stats.selfcheck.ts` is registered as `stats:check` and runs under tsx. Vitest
 * only collects `*.test.ts` / `*.spec.ts`, so nothing in the normal test run
 * executed it — a refactor that re-introduced the lookup table would have gone
 * through green. The repo's rule is that a fix is not done until a test would
 * have caught the bug pre-deploy; this is that test.
 *
 * The script asserts at import time and throws on the first failure, so merely
 * importing it runs all of it. The count is asserted too: an import of a file
 * whose assertions had been deleted would otherwise resolve happily, and a lock
 * that passes when its subject is gone is not a lock.
 */
import { describe, expect, it } from 'vitest';

/** Raise deliberately when assertions are added; never lower it to make a run pass. */
const ASSERTIONS_AT_LEAST = 21;

describe('chi-squared self-check', () => {
  it('runs, and every assertion in it holds', async () => {
    const mod = await import('../lib/stats.selfcheck.ts');
    expect(mod.assertions).toBeGreaterThanOrEqual(ASSERTIONS_AT_LEAST);
  });

  it('is reachable as the `stats:check` script the SDLC spec cites', async () => {
    const { default: pkg } = await import('../package.json', {
      with: { type: 'json' },
    });
    expect(pkg.scripts['stats:check']).toContain('stats.selfcheck.ts');
  });
});
