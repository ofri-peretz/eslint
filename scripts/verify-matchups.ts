#!/usr/bin/env -S npx tsx
/**
 * Verify every rule named in the matchup table actually exists.
 *
 * A comparison that cites a rule which does not exist is worse than no
 * comparison: it is checkable, and someone WILL check. This resolves every
 * `plugin/rule` and `npm-package:rule` against the installed packages and
 * fails on any miss.
 */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MATCHUPS, UNCONTESTED } from '../benchmarks/suites/ilb-headline/matchups.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(REPO_ROOT, 'benchmarks/suites/ilb-flagship/workspace');
const req = createRequire(import.meta.url);

function loadRules(spec: string): Set<string> | null {
  let m: any;
  try { m = req(spec); } catch { return null; }
  const mod = Object.keys(m?.rules ?? {}).length ? m : (m?.default ?? m);
  const rules = mod?.rules;
  return rules ? new Set(Object.keys(rules)) : null;
}

const ourCache = new Map<string, Set<string> | null>();
function ourRules(plugin: string): Set<string> | null {
  if (!ourCache.has(plugin)) {
    ourCache.set(
      plugin,
      loadRules(resolve(REPO_ROOT, `packages/eslint-plugin-${plugin}/dist/src/index.js`)),
    );
  }
  return ourCache.get(plugin)!;
}

const theirCache = new Map<string, Set<string> | null>();
function theirRules(pkg: string): Set<string> | null {
  if (!theirCache.has(pkg)) {
    theirCache.set(pkg, loadRules(resolve(WORKSPACE, 'node_modules', pkg)));
  }
  return theirCache.get(pkg)!;
}

const missing: string[] = [];
const unloadable = new Set<string>();
let checked = 0;

for (const m of MATCHUPS) {
  for (const id of m.ours) {
    const [plugin, ...rest] = id.split('/');
    const rule = rest.join('/');
    const set = ourRules(plugin);
    if (!set) { unloadable.add(`eslint-plugin-${plugin} (ours)`); continue; }
    checked++;
    if (!set.has(rule)) missing.push(`OURS   ${m.job}: ${id}`);
  }
  for (const id of m.theirs) {
    const [pkg, rule] = id.split(':');
    const set = theirRules(pkg);
    if (!set) { unloadable.add(pkg); continue; }
    checked++;
    if (!set.has(rule)) missing.push(`THEIRS ${m.job}: ${id}`);
  }
}

for (const u of UNCONTESTED) {
  for (const id of u.ours) {
    const [plugin, ...rest] = id.split('/');
    const set = ourRules(plugin);
    if (!set) { unloadable.add(`eslint-plugin-${plugin} (ours)`); continue; }
    checked++;
    if (!set.has(rest.join('/'))) missing.push(`UNCONTESTED ${u.job}: ${id}`);
  }
}

console.log(`\nChecked ${checked} rule reference(s) across ${MATCHUPS.length} matchups.\n`);

if (unloadable.size) {
  console.log('Could not load (not installed / not built):');
  for (const u of unloadable) console.log(`  - ${u}`);
  console.log('');
}

if (missing.length) {
  console.error(`${missing.length} rule reference(s) DO NOT EXIST:`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  console.error('\nFix the matchup table — a cited rule that does not exist is a false claim.');
  process.exit(1);
}

// Every matchup where we claim an advantage should say where they are better.
const noNote = MATCHUPS.filter((m) => !m.note).map((m) => m.job);
if (noNote.length) {
  console.log(`Note: ${noNote.length} matchup(s) carry no "where they win" caveat:`);
  for (const j of noNote) console.log(`  - ${j}`);
  console.log('Not fatal, but a table with no such notes reads as a sales sheet.\n');
}

console.log('All cited rules exist.');
