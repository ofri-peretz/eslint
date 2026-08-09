/**
 * Benchmark integrity lock — CI guardrail for the PUBLISHED comparison.
 *
 * The weekly benchmark publishes a head-to-head table naming specific rules on
 * both sides. That table is checkable: anyone can open the two rule docs. So a
 * renamed or deleted rule does not merely break a job — it turns a published
 * claim into a false one, in a repo whose entire pitch is rigor.
 *
 * The weekly workflow already verifies this, but Monday 09:00 UTC is the wrong
 * time to find out: the offending PR merged days earlier and the author has
 * moved on. These locks fail the PR instead.
 *
 * Real incident this guards: while authoring the matchup table, 18 of 54 rule
 * IDs were written from memory and did not exist (`secure-coding/no-eval-usage`
 * vs the real `browser-security/no-eval`). Every one looked plausible.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import { MATCHUPS, UNCONTESTED } from '../../../../benchmarks/suites/ilb-headline/matchups.js';

const require_ = createRequire(import.meta.url);
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const WORKSPACE = join(MONOREPO_ROOT, 'benchmarks/suites/ilb-flagship/workspace');

/** Rule names a plugin exports, or null when it isn't built/installed. */
function rulesOf(spec: string): Set<string> | null {
  let m: any;
  try { m = require_(spec); } catch { return null; }
  // Our packages expose a `default` that is NOT the plugin object; prefer
  // whichever shape actually carries `rules`.
  const mod = Object.keys(m?.rules ?? {}).length ? m : (m?.default ?? m);
  return mod?.rules ? new Set(Object.keys(mod.rules)) : null;
}

const ourPlugin = (name: string) =>
  rulesOf(join(MONOREPO_ROOT, `packages/eslint-plugin-${name}/dist/src/index.js`));
const theirPlugin = (pkg: string) => rulesOf(join(WORKSPACE, 'node_modules', pkg));

// dist/ only exists after a build. Skip rather than fail on a clean checkout —
// the weekly workflow builds first and re-checks there, so this stays a fast
// PR signal without becoming a false alarm for anyone who hasn't built.
const OURS_BUILT = ourPlugin('secure-coding') !== null;
const describeOurs = OURS_BUILT ? describe : describe.skip;

describe('benchmark integrity', () => {
  describeOurs('every OUR rule cited in the matchup table exists', () => {
    const cited = [
      ...MATCHUPS.flatMap((m) => m.ours),
      ...UNCONTESTED.flatMap((u) => u.ours),
    ];

    it('cites a non-trivial number of rules', () => {
      expect(cited.length).toBeGreaterThan(30);
    });

    it.each(cited)('%s exists', (id) => {
      const [plugin, ...rest] = id.split('/');
      const rules = ourPlugin(plugin);
      expect(rules, `eslint-plugin-${plugin} not built`).not.toBeNull();
      expect(rules!.has(rest.join('/'))).toBe(true);
    });
  });

  describe('every COMPETITOR rule cited in the matchup table exists', () => {
    const cited = MATCHUPS.flatMap((m) => m.theirs);
    const installed = cited.filter((id) => theirPlugin(id.split(':')[0]) !== null);

    it('competitor packages are installed in the bench workspace', () => {
      // If none resolve, the workspace isn't installed — that's an
      // environment problem, not a false claim, so don't assert per-rule.
      expect(installed.length).toBeGreaterThan(0);
    });

    it.each(installed)('%s exists', (id) => {
      const [pkg, rule] = id.split(':');
      expect(theirPlugin(pkg)!.has(rule)).toBe(true);
    });
  });

  describe('the comparison stays honest', () => {
    it('no matchup claims a win where the competitor has no rule', () => {
      // A job with no competitor rules belongs in UNCONTESTED, not MATCHUPS —
      // otherwise a downstream renderer computes a speed ratio against nothing
      // and prints it as though we beat someone.
      const emptyButNotNoted = MATCHUPS.filter(
        (m) => m.theirs.length === 0 && !m.note,
      );
      expect(
        emptyButNotNoted.map((m) => m.job),
        'jobs with no competitor rule must carry a note explaining why',
      ).toEqual([]);
    });

    it('keeps at least one caveat naming where competitors are better', () => {
      // Per the objectivity bar: a table where every row favours us reads as
      // authored rather than measured.
      const withNotes = MATCHUPS.filter((m) => m.note);
      expect(withNotes.length).toBeGreaterThanOrEqual(5);
    });

    it('only benchmarks SDK-agnostic plugins', () => {
      // Framework-bound plugins have no comparable competitor; benchmarking
      // them would be an uncontested "win" worth nothing to a reader.
      const ALLOWED = new Set([
        'secure-coding', 'node-security', 'browser-security', 'import-next',
      ]);
      const offenders = MATCHUPS.flatMap((m) => m.ours)
        .map((id) => id.split('/')[0])
        .filter((p) => !ALLOWED.has(p));
      expect([...new Set(offenders)]).toEqual([]);
    });

    it('every matchup is categorised as security or modules', () => {
      for (const m of MATCHUPS) {
        expect(['security', 'modules']).toContain(m.category);
      }
    });
  });

  describe('the published README table stays wired to generated badges', () => {
    const readmePath = join(MONOREPO_ROOT, 'README.md');

    it('README exists', () => {
      expect(existsSync(readmePath)).toBe(true);
    });

    it('benchmark numbers are badge URLs, never hand-typed', () => {
      const readme = readFileSync(readmePath, 'utf-8');
      if (!readme.includes('INTERLACE:BENCH_TABLE')) return; // not wired yet
      const block = readme.split('INTERLACE:BENCH_TABLE')[1]?.split('---')[0] ?? '';
      // Every cell must be an <img>; a literal "1,234 ms" means someone pasted
      // a number that will silently rot the moment the bench re-runs.
      expect(block).not.toMatch(/\|\s*[\d,]+\s*ms\s*\|/);
      expect(block).toContain('/badges/');
    });
  });
});
