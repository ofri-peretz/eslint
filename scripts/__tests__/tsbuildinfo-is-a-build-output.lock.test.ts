/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @provenBy {"file":"turbo.json","find":"\"dist/**\", \".tsbuildinfo\", ","replace":"\"dist/**\", "}
 *
 * A composite project's `dist` and its `.tsbuildinfo` describe each other. Turbo
 * has to restore them together or restore neither.
 *
 * `outputs` declared `dist/**` and not `.tsbuildinfo`, so a cache hit put back a
 * `dist` with no state file — and a cache SAVE banked a `dist` while the
 * buildinfo that says what is in it stayed behind. The two can then be paired
 * from different builds, and nothing detects it: `tsc --build` reads the
 * buildinfo, concludes the referenced project is up to date, and skips emit.
 * `scripts/build-package.ts` already names this failure in a comment —
 *
 *     "otherwise `tsc --build` sees 'up to date' against the (now-deleted) dist
 *      and skips emit silently"
 *
 * — and defends against it by deleting BOTH before it compiles. It can only do
 * that for the package it is building; a referenced project's state arrives
 * from the cache.
 *
 * Measured, 2026-09-09: removing one file from `eslint-devkit/dist` while its
 * buildinfo stayed put made `tsc --build` in eslint-plugin-reliability report
 *
 *     TS2724: '"@interlace/eslint-devkit"' has no exported member named
 *             'propertyName'. Did you mean 'propertyKeyName'?
 *
 * on source that compiles clean, and rebuilding did not repair it. That is the
 * error PR #957 hit in CI on a commit that had passed minutes earlier, and it
 * points at the dependent package rather than at the divergence.
 *
 * The invariant: every path a package names in `tsBuildInfoFile` is covered by
 * the build task's `outputs`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseJsonc } from 'jsonc-parser';

const ROOT = resolve(__dirname, '..', '..');

/**
 * JSON with comments. Hand-rolling the strip is what broke the first draft of
 * this file: `"https://turbo.build/schema.json"` is not a comment, and a regex
 * that does not know it is inside a string says otherwise.
 */
function readJsonc(path: string): Record<string, unknown> {
  return parseJsonc(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function buildOutputs(): string[] {
  const turbo = readJsonc(join(ROOT, 'turbo.json'));
  const tasks = (turbo['tasks'] ?? turbo['pipeline']) as Record<
    string,
    { outputs?: string[] }
  >;
  return tasks['build']?.outputs ?? [];
}

/** Every workspace directory that declares a build. */
function packageDirs(): string[] {
  const out: string[] = [];
  for (const group of ['packages', 'apps', 'tools']) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const pkgDir = join(dir, name);
      if (existsSync(join(pkgDir, 'package.json'))) out.push(pkgDir);
    }
  }
  return out;
}

/** The `tsBuildInfoFile` a package names, normalised to a repo-relative-ish path. */
function declaredBuildInfo(pkgDir: string): string | null {
  for (const name of ['tsconfig.lib.json', 'tsconfig.json']) {
    const path = join(pkgDir, name);
    if (!existsSync(path)) continue;
    const options = readJsonc(path)['compilerOptions'] as
      Record<string, unknown> | undefined;
    const file = options?.['tsBuildInfoFile'];
    if (typeof file === 'string') return file.replace(/^\.\//, '');
  }
  return null;
}

/** Does any output glob cover this package-relative path? */
function isCovered(path: string, outputs: readonly string[]): boolean {
  return outputs.some((glob) => {
    if (glob.startsWith('!')) return false;
    if (glob === path) return true;
    // `dist/**` covers `dist/anything`; it does not cover a sibling of `dist`.
    const prefix = glob.replace(/\/?\*\*$/, '');
    return glob.endsWith('**') && path.startsWith(`${prefix}/`);
  });
}

describe('turbo caches a composite project with its buildinfo, or without its dist', () => {
  it('declares .tsbuildinfo as a build output', () => {
    const outputs = buildOutputs();
    const uncovered = packageDirs()
      .map((dir) => ({ dir, info: declaredBuildInfo(dir) }))
      .filter(
        (entry): entry is { dir: string; info: string } => entry.info !== null,
      )
      .filter((entry) => !isCovered(entry.info, outputs))
      .map((entry) => `${entry.dir.slice(ROOT.length + 1)} -> ${entry.info}`);

    expect(uncovered).toEqual([]);
  });

  it('still declares dist, so the pair is cached as a pair', () => {
    expect(buildOutputs()).toContain('dist/**');
  });
});
