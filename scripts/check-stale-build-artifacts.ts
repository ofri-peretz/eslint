#!/usr/bin/env tsx

/**
 * check-stale-build-artifacts.ts
 *
 * Fails closed if any `.js`, `.d.ts`, or `.js.map` files exist alongside
 * `.ts` source inside `packages/<pkg>/src/`. These are gitignored leftovers
 * from a prior in-place build configuration that no longer runs — but
 * Node and vitest resolvers will silently prefer the stale `.js` over
 * the current `.ts` source when a `package.json#main` points at
 * `./src/index.js`, leading to:
 *
 *   - Plugin rule tests that pass on the .ts implementation but fail in
 *     CI because the stale .js diverged from current logic (this is
 *     exactly how the import-next/no-cycle regression hid for weeks
 *     between b40bc678 and 139b6208).
 *   - The meta-config at @interlace/eslint-config loading whichever
 *     vintage of each plugin happened to last get built in-place.
 *
 * Exits 0 if clean. Exits 1 with offenders + the one-line cleanup
 * command. Cheap (~50ms): one fs walk per package.
 *
 * Wired as the `stale-build-artifacts` step in lefthook's pre-commit.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

const STALE_EXTENSIONS = ['.js', '.d.ts', '.js.map'] as const;

const isStaleArtifact = (name: string): boolean =>
  STALE_EXTENSIONS.some((ext) => name.endsWith(ext));

function* walkSrc(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip nested node_modules / dist that may sit inside a package's src/
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      yield* walkSrc(full);
    } else if (entry.isFile() && isStaleArtifact(entry.name)) {
      yield full;
    }
  }
}

const offenders: string[] = [];
let packageDirs: string[];
try {
  packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(PACKAGES_DIR, d.name));
} catch (err) {
  console.error(`check-stale-build-artifacts: cannot read ${PACKAGES_DIR}`);
  console.error(String(err));
  process.exit(2);
}

for (const pkgDir of packageDirs) {
  const srcDir = join(pkgDir, 'src');
  try {
    if (!statSync(srcDir).isDirectory()) continue;
  } catch {
    continue;
  }
  for (const stale of walkSrc(srcDir)) {
    offenders.push(relative(REPO_ROOT, stale));
  }
}

if (offenders.length === 0) {
  // Quiet success — only speaks up when broken.
  process.exit(0);
}

console.error('');
console.error(`Stale build artifacts found in packages/*/src/ (${offenders.length} files):`);
console.error('');
const PREVIEW = 10;
for (const f of offenders.slice(0, PREVIEW)) {
  console.error(`  ${f}`);
}
if (offenders.length > PREVIEW) {
  console.error(`  … and ${offenders.length - PREVIEW} more`);
}
console.error('');
console.error('These shadow the .ts source under vitest and break workspace runtime');
console.error('resolution (package.json#main points at ./src/index.js). They are');
console.error('gitignored leftovers — safe to delete. Run:');
console.error('');
console.error('  find packages -path \'*/src/*\' \\');
console.error('    \\( -name \'*.js\' -o -name \'*.d.ts\' -o -name \'*.js.map\' \\) \\');
console.error('    -not -path \'*/node_modules/*\' -not -path \'*/dist/*\' -delete');
console.error('');
process.exit(1);
