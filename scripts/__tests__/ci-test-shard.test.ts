/**
 * Lock for the CI shard partitioner.
 *
 * The failure this guards against is silent under-testing: if bucketing ever
 * drops or duplicates a package, CI still reports green while some packages go
 * unrun — the exact class of bug that made `--filter=...[origin/main]` report
 * "0 successful, 0 total" as a pass on PR #355.
 *
 * Asserts against the real repo layout rather than fixtures so that adding a
 * workspace without a test task fails here too.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci-test-shard.mts');
const SHARD_TOTAL = 10;

/** Run the splitter in list-only mode by reading its plan off stdout. */
function planFor(shard: number, total = SHARD_TOTAL): string[] {
  // The script prints "  <name>  (<task>)" per selected package before running
  // turbo. `CI_TEST_SHARD_PLAN_ONLY=1` makes it exit right after printing that
  // plan — that env var, not the shard arithmetic, is what keeps this lock from
  // invoking the real suite.
  const out = execFileSync('npx', ['tsx', SCRIPT, String(shard), String(total)], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, CI_TEST_SHARD_PLAN_ONLY: '1' },
  });
  const names = [...out.matchAll(/^ {2}(\S+) {2}\((?:test|test:coverage), \d+ test files\)$/gm)].map((m) => m[1]);
  // Fail loudly rather than returning [] if the plan format changes — an empty
  // parse would make "no duplicates" and "covers everything" trivially pass or
  // fail for the wrong reason.
  if (names.length === 0) throw new Error(`shard ${shard}/${total}: parsed 0 packages from plan output:\n${out}`);
  return names;
}

describe('shard partitioning', () => {
  const shards = Array.from({ length: SHARD_TOTAL }, (_, i) => planFor(i + 1));
  const all = shards.flat();

  it('assigns every testable package to exactly one shard', () => {
    const dupes = all.filter((p, i) => all.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it('covers every workspace that declares a test task', () => {
    const expected: string[] = [];
    for (const wsDir of ['packages', 'apps', 'tools']) {
      const abs = path.join(REPO_ROOT, wsDir);
      if (!fs.existsSync(abs)) continue;
      for (const entry of fs.readdirSync(abs)) {
        const manifest = path.join(abs, entry, 'package.json');
        if (!fs.existsSync(manifest)) continue;
        const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        if (pkg.scripts?.['test:coverage'] || pkg.scripts?.test) expected.push(pkg.name);
      }
    }
    expect([...all].sort()).toEqual(expected.sort());
  });

  it('leaves no shard empty', () => {
    // An empty shard is a job that reports success having tested nothing.
    for (const [i, s] of shards.entries()) expect(s.length, `shard ${i + 1} is empty`).toBeGreaterThan(0);
  });

  it('is deterministic across invocations', () => {
    // Turbo cache keys depend on a package landing on the same shard each run.
    expect(planFor(1)).toEqual(shards[0]);
  });
});
