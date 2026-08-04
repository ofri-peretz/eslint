/**
 * Build only what this change affects.
 *
 * Build is the longest job on the promote gate — 230s for all 30 tasks at a 0%
 * cache hit rate, versus 81s for typecheck and ~35s for a test shard. Since
 * every one of those runs in parallel, Build alone sets the end-to-end floor.
 *
 * The work is evenly spread, which is what makes filtering worthwhile here:
 * measured cold, 20 plugin builds take 268s of CPU with no single package over
 * 25s (eslint-plugin-react-features). There is no `docs`-shaped outlier to pin
 * the floor, so building 1 package instead of 30 really is ~25s instead of 230s.
 *
 * Uses the same four-state decision as the test sharder, so "affected" means
 * one thing in this repo rather than two:
 *   all  — a global input changed, or no merge-base -> build everything
 *   some — build the changed packages *and their dependents* (`...<pkg>`)
 *   none — no package source changed -> nothing to build
 *   bug  — package files changed but nothing resolved -> exit 1, never skip
 *
 * Set CI_TEST_SHARD_ALL=1 (main, cron, dispatch) to build everything.
 *
 * Usage: node scripts/ci-build.mts
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { decideAffected, reverseDeps, bucket, manifestDeps, type AffectedPkg } from './lib/ci-shard-affected.mts';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BASE_REF = process.env.CI_TEST_SHARD_BASE ?? 'origin/main';

type BuildPkg = AffectedPkg & { cost: number; emitsDist: boolean };

/**
 * Cost proxy for build balancing: source files under src/. Same reasoning as
 * the test sharder's test-file count — derivable from the tree, no state to
 * maintain, and it tracks compile time closely enough (measured: 20 plugin
 * builds = 268s CPU, no package over 25s).
 */
function countSourceFiles(dir: string): number {
  let n = 0;
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'coverage') continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.(ts|tsx|mts|cts)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) n++;
    }
  };
  walk(dir);
  return n;
}

function workspaces(): BuildPkg[] {
  const out: BuildPkg[] = [];
  for (const wsDir of ['packages', 'apps', 'tools']) {
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      // Every workspace, not just testable ones: `registry` has no test task
      // but still has to build.
      if (pkg.name) out.push({
        name: pkg.name,
        dir: `${wsDir}/${entry}`,
        deps: manifestDeps(pkg),
        cost: countSourceFiles(path.join(abs, entry)),
        // Only packages built by scripts/build-package.ts emit a publishable
        // dist/package.json. Apps (`next build`) and private helpers with no
        // build script never do — demanding one from them made the post-build
        // verification fail on @interlace/eslint-formatter-sarif, which is
        // private:true with no build script at all.
        emitsDist: typeof pkg.scripts?.build === 'string' && pkg.scripts.build.includes('build-package'),
      });
    }
  }
  return out;
}

function changedFiles(): string[] | null {
  try {
    const base = execFileSync('git', ['merge-base', 'HEAD', BASE_REF], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: REPO_ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return null;
  }
}

const all = workspaces();
if (all.length === 0) {
  console.error('::error::No workspaces discovered — refusing to report a successful build of nothing.');
  process.exit(1);
}

const REVERSE_DEPS = reverseDeps(all);
const MATRIX_MODE = process.argv[2] === '--matrix';

/**
 * Record the slice so the post-build checks know which dist/ dirs MUST exist.
 * Without it, verify-runtime-deps.ts cannot tell "this shard built nothing, by
 * design" from "the build silently produced nothing", and has to treat both as
 * failure.
 */
function writeBuiltPackages(pkgs: BuildPkg[]): void {
  fs.writeFileSync(
    path.join(REPO_ROOT, '.ci-built-packages.json'),
    JSON.stringify(pkgs.map((p) => ({ name: p.name, dir: p.dir, emitsDist: p.emitsDist })), null, 2),
  );
}

/** Emit the build matrix to GITHUB_OUTPUT (and stdout when run locally). */
function emitBuildMatrix(shardNumbers: number[]): void {
  const json = JSON.stringify(shardNumbers);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `build_shards=${json}\nbuild_any=${shardNumbers.length > 0}\n`,
    );
  }
  console.log(`build_matrix=${json}`);
}

// ── What to build ───────────────────────────────────────────────────────────
let selected: BuildPkg[] = all;
let note = `all ${all.length} workspaces (filtering disabled)`;

if (process.env.CI_TEST_SHARD_ALL !== '1') {
  // Pass the reverse-dep graph so `some` comes back as the dependent CLOSURE.
  // Changing eslint-devkit must still rebuild every plugin on top of it, or the
  // runtime-dependency checks would inspect stale artifacts — but the closure
  // is computed ONCE here rather than re-expanded per shard.
  const decision = decideAffected(changedFiles(), all, REVERSE_DEPS);
  if (decision.mode === 'bug') {
    console.error(`::error::Files changed under ${decision.dirs.join(', ')} but no workspace resolved.`);
    console.error('That is a bug in the affected computation, not a fast path. Refusing to report success.');
    process.exit(1);
  }
  if (decision.mode === 'none') {
    // Emit an EMPTY matrix rather than exiting silently — the workflow feeds
    // this straight into fromJSON(), and an unset output would be a parse
    // error, not a skip.
    if (MATRIX_MODE) emitBuildMatrix([]);
    console.log(`Nothing to build: ${decision.why} vs ${BASE_REF}.`);
    process.exit(0);
  }
  if (decision.mode === 'all') {
    note = `all ${all.length} workspaces (${decision.why})`;
  } else {
    selected = all.filter((p) => decision.names.has(p.name));
    note = `${selected.length} affected workspace(s) incl. dependents`;
  }
}

// ── Which of them this runner builds ────────────────────────────────────────
//
// One runner running `turbo run build` for 34 packages queues them behind its
// own 4-vCPU concurrency limit — measured 230s cold, and Build is what sets the
// end-to-end floor for the gate. Splitting across runners works here in a way
// it does not for tests: build work has no outlier (no package over 25s), so
// LPT bucketing produces genuinely even shards rather than hitting a floor.
//
// The partition is over `selected`, so a package is built by exactly one shard.
// Its upstream deps still get built alongside it (turbo's `build.dependsOn:
// ["^build"]`), and that upstream set — devkit, ui — is duplicated across
// shards that need it. That is a handful of small packages, not the 34-package
// duplication that plain `--filter=...<pkg>` per shard produced.
// A malformed value must not silently degrade to "build everything". If it
// did, a typo in the matrix would put the FULL build on all four runners —
// reintroducing exactly the duplication this sharding removes, while every
// job still reported success. So: if either variable is set at all, both must
// be valid.
// `--matrix <total>` prints the GitHub matrix of build shards that have work,
// for `strategy.matrix.shard: fromJSON(...)` — the same trick the test sharder
// uses. Without it the matrix is static [1,2,3,4] and every shard spins up a
// runner, pays ~24s of checkout+setup, discovers it owns nothing affected, and
// exits 0. On a typical one-plugin PR that is 3 wasted runner slots against an
// account-wide cap of 20, which is the binding constraint on this repo's CI.
if (MATRIX_MODE) {
  const total = Number(process.argv[3]);
  if (!Number.isInteger(total) || total < 1) {
    console.error('Usage: node scripts/ci-build.mts --matrix <shardTotal>');
    process.exit(2);
  }
  const ordered = [...all].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  const buckets = bucket(ordered, total);
  const selectedNames = new Set(selected.map((p) => p.name));
  const live = buckets
    .map((b, i) => ({ shard: i + 1, pkgs: b.filter((p) => selectedNames.has(p.name)) }))
    .filter((s) => s.pkgs.length > 0);
  for (const s of live) console.log(`  build shard ${s.shard}: ${s.pkgs.map((p) => p.name).join(', ')}`);
  console.log(`Dispatching ${live.length} of ${total} build shards (${note}).`);
  emitBuildMatrix(live.map((s) => s.shard));
  process.exit(0);
}

const rawShard = process.env.CI_BUILD_SHARD;
const rawTotal = process.env.CI_BUILD_SHARD_TOTAL;
const shardIndex = Number(rawShard ?? '0');
const shardTotal = Number(rawTotal ?? '0');
if (rawShard !== undefined || rawTotal !== undefined) {
  const bad =
    !Number.isInteger(shardIndex) ||
    !Number.isInteger(shardTotal) ||
    shardTotal < 1 ||
    shardIndex < 1 ||
    shardIndex > shardTotal;
  if (bad) {
    console.error(
      `::error::Malformed build shard configuration: CI_BUILD_SHARD=${rawShard ?? '(unset)'} ` +
        `CI_BUILD_SHARD_TOTAL=${rawTotal ?? '(unset)'}. Both must be integers with ` +
        `1 <= shard <= total. Refusing to fall back to an unsharded build — that would ` +
        `run the full build on every runner.`,
    );
    process.exit(2);
  }
}
const sharded = shardTotal > 1;

let mine = selected;
if (sharded) {
  // Bucket the FULL workspace list, then intersect with `selected` — never
  // bucket the affected subset directly.
  //
  // Shard assignment has to depend only on the repo, not on the diff. The
  // Turbo cache is scoped per shard (turbo-cache-scope: build-N), so if a
  // package's shard number moved with the affected set — shard 2 on one PR,
  // shard 3 on the next — its cached output would sit in a lineage the next
  // run never restores, and every build would miss. Bucketing the whole list
  // keeps `package -> shard` a pure function of the repo.
  const ordered = [...all].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  const buckets = bucket(ordered, shardTotal);
  const selectedNames = new Set(selected.map((p) => p.name));
  mine = buckets[shardIndex - 1].filter((p) => selectedNames.has(p.name));
  const loads = buckets.map((b) => b.reduce((n, p) => n + p.cost, 0));
  console.log(
    `Build shard ${shardIndex}/${shardTotal} — ${mine.length} of ${selected.length} selected ` +
      `(${buckets[shardIndex - 1].length} bucketed, balance ${Math.min(...loads)}-${Math.max(...loads)} ` +
      `source files across the full ${all.length}-package partition) — ${note}`,
  );
} else {
  console.log(`Building ${note}.`);
}

for (const p of mine) console.log(`  ${p.name}  (${p.cost} source files)`);

// An empty slice is legitimate: this shard owns packages, none affected. Stated
// rather than inferred from silence, same as the test sharder.
if (mine.length === 0) {
  // Record the empty slice BEFORE exiting. The post-build steps still run, and
  // verify-runtime-deps.ts refuses to pass having inspected 0 artifacts — a
  // guard that is right when a build was expected and wrong here, where the
  // shard correctly owns nothing affected. Writing [] tells it the difference.
  writeBuiltPackages([]);
  console.log('Nothing for this shard to build.');
  process.exit(0);
}

writeBuiltPackages(mine);

if (process.env.CI_BUILD_PLAN_ONLY === '1') process.exit(0);

// Plain `--filter=<pkg>`. Never `...<pkg>` — dependents are already in the
// closure above and bucketed to their own shard.
const filters = mine.map((p) => `--filter=${p.name}`);
const args = ['turbo', 'run', 'build', ...filters];
console.log(`\n$ npx ${args.join(' ')}\n`);
try {
  execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
} catch {
  process.exit(1);
}
