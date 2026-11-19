/**
 * @provenBy {"file":"packages/eslint-plugin-import-next/README.md","find":"passes **2,035 of 2,135** (95.3%)","replace":"passes **2,135 of 2,135** (100.0%)"}
 * @provenBy {"file":"packages/eslint-plugin-import-next/README.md","find":"**all 45 of its tested rules are implemented**","replace":"**all 44 of its tested rules are implemented**"}
 * @provenBy {"file":"benchmarks/results/ilb-import-parity/2026-11-19.json","find":"\"passed\": 2035,","replace":"\"passed\": 2135,"}
 * @provenBy {"file":"packages/eslint-plugin-import-next/README.md","find":"No graded case sets an option","replace":"Hardly any graded case sets an option"}
 */

/*
 * The README's import-next parity sentence is a measurement, and only that.
 *
 * It used to say "Full drop-in replacement", which nothing had measured.
 * Graded by eslint-plugin-import's own test suite, import-next passes about
 * half of its cases (PRINCIPLES.md: "measured or it is a slogan"). The figure
 * now comes from one committed envelope, benchmarks/results/ilb-import-parity/,
 * written by benchmarks/suites/ilb-competitor-parity/import-drop-in.mts.
 *
 * Re-running the grader needs a pinned upstream checkout, which CI does not
 * have. So this lock does not re-grade. It checks three things that can each
 * drift on their own:
 *
 *   1. The envelope agrees with itself. The headline is recomputed from the
 *      per-rule rows, and every row's cases add up.
 *   2. The envelope grades the committed corpus: same upstream commit, same
 *      number of cases.
 *   3. The README states the envelope's numbers and links that same file.
 *      Editing either one without the other fails here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const README = fs.readFileSync(
  path.join(ROOT, 'packages/eslint-plugin-import-next/README.md'),
  'utf8',
);
const CORPUS = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'benchmarks/corpus/competitor-parity/eslint-plugin-import.json',
    ),
    'utf8',
  ),
);

type Row = {
  rule: string;
  implemented: boolean;
  cases: number;
  graded: number;
  passed: number;
  validGraded: number;
  validPassed: number;
  invalidGraded: number;
  invalidPassed: number;
  excluded: Record<string, number>;
  failures: Record<string, number>;
};

/** The envelope the README links. There must be exactly one such link. */
const cited = [
  ...README.matchAll(
    /benchmarks\/results\/ilb-import-parity\/([\w.-]+\.json)/g,
  ),
].map((m) => m[1]);
const RESULT = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'benchmarks/results/ilb-import-parity',
      cited[0] ?? 'missing.json',
    ),
    'utf8',
  ),
);
const rows: Row[] = RESULT.rules;
const sum = (f: (r: Row) => number, rs = rows) =>
  rs.reduce((s, r) => s + f(r), 0);
const total = (o: Record<string, number>) =>
  Object.values(o).reduce((s, n) => s + n, 0);
/** `1,180` → 1180 */
const num = (s: string) => Number(s.replace(/,/g, ''));
const fmt = (n: number) => n.toLocaleString('en-US');

describe('the parity envelope agrees with itself', () => {
  it('every row accounts for every one of its cases', () => {
    for (const r of rows) {
      expect(r.graded + total(r.excluded), r.rule).toBe(r.cases);
      expect(r.passed + total(r.failures), r.rule).toBe(r.graded);
      expect(r.validGraded + r.invalidGraded, r.rule).toBe(r.graded);
      expect(r.validPassed + r.invalidPassed, r.rule).toBe(r.passed);
      // An unimplemented rule cannot pass a case.
      if (!r.implemented) expect(r.passed, r.rule).toBe(0);
    }
  });

  it('the headline is the sum of the rows', () => {
    const h = RESULT.headline;
    expect(h.passed).toBe(sum((r) => r.passed));
    expect(h.graded).toBe(sum((r) => r.graded));
    expect(h.captured).toBe(sum((r) => r.cases));
    expect(h.excluded).toBe(sum((r) => total(r.excluded)));
    expect(h.rules).toBe(rows.length);
    expect(h.rulesNotImplemented).toEqual(
      rows.filter((r) => !r.implemented).map((r) => r.rule),
    );
    expect(total(h.failuresByOutcome)).toBe(h.graded - h.passed);
    expect(RESULT.failing).toHaveLength(h.graded - h.passed);
  });
});

/**
 * The ratchet. The envelope the README cites may be replaced by a newer
 * measurement, never by a lower one: a change that makes import-next pass
 * fewer of eslint-plugin-import's own cases has to say so here.
 */
const PASSED_FLOOR = 2035;

describe('the parity score only goes up', () => {
  it(`passes at least ${PASSED_FLOOR} graded cases`, () => {
    expect(RESULT.headline.passed).toBeGreaterThanOrEqual(PASSED_FLOOR);
  });
});

describe('the envelope grades the committed corpus', () => {
  it('names the same upstream commit and case count', () => {
    expect(RESULT.upstreamCommit).toBe(CORPUS.source.commit);
    expect(RESULT.incumbent).toBe(
      `${CORPUS.source.package}@${CORPUS.source.version}`,
    );
    expect(RESULT.headline.captured).toBe(CORPUS.cases.length);
    expect(CORPUS.counts.total).toBe(CORPUS.cases.length);
  });

  it('hashes the corpus and the extractor into its methodology', () => {
    expect(RESULT.methodologyPaths).toEqual(
      expect.arrayContaining([
        'benchmarks/suites/ilb-competitor-parity/import-drop-in.mts',
        'benchmarks/scripts/extract-import-cases.cjs',
        'benchmarks/corpus/competitor-parity/eslint-plugin-import.json',
      ]),
    );
  });

  it('keeps the incumbent licence notice with the cases', () => {
    expect(CORPUS.source.license).toBe('MIT');
    expect(CORPUS.licenseText).toMatch(/Copyright \(c\) 2015 Ben Mosher/);
    expect(CORPUS.licenseText).toMatch(/Permission is hereby granted/);
  });
});

describe('the README states the measured numbers', () => {
  it('cites exactly one envelope, and it exists', () => {
    expect(cited).toHaveLength(1);
  });

  it('no longer claims a full drop-in replacement', () => {
    expect(README).not.toMatch(/full drop-in replacement/i);
  });

  it('passes N of M (P%) — all three from the envelope', () => {
    const m = README.match(
      /passes \*\*([\d,]+) of ([\d,]+)\*\* \(([\d.]+)%\) of `eslint-plugin-import`@([\d.]+)'s own test cases/,
    );
    expect(m, 'parity sentence not found').not.toBeNull();
    const [, passed, graded, pct, version] = m!;
    const h = RESULT.headline;
    expect(num(passed)).toBe(h.passed);
    expect(num(graded)).toBe(h.graded);
    expect(pct).toBe(((100 * h.passed) / h.graded).toFixed(1));
    expect(`eslint-plugin-import@${version}`).toBe(RESULT.incumbent);
    // Written the way the README writes numbers, so a copy-paste can't drift.
    expect(passed).toBe(fmt(h.passed));
  });

  it('names how many rules, and which, are not implemented', () => {
    const h = RESULT.headline;
    // Every tested rule implemented: the README says so, in these words.
    if (h.rulesNotImplemented.length === 0) {
      expect(README).toContain(
        `**all ${h.rules} of its tested rules are implemented**`,
      );
      expect(README).not.toMatch(/tested rules are not implemented/);
      return;
    }
    const m = README.match(
      /\*\*(\d+) of its (\d+) tested rules are not implemented\*\* \(([^)]*)\)/,
    );
    expect(m, 'not-implemented clause not found').not.toBeNull();
    const [, missing, of, names] = m!;
    expect(Number(missing)).toBe(h.rulesNotImplemented.length);
    expect(Number(of)).toBe(h.rules);
    expect(names.split(',').map((s) => s.trim().replace(/`/g, ''))).toEqual(
      h.rulesNotImplemented,
    );
  });

  it('states the exclusion count the envelope records', () => {
    const m = README.match(
      /leaves out ([\d,]+) of the ([\d,]+) captured cases/,
    );
    expect(m).not.toBeNull();
    expect(num(m![1])).toBe(RESULT.headline.excluded);
    expect(num(m![2])).toBe(RESULT.headline.captured);
  });

  it('states the failure breakdown the envelope records', () => {
    const f = RESULT.headline.failuresByOutcome;
    // An outcome with no cases is absent from the envelope, not zero.
    const rejected = f['options-rejected'] ?? 0;
    expect(README).toContain(
      rejected === 0
        ? 'No graded case sets an option `import-next` rejects'
        : `${fmt(rejected)} failing cases set an option`,
    );
    expect(README).toContain(
      `${fmt(f['misses-invalid'])} invalid cases go unreported`,
    );
    expect(README).toContain(
      `${fmt(f['reports-valid'])} valid cases are reported`,
    );
    expect(README).toContain(
      `${fmt(f['different-count'])} report a different number of times`,
    );
    // A rule that is not implemented fails every graded case it has; the
    // README counts them, or says there are none.
    if (f['not-implemented']) {
      expect(README).toContain(
        `${fmt(f['not-implemented'])} cases belong to the`,
      );
    } else {
      expect(README).toContain('none is an unimplemented rule');
    }
    expect(README).toContain(
      `${RESULT.headline.rulesFullyPassing} rules pass every graded case`,
    );
  });
});
