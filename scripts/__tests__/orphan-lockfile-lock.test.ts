/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock — stale dependency state that only a scanner can see.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY (2026-08-12)
 * OpenSSF Scorecard reported **29 OSV vulnerabilities** while `npm audit` at the
 * root reported one. All 29 came from two `package-lock.json` files committed at
 * the root of workspace members.
 *
 * In an npm workspace the ROOT lockfile is authoritative, so a lockfile at
 * `packages/x/package-lock.json` is never consulted — never regenerated, never
 * audited, rotting indefinitely. Ours had gone eight months, pinning
 * `ajv@6.12.6` and `brace-expansion@1.1.12`. They were so stale that `npm ci`
 * against them failed outright, which is why nothing ever surfaced them.
 *
 * The asymmetry is the trap: **`npm audit` cannot see those files, and OSV walks
 * every lockfile it finds.** A green `npm audit` is not evidence.
 *
 * The same rot occurs one level down, inside the root lockfile. `apps/docs`
 * carried a nested `fumadocs-mdx@14.2.6` while declaring `^15.2.2`; npm reported
 * it `invalid` and faithfully reproduced it on every install, because
 * `npm install` does not prune stale entries. It dragged in `esbuild@0.27.7` —
 * the last advisory left after the two files above were deleted — and meant the
 * app ran a major version behind what its own manifest asked for.
 *
 * Both failures are silent: nothing errors, no build breaks, the score just
 * drops and the app quietly runs code nobody chose.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/orphan-lockfile-lock.test.ts
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')) as T;

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

/**
 * Directories npm treats as workspace members, expanded from the root
 * `workspaces` globs against what is actually on disk.
 */
const workspaceMembers = (): string[] => {
  const { workspaces = [] } = readJson<{ workspaces?: string[] }>('package.json');

  return workspaces.flatMap((glob) => {
    if (!glob.endsWith('/*')) {
      return fs.existsSync(path.join(REPO_ROOT, glob, 'package.json')) ? [glob] : [];
    }
    const parent = glob.slice(0, -2);
    const dir = path.join(REPO_ROOT, parent);
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .map((name) => `${parent}/${name}`)
      .filter((member) =>
        fs.existsSync(path.join(REPO_ROOT, member, 'package.json')),
      );
  });
};

describe('lockfile hygiene', () => {
  it('has no lockfile at the root of a workspace member', () => {
    const members = workspaceMembers();
    expect(members.length).toBeGreaterThan(20);

    // Scoped to `<member>/package-lock.json` exactly. Lockfiles DEEPER inside a
    // member (`packages/x/benchmark/`, `benchmarks/suites/*/`) are standalone
    // rigs that are installed on their own and therefore maintained — the
    // weekly benchmark runs `npm ci` in one of them. Only a lockfile sitting
    // beside a member's own package.json is unreachable by npm.
    const orphans = members
      .map((member) => `${member}/package-lock.json`)
      .filter((file) => trackedFiles().includes(file));

    // Assert the list, not a count: the failure names the file to delete.
    expect(orphans).toEqual([]);
  });

  it('has no nested lockfile entry that violates its own member manifest', () => {
    const lock = readJson<{
      packages: Record<string, { version?: string }>;
    }>('package-lock.json');
    const members = workspaceMembers();

    // Nesting is legitimate on its own — it is how npm resolves two members
    // needing conflicting majors. What is never legitimate is a nested version
    // that fails the member's OWN declared range: npm calls that `invalid`, and
    // it means the member runs something other than what it asks for.
    const violations: string[] = [];

    for (const member of members) {
      const manifest = readJson<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      }>(`${member}/package.json`);

      const declared = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.optionalDependencies,
      };

      const prefix = `${member}/node_modules/`;
      for (const [key, entry] of Object.entries(lock.packages)) {
        if (!key.startsWith(prefix)) continue;

        const name = key.slice(prefix.length);
        const range = declared[name];
        // Undeclared means transitive — the member never expressed an opinion,
        // so there is nothing to violate.
        if (!range || !entry.version) continue;
        // Workspace links and non-registry protocols are not semver ranges.
        if (!semver.validRange(range)) continue;

        if (!semver.satisfies(entry.version, range)) {
          violations.push(`${key}@${entry.version} violates ${name}@${range}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
