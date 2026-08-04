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

type BuildPkg = AffectedPkg & { cost: number };

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
const shardIndex = Number(process.env.CI_BUILD_SHARD ?? '0');
const shardTotal = Number(process.env.CI_BUILD_SHARD_TOTAL ?? '0');
const sharded = Number.isInteger(shardIndex) && Number.isInteger(shardTotal) && shardTotal > 1;

let mine = selected;
if (sharded) {
  if (shardIndex < 1 || shardIndex > shardTotal) {
    console.error(`::error::CI_BUILD_SHARD=${shardIndex} out of range 1..${shardTotal}.`);
    process.exit(2);
  }
  // Sorted heaviest-first (name asc as tiebreak) so bucketing is both effective
  // and deterministic — a package keeps its shard, and therefore its Turbo
  // cache key, run to run.
  const ordered = [...selected].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  const buckets = bucket(ordered, shardTotal);
  mine = buckets[shardIndex - 1];
  const loads = buckets.map((b) => b.reduce((n, p) => n + p.cost, 0));
  console.log(
    `Build shard ${shardIndex}/${shardTotal} — ${mine.length} of ${selected.length} packages, ` +
      `${loads[shardIndex - 1]} of ${loads.reduce((a, b) => a + b, 0)} source files ` +
      `(balance: ${Math.min(...loads)}-${Math.max(...loads)}) — ${note}`,
  );
} else {
  console.log(`Building ${note}.`);
}

for (const p of mine) console.log(`  ${p.name}  (${p.cost} source files)`);

// An empty slice is legitimate: this shard owns packages, none affected. Stated
// rather than inferred from silence, same as the test sharder.
if (mine.length === 0) {
  console.log('Nothing for this shard to build.');
  process.exit(0);
}

if (process.env.CI_BUILD_PLAN_ONLY === '1') process.exit(0);

// Plain `--filter=<pkg>`. Never `...<pkg>` — dependents are already in the
// closure above and bucketed to their own shard.
const filters = mine.map((p) => `--filter=${p.name}`);
// Record the slice so the post-build checks know what dist/ dirs MUST exist.
// Without this, verify-runtime-deps.ts skips packages with no dist and reports
// success — vacuously green if the build produced nothing at all.
fs.writeFileSync(
  path.join(REPO_ROOT, '.ci-built-packages.json'),
  JSON.stringify(mine.map((p) => p.name), null, 2),
);

const args = ['turbo', 'run', 'build', ...filters];
console.log(`\n$ npx ${args.join(' ')}\n`);
try {
  execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
} catch {
  process.exit(1);
}
