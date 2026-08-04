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
import { decideAffected, type AffectedPkg } from './lib/ci-shard-affected.mts';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BASE_REF = process.env.CI_TEST_SHARD_BASE ?? 'origin/main';

function workspaces(): AffectedPkg[] {
  const out: AffectedPkg[] = [];
  for (const wsDir of ['packages', 'apps', 'tools']) {
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      // Every workspace, not just testable ones: `registry` has no test task
      // but still has to build.
      if (pkg.name) out.push({ name: pkg.name, dir: `${wsDir}/${entry}` });
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

let filters: string[] = [];
if (process.env.CI_TEST_SHARD_ALL === '1') {
  console.log(`Building all ${all.length} workspaces (filtering disabled).`);
} else {
  const decision = decideAffected(changedFiles(), all);
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
    console.log(`Building all ${all.length} workspaces (${decision.why}).`);
  } else {
    // `...<pkg>` pulls in dependents: changing eslint-devkit must still rebuild
    // every plugin on top of it, or the runtime-dependency check below would
    // inspect stale artifacts.
    filters = [...decision.names].map((n) => `--filter=...${n}`);
    console.log(`Building ${decision.names.size} affected workspace(s) + dependents: ${[...decision.names].join(', ')}`);
  }
}

const args = ['turbo', 'run', 'build', ...filters];
console.log(`\n$ npx ${args.join(' ')}\n`);
try {
  execFileSync('npx', args, { cwd: REPO_ROOT, stdio: 'inherit' });
} catch {
  process.exit(1);
}
