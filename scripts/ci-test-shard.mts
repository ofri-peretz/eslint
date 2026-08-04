/**
 * Split the test-bearing workspaces across N CI shards and run one shard.
 *
 * Why shard by *package* rather than with `vitest --shard`: Turborepo caches
 * per package-task. Splitting inside a package would make every shard a
 * distinct, uncacheable slice of the same task, so a cache hit could never
 * replay — we'd trade one cache hit for N cold runs. Bucketing whole packages
 * keeps each `<pkg>#test:coverage` a normal, cacheable Turbo task.
 *
 * Bucketing is deterministic (sorted names, round-robin by index) so a given
 * package always lands on the same shard number across runs and its Turbo
 * cache key stays stable.
 *
 * Usage: tsx scripts/ci-test-shard.mts <shardIndex 1-based> <shardTotal>
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/** Workspace globs that can hold testable packages. */
const WORKSPACE_DIRS = ['packages', 'apps', 'tools'];

type Pkg = { name: string; dir: string; task: 'test:coverage' | 'test' };

/**
 * Packages allowed to have no test task at all. Anything else missing one is a
 * hard failure — otherwise deleting a `test` script silently removes a package
 * from CI while every check stays green.
 */
const NO_TEST_ALLOWLIST = new Set<string>(['registry']);

function discoverPackages(): { testable: Pkg[]; untested: string[] } {
  const testable: Pkg[] = [];
  const untested: string[] = [];
  for (const wsDir of WORKSPACE_DIRS) {
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      const dir = `${wsDir}/${entry}`;
      // Prefer test:coverage so the 100% thresholds declared in each
      // vitest.config.mts are actually enforced. Fall back to plain `test` for
      // workspaces that have tests but no coverage task (docs,
      // cwe-analytics-engine) — dropping them would be a coverage regression
      // disguised as a sharding change.
      if (pkg.scripts?.['test:coverage']) testable.push({ name: pkg.name, dir, task: 'test:coverage' });
      else if (pkg.scripts?.test) testable.push({ name: pkg.name, dir, task: 'test' });
      else if (!NO_TEST_ALLOWLIST.has(pkg.name)) untested.push(pkg.name);
    }
  }
  testable.sort((a, b) => a.name.localeCompare(b.name));
  return { testable, untested };
}

const shardIndex = Number(process.argv[2]);
const shardTotal = Number(process.argv[3]);

if (!Number.isInteger(shardIndex) || !Number.isInteger(shardTotal) || shardIndex < 1 || shardTotal < 1 || shardIndex > shardTotal) {
  console.error(`Usage: tsx scripts/ci-test-shard.mts <shardIndex 1..N> <shardTotal N>`);
  process.exit(2);
}

const { testable, untested } = discoverPackages();

// Zero-selection guard. `turbo run test --filter=...[origin/main]` used to
// report a green check having executed nothing (observed on PR #355:
// "Running test in 1 packages / Tasks: 0 successful, 0 total"). A gate that
// passes while verifying nothing is worse than no gate, so an empty universe
// is a hard failure, not a silent success.
if (testable.length === 0) {
  console.error(`::error::No workspace declares a \`test\` or \`test:coverage\` script. Refusing to report success without running any tests.`);
  process.exit(1);
}

if (untested.length > 0) {
  console.error(`::error::These workspaces declare no test task and are not allowlisted: ${untested.join(', ')}`);
  console.error('Add a test script, or add the package to NO_TEST_ALLOWLIST in scripts/ci-test-shard.mts with a reason.');
  process.exit(1);
}

// Round-robin so slow packages spread across shards instead of clustering.
const mine = testable.filter((_, i) => i % shardTotal === shardIndex - 1);

console.log(`Shard ${shardIndex}/${shardTotal} — ${mine.length} of ${testable.length} testable packages:`);
for (const p of mine) console.log(`  ${p.name}  (${p.task})`);

if (mine.length === 0) {
  console.error(`::error::Shard ${shardIndex}/${shardTotal} selected 0 packages out of ${testable.length}. Reduce shardTotal — an empty shard reports success without testing anything.`);
  process.exit(1);
}

// Plan-only mode: print the selection and exit, without running anything. Used
// by scripts/__tests__/ci-test-shard.test.ts to assert the partition covers
// every package exactly once — that lock can't invoke the real suite.
if (process.env.CI_TEST_SHARD_PLAN_ONLY === '1') process.exit(0);

// Two invocations rather than one: `turbo run test:coverage test` would run
// *both* tasks for packages that define both, doubling their runtime.
let failed = false;
for (const task of ['test:coverage', 'test'] as const) {
  const group = mine.filter((p) => p.task === task);
  if (group.length === 0) continue;
  const args = ['turbo', 'run', task, ...group.map((p) => `--filter=${p.name}`)];
  console.log(`\n$ npx ${args.join(' ')}\n`);
  try {
    execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch {
    // Keep going so one failing group still reports the other's result.
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
