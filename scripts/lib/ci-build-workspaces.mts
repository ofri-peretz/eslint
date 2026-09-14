/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The build lane's workspace universe.
 *
 * Lives here rather than inside `ci-build.mts` so it can be locked by a test.
 * `ci-build.mts` decides and executes a build at import time, so a test cannot
 * import it; the previous shape of this code was therefore unreachable from
 * vitest and the defect below shipped unnoticed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { manifestDeps, type AffectedPkg } from './ci-shard-affected.mts';

export type BuildPkg = AffectedPkg & { cost: number; emitsDist: boolean };

/**
 * Every workspace directory, READ from `package.json` rather than listed here.
 *
 * This was hard-coded to `['packages', 'apps', 'tools']` — three of the four
 * globs the manifest declares. The fourth, `benchmarks`, is a workspace at
 * depth 1, so it was never in the build universe at all.
 *
 * `decideAffected` does know about it: `benchmarks/budgets/per-rule-p95.json`
 * resolves to the touched dir `benchmarks`. With no workspace able to claim
 * that dir, `anywhere` came back empty and the gate reported
 *
 *   Files changed under benchmarks but no workspace resolved.
 *   That is a bug in the affected computation, not a fast path.
 *
 * which was exactly right, and exactly this. A benchmarks-only PR could not
 * pass the build gate (#1035). `ci-shard-affected.mts` already carries the
 * comment describing the same hole fixed for the TEST lane; the build lane
 * never got the same treatment.
 *
 * Reading the globs closes the class instead of adding a fourth string — a
 * fifth workspace glob now arrives here on its own.
 */
export function workspaceDirs(repoRoot: string): string[] {
  const globs: string[] = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  ).workspaces;
  return [
    ...new Set(globs.map((g) => (g.endsWith('/*') ? g.slice(0, -2) : g))),
  ];
}

/**
 * Cost proxy for build balancing: source files under src/. Same reasoning as
 * the test sharder's test-file count — derivable from the tree, no state to
 * maintain, and it tracks compile time closely enough (measured: 20 plugin
 * builds = 268s CPU, no package over 25s).
 */
export function countSourceFiles(dir: string): number {
  let n = 0;
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (
        e.name === 'node_modules' ||
        e.name === 'dist' ||
        e.name === 'coverage'
      )
        continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (
        /\.(ts|tsx|mts|cts)$/.test(e.name) &&
        !/\.(test|spec)\./.test(e.name)
      )
        n++;
    }
  };
  walk(dir);
  return n;
}

/** One workspace entry from a manifest. */
function toPkg(
  manifestPath: string,
  dir: string,
  abs: string,
): BuildPkg | null {
  const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!pkg.name) return null;
  return {
    name: pkg.name,
    dir,
    deps: manifestDeps(pkg),
    cost: countSourceFiles(abs),
    // Only packages built by scripts/build-package.ts emit a publishable
    // dist/package.json. Apps (`next build`) and private helpers with no build
    // script never do — demanding one from them made the post-build
    // verification fail on @interlace/eslint-formatter-sarif back when it was
    // private:true with no build script at all (it builds now).
    emitsDist:
      typeof pkg.scripts?.build === 'string' &&
      pkg.scripts.build.includes('build-package'),
  };
}

export function workspaces(repoRoot: string): BuildPkg[] {
  const out: BuildPkg[] = [];
  for (const wsDir of workspaceDirs(repoRoot)) {
    const abs = path.join(repoRoot, wsDir);
    if (!fs.existsSync(abs)) continue;

    // A literal glob names the workspace itself, not a parent of workspaces.
    const own = path.join(abs, 'package.json');
    if (fs.existsSync(own)) {
      const pkg = toPkg(own, wsDir, abs);
      if (pkg) out.push(pkg);
      continue;
    }

    // Every workspace, not just testable ones: `registry` has no test task but
    // still has to build.
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = toPkg(manifest, `${wsDir}/${entry}`, path.join(abs, entry));
      if (pkg) out.push(pkg);
    }
  }
  return out;
}
