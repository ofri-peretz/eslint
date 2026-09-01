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
import { changedFilesSince, warnUnresolvedBase } from './lib/ci-changed-files.mts';
import { decideAffected, reverseDeps, bucket, manifestDeps } from './lib/ci-shard-affected.mts';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/** Workspace globs that can hold testable packages. */
const WORKSPACE_DIRS = ['packages', 'apps', 'tools'];

type Pkg = {
  name: string;
  dir: string;
  task: 'test:coverage' | 'test';
  cost: number;
  deps: string[];
  /** Set when this entry is one slice of a package split across CI shards. */
  split?: { i: number; n: number };
};

/**
 * The two dependency worlds this monorepo actually has.
 *
 * `web` packages pull in the Next.js/React tree — `next` (200 MB unpacked),
 * `@next` (86), `mermaid` (84), posthog (86), fumadocs, `@base-ui`, `recharts`.
 * `node` packages — every ESLint plugin, the devkit, the formatters, the tools
 * — pull in none of it.
 *
 * Before this split the two shared one shard matrix, so ANY shard might be
 * handed a `web` package and every shard therefore had to restore the whole
 * 451 MB `node_modules` archive. Measured on run 33337052316: 13.3s of restore
 * per job, ten jobs, to execute 43s of tests. Eight of those ten held nothing
 * but ESLint plugins and never opened a byte of it.
 *
 * Membership is DERIVED, not listed. A workspace is `web` because its manifest
 * declares something the lean archive trims, or because it depends on a
 * workspace that does — never because someone wrote its name down. A hardcoded
 * set was the first implementation and it was wrong in the one direction that
 * matters silently: a new or renamed workspace with the web dependency closure
 * would keep getting lean dependencies until a human remembered to add it, and
 * the failure is a MODULE_NOT_FOUND in whichever shard happened to hold it.
 */
const LEAN_TRIMMED = new Set(
  fs
    .readFileSync(path.join(REPO_ROOT, '.github', 'lean-node-modules.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')),
);

type Lane = 'node' | 'web';

/**
 * Does this manifest declare anything the lean archive removes?
 *
 * Scope-aware: the list carries `@base-ui`, the manifest carries
 * `@base-ui/react`. Matching the bare name only would have classed
 * `@interlace/ui` as node-lane and handed it a tree without its own UI
 * primitives.
 */
function declaresTrimmed(manifest: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}): boolean {
  const deps = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ];
  return deps.some(
    (d) => LEAN_TRIMMED.has(d) || LEAN_TRIMMED.has(d.split('/')[0]),
  );
}

/**
 * Packages split across several CI shards with `vitest --shard`.
 *
 * LPT bucketing cannot produce a shard faster than the single largest item, so
 * while a package is one indivisible unit it is a floor on the whole gate. On
 * 2026-08-30 `docs` was that floor: 144s against 19-47s for every other shard,
 * and it alone was the critical path of the REQUIRED `Quality (Full) Gate`.
 * Rebalancing could not have helped — only splitting the item can.
 *
 * Slice count is chosen against the partition floor, not minimised. Total test
 * work is ~375s over 10 shards, so no bucketing can beat ~37s average however
 * finely anything is split — the goal is only to get the largest item BELOW
 * that floor so LPT can actually reach it. At 6 slices `docs` contributes ~24s
 * per slice, comfortably under. Splitting further buys nothing: each extra
 * shard pays ~12-16s to acquire a runner, and the gate is then bounded by
 * `Build` (45s) and `Benchmark configs load` (50s) regardless.
 *
 * The repo is public, so Actions minutes are free — the constraint here is the
 * concurrent-job cap and per-runner startup, not billing.
 *
 * NOT applied when collecting coverage — see `wantCoverage` below.
 */
const SPLIT_ACROSS_SHARDS: Record<string, number> = { docs: 3 };

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

const wantCoverage = process.env.CI_TEST_SHARD_COVERAGE === '1';

/** Every workspace manifest, with the directory it came from. */
function readWorkspaces(): { dir: string; entry: string; abs: string; pkg: any }[] {
  const out: { dir: string; entry: string; abs: string; pkg: any }[] = [];
  for (const wsDir of WORKSPACE_DIRS) {
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      out.push({
        dir: `${wsDir}/${entry}`,
        entry,
        abs,
        pkg: JSON.parse(fs.readFileSync(manifest, 'utf8')),
      });
    }
  }
  return out;
}

/**
 * Lane per workspace, derived from manifests.
 *
 * Two rules, both evidence:
 *   1. declares something the lean archive trims -> web;
 *   2. depends on a workspace that is web -> web, transitively. `packages/ui`
 *      is web because it declares `mermaid`; anything importing `@interlace/ui`
 *      inherits that closure and needs the same tree.
 *
 * Iterated to a fixed point rather than done in one pass, because workspace
 * dependencies are not sorted and a single pass would miss a package whose web
 * dependency is discovered after it.
 */
function laneMap(): Map<string, Lane> {
  const all = readWorkspaces();
  const lanes = new Map<string, Lane>(
    all.map((w) => [w.pkg.name, declaresTrimmed(w.pkg) ? 'web' : 'node']),
  );
  const byName = new Map(all.map((w) => [w.pkg.name, w]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const w of all) {
      if (lanes.get(w.pkg.name) === 'web') continue;
      const deps = manifestDeps(w.pkg);
      if (deps.some((d) => byName.has(d) && lanes.get(d) === 'web')) {
        lanes.set(w.pkg.name, 'web');
        changed = true;
      }
    }
  }
  return lanes;
}

const LANE_OF = laneMap();

function discoverPackages(lane: Lane): { testable: Pkg[]; untested: string[]; laneDirs: Set<string> } {
  const testable: Pkg[] = [];
  const untested: string[] = [];
  const laneDirs = new Set<string>();
  {
    for (const { dir, entry, abs, pkg } of readWorkspaces()) {
      // Before the task lookup, not after. A package in the other lane is not
      // "untested" — it is another job's work, and the `untested` guard below
      // would otherwise fail the node lane for every web package. The web
      // lane's own discovery still holds that package to the same rule.
      if (LANE_OF.get(pkg.name) !== lane) continue;
      laneDirs.add(dir);
      // Prefer test:coverage so the 100% thresholds declared in each
      // vitest.config.mts are actually enforced. Fall back to plain `test` for
      // workspaces that have tests but no coverage task (docs,
      // cwe-analytics-engine) — dropping them would be a coverage regression
      // disguised as a sharding change.
      // Coverage is deliberately NOT collected on PRs. v8 instrumentation
      // roughly doubles vitest's cost for a number nobody reads per-PR, and
      // codecov.yml now collects it on a daily cron instead. Set
      // CI_TEST_SHARD_COVERAGE=1 to opt back in (that daily job does).
      // (also consulted above for SPLIT_ACROSS_SHARDS)
      const task = wantCoverage && pkg.scripts?.['test:coverage']
        ? 'test:coverage'
        : pkg.scripts?.test
          ? 'test'
          : pkg.scripts?.['test:coverage']
            ? 'test:coverage'
            : null;
      if (task) {
        const cost = countTestFiles(path.join(abs, entry));
        const deps = manifestDeps(pkg);
        // Splitting hides files from each slice, so per-slice coverage would
        // sit far below the 100% thresholds and fail. The daily codecov job
        // sets CI_TEST_SHARD_COVERAGE=1 and must see whole packages.
        const slices = wantCoverage ? 1 : (SPLIT_ACROSS_SHARDS[pkg.name] ?? 1);
        if (slices > 1) {
          for (let i = 1; i <= slices; i++) {
            testable.push({
              name: pkg.name, dir, task,
              cost: Math.ceil(cost / slices), deps,
              split: { i, n: slices },
            });
          }
        } else {
          testable.push({ name: pkg.name, dir, task, cost, deps });
        }
      }
      else if (!NO_TEST_ALLOWLIST.has(pkg.name)) untested.push(pkg.name);
    }
  }
  // Sort by cost desc, name asc as tiebreak. Descending order is what makes the
  // LPT bucketing below effective, and the name tiebreak keeps it deterministic
  // so a package keeps its shard (and therefore its Turbo cache key) run to run.
  testable.sort(
    (a, b) =>
      b.cost - a.cost ||
      a.name.localeCompare(b.name) ||
      (a.split?.i ?? 0) - (b.split?.i ?? 0),
  );
  return { testable, untested, laneDirs };
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
const MATRIX_MODE = process.argv.includes('--matrix');

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
      // `count` exists purely so the workflow can NAME the decision. A skipped
      // job leaves no row in the PR's checks list, so "0 shards affected" and
      // "the matrix step broke" look identical from outside — see the
      // `test-scope` job in quality-full.yml.
      `shards=${json}\nany=${shardNumbers.length > 0}\ncount=${shardNumbers.length}\nheavy=${heavy}\n`,
    );
  }
}

// `--lane <node|web>` selects the dependency world; it is stripped before the
// positional arguments are read so both call shapes keep working unchanged.
// Defaulting to `node` is deliberate: a caller that forgets the flag gets the
// lane with the lean dependency archive, so the failure is a loud
// MODULE_NOT_FOUND in a web test rather than a web package silently never
// running.
const laneFlagAt = process.argv.indexOf('--lane');
const LANE: Lane = laneFlagAt === -1 ? 'node' : (process.argv[laneFlagAt + 1] as Lane);
if (LANE !== 'node' && LANE !== 'web') {
  console.error(`--lane must be "node" or "web" (got ${JSON.stringify(process.argv[laneFlagAt + 1])})`);
  process.exit(2);
}
const positional = process.argv
  .slice(2)
  .filter((a, i, all) => a !== '--lane' && all[i - 1] !== '--lane');

const shardIndex = MATRIX_MODE ? 0 : Number(positional[0]);
const shardTotal = Number(positional[1]);

if (!MATRIX_MODE && (!Number.isInteger(shardIndex) || shardIndex < 1 || shardIndex > shardTotal)) {
  console.error(`Usage: node scripts/ci-test-shard.mts <shardIndex 1..N> <shardTotal N> [--lane node|web]`);
  console.error(`   or: node scripts/ci-test-shard.mts --matrix <shardTotal N> [--lane node|web]`);
  process.exit(2);
}
if (!Number.isInteger(shardTotal) || shardTotal < 1) {
  console.error(`shardTotal must be a positive integer`);
  process.exit(2);
}


const { testable, untested, laneDirs } = discoverPackages(LANE);
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
  const r = changedFilesSince(BASE_REF, REPO_ROOT);
  if (r.ok) return r.changed;
  warnUnresolvedBase(r.why);
  return null;
}

const runAll = process.env.CI_TEST_SHARD_ALL === '1';
let filterNote = 'all packages (filtering disabled)';
/** null = no filtering; otherwise the affected package names. */
let affected: Set<string> | null = null;

if (!runAll) {
  const changed = changedFiles();
  const decision = decideAffected(changed, testable, REVERSE_DEPS, laneDirs);
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
for (const p of mine)
  console.log(
    `  ${p.name}${p.split ? ` [slice ${p.split.i}/${p.split.n}]` : ''}  (${p.task}, ~${p.cost} test files)`,
  );

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
  // A sliced package needs its OWN invocation: `--shard` after `--` reaches
  // every package in the command, so batching a slice with whole packages
  // would silently run only a fraction of each of them — a green check over
  // untested files, which is the exact failure class this script exists to
  // prevent. Whole packages still batch into one call.
  const sliced = group.filter((p) => p.split);
  const whole = group.filter((p) => !p.split);

  const invocations: string[][] = [];
  if (whole.length) {
    invocations.push(['turbo', 'run', task, ...whole.map(spec), '--', '--reporter=dot']);
  }
  for (const p of sliced) {
    const { i, n } = p.split as { i: number; n: number };
    invocations.push(['turbo', 'run', task, spec(p), '--', '--reporter=dot', `--shard=${i}/${n}`]);
  }

  for (const args of invocations) {
    console.log(`\n$ npx ${args.join(' ')}\n`);
    try {
      execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
    } catch {
      // Keep going so one failing group still reports the other's result.
      failed = true;
    }
  }
}

process.exit(failed ? 1 : 0);
