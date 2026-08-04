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
 * Usage: node scripts/ci-test-shard.mts <shardIndex 1-based> <shardTotal>
 *    or: node scripts/ci-test-shard.mts --matrix <shardTotal>   (emit GH matrix)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { decideAffected, reverseDeps, bucket, manifestDeps } from './lib/ci-shard-affected.mts';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/** Workspace globs that can hold testable packages. */
const WORKSPACE_DIRS = ['packages', 'apps', 'tools'];

type Pkg = { name: string; dir: string; task: 'test:coverage' | 'test'; cost: number; deps: string[] };

/**
 * Cost proxy for balancing: number of test files in the package.
 *
 * Not wall-clock — that would need a results database and would drift. File
 * count tracks runtime closely enough here (measured 738 files across 33
 * packages, and the observed 54s/299s shard split matched their file counts),
 * and it is derivable from the tree with no state to maintain.
 */
function countTestFiles(dir: string): number {
  let n = 0;
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'coverage') continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.(test|spec)\.(ts|tsx|mjs|js)$/.test(e.name)) n++;
    }
  };
  walk(dir);
  return n;
}

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
      // Coverage is deliberately NOT collected on PRs. v8 instrumentation
      // roughly doubles vitest's cost for a number nobody reads per-PR, and
      // codecov.yml now collects it on a daily cron instead. Set
      // CI_TEST_SHARD_COVERAGE=1 to opt back in (that daily job does).
      const wantCoverage = process.env.CI_TEST_SHARD_COVERAGE === '1';
      const task = wantCoverage && pkg.scripts?.['test:coverage']
        ? 'test:coverage'
        : pkg.scripts?.test
          ? 'test'
          : pkg.scripts?.['test:coverage']
            ? 'test:coverage'
            : null;
      if (task) testable.push({ name: pkg.name, dir, task, cost: countTestFiles(path.join(abs, entry)), deps: manifestDeps(pkg) });
      else if (!NO_TEST_ALLOWLIST.has(pkg.name)) untested.push(pkg.name);
    }
  }
  // Sort by cost desc, name asc as tiebreak. Descending order is what makes the
  // LPT bucketing below effective, and the name tiebreak keeps it deterministic
  // so a package keeps its shard (and therefore its Turbo cache key) run to run.
  testable.sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  return { testable, untested };
}

// `--matrix <total>` prints the GitHub matrix of shards that actually have
// work, for `strategy.matrix.shard: fromJSON(...)`.
//
// This is the single most valuable thing this script does, because runners —
// not CPU — are the binding constraint. Measured on PR #356: 4640s of job time
// was spent queueing for a runner versus 1052s computing (82%), with Typecheck
// waiting 732s to run for 81s. Under those conditions a fixed 10-way matrix on
// a one-package PR would acquire ten runners so nine could print "nothing to
// do" — actively worse than not sharding. Emitting only the non-empty shards
// keeps job count proportional to the size of the change.
const MATRIX_MODE = process.argv[2] === '--matrix';

/**
 * Write the shard list to GITHUB_OUTPUT (and stdout when run locally).
 *
 * `heavy` tells the workflow whether Build / Typecheck / Portability need to
 * run at all. It is false only when the diff touches no package source —
 * a root README, a .md doc, a workflow comment. Markdown is still linted:
 * quality.yml is a separate workflow with no such condition.
 */
function emitMatrix(shardNumbers: number[], heavy = true): void {
  const json = JSON.stringify(shardNumbers);
  console.log(`matrix=${json} heavy=${heavy}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `shards=${json}\nany=${shardNumbers.length > 0}\nheavy=${heavy}\n`,
    );
  }
}

const shardIndex = MATRIX_MODE ? 0 : Number(process.argv[2]);
const shardTotal = Number(process.argv[3]);

if (!MATRIX_MODE && (!Number.isInteger(shardIndex) || shardIndex < 1 || shardIndex > shardTotal)) {
  console.error(`Usage: node scripts/ci-test-shard.mts <shardIndex 1..N> <shardTotal N>`);
  console.error(`   or: node scripts/ci-test-shard.mts --matrix <shardTotal N>`);
  process.exit(2);
}
if (!Number.isInteger(shardTotal) || shardTotal < 1) {
  console.error(`shardTotal must be a positive integer`);
  process.exit(2);
}


const { testable, untested } = discoverPackages();
const REVERSE_DEPS = reverseDeps(testable);

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

const shards = bucket(testable, shardTotal);
let mine = MATRIX_MODE ? [] : shards[shardIndex - 1];

// ── Affected filtering ──────────────────────────────────────────────────────
//
// `--filter=...[origin/main]` was removed in #356 because turbo exits 0 when a
// filter selects nothing, so a PR touching only workflows reported a green
// tests check having run none. The speed it bought was real, though — most PRs
// touch one or two packages out of 33.
//
// This brings the speed back without the silent pass, by making the empty case
// explicit and guarded rather than implicit:
//
//   • A change to any global input (lockfile, turbo.json, base tsconfig, the
//     setup action, this script) has unbounded blast radius -> run everything.
//   • Otherwise run only packages whose own directory changed, plus everything
//     downstream of them via turbo's `...` dependency operator.
//   • If any file under packages/|apps/|tools/ changed but the affected set
//     came out empty, that is a bug in this logic, not a fast path -> hard
//     error. This is the invariant the old filter lacked.
//   • Genuinely nothing testable changed -> say so explicitly and exit 0. That
//     is a correct pass, and it is stated rather than inferred from silence.
//
// Set CI_TEST_SHARD_ALL=1 (main, cron, dispatch) to skip filtering entirely.
const BASE_REF = process.env.CI_TEST_SHARD_BASE ?? 'origin/main';


function changedFiles(): string[] | null {
  try {
    const base = execFileSync('git', ['merge-base', 'HEAD', BASE_REF], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: REPO_ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    // No base ref (shallow clone, detached main, fork) — cannot reason about
    // the diff, so fall back to running everything rather than guessing.
    return null;
  }
}

const runAll = process.env.CI_TEST_SHARD_ALL === '1';
let filterNote = 'all packages (filtering disabled)';
/** null = no filtering; otherwise the affected package names. */
let affected: Set<string> | null = null;

if (!runAll) {
  const changed = changedFiles();
  const decision = decideAffected(changed, testable, REVERSE_DEPS);
  if (decision.mode === 'bug') {
    console.error(`::error::Files changed under ${decision.dirs.join(', ')} but the affected set is empty.`);
    console.error('That is a bug in the affected computation, not a fast path. Refusing to report success.');
    process.exit(1);
  } else if (decision.mode === 'none') {
    if (MATRIX_MODE) {
      // Empty matrix -> GitHub spawns zero jobs, so a no-package PR costs no
      // runners at all instead of N that each start up only to no-op.
      // heavy=false additionally skips Build / Typecheck / Portability: a
      // docs-only change cannot affect any of them.
      emitMatrix([], false);
      console.log(`Nothing to test: ${decision.why} vs ${BASE_REF}.`);
      process.exit(0);
    }
    console.log(`Nothing to test: ${decision.why} vs ${BASE_REF}.`);
    console.log(`Changed files (${changed!.length}): ${changed!.slice(0, 10).join(', ')}${changed!.length > 10 ? ' …' : ''}`);
    process.exit(0);
  } else if (decision.mode === 'all') {
    filterNote = `all packages (${decision.why})`;
  } else {
    affected = decision.names;
    // `decision.names` is already the dependent CLOSURE, so intersecting it with
    // this shard's bucket yields a true partition: each affected package runs on
    // exactly one shard. Previously the closure was applied per shard via
    // `--filter=...<pkg>`, so every shard re-ran every downstream package.
    mine = mine.filter((p) => affected!.has(p.name));
    filterNote = `${affected.size} package(s) affected (incl. dependents) vs ${BASE_REF}`;
  }
}

if (MATRIX_MODE) {
  const live = shards
    .map((s, i) => ({ shard: i + 1, pkgs: affected ? s.filter((p) => affected!.has(p.name)) : s }))
    .filter((s) => s.pkgs.length > 0);
  for (const s of live) {
    console.log(`  shard ${s.shard}: ${s.pkgs.map((p) => p.name).join(', ')}`);
  }
  console.log(`Dispatching ${live.length} of ${shardTotal} shards (${filterNote}).`);
  emitMatrix(live.map((s) => s.shard));
  process.exit(0);
}

const loads = shards.map((s) => s.reduce((n, p) => n + p.cost, 0));
const bucketed = shards[shardIndex - 1];
console.log(
  `Shard ${shardIndex}/${shardTotal} — ${bucketed.length} of ${testable.length} packages bucketed, ` +
    `${loads[shardIndex - 1]} of ${loads.reduce((a, b) => a + b, 0)} test files ` +
    `(balance: ${Math.min(...loads)}–${Math.max(...loads)}) — running ${filterNote}`,
);
for (const p of mine) console.log(`  ${p.name}  (${p.task}, ${p.cost} test files)`);

// An empty *bucket* means shardTotal exceeds what the partition can fill — a
// job that reports success having tested nothing. Still fatal.
if (bucketed.length === 0) {
  console.error(`::error::Shard ${shardIndex}/${shardTotal} was allocated 0 packages out of ${testable.length}. Reduce shardTotal — an empty shard reports success without testing anything.`);
  process.exit(1);
}

// An empty *selection* after affected-filtering is legitimate and common: this
// shard owns packages, none of which this PR touched. Distinct from the case
// above, and stated explicitly rather than passing silently.
if (mine.length === 0) {
  console.log(`None of this shard's ${bucketed.length} packages were affected by this change — nothing to run.`);
  process.exit(0);
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
  // Plain `--filter=<pkg>`, never `...<pkg>`. Dependents are already in the
  // affected closure and bucketed into whichever shard owns them; re-expanding
  // here would run them again on every shard that happens to hold an upstream
  // package. A change to eslint-devkit still exercises all 20 plugins built on
  // it — they are in the closure — but each plugin runs once, not once per
  // shard.
  const spec = (p: Pkg) => `--filter=${p.name}`;
  // `--` forwards the rest to the package script, i.e. to `vitest run`.
  // `dot` is the cheapest reporter: one character per file instead of a line
  // per file across 742 files, with failures still printed in full. This is
  // output volume only — no assertion is skipped.
  // Coverage is off in every vitest config now (`coverage.enabled: false`), so
  // plain `vitest run` does not instrument. `test:coverage` passes `--coverage`
  // on the CLI, which overrides the config — that is how the daily codecov job
  // still collects it. No flag needed here.
  const args = ['turbo', 'run', task, ...group.map(spec), '--', '--reporter=dot'];
  console.log(`\n$ npx ${args.join(' ')}\n`);
  try {
    execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch {
    // Keep going so one failing group still reports the other's result.
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
