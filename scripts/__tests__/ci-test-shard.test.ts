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

const REPO_ROOT = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '../..',
);
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci-test-shard.mts');

/**
 * The two lanes and their shard counts, mirroring quality-full.yml.
 *
 * The partition is across BOTH lanes, not within either one: a package dropped
 * from the node lane and never picked up by the web lane is exactly the silent
 * under-testing this file exists to catch, and a per-lane assertion would miss
 * it. Every test below therefore works on the union.
 */
const LANES = [
  { lane: 'node', total: 4 },
  { lane: 'web', total: 3 },
] as const;

/** Run the splitter in list-only mode by reading its plan off stdout. */
function planFor(shard: number, total: number, lane: string): string[] {
  // The script prints "  <name>  (<task>)" per selected package before running
  // turbo. `CI_TEST_SHARD_PLAN_ONLY=1` makes it exit right after printing that
  // plan — that env var, not the shard arithmetic, is what keeps this lock from
  // invoking the real suite.
  // `node`, not `npx tsx`: the workflow runs `node scripts/ci-test-shard.mts`,
  // and tsx is not a dependency of this repo — `npx tsx` would hit the registry
  // at test time and exercise esbuild's transform instead of Node's native
  // .mts type stripping, i.e. lock a code path production does not use.
  const out = execFileSync(
    'node',
    [SCRIPT, String(shard), String(total), '--lane', lane],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      // CI_TEST_SHARD_ALL=1 is required, not incidental. Without it the script
      // applies affected filtering against origin/main, so on a branch touching
      // a few packages the plan is the FILTERED subset — and the assertions
      // below ("covers every package exactly once", "no shard empty") would then
      // be checking the diff rather than the partition, passing vacuously on a
      // branch that changed nothing.
      env: {
        ...process.env,
        CI_TEST_SHARD_PLAN_ONLY: '1',
        CI_TEST_SHARD_ALL: '1',
      },
    },
  );
  // A package split with `vitest --shard` appears once PER SLICE, so the unit
  // parsed here is "name" or "name#i/n" — not just the package name. Collapsing
  // slices back to the bare name would make a MISSING slice invisible to the
  // duplicate and coverage assertions below, and a missing slice is silently
  // untested files behind a green check.
  const names = [
    ...out.matchAll(
      /^ {2}(\S+)(?: \[slice (\d+)\/(\d+)\])? {2}\((?:test|test:coverage), ~?\d+s\)$/gm,
    ),
  ].map((m) => (m[2] ? `${m[1]}#${m[2]}/${m[3]}` : m[1]));
  // Fail loudly rather than returning [] if the plan format changes — an empty
  // parse would make "no duplicates" and "covers everything" trivially pass or
  // fail for the wrong reason.
  if (names.length === 0)
    throw new Error(
      `${lane} shard ${shard}/${total}: parsed 0 packages from plan output:\n${out}`,
    );
  return names;
}

/**
 * Mirror of `SPLIT_ACROSS_SHARDS` in scripts/ci-test-shard.mts. Deliberately
 * duplicated rather than imported: importing the .mts would run its top-level
 * discovery, and a lock that derives its expectation from the code under test
 * agrees with that code by construction — including when both are wrong.
 */
const SPLIT_ACROSS_SHARDS: Record<string, number> = { docs: 3 };

/**
 * Every workspace directory, expanded from the root manifest's `workspaces`.
 *
 * Two shapes: `<group>/*` (expand the children) and a plain directory, which
 * is the workspace itself. Reading the manifest is the whole point — see the
 * comment in the coverage assertion below.
 */
function workspaceDirs(): string[] {
  const globs: string[] = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
  ).workspaces;
  const out: string[] = [];
  for (const glob of globs) {
    if (!glob.endsWith('/*')) {
      out.push(glob);
      continue;
    }
    const wsDir = glob.slice(0, -2);
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) out.push(`${wsDir}/${entry}`);
  }
  return out;
}

describe('shard partitioning', () => {
  const shards = LANES.flatMap(({ lane, total }) =>
    Array.from({ length: total }, (_, i) => planFor(i + 1, total, lane)),
  );
  const all = shards.flat();

  it('assigns every package — and every slice of a split package — exactly once', () => {
    const dupes = all.filter((p, i) => all.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it('covers every workspace that declares a test task', () => {
    /*
     * The workspace list comes off the root manifest, not a literal
     * ['packages','apps','tools'].
     *
     * That literal is what this assertion USED to iterate — the same wrong
     * list the script itself held — so the two agreed with each other and
     * disagreed with `package.json`, which also declares `benchmarks`. A lock
     * that mirrors the implementation's assumption instead of the source of
     * truth cannot catch the drift between them: `@interlace/benchmarks` was
     * absent from both sides and this test passed for as long as it existed.
     */
    const expected: string[] = [];
    for (const dir of workspaceDirs()) {
      const manifest = path.join(REPO_ROOT, dir, 'package.json');
      {
        if (!fs.existsSync(manifest)) continue;
        const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        if (pkg.scripts?.['test:coverage'] || pkg.scripts?.test) {
          // Mirrors SPLIT_ACROSS_SHARDS in the script. A package listed there
          // must contribute all N slices — this is what catches a slice that
          // stopped being emitted.
          const slices = SPLIT_ACROSS_SHARDS[pkg.name] ?? 1;
          if (slices > 1) {
            for (let i = 1; i <= slices; i++)
              expected.push(`${pkg.name}#${i}/${slices}`);
          } else {
            expected.push(pkg.name);
          }
        }
      }
    }
    expect([...all].sort()).toEqual(expected.sort());
  });

  it('leaves no shard empty', () => {
    // An empty shard is a job that reports success having tested nothing.
    for (const [i, s] of shards.entries())
      expect(s.length, `shard ${i + 1} is empty`).toBeGreaterThan(0);
  });

  it.each(LANES)(
    'is deterministic across invocations ($lane lane)',
    ({ lane, total }) => {
      // Turbo cache keys depend on a package landing on the same shard each run.
      const first =
        LANES.findIndex((l) => l.lane === lane) === 0 ? 0 : LANES[0].total;
      expect(planFor(1, total, lane)).toEqual(shards[first]);
    },
  );
});
