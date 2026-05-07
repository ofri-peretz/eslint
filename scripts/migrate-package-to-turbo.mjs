#!/usr/bin/env node
/**
 * One-shot migration: convert each `packages/<name>/` from Nx executors
 * (project.json) to Turbo-compatible plain-npm-script form.
 *
 * For each package directory it:
 *   1. Patches `tsconfig.lib.json` with `composite`, `rootDir`, `outDir`,
 *      `tsBuildInfoFile`, and (for plugins that depend on `@interlace/eslint-devkit`)
 *      a project `references` entry.
 *   2. Patches `package.json` with `scripts.{build, test, test:coverage, typecheck}`.
 *
 * Does NOT delete `project.json` — Turbo and Nx coexist during the migration;
 * the final cleanup step removes Nx artifacts in one pass after validation.
 *
 * Idempotent: running twice produces the same output.
 *
 * Skips `eslint-formatter` (mid-refactor, intentionally not in this release).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const PACKAGES_DIR = resolve(import.meta.dirname, '..', 'packages');
const SKIP = new Set(['dist', 'eslint-formatter']);

const SCRIPTS = {
  build: 'node ../../scripts/build-package.mjs',
  test: 'vitest run',
  'test:coverage': 'vitest run --coverage',
  typecheck: 'tsc -p tsconfig.lib.json --noEmit',
};

const TSC_OVERRIDES = {
  composite: true,
  rootDir: './src',
  outDir: './dist/src',
  tsBuildInfoFile: './.tsbuildinfo',
  declaration: true,
};

let migrated = 0;
let skipped = [];

for (const name of readdirSync(PACKAGES_DIR)) {
  if (SKIP.has(name)) {
    skipped.push(`${name} (skip-list)`);
    continue;
  }

  const pkgDir = join(PACKAGES_DIR, name);
  const pkgJsonPath = join(pkgDir, 'package.json');
  const tsconfigLibPath = join(pkgDir, 'tsconfig.lib.json');

  if (!existsSync(pkgJsonPath) || !existsSync(tsconfigLibPath)) {
    skipped.push(`${name} (missing package.json or tsconfig.lib.json)`);
    continue;
  }

  // ---- 1. Patch tsconfig.lib.json --------------------------------------------
  const tsconfig = JSON.parse(readFileSync(tsconfigLibPath, 'utf8'));
  tsconfig.compilerOptions = { ...(tsconfig.compilerOptions ?? {}), ...TSC_OVERRIDES };

  // Drop the legacy Nx out path if it's still there.
  if (tsconfig.compilerOptions.outDir !== './dist/src') {
    tsconfig.compilerOptions.outDir = './dist/src';
  }

  // Add cross-package project reference if this package depends on
  // `@interlace/eslint-devkit` (every plugin does; devkit itself doesn't).
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const dependsOnDevkit = !!(pkg.dependencies && pkg.dependencies['@interlace/eslint-devkit']);

  if (dependsOnDevkit) {
    const devkitRef = { path: '../eslint-devkit/tsconfig.lib.json' };
    const existing = tsconfig.references ?? [];
    const hasIt = existing.some((r) => r.path === devkitRef.path);
    tsconfig.references = hasIt ? existing : [...existing, devkitRef];
  }

  writeFileSync(tsconfigLibPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');

  // ---- 2. Patch package.json scripts -----------------------------------------
  pkg.scripts = { ...(pkg.scripts ?? {}), ...SCRIPTS };
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  migrated++;
  console.log(`migrated: ${name}${dependsOnDevkit ? ' (+ devkit reference)' : ''}`);
}

console.log(`\nDone. ${migrated} migrated, ${skipped.length} skipped.`);
if (skipped.length) {
  for (const s of skipped) console.log(`  skipped: ${s}`);
}
