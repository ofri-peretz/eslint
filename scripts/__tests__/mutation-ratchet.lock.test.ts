/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * @provenBy {"file":"scripts/lib/mutation-score.ts","find":"    if (score < prior.score)\n      return { rule, kind: 'regressed', current: score, baseline: prior.score };\n","replace":""}
 * @provenBy {"file":"scripts/lib/mutation-score.ts","find":"    if (prior[rule] && s.score < prior[rule].score && !allowRegression) {","replace":"    if (false) {"}
 * @provenBy {"file":"scripts/lib/mutation-score.ts","find":"      else if (status === 'Survived' && testsCompleted === 0) continue;\n","replace":""}
 * @provenBy {"file":".agent/mutation-baseline.json","find":"\"require-max-age\": {","replace":"\"require-max-age-renamed\": {"}
 */

/**
 * The mutation-score ratchet grades what it claims to grade.
 *
 * Stryker scores are only a gate if three things hold, and each one has a
 * quiet way to stop holding while everything stays green:
 *
 *   a drop fails      — a grader that only reports "improved" / "ok" turns the
 *                       baseline into a scoreboard nobody is held to
 *   lowering is loud  — `--update-baseline` after a regression must not bank
 *                       the lower number as a side effect; that is the same
 *                       regression, laundered through a re-run
 *   every rule counts — an opted-in plugin whose new rule has no banked score
 *                       is a rule the PR job grades as "unbaselined" exactly
 *                       once, on the PR that adds it, and never again unless
 *                       someone remembers
 *
 * The fourth case is a measurement artefact, not policy: the vitest runner
 * reports a mutant that crashes a test FILE at import as `Survived` with zero
 * tests completed. Counted, it charges every rule a phantom survivor.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  bank,
  failing,
  grade,
  ruleOf,
  scoreReport,
  type Baseline,
} from '../lib/mutation-score';

const ROOT = resolve(__dirname, '..', '..');

const s = (score: number) => ({
  score,
  killed: 0,
  survived: 0,
  noCoverage: 0,
  timeout: 0,
});

describe('grade', () => {
  it('fails a rule whose score dropped', () => {
    const v = grade({ r: s(79.9) }, { r: s(80) });
    expect(v).toEqual([
      { rule: 'r', kind: 'regressed', current: 79.9, baseline: 80 },
    ]);
    expect(failing(v)).toHaveLength(1);
  });

  it('fails a rule with no banked score', () => {
    expect(failing(grade({ r: s(100) }, {}))).toEqual([
      { rule: 'r', kind: 'unbaselined', current: 100 },
    ]);
  });

  it('passes an equal or better score and only grades the rules that ran', () => {
    const v = grade({ a: s(80), b: s(90) }, { a: s(80), b: s(85), c: s(99) });
    expect(v.map((x) => x.kind)).toEqual(['ok', 'improved']);
    expect(failing(v)).toEqual([]);
  });
});

describe('bank', () => {
  const base: Baseline = { plugins: { p: { rules: { a: s(80), b: s(70) } } } };

  it('refuses to lower a banked score without --allow-regression', () => {
    const r = bank(base, 'p', { a: s(60), b: s(75) }, false);
    expect(r.refused).toEqual(['a']);
    expect(r.baseline.plugins.p.rules.a.score).toBe(80);
    expect(r.baseline.plugins.p.rules.b.score).toBe(75);
  });

  it('lowers it when the regression is the stated decision', () => {
    expect(
      bank(base, 'p', { a: s(60) }, true).baseline.plugins.p.rules.a.score,
    ).toBe(60);
  });

  it('a scoped run merges instead of dropping the rules it did not mutate', () => {
    expect(
      Object.keys(
        bank(base, 'p', { c: s(50) }, false).baseline.plugins.p.rules,
      ),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('scoreReport', () => {
  const m = (status: string, testsCompleted?: number) => ({
    status,
    testsCompleted,
  });

  it('scores per rule: Killed+Timeout over Killed+Timeout+Survived+NoCoverage', () => {
    const scores = scoreReport({
      files: {
        'src/rules/a/index.ts': {
          mutants: [
            m('Killed', 3),
            m('Timeout', 1),
            m('Survived', 2),
            m('NoCoverage', 0),
            m('Ignored'),
            m('CompileError'),
          ],
        },
      },
    });
    expect(scores.a).toEqual({
      score: 50,
      killed: 1,
      timeout: 1,
      survived: 1,
      noCoverage: 1,
    });
  });

  it('does not count a survivor that ran zero tests (a test file that crashed at import)', () => {
    const scores = scoreReport({
      files: {
        'src/rules/a/index.ts': { mutants: [m('Killed', 4), m('Survived', 0)] },
      },
    });
    expect(scores.a.score).toBe(100);
  });

  it('maps only rule sources to rules', () => {
    expect(ruleOf('packages/eslint-plugin-x/src/rules/no-foo/index.ts')).toBe(
      'no-foo',
    );
    expect(ruleOf('src/rules/no-foo/helpers.ts')).toBe('no-foo');
    expect(ruleOf('src/rules/no-foo/no-foo.test.ts')).toBeUndefined();
    expect(ruleOf('src/utils/index.ts')).toBeUndefined();
    expect(ruleOf('src/rules/alt-text.ts')).toBe('alt-text');
    expect(ruleOf('src/rules/index.ts')).toBeUndefined();
  });
});

describe('the committed baseline', () => {
  const baseline = JSON.parse(
    readFileSync(join(ROOT, '.agent/mutation-baseline.json'), 'utf8'),
  ) as Baseline;

  it('opts at least one plugin in (an empty baseline gates nothing)', () => {
    expect(Object.keys(baseline.plugins).length).toBeGreaterThan(0);
  });

  it.each(Object.keys(baseline.plugins))(
    '%s has a banked score for every rule it ships',
    (plugin) => {
      const dir = join(
        ROOT,
        'packages',
        `eslint-plugin-${plugin}`,
        'src',
        'rules',
      );
      const shipped = readdirSync(dir)
        .map((d) =>
          statSync(join(dir, d)).isDirectory() ? d : ruleOf(`src/rules/${d}`),
        )
        .filter((r): r is string => r !== undefined)
        .toSorted();
      expect(Object.keys(baseline.plugins[plugin].rules).toSorted()).toEqual(
        shipped,
      );
    },
  );
});
