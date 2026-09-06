/**
 * The cross-version matrix must not die on a peer's support policy.
 *
 * ILB-Arena refuses to score a config that fails to load, deliberately: a
 * silent `[]` is indistinguishable from a plugin that genuinely finds nothing,
 * and that is how a stale import once put Interlace last at F1 0%.
 *
 * But `eslint-plugin-unicorn@74` declares `peerDependencies.eslint: ">=10.4"`.
 * On the matrix's eslint-8.x cell its config cannot load, and the refusal took
 * the whole leg down with it — issue #891, red every week since 2026-08-15,
 * while our own rules were fine on all three majors.
 *
 * So the two cases are now distinguished, and this lock pins the distinction:
 * a peer that never claimed this major is excluded; anything else still stops
 * the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  NPM_PACKAGE_NAMES,
  OUR_PLUGIN_NAME,
  declaresSupportFor,
  peerEslintRange,
} from '../suites/ilb-arena/peer-support.js';

const ARENA = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../suites/ilb-arena',
);
const RUN_JS = fs.readFileSync(path.join(ARENA, 'run.js'), 'utf-8');

describe('a peer is only excused when it never claimed the major', () => {
  it('reads a declared range through an exports map that hides package.json', () => {
    // eslint-plugin-unicorn omits "./package.json" from `exports`, so
    // require.resolve('<pkg>/package.json') throws ERR_PACKAGE_PATH_NOT_EXPORTED.
    // Resolving that to null would make every peer read as "declares nothing"
    // — which is the `true` branch, and the leg dies again.
    expect(peerEslintRange('unicorn')).toBe('>=10.4');
  });

  it('excuses unicorn on eslint 8, the cell that was failing', () => {
    expect(declaresSupportFor('unicorn', '8.57.1')).toBe(false);
  });

  it('still scores unicorn on the majors it does claim', () => {
    expect(declaresSupportFor('unicorn', '10.10.0')).toBe(true);
  });

  it('never excuses our own plugin — a load failure there is always fatal', () => {
    expect(OUR_PLUGIN_NAME).toBe('interlace');
    expect(NPM_PACKAGE_NAMES[OUR_PLUGIN_NAME]).toBe(
      'eslint-plugin-secure-coding',
    );
  });

  it('treats an undeclared range as a claim of support, so it still fails loud', () => {
    expect(peerEslintRange('no-such-plugin-anywhere')).toBeNull();
    expect(declaresSupportFor('no-such-plugin-anywhere', '8.57.1')).toBe(true);
  });
});

/*
 * The vacuity that hid three defects for months.
 *
 * `runEslint` refused to score a config that FAILED TO LOAD, but a failure of
 * the lint RUN itself was downgraded to a warning returning []. An empty
 * result is indistinguishable from a plugin that found nothing, so it scored
 * as one. Measured on genuine ESLint 8 before this was closed: 36 run
 * failures, all 18 plugins at 0/40 TP and F1 0.0%, exit code 0 — a green run
 * that measured nothing. @angular-eslint scored that way on every published
 * run, on every ESLint major (#897).
 */
describe('a failed lint run is never scored as "found nothing"', () => {
  const RUN = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../suites/ilb-arena/run.js',
    ),
    'utf-8',
  );

  /** The body of runEslint's lint-run catch block. */
  const runCatch = (): string => {
    const at = RUN.indexOf('const results = await eslint.lintFiles(');
    expect(
      at,
      'lintFiles call not found — this lock is pointed at nothing',
    ).toBeGreaterThan(-1);
    const rest = RUN.slice(at);
    const start = rest.indexOf('} catch (e) {');
    expect(start, 'no catch around the lint run').toBeGreaterThan(-1);
    // Comments out first. This block explains the old `return []` in prose,
    // and a lock that reads its subject's commentary asserts nothing about
    // its code — the failure mode that made three locks vacuous this week.
    // The window has to hold the whole catch, and it grew when the crash
    // branch landed — at 1600 it stopped just short of `process.exit(3)` and
    // the lock failed for a reason that had nothing to do with its subject.
    // Sized to the block's closing brace instead of a guessed byte count.
    const end = rest.indexOf('\n  }', start);
    expect(end, 'catch block has no closing brace').toBeGreaterThan(start);
    return rest
      .slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  };

  it('never returns an empty result, whoever failed', () => {
    // The property, not the mechanism. `[]` is the thing that scores as
    // "found nothing" — that is what must never come back from here, and it
    // is what the 36-run/0-F1 measurement above was made of.
    expect(runCatch()).not.toMatch(/return\s*\[\s*\]/);
  });

  it('still stops the run when OUR plugin is the one that failed', () => {
    // Interlace failing is our bug and must block. This is the half that
    // stayed fatal when a peer's crash stopped being fatal (#897).
    const body = runCatch();
    expect(body).toContain('process.exit(3)');
    expect(body).toContain('OUR_PLUGIN_NAME');
  });

  it("records a peer's crash rather than scoring or halting on it", () => {
    // A peer that DECLARES this ESLint and throws anyway is an upstream
    // defect. Exiting there is honest about that plugin and dishonest about
    // the other seventeen: it left the whole matrix unmeasured, so the last
    // published numbers — the fabricated zeros — stayed the newest ones.
    const body = runCatch();
    expect(body).toContain('crash(');
  });

  it('still excuses a peer that never claimed the running major', () => {
    expect(runCatch()).toContain('UNSUPPORTED');
  });

  it('picks ESLint 8s flat-config engine, which lives elsewhere', () => {
    // v8 rejects `new ESLint({overrideConfigFile: true})` outright; its flat
    // engine is FlatESLint behind eslint/use-at-your-own-risk, off `.default`.
    expect(RUN).toContain('use-at-your-own-risk');
    expect(RUN).toContain('FlatESLint');
    expect(RUN).toMatch(/>=\s*9\)\s*return ESLint/);
  });
});

/*
 * The summary must survive records that carry no metrics.
 *
 * Every consumer below the table dereferences `data.metrics`. An excluded or
 * unmeasurable plugin has none, so an unfiltered summary throws
 * `Cannot read properties of undefined (reading 'f1Score')` — and the throw
 * lands after the table is printed but BEFORE results are saved, so a run
 * looks like it worked and silently writes nothing.
 *
 * It was invisible because the entrypoint was `.catch(console.error)`: the
 * error printed and the process still exited 0. Verifying by exit code alone
 * reported success on a run that produced no output file.
 */
describe('the summary tolerates records with no metrics', () => {
  const RUN = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../suites/ilb-arena/run.js',
    ),
    'utf-8',
  );

  it('ranks only scored records', () => {
    // The sort must not read from every plugin entry.
    expect(RUN).not.toMatch(
      /sortedPlugins\s*=\s*Object\.entries\(results\.plugins\)\.sort/,
    );
    expect(RUN).toMatch(/const scored = Object\.entries\(results\.plugins\)/);
    expect(RUN).toMatch(/d\.metrics !== undefined/);
  });

  it('still names what it did not score', () => {
    expect(RUN).toContain('Not scored:');
    expect(RUN).toMatch(/notScored:/);
  });

  it('fails the process when the run throws', () => {
    // `.catch(console.error)` exits 0 on any error — a bench that cannot fail
    // cannot gate, and this is what hid the summary crash.
    expect(RUN).not.toMatch(/runBenchmark\(\)\.catch\(console\.error\)/);
    expect(RUN).toMatch(
      /runBenchmark\(\)\.catch\([\s\S]{0,120}process\.exit\(1\)/,
    );
  });

  it('reproduces the crash on an unfiltered sort', () => {
    const plugins = {
      good: { displayName: 'Good', metrics: { f1Score: '50.0%' } },
      excluded: { displayName: 'Excluded' },
    };
    expect(() =>
      Object.entries(plugins).sort(
        ([, a]: [string, any], [, b]: [string, any]) =>
          parseFloat(b.metrics.f1Score) - parseFloat(a.metrics.f1Score),
      ),
    ).toThrow(/f1Score/);

    const scored = Object.entries(plugins).filter(
      ([, d]: [string, any]) => d.metrics !== undefined,
    );
    expect(() =>
      scored.sort(
        ([, a]: [string, any], [, b]: [string, any]) =>
          parseFloat(b.metrics.f1Score) - parseFloat(a.metrics.f1Score),
      ),
    ).not.toThrow();
    expect(scored).toHaveLength(1);
  });
});

/*
 * The guard that keeps @angular-eslint honest must itself be non-vacuous.
 *
 * angular.config.js excludes three rules that need a TypeScript program, by
 * name, because `requiresTypeChecking` is set on none of them. The exclusion
 * is only safe while something notices upstream changing the rule set — and
 * the first version of that check compared `runnable.length` against
 * `total - NEEDS_TYPE_PROGRAM.size`, which is the same subtraction on both
 * sides. It cancelled, and a newly-added type-aware rule passed it.
 */
describe('the angular type-aware exclusion is guarded by a real check', () => {
  const ANGULAR = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../suites/ilb-arena/configs/angular.config.js',
    ),
    'utf-8',
  );

  it('pins the rule total it was measured against', () => {
    // Without this, "upstream added a rule" is unobservable here.
    expect(ANGULAR).toMatch(/MEASURED_RULE_TOTAL\s*=\s*\d+/);
    expect(ANGULAR).toMatch(/all\.length !== MEASURED_RULE_TOTAL/);
  });

  it('rejects an entry upstream no longer publishes', () => {
    // A rename holds the total at 50 while leaving a live type-aware rule on.
    expect(ANGULAR).toMatch(/stale/);
    expect(ANGULAR).toContain('!all.includes(rule)');
  });

  it('never restores the cancelling comparison', () => {
    expect(ANGULAR).not.toMatch(/length\s*-\s*NEEDS_TYPE_PROGRAM\.size/);
  });

  it('scores angular for real — no unmeasurable flag anywhere', () => {
    // The bug in #897 was a fabricated 0/40. Marking the plugin unmeasurable
    // would hide the same absence behind a different word.
    expect(ANGULAR).not.toMatch(/unmeasurable/i);
    expect(RUN_JS).not.toMatch(/angular[\s\S]{0,200}?unmeasurable/i);
  });

  it('shows why the cancelling comparison could not catch a new rule', () => {
    // Pure reproduction: upstream ships rule 51, type-aware, unlisted.
    const listed = new Set(['a', 'b', 'c']);
    const upstream = [
      'a',
      'b',
      'c',
      ...Array.from({ length: 48 }, (_, i) => `r${i}`),
    ];
    const runnable = upstream.filter((r) => !listed.has(r));

    // Old guard, before rule 51 and after — passes both times.
    expect(runnable.length).toBe(upstream.length - listed.size);
    const grown = [...upstream, 'r48'];
    expect(grown.filter((r) => !listed.has(r)).length).toBe(
      grown.length - listed.size,
    );

    // New guard: the total moved, so it throws.
    expect(upstream.length).toBe(51);
    expect(grown.length).not.toBe(51);
  });
});
