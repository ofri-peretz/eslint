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
    return rest
      .slice(start, start + 1600)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  };

  it('stops the run instead of returning an empty result', () => {
    const body = runCatch();
    expect(body).toContain('process.exit(3)');
    expect(body).not.toMatch(/return\s*\[\s*\]/);
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
