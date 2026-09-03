#!/usr/bin/env -S npx tsx

/**
 * ILB Meta URL Fix — for every rule whose `meta.docs.url` is missing,
 * insert the canonical docs URL based on the plugin/rule path.
 *
 * Why this matters: per `npm run audit:meta`, only `pg` has `meta.docs.url`
 * populated (93%). Every other plugin is at 0%. The whole-run formatter
 * renders this as a clickable link in human and JSON output — without it,
 * the diagnostic doesn't tell consumers (or LLMs) where to read more.
 *
 * Strategy:
 *   1. Walk every rule's source file under packages/<plugin>/src/rules.
 *   2. If the file has a `meta.docs: {` object, insert
 *      `url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/<plugin>/docs/rules/<rule>.md'`
 *      as the first field, unless `url:` is already present.
 *   3. Skip files where we can't reliably locate the meta block via regex.
 *
 * Usage:
 *   tsx scripts/ilb-meta-url-fix.ts            # dry-run, prints plan
 *   tsx scripts/ilb-meta-url-fix.ts --apply    # write changes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

interface Plan {
  file: string;
  pluginShort: string;
  ruleName: string;
  action: 'add' | 'skip-already-has-url' | 'skip-no-meta-docs' | 'skip-no-rule-name';
}

function listRuleSources(): string[] {
  const out: string[] = [];
  for (const pkg of fs.readdirSync(PACKAGES_DIR)) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    const rulesRoot = path.join(PACKAGES_DIR, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesRoot)) continue;
    walk(rulesRoot, out);
  }
  return out;
}

function walk(dir: string, acc: string[]) {
  for (const e of fs.readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules') continue;
    const p = path.join(dir, e);
    let stat;
    try { stat = fs.statSync(p); } catch { continue; }
    if (stat.isDirectory()) walk(p, acc);
    else if (e.endsWith('.ts') && !e.endsWith('.test.ts') && !e.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
}

function ruleNameFromFile(file: string): string | null {
  const rel = path.relative(PACKAGES_DIR, file);
  // packages/<pkg>/src/rules/<...>/<rule>(/index.ts | .ts)
  const segs = rel.split(path.sep);
  // segs[0] = pkg, [1] = src, [2] = rules, [3..] = path within rules
  if (segs.length < 4 || segs[1] !== 'src' || segs[2] !== 'rules') return null;
  const tail = segs.slice(3);
  // <rule>/index.ts or <category>/<rule>.ts or <rule>.ts
  const last = tail[tail.length - 1];
  if (last === 'index.ts' || last === 'index.tsx') {
    return tail[tail.length - 2] ?? null;
  }
  return last.replace(/\.tsx?$/, '');
}

function pluginShortFromFile(file: string): string | null {
  const rel = path.relative(PACKAGES_DIR, file);
  const segs = rel.split(path.sep);
  if (!segs[0] || !segs[0].startsWith('eslint-plugin-')) return null;
  return segs[0].replace(/^eslint-plugin-/, '');
}

function pluginDirFromFile(file: string): string | null {
  const rel = path.relative(PACKAGES_DIR, file);
  return rel.split(path.sep)[0] ?? null;
}

function tryInsertUrl(source: string, pluginDir: string, ruleName: string): string | null {
  // Only touch the FIRST `meta: { ... }` block whose nested `docs: { ... }`
  // doesn't already include `url:`. We use a balanced-brace walk anchored
  // at the `docs:` key.
  const docsKeyRe = /(\s)docs\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = docsKeyRe.exec(source)) !== null) {
    const docsBraceStart = m.index + m[0].length - 1; // position of `{`
    let depth = 1;
    let i = docsBraceStart + 1;
    let inStr: string | null = null;
    let escape = false;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (escape) { escape = false; i++; continue; }
      if (c === '\\') { escape = true; i++; continue; }
      if (inStr) {
        if (c === inStr) inStr = null;
        i++; continue;
      }
      if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    const docsBraceEnd = i - 1;
    const docsBlock = source.slice(docsBraceStart, docsBraceEnd + 1);
    if (/\burl\s*:/.test(docsBlock)) return null; // already present
    // Detect indent inside docs by looking at the first non-blank line.
    const lines = docsBlock.split('\n');
    const innerIndentMatch = lines[1]?.match(/^(\s*)\S/);
    const indent = innerIndentMatch?.[1] ?? '      ';
    const url = `https://github.com/ofri-peretz/eslint/blob/main/packages/${pluginDir}/docs/rules/${ruleName}.md`;
    const insertion = `\n${indent}url: '${url}',`;
    // Insert right after the opening `{`.
    const updated =
      source.slice(0, docsBraceStart + 1) +
      insertion +
      source.slice(docsBraceStart + 1);
    return updated;
  }
  return null;
}

const plan: Plan[] = [];
let added = 0;
for (const file of listRuleSources()) {
  const ruleName = ruleNameFromFile(file);
  const pluginShort = pluginShortFromFile(file);
  const pluginDir = pluginDirFromFile(file);
  if (!ruleName || !pluginShort || !pluginDir) {
    plan.push({ file, pluginShort: pluginShort ?? '?', ruleName: ruleName ?? '?', action: 'skip-no-rule-name' });
    continue;
  }
  const src = fs.readFileSync(file, 'utf-8');
  if (!/docs\s*:\s*\{/.test(src)) {
    plan.push({ file, pluginShort, ruleName, action: 'skip-no-meta-docs' });
    continue;
  }
  const updated = tryInsertUrl(src, pluginDir, ruleName);
  if (!updated) {
    plan.push({ file, pluginShort, ruleName, action: 'skip-already-has-url' });
    continue;
  }
  if (APPLY) fs.writeFileSync(file, updated);
  plan.push({ file, pluginShort, ruleName, action: 'add' });
  added++;
}

const counts = plan.reduce<Record<string, number>>((a, p) => {
  a[p.action] = (a[p.action] ?? 0) + 1;
  return a;
}, {});

console.log(`\nILB Meta URL Fix — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  scanned ${plan.length} rule sources`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
console.log(`\n${APPLY ? 'wrote' : 'would write'} ${added} files`);
