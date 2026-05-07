#!/usr/bin/env node
/**
 * Strip references to `@nx/vite/plugins/*` from every package's
 * `vite.config.{ts,mts}` and `vitest.config.{ts,mts}`.
 *
 * Why: those plugins were used by the Nx executor to resolve workspace
 * tsconfig paths and copy assets. Now that we've moved to Turbo + plain
 * tsc + a per-package build script, the plugins are unnecessary AND
 * unresolvable once `@nx/vite` is removed from devDependencies.
 *
 * Strategy:
 *   - Remove `import { nxViteTsPaths } ...` and `import { nxCopyAssetsPlugin } ...`
 *   - Remove the corresponding entries from any `plugins: [...]` array
 *   - Leave the rest of the config untouched
 *
 * Idempotent.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = [];

function findConfigs(baseDir, kind) {
  if (!existsSync(baseDir)) return;
  for (const entry of readdirSync(baseDir)) {
    const dir = join(baseDir, entry);
    for (const fname of ['vite.config.ts', 'vite.config.mts', 'vitest.config.ts', 'vitest.config.mts']) {
      const p = join(dir, fname);
      if (existsSync(p)) TARGETS.push(p);
    }
  }
}

findConfigs(join(ROOT, 'packages'), 'package');
findConfigs(join(ROOT, 'tools'), 'tool');

let touched = 0;
for (const file of TARGETS) {
  let src = readFileSync(file, 'utf8');
  if (!src.includes('@nx/vite/plugins')) continue;

  const before = src;

  // Drop import lines for both nx-vite plugins.
  src = src.replace(/^import\s+\{[^}]*\}\s+from\s+['"]@nx\/vite\/plugins\/[^'"]+['"];?\n/gm, '');

  // Drop occurrences inside `plugins: [...]`. Handle these patterns:
  //   plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])]
  //   plugins: [nxViteTsPaths()]
  //   plugins: [..., nxViteTsPaths(), ...]
  src = src.replace(/nxViteTsPaths\(\)\s*,?\s*/g, '');
  src = src.replace(/nxCopyAssetsPlugin\([^)]*\)\s*,?\s*/g, '');

  // Clean up any leftover empty `plugins: [],` lines or trailing commas.
  src = src.replace(/plugins:\s*\[\s*\],?\s*\n/g, '');
  src = src.replace(/plugins:\s*\[\s*,/g, 'plugins: [');
  src = src.replace(/,\s*\]/g, ']');

  if (src !== before) {
    writeFileSync(file, src);
    touched++;
    console.log(`patched: ${file.replace(ROOT + '/', '')}`);
  }
}

console.log(`\nDone. Patched ${touched} of ${TARGETS.length} configs.`);
