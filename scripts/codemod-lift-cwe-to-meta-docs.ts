#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * codemod-lift-cwe-to-meta-docs — fleet-wide P1 #5 in the FP/FN tracker.
 *
 * Walks every Interlace plugin rule file, finds `formatLLMMessage(...)`
 * calls in `messages.*` blocks that carry `cwe:` and/or `severity:`,
 * and lifts those values to `meta.docs.cwe` / `meta.docs.cvss` where
 * @interlace/eslint-formatter actually reads them.
 *
 * Idempotent: if `meta.docs.cwe` already exists the rule is skipped.
 * Single-pass per file; brace-aware scanner re-uses the audit's
 * primitives so behaviour is consistent with the audit it is lifting.
 *
 * Severity → CVSS mapping (CVSS 3.1 mid-band convention used across the
 * Interlace tracker):
 *   CRITICAL → 9.5
 *   HIGH     → 7.5
 *   MEDIUM   → 5.0
 *   LOW      → 2.5
 *
 * Usage:
 *   tsx scripts/codemod-lift-cwe-to-meta-docs.ts                          # dry-run (default)
 *   tsx scripts/codemod-lift-cwe-to-meta-docs.ts --apply                  # write changes
 *   tsx scripts/codemod-lift-cwe-to-meta-docs.ts --apply --plugin=eslint-plugin-jwt
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

const APPLY = process.argv.includes('--apply');
const PLUGIN_FILTER = process.argv.find(a => a.startsWith('--plugin='))?.split('=')[1];

const SEVERITY_TO_CVSS: Record<string, number> = {
  CRITICAL: 9.5,
  HIGH: 7.5,
  MEDIUM: 5.0,
  LOW: 2.5,
};

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type StringDelim = "'" | '"' | '`' | null;

type ProcessStatus = 'no-meta' | 'no-docs' | 'already-lifted' | 'no-cwe-in-message' | 'lifted';

interface ProcessResult {
  path: string;
  status: ProcessStatus;
  changed: boolean;
  cwe?: string;
  cvss?: number | null;
  severity?: string | null;
}

interface Stats {
  lifted: number;
  alreadyLifted: number;
  noCweInMessage: number;
  noMeta: number;
  noDocs: number;
}

// ---------------------------------------------------------------------------
// BRACE-AWARE SCANNERS (mirror scripts/audit-rule-meta-completeness.ts)
// ---------------------------------------------------------------------------

function findMatchingBrace(source: string, openIdx: number): number {
  if (source[openIdx] !== '{' && source[openIdx] !== '(') return -1;
  const open = source[openIdx];
  const close = open === '{' ? '}' : ')';
  let depth = 0;
  let inString: StringDelim = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch as StringDelim; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findKeyBlockRange(scope: string, key: string): [number, number] | null {
  const re = new RegExp(`(?:^|[\\s,{])${key}\\s*:\\s*\\{`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const openIdx = scope.indexOf('{', m.index);
    if (openIdx === -1) continue;
    if (depthAt(scope, openIdx) !== 1) continue;
    const closeIdx = findMatchingBrace(scope, openIdx);
    if (closeIdx === -1) continue;
    return [openIdx, closeIdx];
  }
  return null;
}

function depthAt(source: string, idx: number): number {
  let depth = 0;
  let inString: StringDelim = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < idx; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch as StringDelim; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth;
}

function hasKey(scope: string, key: string): boolean {
  const re = new RegExp(`(?:^|[\\s,{])${key}\\s*:`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const idx = m.index + m[0].indexOf(key);
    if (depthAt(scope, idx) === 1) return true;
  }
  return false;
}

function findMetaBlockRange(source: string): [number, number] | null {
  const re = /(?:^|[\s,{])meta\s*:\s*\{/g;
  const m = re.exec(source);
  if (!m) return null;
  const openIdx = source.indexOf('{', m.index);
  const closeIdx = findMatchingBrace(source, openIdx);
  if (closeIdx === -1) return null;
  return [openIdx, closeIdx];
}

// ---------------------------------------------------------------------------
// EXTRACT CWE + SEVERITY FROM formatLLMMessage CALLS
// ---------------------------------------------------------------------------

function findFormatLLMMessageCalls(scope: string): string[] {
  const out: string[] = [];
  const re = /formatLLMMessage\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const openIdx = scope.indexOf('{', m.index);
    const closeIdx = findMatchingBrace(scope, openIdx);
    if (closeIdx === -1) continue;
    out.push(scope.slice(openIdx, closeIdx + 1));
  }
  return out;
}

function extractStringProperty(objSrc: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*['"]([^'"]+)['"]`);
  const m = re.exec(objSrc);
  return m ? m[1]! : null;
}

function extractNumberProperty(objSrc: string, key: string): number | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`);
  const m = re.exec(objSrc);
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------------------
// WORK PER FILE
// ---------------------------------------------------------------------------

function processFile(path: string): ProcessResult {
  const original = readFileSync(path, 'utf8');
  const metaRange = findMetaBlockRange(original);
  if (!metaRange) return { path, status: 'no-meta', changed: false };

  const metaSrc = original.slice(metaRange[0], metaRange[1] + 1);
  const docsRange = findKeyBlockRange(metaSrc, 'docs');
  if (!docsRange) return { path, status: 'no-docs', changed: false };

  const docsSrc = metaSrc.slice(docsRange[0], docsRange[1] + 1);
  if (hasKey(docsSrc, 'cwe')) {
    return { path, status: 'already-lifted', changed: false };
  }

  const calls = findFormatLLMMessageCalls(original);
  let cwe: string | null = null;
  let severity: string | null = null;
  let cvss: number | null = null;
  for (const call of calls) {
    cwe ??= extractStringProperty(call, 'cwe');
    severity ??= extractStringProperty(call, 'severity');
    cvss ??= extractNumberProperty(call, 'cvss');
    if (cwe) break;
  }

  if (!cwe) return { path, status: 'no-cwe-in-message', changed: false };

  const derivedCvss: number | null = cvss ?? (severity ? SEVERITY_TO_CVSS[severity.toUpperCase()] ?? null : null);

  // Determine the sibling-field indent inside the docs block.
  const docsBody = docsSrc.slice(1, -1);
  const siblingMatch = /\n([ \t]+)[A-Za-z_$][\w$]*\s*:/.exec(docsBody);
  const indent = siblingMatch ? siblingMatch[1]! : '      ';
  const closeOffsetIntoDocs = docsRange[1] - docsRange[0];
  const beforeClose = docsSrc.slice(0, closeOffsetIntoDocs);
  const closingMatch = /\n([ \t]*)$/.exec(beforeClose);
  const closingIndent = closingMatch ? closingMatch[1]! : indent.replace(/^[ \t]{2}/, '');

  const docsCloseAbs = metaRange[0] + docsRange[1];
  let insertAt = docsCloseAbs;
  while (insertAt > 0 && /\s/.test(original[insertAt - 1]!)) insertAt--;
  const prevChar = original[insertAt - 1];
  const needsComma = prevChar !== ',';

  const insertion =
    (needsComma ? ',' : '') +
    `\n${indent}cwe: '${cwe}',` +
    (derivedCvss !== null ? `\n${indent}cvss: ${derivedCvss},` : '');

  const before = original.slice(0, insertAt);
  const after = `\n${closingIndent}` + original.slice(docsCloseAbs);
  const updated = `${before}${insertion}${after}`;

  if (APPLY) writeFileSync(path, updated, 'utf8');
  return {
    path,
    status: 'lifted',
    changed: true,
    cwe,
    cvss: derivedCvss,
    severity,
  };
}

// ---------------------------------------------------------------------------
// FILE WALKING
// ---------------------------------------------------------------------------

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (/\.(test|spec)\.ts$/.test(entry.name)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      if (full.includes('/__compatibility__/')) continue;
      if (full.includes('/__fixtures__/')) continue;
      out.push(full);
    }
  }
  return out;
}

function listPluginDirs(): string[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('eslint-plugin-'))
    .filter(d => !PLUGIN_FILTER || d.name === PLUGIN_FILTER)
    .map(d => join(PACKAGES_DIR, d.name))
    .filter(p => {
      try { return statSync(join(p, 'src')).isDirectory(); }
      catch { return false; }
    });
}

function listRuleFiles(pluginDir: string): string[] {
  return walkTsFiles(join(pluginDir, 'src')).filter(p => /\bmeta\s*:\s*\{/.test(readFileSync(p, 'utf8')));
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  const plugins = listPluginDirs();
  const stats: Stats = { lifted: 0, alreadyLifted: 0, noCweInMessage: 0, noMeta: 0, noDocs: 0 };
  const lifted: Array<ProcessResult & { file: string; pluginName: string }> = [];

  for (const pluginDir of plugins) {
    const pluginName = relative(PACKAGES_DIR, pluginDir);
    const files = listRuleFiles(pluginDir);
    for (const file of files) {
      let result: ProcessResult;
      try { result = processFile(file); }
      catch (err) {
        console.error(`error processing ${file}: ${(err as Error).message}`);
        continue;
      }
      const key: keyof Stats = result.status === 'no-meta' ? 'noMeta'
        : result.status === 'no-docs' ? 'noDocs'
        : result.status === 'already-lifted' ? 'alreadyLifted'
        : result.status === 'no-cwe-in-message' ? 'noCweInMessage'
        : 'lifted';
      stats[key]++;
      if (result.changed) {
        lifted.push({ file: relative(REPO_ROOT, file), pluginName, ...result });
      }
    }
  }

  console.log(`codemod-lift-cwe-to-meta-docs (${APPLY ? 'APPLY' : 'DRY-RUN'}):`);
  console.log(`  plugins scanned:        ${plugins.length}`);
  console.log(`  rules already lifted:   ${stats.alreadyLifted}`);
  console.log(`  rules with no CWE:      ${stats.noCweInMessage}`);
  console.log(`  rules with no meta:     ${stats.noMeta}`);
  console.log(`  rules with no docs:     ${stats.noDocs}`);
  console.log(`  rules to lift:          ${stats.lifted}`);
  if (lifted.length > 0) {
    console.log('');
    console.log('Sample lifts:');
    for (const l of lifted.slice(0, 10)) {
      console.log(`  ${l.file} → cwe=${l.cwe} cvss=${l.cvss ?? 'n/a'} (severity=${l.severity ?? 'n/a'})`);
    }
    if (lifted.length > 10) console.log(`  … and ${lifted.length - 10} more`);
  }
  if (!APPLY && stats.lifted > 0) {
    console.log('');
    console.log('Dry-run only. Re-run with --apply to write changes.');
  }
}

main();
