/**
 * Regression lock: a mistake we still make must never be counted as one we
 * have sealed.
 *
 * `FP:` and `FN:` in the case database are not a bug list. They are receipts —
 * an over-report we made against real code, or a defect we walked past, each
 * now held shut by a case that fails on the rule as it was. `GAP:` is the
 * honest opposite: a miss with no lock behind it.
 *
 * The bug this locks is the one the database actually had. Every seal is
 * applied by editing a case that already exists — an `FN:` case moves from
 * `valid` to `invalid` when the fix lands — and on the two occasions that
 * happened, the marker was dropped in the move. The record of the mistake
 * disappeared at the exact moment it became worth keeping, so the ledger read
 * `FN 0` while eleven misses had in fact been found and fixed.
 *
 * Two things keep that from recurring, and both are checked here:
 *
 *   1. A marker must agree with the array it sits in. `FN:` in `valid` claims
 *      a sealed miss that still passes silently; `GAP:` in `invalid` claims an
 *      open miss the rule already catches. Neither is a subtler position, so
 *      the extractor throws rather than reinterpreting.
 *   2. `GAP` must not satisfy any obligation `TP` satisfies. A rule cannot
 *      discharge its floor by documenting that it does not work.
 *
 *   npx vitest run --root benchmarks
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const LEDGER = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');

type Case = {
  id: string;
  kind: string;
  code: string;
  description: string;
  file: string;
  found?: string;
};
type Rule = { rule: string; cases: Case[] };

/**
 * REGENERATED, not read from the working tree.
 *
 * This read the committed `RULE_CASES.json`, which meant the three assertions
 * below verified whatever was last generated rather than what the test files
 * currently say. Add an `FN:` case in the wrong array, forget to regenerate,
 * and the lock passes — the exact "green check that tested nothing" this
 * repository has now produced three times.
 *
 * Regenerating also lets the artifact leave git: 135,000 lines of derivable
 * JSON were making every PR that touched a rule unreviewable.
 */
execFileSync('npx', ['tsx', 'scripts/rule-case-ledger.ts'], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: ['ignore', 'ignore', 'pipe'],
});

const db = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as {
  counts: Record<string, number>;
  rules: Rule[];
};
const all = db.rules.flatMap((r) => r.cases.map((c) => ({ rule: r.rule, c })));

describe('a seal and an admission are different rows', () => {
  it('every FP and FN carries a description — an undescribed receipt proves nothing', () => {
    const mute = all.filter(
      ({ c }) => (c.kind === 'FP' || c.kind === 'FN') && c.description === '',
    );
    expect(mute.map(({ c }) => c.id)).toEqual([]);
  });

  it('every FP and FN records how it was found', () => {
    // Without this the table cannot separate a mistake real code showed us
    // from one we reasoned our way to, and those carry different weight.
    const untraced = all.filter(
      ({ c }) => (c.kind === 'FP' || c.kind === 'FN') && c.found === undefined,
    );
    expect(untraced.map(({ c }) => c.id)).toEqual([]);
  });

  it('no rule reaches the case floor on GAP cases', () => {
    // The floor asks for three things a rule catches. A GAP is a thing it does
    // not catch, so a rule whose invalid side is thin cannot be topped up with
    // admissions.
    const propped = db.rules.filter((r) => {
      const catches = r.cases.filter(
        (c) => (c.kind === 'TP' || c.kind === 'FN') && c.code !== '',
      ).length;
      const gaps = r.cases.filter((c) => c.kind === 'GAP').length;
      return catches < 3 && gaps > 0;
    });
    expect(propped.map((r) => r.rule)).toEqual([]);
  });

  it('the extractor rejects a marker that contradicts its array', () => {
    // The real check: run the extractor over a file that makes the mistake and
    // require it to refuse. A lock that only re-reads the generated JSON would
    // pass identically against an extractor that had stopped checking.
    const probe = path.join(
      ROOT,
      'packages',
      'eslint-plugin-import-next',
      'src',
      'tests',
      '__coherence-probe.test.ts',
    );
    fs.writeFileSync(
      probe,
      [
        `import { noNamedAsDefault } from '../rules/no-named-as-default';`,
        `ruleTester.run('probe', noNamedAsDefault, {`,
        `  valid: [{ name: 'FN: a sealed miss that still passes silently', code: 'const a = 1;' }],`,
        `  invalid: [],`,
        `});`,
      ].join('\n'),
    );
    try {
      let failed = false;
      let output = '';
      try {
        execFileSync('npx', ['tsx', 'scripts/rule-case-ledger.ts', '--check'], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (error) {
        failed = true;
        const e = error as {
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        output = `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`;
      }
      expect(failed).toBe(true);
      expect(output).toContain('marked FN');
      expect(output).toContain('`invalid` array');
    } finally {
      fs.rmSync(probe, { force: true });
    }
  }, 120_000);
});
