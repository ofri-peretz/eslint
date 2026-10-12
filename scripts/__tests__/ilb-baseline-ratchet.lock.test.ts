/**
 * @provenBy {"file":"scripts/ilb-regression-check.ts","find":"if (dropped.length > 0 && !ALLOW_SHRINK) {","replace":"if (false) {"}
 * @provenBy {"file":"scripts/ilb-regression-check.ts","find":"if (fails.length > 0 && !ACCEPT_REGRESSIONS) {","replace":"if (false) {"}
 * @provenBy {"file":"scripts/ilb-regression-check.ts","find":"  if (missing.length > 0) {","replace":"  if (false) {"}
 * @provenBy {"file":".github/workflows/benchmark.yml","find":"if ! npx tsx scripts/ilb-wild.ts","replace":"if ! tsx scripts/ilb-wild.ts"}
 *
 * Lock: the ILB-Wild baseline is a ratchet, and the CI job measures something.
 *
 * Three ways this gate reported green while measuring nothing or moving the
 * wrong way, all reproduced against main on 2026-10-12:
 *
 * 1. `--update-baseline` overwrote unconditionally. A run that regressed became
 *    the new floor, and a 3-repo smoke run replaced the 22-repo corpus — after
 *    which the other 19 repos read "new repo (no baseline)" and were never
 *    compared again.
 * 2. benchmark.yml ran bare `tsx` in a `run:` step, where node_modules/.bin is
 *    not on PATH. Every run since the Turbo migration printed
 *    `tsx: command not found`, `|| echo ::warning::` swallowed it, and the check
 *    fell back to the newest COMMITTED summary (2026-08-03) — the same two
 *    stale files compared every week (run 37489272896).
 * 3. The `update_baseline` dispatch input wrote baseline.json on a runner with
 *    `contents: read` and no upload, so the file died with the runner.
 *
 * Sabotage proof: restore the unconditional write in ilb-regression-check.ts
 * and the shrink/regression cases fail; drop `--expect-repos` and the stale
 * summary case fails; put bare `tsx` or the `|| echo` back in benchmark.yml and
 * the workflow cases fail.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const REPO_ROOT = resolve(__dirname, '..', '..');
const SCRIPT = resolve(REPO_ROOT, 'scripts', 'ilb-regression-check.ts');

let dir: string;

function repo(name: string, activationRate = 50) {
  return {
    repo: name,
    success: true,
    findings: { total: 10, densityPerKloc: 1 },
    pluginCoverage: { 'secure-coding': { activationRate } },
  };
}

function summary(repos: object[]) {
  return { date: '2026-01-01', aggregate: { avgDensityPerKloc: 1 }, repos };
}

function writeBaseline(repos: object[]) {
  writeFileSync(join(dir, 'baseline.json'), JSON.stringify(summary(repos)));
}

function writeCurrent(repos: object[]) {
  mkdirSync(join(dir, '2026-01-02'), { recursive: true });
  writeFileSync(
    join(dir, '2026-01-02', 'summary.json'),
    JSON.stringify(summary(repos)),
  );
}

const baselineRepos = () =>
  (
    JSON.parse(readFileSync(join(dir, 'baseline.json'), 'utf8')) as {
      repos: { repo: string }[];
    }
  ).repos.map((r) => r.repo);

function run(...args: string[]): { out: string; status: number } {
  const result = spawnSync('tsx', [SCRIPT, '--results-dir', dir, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(REPO_ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`,
    },
  });
  return {
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ilb-ratchet-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ilb-regression-check --update-baseline is a one-way ratchet', () => {
  it('refuses a run that covers fewer repos than the baseline', () => {
    writeBaseline([repo('a'), repo('b'), repo('c')]);
    writeCurrent([repo('a')]);

    const { out, status } = run('--update-baseline');

    expect(status).toBe(2);
    expect(out).toMatch(/Baseline NOT updated.*2 repo/);
    expect(baselineRepos()).toEqual(['a', 'b', 'c']);
  });

  it('counts a repo that failed in this run as not covered', () => {
    writeBaseline([repo('a'), repo('b')]);
    writeCurrent([repo('a'), { repo: 'b', success: false }]);

    expect(run('--update-baseline').status).toBe(2);
    expect(baselineRepos()).toEqual(['a', 'b']);
  });

  it('refuses a run that regresses past a hard threshold', () => {
    writeBaseline([repo('a', 50), repo('b', 50)]);
    writeCurrent([repo('a', 20), repo('b', 50)]);

    const { out, status } = run('--update-baseline');

    expect(status).toBe(1);
    expect(out).toMatch(/activation dropped 30\.0pp/);
    expect(out).toMatch(/Baseline NOT updated/);
    expect(
      JSON.parse(readFileSync(join(dir, 'baseline.json'), 'utf8')).repos[0]
        .pluginCoverage['secure-coding'].activationRate,
    ).toBe(50);
  });

  it('moves forward on a clean run that covers at least the baseline', () => {
    writeBaseline([repo('a'), repo('b')]);
    writeCurrent([repo('a', 60), repo('b'), repo('c')]);

    expect(run('--update-baseline').status).toBe(0);
    expect(baselineRepos()).toEqual(['a', 'b', 'c']);
  });

  it('takes an explicit override for each refusal', () => {
    writeBaseline([repo('a', 50), repo('b')]);
    writeCurrent([repo('a', 20)]);

    expect(run('--update-baseline', '--allow-shrink').status).toBe(1);
    expect(
      run('--update-baseline', '--allow-shrink', '--accept-regressions').status,
    ).toBe(0);
    expect(baselineRepos()).toEqual(['a']);
  });

  it('bootstraps when there is no baseline yet', () => {
    writeCurrent([repo('a')]);

    expect(run('--update-baseline').status).toBe(0);
    expect(baselineRepos()).toEqual(['a']);
  });
});

describe('ilb-regression-check --expect-repos refuses a summary this run did not write', () => {
  it('fails when an expected repo is absent (stale committed summary)', () => {
    writeBaseline([repo('a')]);
    writeCurrent([repo('a')]);

    const { out, status } = run('--expect-repos', 'sst,a', '--summary-only');

    expect(status).toBe(2);
    expect(out).toMatch(/no successful result for: sst/);
  });

  it('fails when an expected repo is present but failed', () => {
    writeBaseline([repo('a')]);
    writeCurrent([{ repo: 'sst', success: false }]);

    expect(run('--expect-repos', 'sst', '--summary-only').status).toBe(2);
  });

  it('passes when every expected repo succeeded', () => {
    writeBaseline([repo('a')]);
    writeCurrent([repo('sst'), repo('a')]);

    expect(run('--expect-repos', 'sst,a', '--summary-only').status).toBe(0);
  });
});

describe('benchmark.yml ILB-Wild job', () => {
  const wf = readFileSync(
    resolve(REPO_ROOT, '.github', 'workflows', 'benchmark.yml'),
    'utf8',
  );
  const runLines = wf.split('\n').filter((l) => !l.trimStart().startsWith('#'));

  it('never invokes bare `tsx` (node_modules/.bin is not on PATH in a run: step)', () => {
    const bare = runLines.filter(
      (l) => /(^|[\s;&|(!])tsx\s/.test(l) && !/npx\s+(-y\s+)?tsx\s/.test(l),
    );
    expect(bare).toEqual([]);
  });

  it('does not turn a failed repo into a warning', () => {
    expect(runLines.join('\n')).not.toMatch(/ilb-wild\.ts[^\n]*\|\|\s*echo/);
  });

  it('checks the summary is this run’s in a step that is NOT continue-on-error', () => {
    const step = wf.slice(wf.indexOf('- name: Check the summary is this run'));
    const body = step.slice(0, step.indexOf('\n      - name:', 1));
    expect(body).toMatch(
      /ilb-regression-check\.ts --expect-repos "\$ILB_REPOS" --summary-only/,
    );
    expect(body).not.toMatch(/continue-on-error/);
  });

  it('strips whitespace from each repo name before passing it to ilb-wild', () => {
    // `sst, vercel-ai` would otherwise hand ` vercel-ai` to an exact-match
    // lookup and fail a valid repo.
    const loop = wf.slice(wf.indexOf('for r in "${REPOS[@]}"'));
    const body = loop.slice(0, loop.indexOf('npx tsx scripts/ilb-wild.ts'));
    expect(body).toContain('r="${r//[[:space:]]/}"');
  });

  it('has no update_baseline input that writes to a runner and discards the file', () => {
    expect(runLines.join('\n')).not.toMatch(/update_baseline/);
    expect(runLines.join('\n')).not.toMatch(/--update-baseline/);
  });
});
