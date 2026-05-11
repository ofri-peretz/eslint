#!/usr/bin/env -S npx tsx

/**
 * verify-oxlint-shims.mjs — runtime smoke test for oxlint shims.
 *
 * Sister to scripts/generate-oxlint-shims.mjs (file-drift check). Where the
 * generator's `--check` only verifies that on-disk shim files match what the
 * generator would produce, this script actually `require()`s each shim and
 * asserts:
 *
 *   1. The shim resolves without throwing (catches stale dist paths, missing
 *      builds, broken module-resolver patches).
 *   2. The loaded plugin exposes a `rules` object (catches export-shape drift).
 *   3. The rule names + count match the snapshot baked into the manifest
 *      (catches accidental rule deletion in dist or upstream regression).
 *
 * Designed to be cheap enough to run after every build. Intended invocation:
 *   npm run oxlint:shims:verify          # check
 *   npm run oxlint:shims:verify -- --update   # rewrite manifest snapshot
 *
 * Not in `quality` directly — `quality` doesn't build dist. Wire this into
 * any CI step that runs after `turbo build`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.agent', 'oxlint-jsplugins-manifest.json');

const args = new Set(process.argv.slice(2));
const UPDATE = args.has('--update');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`✗ manifest missing: ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.error('  run: npm run oxlint:shims');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

const failures = [];
const updatedRuntime = {};

console.log('');
console.log('═'.repeat(70));
console.log('  OXLINT SHIM RUNTIME SMOKE TEST');
console.log('═'.repeat(70));
console.log('');

for (const entry of manifest.plugins) {
  const shimAbs = path.join(ROOT, entry.shim);
  if (!fs.existsSync(shimAbs)) {
    failures.push(`${entry.short}: shim missing at ${entry.shim}`);
    continue;
  }

  // Drop any cached require for this shim so each run sees fresh state.
  delete require.cache[require.resolve(shimAbs)];

  let plugin;
  try {
    plugin = require(shimAbs);
  } catch (err) {
    failures.push(`${entry.short}: shim threw on require — ${err.message.split('\n')[0]}`);
    continue;
  }

  const rulesObj = plugin?.rules ?? plugin?.default?.rules;
  if (!rulesObj || typeof rulesObj !== 'object') {
    failures.push(`${entry.short}: plugin export has no \`rules\` object`);
    continue;
  }

  const runtimeRuleNames = Object.keys(rulesObj).toSorted();
  updatedRuntime[entry.short] = runtimeRuleNames;

  // Detect rule aliasing: a name like `react/jsx-key` registered alongside
  // a flat `jsx-key` indicates the plugin double-registers for ecosystem
  // compat. We capture the canonical (flat) set + the aliased set so a
  // future drop-by-half regression (e.g. someone removes the categorized
  // namespace) is detected, not silently accepted.
  const flat = runtimeRuleNames.filter(n => !n.includes('/'));
  const aliased = runtimeRuleNames.filter(n => n.includes('/'));
  if (aliased.length > 0) {
    // Sanity: every aliased name should have a flat counterpart, else the
    // plugin's index export is malformed.
    const aliasBaseNames = aliased.map(n => n.split('/').pop());
    const orphanAliases = aliasBaseNames.filter(b => !flat.includes(b));
    if (orphanAliases.length > 0 && !UPDATE) {
      failures.push(
        `${entry.short}: ${orphanAliases.length} aliased rule(s) without a flat counterpart — ` +
        `${orphanAliases.slice(0, 3).join(', ')}${orphanAliases.length > 3 ? '...' : ''}. ` +
        `Aliasing scheme should keep both names in sync.`,
      );
    }
  }

  const expectedRuntime = manifest.runtimeRuleNames?.[entry.short];
  if (expectedRuntime && !UPDATE) {
    const missing = expectedRuntime.filter(n => !runtimeRuleNames.includes(n));
    const added = runtimeRuleNames.filter(n => !expectedRuntime.includes(n));
    if (missing.length > 0) {
      failures.push(`${entry.short}: ${missing.length} rule(s) MISSING from dist — ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }
    if (added.length > 0) {
      failures.push(`${entry.short}: ${added.length} rule(s) APPEARED in dist not in manifest — ${added.slice(0, 5).join(', ')}${added.length > 5 ? '...' : ''}. Run: npm run oxlint:shims && npm run oxlint:shims:verify -- --update`);
    }
    if (missing.length === 0 && added.length === 0) {
      const aliasNote = aliased.length > 0 ? ` (${flat.length} flat + ${aliased.length} aliased)` : '';
      console.log(`  ✓ ${entry.short.padEnd(28)} ${runtimeRuleNames.length} rule(s)${aliasNote}`);
    }
  } else {
    const aliasNote = aliased.length > 0 ? ` (${flat.length} flat + ${aliased.length} aliased)` : '';
    console.log(`  ${UPDATE ? '↻' : '?'} ${entry.short.padEnd(28)} ${runtimeRuleNames.length} rule(s)${aliasNote}${UPDATE ? ' (snapshot updated)' : ' (no snapshot — run with --update)'}`);
  }
}

console.log('');

if (UPDATE) {
  if (failures.length > 0) {
    // Refusing to write a partial snapshot — failures would be encoded as
    // "missing rules" silently if we let --update through.
    console.log(`  ✗ ${failures.length} failure(s) — refusing to update partial snapshot:`);
    for (const f of failures) console.log(`     • ${f}`);
    console.log('');
    process.exit(1);
  }
  manifest.runtimeRuleNames = updatedRuntime;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  ↻ manifest snapshot updated: ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log('');
  process.exit(0);
}

// In check mode, missing snapshots are tolerated (first run after a new
// plugin) but result in a warning so they don't masquerade as success.
const missingSnapshot = manifest.plugins
  .filter(e => updatedRuntime[e.short] && !manifest.runtimeRuleNames?.[e.short]);
if (missingSnapshot.length > 0 && failures.length === 0) {
  console.log(`  ⚠ ${missingSnapshot.length} plugin(s) have no snapshot yet — run with --update.`);
  console.log('');
}

if (failures.length > 0) {
  console.log(`  ✗ ${failures.length} failure(s):`);
  for (const f of failures) console.log(`     • ${f}`);
  console.log('');
  console.log('  Common causes:');
  console.log('    - Stale dist (run: npx turbo run build)');
  console.log('    - Plugin source export changed (run: npm run oxlint:shims:verify -- --update if intentional)');
  console.log('    - Shim path mismatch (check scripts/generate-oxlint-shims.mjs SHIM_CJS_TEMPLATE)');
  console.log('');
  process.exit(1);
}

console.log('  ✅ All shims load and rule sets match manifest snapshot.');
console.log('');
