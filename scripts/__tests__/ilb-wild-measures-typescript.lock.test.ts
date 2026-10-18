/**
 * @provenBy {"file":"scripts/lib/ilb-wild-config.ts","find":"import * as tsParser from '@typescript-eslint/parser';","replace":"import tsParser from '@typescript-eslint/parser';"}
 * @provenBy {"file":"scripts/lib/ilb-wild-config.ts","find":"      languageOptions: { parser: tsParser },","replace":"      languageOptions: {},"}
 * @provenBy {"file":"scripts/lib/ilb-wild-config.ts","find":"              parser: hermesParser,","replace":"              parser: undefined,"}
 * @provenBy {"file":"scripts/ilb-wild.ts","find":"    overrideConfig: wildOverrideConfig(pluginConfigBlocks, { flow: ${!!repo.flow} }),","replace":"    overrideConfig: pluginConfigBlocks,"}
 * @provenBy {"file":"scripts/ilb-wild.ts","find":"'express-security', 'postgresql-security'],","replace":"'express-security', 'pg'],"}
 * @provenBy {"file":"scripts/ilb-wild.ts","find":"`stderr (tail): ${stderrTail || '(empty)'}`","replace":"''"}
 * @provenBy {"file":"scripts/lib/ilb-parse-health.ts","find":"  if (rate <= MAX_PARSE_ERROR_RATE) return null;","replace":"  return null;"}
 * @provenBy {"file":"scripts/ilb-regression-check.ts","find":"  if (unmeasured.length > 0) {","replace":"  if (false) {"}
 * @provenBy {"file":"scripts/ilb-regression-check.ts","find":"    current.data.repos.filter((r) => r.success && !parseHealthProblem(r)).map((r) => r.repo),","replace":"    current.data.repos.filter((r) => r.success).map((r) => r.repo),"}
 *
 * Lock: ILB-Wild measures the code it reports on.
 *
 * Found in the full run of 2026-10-12, all present since at least the
 * 2026-05-03 baseline:
 *
 * 1. No TypeScript parser. Every .ts/.tsx file went to espree, failed on its
 *    first annotation, and was counted as a "parse error" and skipped. The
 *    baseline holds twentyhq at 4,787 parse errors of 4,978 files, supabase
 *    1,819 / 2,042, vercel-ai 1,327 / 1,431 — TypeScript repos were measured on
 *    their handful of .js files and reported as clean.
 *    The first fix imported the parser with a DEFAULT import, which is
 *    `undefined` in the CommonJS the worker runs as, and ESLint silently fell
 *    back to espree — so the parse check below runs under tsx, the worker's
 *    own module format, not in-process.
 * 2. Nothing refused such a result. A repo with 90% unparsed files "succeeded"
 *    and could be baselined.
 * 3. medusa, appwrite, nestjs-typeorm and twentyhq failed as "worker stdout
 *    unparseable; first 200 chars: " — and then nothing. They named the `pg`
 *    and `crypto` plugins, renamed/removed in #414 and #167, so the worker died
 *    resolving an import; the stderr that said so was discarded.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  onTestFinished,
} from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  BENCHMARK_REPOS,
  buildWorkerScript,
  describeWorkerFailure,
  missingPlugins,
} from '../ilb-wild';
import {
  parseHealthProblem,
  MAX_PARSE_ERROR_RATE,
} from '../lib/ilb-parse-health';

const REPO_ROOT = resolve(__dirname, '..', '..');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ilb-wild-ts-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/**
 * Lint `files` with the real config module, under tsx, from where the
 * generated worker runs (.bench-workers/) — the same module format and the
 * same dependency resolution. Returns the parse failures.
 */
function lintLikeTheWorker(
  files: Record<string, string>,
  opts: { flow?: boolean } = {},
) {
  for (const [name, src] of Object.entries(files))
    writeFileSync(join(dir, name), src);
  const workers = join(REPO_ROOT, '.bench-workers');
  mkdirSync(workers, { recursive: true });
  const probe = join(workers, `lock-probe-${process.pid}.ts`);
  onTestFinished(() => rmSync(probe, { force: true }));
  writeFileSync(
    probe,
    `import { ESLint } from 'eslint';
     import { wildOverrideConfig } from ${JSON.stringify(join(REPO_ROOT, 'scripts', 'lib', 'ilb-wild-config.ts'))};
     async function main() {
       const eslint = new ESLint({ cwd: ${JSON.stringify(dir)}, overrideConfigFile: true, overrideConfig: wildOverrideConfig([], ${JSON.stringify(opts)}) });
       const results = await eslint.lintFiles(${JSON.stringify(Object.keys(files).map((f) => join(dir, f)))});
       const fatal = results.flatMap((r) => r.messages.filter((m) => m.fatal).map((m) => r.filePath.split('/').pop() + ': ' + m.message));
       process.stdout.write(JSON.stringify({ linted: results.length, fatal }) + '\\n');
     }
     main();`,
  );
  const run = spawnSync(TSX, [probe], { cwd: REPO_ROOT, encoding: 'utf8' });
  expect(run.stderr).toBe('');
  return JSON.parse(run.stdout) as { linted: number; fatal: string[] };
}

describe('the ILB-Wild worker parses what the corpus is written in', () => {
  it('TypeScript: .ts/.tsx/.mts, under the CommonJS the worker runs as', () => {
    const files = {
      'decorated.ts': `
        import { Injectable } from '@nestjs/common';
        type Opts<T> = { value?: T | null };
        @Injectable()
        export class Svc<T extends object = {}> {
          constructor(private readonly opts: Opts<T>) {}
          get(): T | undefined { return this.opts.value ?? undefined; }
        }
        export const cast = <T,>(x: unknown) => x as T;
        export enum Mode { A = 'a', B = 'b' }`,
      'view.tsx': `
        export function List<T>({ items }: { items: T[] }): JSX.Element {
          return <ul>{items.map((i, n) => <li key={n}>{String(i)}</li>)}</ul>;
        }`,
      'esm.mts': `export const n: number = 1 satisfies number;`,
      'plain.js': `export const x = <div>jsx in js</div>;`,
    };
    expect(lintLikeTheWorker(files)).toEqual({ linted: 4, fatal: [] });
  });

  it('Flow-typed .js (React), for a repo that opts in', () => {
    const files = {
      'ReactDOMFB.js': `/** @flow */
        import type {ReactNodeList} from 'shared/ReactTypes';
        export function render(children: ReactNodeList, el: ?Element): {|root: mixed|} {
          return {root: <div>{children}</div>};
        }`,
    };
    expect(lintLikeTheWorker(files, { flow: true })).toEqual({
      linted: 1,
      fatal: [],
    });
  });

  it('the generated worker lints with that config, not its own', () => {
    const src = buildWorkerScript({ plugins: ['secure-coding'] }, ['/x.ts']);
    expect(src).toContain('scripts/lib/ilb-wild-config.ts');
    expect(src).toContain(
      'overrideConfig: wildOverrideConfig(pluginConfigBlocks, { flow: false })',
    );
    expect(
      buildWorkerScript({ plugins: ['secure-coding'], flow: true }, ['/x.js']),
    ).toContain('{ flow: true }');
  });
});

describe('ILB-Wild registry', () => {
  it('names only plugins that have a source package', () => {
    const missing = BENCHMARK_REPOS.flatMap((r) =>
      missingPlugins(r).map((p) => `${r.name}: ${p}`),
    );
    expect(missing).toEqual([]);
  });
});

describe('a repo that did not parse is not a measurement', () => {
  it('passes a corpus with a few unparseable files', () => {
    expect(
      parseHealthProblem({ fileCount: 1000, findings: { parseErrors: 3 } }),
    ).toBeNull();
    expect(
      parseHealthProblem({ fileCount: 6, findings: { parseErrors: 0 } }),
    ).toBeNull();
  });

  it('fails the shape every TypeScript repo had (twentyhq, 2026-05-03 baseline)', () => {
    expect(
      parseHealthProblem({ fileCount: 4978, findings: { parseErrors: 4787 } }),
    ).toMatch(/4787 of 4978 files \(96\.2%\) failed to parse/);
    const justOver = Math.floor(1000 * MAX_PARSE_ERROR_RATE) + 1;
    expect(
      parseHealthProblem({
        fileCount: 1000,
        findings: { parseErrors: justOver },
      }),
    ).not.toBeNull();
  });

  it('a worker failure carries its stderr', () => {
    const msg = describeWorkerFailure({
      stdout: '',
      stderr:
        'node:internal/modules/run_main:123\nError: Cannot find module ' +
        "'/repo/packages/eslint-plugin-pg/src/index.ts'",
      status: 1,
      signal: null,
    });
    expect(msg).toMatch(/exit 1/);
    expect(msg).toContain('eslint-plugin-pg/src/index.ts');
  });
});

describe('ilb-regression-check refuses results that did not parse', () => {
  const SCRIPT = join(REPO_ROOT, 'scripts', 'ilb-regression-check.ts');
  const repo = (name: string, parseErrors: number) => ({
    repo: name,
    success: true,
    fileCount: 100,
    findings: { total: 0, densityPerKloc: 0, parseErrors },
    pluginCoverage: { 'secure-coding': { activationRate: 10 } },
  });
  const summary = (repos: object[]) => ({
    date: '2026-01-01',
    aggregate: { avgDensityPerKloc: 1 },
    repos,
  });
  const run = (...args: string[]) => {
    const r = spawnSync(TSX, [SCRIPT, '--results-dir', dir, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return { out: `${r.stdout}${r.stderr}`, status: r.status };
  };

  beforeEach(() => {
    writeFileSync(
      join(dir, 'baseline.json'),
      JSON.stringify(summary([repo('a', 0)])),
    );
    mkdirSync(join(dir, '2026-01-02'));
    writeFileSync(
      join(dir, '2026-01-02', 'summary.json'),
      JSON.stringify(summary([repo('a', 0), repo('ts', 90)])),
    );
  });

  it('will not baseline it, even with every override', () => {
    const { out, status } = run(
      '--update-baseline',
      '--allow-shrink',
      '--accept-regressions',
    );
    expect(status).toBe(2);
    expect(out).toMatch(/ts: 90 of 100 files/);
    expect(
      JSON.parse(readFileSync(join(dir, 'baseline.json'), 'utf8')).repos,
    ).toHaveLength(1);
  });

  it('does not count it toward --expect-repos', () => {
    const { out, status } = run('--expect-repos', 'a,ts', '--summary-only');
    expect(status).toBe(2);
    expect(out).toMatch(/no successful result for: ts/);
  });
});
