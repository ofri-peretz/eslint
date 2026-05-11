#!/usr/bin/env -S npx tsx
/**
 * Build helper invoked by each package's `npm run build` script.
 *
 * Steps:
 *   1. Compile TypeScript via the package's `tsconfig.lib.json` to `<pkg>/dist/`.
 *   2. Copy publish-time assets (README, CHANGELOG, LICENSE, AGENTS.md,
 *      .npmignore, package.json) into `<pkg>/dist/`.
 *
 * After this runs, `<pkg>/dist/` is the publishable artifact:
 *   - `dist/src/index.js` etc. (matches the published `package.json`'s
 *     `main: "./src/index.js"` so consumer-facing paths are unchanged).
 *   - `dist/package.json`, `dist/README.md`, etc. at the dist root.
 *
 * Run from the package directory; intended to be invoked by Turbo via
 * the workspace's `build` task.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';

const pkgDir = process.cwd();
const pkgJsonPath = resolve(pkgDir, 'package.json');
if (!existsSync(pkgJsonPath)) {
  console.error(`build-package: no package.json found in ${pkgDir}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
const distDir = resolve(pkgDir, 'dist');

// 1. Clean prior output so stale files (e.g. removed source files) don't linger.
//    Also drop the tsc incremental buildinfo — otherwise `tsc --build` sees
//    "up to date" against the (now-deleted) dist and skips emit silently.
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
const tsBuildInfo = resolve(pkgDir, '.tsbuildinfo');
if (existsSync(tsBuildInfo)) {
  rmSync(tsBuildInfo, { force: true });
}
mkdirSync(distDir, { recursive: true });

// 2. Compile TypeScript. Use `tsc --build` so cross-package project
//    references resolve correctly (each plugin's tsconfig.lib.json
//    declares a `references: [{ path: "../eslint-devkit/tsconfig.lib.json" }]`
//    when it imports from devkit, and tsc --build walks the graph).
//    tsc --build is incremental and skips already-built upstream projects.
const tsconfig = existsSync(resolve(pkgDir, 'tsconfig.lib.json'))
  ? 'tsconfig.lib.json'
  : 'tsconfig.json';

const tscResult = spawnSync('npx', ['tsc', '--build', tsconfig], {
  cwd: pkgDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (tscResult.status !== 0) {
  console.error(`build-package(${pkg.name}): tsc failed with status ${tscResult.status}`);
  process.exit(tscResult.status ?? 1);
}

// 3. Copy publish-time assets to the dist root.
const assets = ['README.md', 'CHANGELOG.md', 'LICENSE', 'AGENTS.md', '.npmignore', 'package.json'];
for (const asset of assets) {
  const src = resolve(pkgDir, asset);
  if (existsSync(src)) {
    copyFileSync(src, join(distDir, asset));
  }
}

console.log(`build-package(${pkg.name}@${pkg.version}): wrote ${distDir}`);
