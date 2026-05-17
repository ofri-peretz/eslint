#!/usr/bin/env tsx

/**
 * check-stale-build-artifacts.ts
 *
 * Fails closed if any `.js`, `.d.ts`, or `.js.map` files exist alongside
 * `.ts` source inside `packages/<pkg>/src/`. They are gitignored leftovers
 * from a prior in-place build configuration that no longer runs — but
 * Node and vitest resolvers silently prefer the stale `.js` over the
 * current `.ts` source when a `package.json#main` points at
 * `./src/index.js`. That is how the import-next/no-cycle regression hid
 * for weeks between b40bc678 and 139b6208.
 *
 * Wired as the `stale-build-artifacts` step in lefthook's pre-commit.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { walkFiles } from './lib/walk.js';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const STALE_EXTENSIONS = ['.js', '.d.ts', '.js.map'] as const;

let packageDirs: string[];
try {
  packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(PACKAGES_DIR, d.name));
} catch {
  // A checkout without packages/ is not this gate's failure mode.
  process.exit(0);
}

const offenders: string[] = [];
for (const pkgDir of packageDirs) {
  for (const file of walkFiles(join(pkgDir, 'src'), {
    relativeTo: REPO_ROOT,
    extensions: STALE_EXTENSIONS,
  })) {
    offenders.push(file);
  }
}

if (offenders.length === 0) {
  process.exit(0);
}

console.error('');
console.error(`Stale build artifacts found in packages/<pkg>/src/ (${offenders.length} files):`);
console.error('');
const PREVIEW = 10;
for (const f of offenders.slice(0, PREVIEW)) {
  console.error(`  ${f}`);
}
if (offenders.length > PREVIEW) {
  console.error(`  … and ${offenders.length - PREVIEW} more`);
}
console.error('');
console.error('These shadow .ts source under vitest and break workspace runtime');
console.error('resolution (package.json#main points at ./src/index.js). They are');
console.error('gitignored leftovers — safe to delete. Run:');
console.error('');
console.error('  find packages -path \'*/src/*\' \\');
console.error('    \\( -name \'*.js\' -o -name \'*.d.ts\' -o -name \'*.js.map\' \\) \\');
console.error('    -not -path \'*/node_modules/*\' -not -path \'*/dist/*\' -delete');
console.error('');
process.exit(1);
