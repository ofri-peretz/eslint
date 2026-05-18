#!/usr/bin/env node
/**
 * Remove stale Storybook caches whose directory name doesn't match the
 * currently-installed Storybook version. Runs as `predev` / `prebuild`.
 *
 * Why this exists: `npm install` doesn't clean `node_modules/.cache/`,
 * so a bump from Storybook 10.3.6 → 10.4.0 leaves `node_modules/.cache/
 * storybook/10.3.6/` in place. The newer Storybook dev server tries to
 * reuse those cached entries; their schema is incompatible (e.g. missing
 * the `moduleType` field added in 10.4) and the Rust deserializer throws
 * `Missing field "moduleType"` on every `/iframe.html` request — a 500
 * with no useful stack trace.
 *
 * This script preserves the cache for the *current* version (so iterative
 * dev still benefits from caching) and only deletes the stale dirs.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const CACHE_DIR = join(REPO_ROOT, 'node_modules', '.cache', 'storybook');

if (!existsSync(CACHE_DIR)) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
let currentVersion;
try {
  currentVersion = require('storybook/package.json').version;
} catch {
  // Storybook not installed yet — nothing to do.
  process.exit(0);
}

const removed = [];
for (const entry of readdirSync(CACHE_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (entry.name === currentVersion) continue;
  rmSync(join(CACHE_DIR, entry.name), { recursive: true, force: true });
  removed.push(entry.name);
}

if (removed.length > 0) {
  console.log(
    `[storybook] removed stale cache(s): ${removed.join(', ')} (current: ${currentVersion})`,
  );
}
