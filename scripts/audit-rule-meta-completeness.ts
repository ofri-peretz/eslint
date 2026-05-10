#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * audit-rule-meta-completeness — static-source audit of every Interlace
 * plugin's rule meta blocks.
 *
 * The whole-run formatter (`@interlace/eslint-formatter`) renders the
 * following fields when present:
 *
 *   meta.type
 *   meta.fixable
 *   meta.hasSuggestions
 *   meta.docs.description
 *   meta.docs.url
 *   meta.docs.cwe          ← Interlace extension, surfaced in compact + json + human + xml + ndjson
 *   meta.docs.cvss         ← Interlace extension, surfaced in human + json + xml + ndjson
 *
 * Anything missing means the formatter renders a less-actionable message
 * for a downstream LLM/dev. This script reads every rule file under
 * packages/eslint-plugin-* /src/rules/, scans the `meta` block, and
 * emits a markdown report at docs/META_HYGIENE.md plus a stdout summary.
 *
 * Usage:
 *   tsx scripts/audit-rule-meta-completeness.ts
 *   tsx scripts/audit-rule-meta-completeness.ts --json     # raw JSON to stdout
 *   tsx scripts/audit-rule-meta-completeness.ts --strict   # exit non-zero below floors (CI gate)
 */

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const REPORT_PATH = join(REPO_ROOT, 'docs', 'META_HYGIENE.md');

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface RuleAudit {
  ruleName: string;
  path: string;
  hasMeta: boolean;
  type: boolean;
  description: boolean;
  url: boolean;
  cwe: boolean;
  cvss: boolean;
  fixable: boolean;
  hasSuggestions: boolean;
  cweEmbeddedInMessage: boolean;
  score: number;
}

interface PluginAudit {
  pluginName: string;
  ruleCount: number;
  counts: {
    type: number;
    description: number;
    url: number;
    cwe: number;
    cvss: number;
    fixable: number;
    hasSuggestions: number;
    cweEmbeddedInMessage: number;
  };
  avgScore: number;
  rules: RuleAudit[];
}

interface RuleDefinition {
  ruleName: string;
  path: string;
  occurrenceIndex: number;
}

// ---------------------------------------------------------------------------
// FILE WALKING
// ---------------------------------------------------------------------------

function isPluginDir(name: string): boolean {
  return name.startsWith('eslint-plugin-');
}

function listPluginDirs(): string[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && isPluginDir(d.name))
    .map(d => join(PACKAGES_DIR, d.name))
    .filter(p => {
      try { return statSync(join(p, 'src')).isDirectory(); }
      catch { return false; }
    });
}

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
      // Skip test/spec/fixture files — they're not rule definitions.
      if (/\.(test|spec)\.ts$/.test(entry.name)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      if (full.includes('/__compatibility__/')) continue;
      if (full.includes('/__fixtures__/')) continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Find every rule definition under a plugin. Each rule is a `meta: {`
 * block that owns the file (or appears at the same lexical level as a
 * sibling rule in a multi-rule file).
 */
function listRuleDefinitions(pluginDir: string): RuleDefinition[] {
  // Plugins use one of: src/rules/, src/lib/, src/files/, or a flat src/.
  // Walk anything under src/ that's plausible.
  const srcDir = join(pluginDir, 'src');
  const candidates = walkTsFiles(srcDir);
  const out: RuleDefinition[] = [];
  for (const path of candidates) {
    const source = readFileSync(path, 'utf8');
    if (!/\bmeta\s*:\s*\{/.test(source)) continue;

    const ruleNames = extractRuleNamesAroundMeta(source);
    if (ruleNames.length === 0) {
      const fileBasename = path.split('/').pop()!.replace(/\.ts$/, '');
      const dirBasename = path.split('/').slice(-2)[0]!;
      const ruleName = fileBasename === 'index' ? dirBasename : fileBasename;
      out.push({ ruleName, path, occurrenceIndex: 0 });
    } else {
      for (let i = 0; i < ruleNames.length; i++) {
        out.push({ ruleName: ruleNames[i]!, path, occurrenceIndex: i });
      }
    }
  }
  return out;
}

/**
 * Heuristic: for each `meta: {` block, walk back ~400 chars and look
 * for the nearest identifier that names a rule export.
 */
function extractRuleNamesAroundMeta(source: string): string[] {
  const names: string[] = [];
  const re = /\bmeta\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const lookbehind = source.slice(Math.max(0, m.index - 400), m.index);
    let name: string | null = null;
    const stringRule = lookbehind.match(/['"]([a-z][a-z0-9-]+)['"]\s*:\s*\{[^}]*$/);
    if (stringRule) name = stringRule[1]!;
    if (!name) {
      const exportConst = lookbehind.match(/export\s+const\s+([A-Za-z_][\w]*)[\s:=]/);
      if (exportConst) name = camelToKebab(exportConst[1]!);
    }
    if (!name) {
      const constLet = lookbehind.match(/(?:const|let)\s+([A-Za-z_][\w]*)[\s:=]/);
      if (constLet) name = camelToKebab(constLet[1]!);
    }
    if (name) names.push(name);
    else names.push(`(unnamed-${names.length})`);
  }
  return names;
}

function camelToKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// META BLOCK EXTRACTION
// ---------------------------------------------------------------------------

type StringDelim = "'" | '"' | '`' | null;

function extractBalancedBlock(source: string, openIdx: number): string | null {
  if (source[openIdx] !== '{') return null;
  let depth = 0;
  let inString: StringDelim = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch as StringDelim; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(openIdx, i + 1);
      }
    }
  }
  return null;
}

function findKeyBlock(scope: string, key: string): string | null {
  const re = new RegExp(`(?:^|[\\s,{])${key}\\s*:\\s*\\{`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const openIdx = scope.indexOf('{', m.index);
    if (openIdx === -1) continue;
    let depth = 0;
    let inString: StringDelim = null;
    let inLineComment = false;
    let inBlockComment = false;
    for (let i = 0; i < openIdx; i++) {
      const ch = scope[i];
      const next = scope[i + 1];
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
    if (depth !== 1) continue;
    return extractBalancedBlock(scope, openIdx);
  }
  return null;
}

function hasKey(scope: string, key: string): boolean {
  const re = new RegExp(`(?:^|[\\s,{])${key}\\s*:`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const idx = m.index + m[0].indexOf(key);
    let depth = 0;
    let inString: StringDelim = null;
    let inLineComment = false;
    let inBlockComment = false;
    for (let i = 0; i < idx; i++) {
      const ch = scope[i];
      const next = scope[i + 1];
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
    if (depth === 1) return true;
  }
  return false;
}

function findNthMetaBlock(source: string, n: number): string | null {
  const re = /(?:^|[\s,{])meta\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(source)) !== null) {
    if (idx === n) {
      const openIdx = source.indexOf('{', m.index);
      return extractBalancedBlock(source, openIdx);
    }
    idx++;
  }
  return null;
}

function detectEmbeddedCwe(source: string): boolean {
  // Many Interlace rules currently put `cwe:` inside `formatLLMMessage`
  // calls in `messages.*`, not at meta.docs.cwe.
  return /formatLLMMessage\s*\(\s*\{[\s\S]*?cwe\s*:/.test(source);
}

// ---------------------------------------------------------------------------
// AUDIT
// ---------------------------------------------------------------------------

function auditRule(ruleName: string, path: string, occurrenceIndex = 0): RuleAudit {
  const source = readFileSync(path, 'utf8');
  const meta = findNthMetaBlock(source, occurrenceIndex);
  if (!meta) {
    return {
      ruleName,
      path,
      hasMeta: false,
      type: false,
      description: false,
      url: false,
      cwe: false,
      cvss: false,
      fixable: false,
      hasSuggestions: false,
      cweEmbeddedInMessage: detectEmbeddedCwe(source),
      score: 0,
    };
  }

  const docs = findKeyBlock(meta, 'docs');
  const checks = {
    type: hasKey(meta, 'type'),
    description: docs ? hasKey(docs, 'description') : false,
    url: docs ? hasKey(docs, 'url') : false,
    cwe: docs ? hasKey(docs, 'cwe') : false,
    cvss: docs ? hasKey(docs, 'cvss') : false,
    fixable: hasKey(meta, 'fixable'),
    hasSuggestions: hasKey(meta, 'hasSuggestions'),
  };

  const cweEmbeddedInMessage = !checks.cwe && detectEmbeddedCwe(source);

  // Score: 4 core fields (type, description, url) + 2 advanced (cwe, cvss)
  // + 2 contextual (fixable, hasSuggestions). Total 7. We weight the core
  // 3 heavier — they're what the formatter renders by default.
  const core = (checks.type ? 1 : 0) + (checks.description ? 1 : 0) + (checks.url ? 1 : 0);
  const advanced = (checks.cwe ? 1 : 0) + (checks.cvss ? 1 : 0);
  const contextual = (checks.fixable ? 1 : 0) + (checks.hasSuggestions ? 1 : 0);
  const score = (core * 3 + advanced * 2 + contextual * 1) / (3 * 3 + 2 * 2 + 1 * 2);

  return {
    ruleName,
    path,
    hasMeta: true,
    ...checks,
    cweEmbeddedInMessage,
    score: Math.round(score * 1000) / 1000,
  };
}

function auditPlugin(pluginDir: string): PluginAudit | null {
  const pluginName = relative(PACKAGES_DIR, pluginDir);
  const rules = listRuleDefinitions(pluginDir).map(({ ruleName, path, occurrenceIndex }) =>
    auditRule(ruleName, path, occurrenceIndex),
  );
  const ruleCount = rules.length;
  if (ruleCount === 0) return null;
  const counts = {
    type: rules.filter(r => r.type).length,
    description: rules.filter(r => r.description).length,
    url: rules.filter(r => r.url).length,
    cwe: rules.filter(r => r.cwe).length,
    cvss: rules.filter(r => r.cvss).length,
    fixable: rules.filter(r => r.fixable).length,
    hasSuggestions: rules.filter(r => r.hasSuggestions).length,
    cweEmbeddedInMessage: rules.filter(r => r.cweEmbeddedInMessage).length,
  };
  const avgScore = rules.reduce((s, r) => s + r.score, 0) / ruleCount;
  return {
    pluginName,
    ruleCount,
    counts,
    avgScore: Math.round(avgScore * 1000) / 1000,
    rules,
  };
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

function pct(n: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((n / total) * 100)}%`;
}

function buildMarkdown(audit: PluginAudit[]): string {
  const lines: string[] = [];
  lines.push('# Plugin Rule Meta Hygiene Audit');
  lines.push('');
  lines.push(`> Generated by \`tsx scripts/audit-rule-meta-completeness.ts\` on ${new Date().toISOString().slice(0, 10)}.`);
  lines.push('> Source-of-truth contract: every rule should populate the fields the whole-run formatter renders. Holes here translate directly into less-actionable LLM output.');
  lines.push('');
  lines.push('## What we check');
  lines.push('');
  lines.push('| Field | Why the formatter cares |');
  lines.push('| :--- | :--- |');
  lines.push('| `meta.type` | Drives ESLint built-in classification — `problem` vs `suggestion` vs `layout`. |');
  lines.push('| `meta.docs.description` | Fallback in the formatter when no per-message text is present. |');
  lines.push('| `meta.docs.url` | Rendered as a clickable docs link in human + JSON modes. |');
  lines.push('| `meta.docs.cwe` *(Interlace ext.)* | Surfaced inline in human + compact + JSON + XML + NDJSON. Most actionable single TP-classification field for a security finding. |');
  lines.push('| `meta.docs.cvss` *(Interlace ext.)* | Surfaced as severity context in human + JSON + XML + NDJSON. |');
  lines.push('| `meta.fixable` | Drives the `(fixable)` / `[fixable]` markers in every mode. |');
  lines.push('| `meta.hasSuggestions` | Drives the `(has suggestions)` marker + lifts ESLint suggestions into the formatter render. |');
  lines.push('');
  lines.push('## Per-plugin summary');
  lines.push('');
  lines.push('Sorted by descending completeness. CWE column counts rules with `meta.docs.cwe` set; the parenthesised number after it is rules where CWE is *embedded inside `formatLLMMessage`* (so the rule "has a CWE" but the formatter cannot see it — these are recommended fixes).');
  lines.push('');
  lines.push('| Plugin | Rules | Score | type | description | url | **cwe** | cvss | fixable | hasSuggestions |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  const sorted = [...audit].sort((a, b) => b.avgScore - a.avgScore);
  for (const p of sorted) {
    const cweCol = p.counts.cweEmbeddedInMessage > 0
      ? `${p.counts.cwe}/${p.ruleCount} (+${p.counts.cweEmbeddedInMessage} embedded)`
      : `${p.counts.cwe}/${p.ruleCount}`;
    lines.push(`| \`${p.pluginName}\` | ${p.ruleCount} | ${(p.avgScore * 100).toFixed(0)}% | ${pct(p.counts.type, p.ruleCount)} | ${pct(p.counts.description, p.ruleCount)} | ${pct(p.counts.url, p.ruleCount)} | ${cweCol} | ${pct(p.counts.cvss, p.ruleCount)} | ${pct(p.counts.fixable, p.ruleCount)} | ${pct(p.counts.hasSuggestions, p.ruleCount)} |`);
  }
  lines.push('');

  const allRules = audit.flatMap(p => p.rules.map(r => ({ ...r, pluginName: p.pluginName })));
  const missingCore = allRules.filter(r => r.hasMeta && (!r.type || !r.description || !r.url));
  lines.push('## Rules missing core fields (`type` / `description` / `url`)');
  lines.push('');
  if (missingCore.length === 0) {
    lines.push('None — every rule has the three core meta fields. ✅');
  } else {
    lines.push(`${missingCore.length} rule(s) are missing one of the three fields the formatter falls back on:`);
    lines.push('');
    lines.push('| Plugin | Rule | Missing |');
    lines.push('| :--- | :--- | :--- |');
    for (const r of missingCore.slice(0, 50)) {
      const missing: string[] = [];
      if (!r.type) missing.push('`type`');
      if (!r.description) missing.push('`description`');
      if (!r.url) missing.push('`url`');
      lines.push(`| \`${r.pluginName}\` | \`${r.ruleName}\` | ${missing.join(', ')} |`);
    }
    if (missingCore.length > 50) {
      lines.push(`| _… ${missingCore.length - 50} more_ | | |`);
    }
  }
  lines.push('');

  const embedded = allRules.filter(r => r.cweEmbeddedInMessage);
  lines.push('## CWE embedded in messages but not in `meta.docs.cwe`');
  lines.push('');
  if (embedded.length === 0) {
    lines.push('None — every rule that knows its CWE exposes it via `meta.docs.cwe`. ✅');
  } else {
    lines.push(`${embedded.length} rule(s) put their CWE inside \`formatLLMMessage(...)\` in \`messages.*\` rather than on \`meta.docs.cwe\`. The formatter can't see those, so no CWE prefix appears in the output. Lifting the value to \`meta.docs.cwe\` is a one-line change per rule and unlocks security context in every render.`);
    lines.push('');
    lines.push('| Plugin | Rule |');
    lines.push('| :--- | :--- |');
    for (const r of embedded.slice(0, 100)) {
      lines.push(`| \`${r.pluginName}\` | \`${r.ruleName}\` |`);
    }
    if (embedded.length > 100) {
      lines.push(`| _… ${embedded.length - 100} more_ | |`);
    }
  }
  lines.push('');

  const fullyDecorated = allRules.filter(r => r.hasMeta && r.type && r.description && r.url && r.cwe);
  lines.push(`## Fully-decorated rules (have type + description + url + cwe)`);
  lines.push('');
  lines.push(`${fullyDecorated.length} of ${allRules.length} (${pct(fullyDecorated.length, allRules.length)}).`);
  lines.push('');

  return lines.join('\n');
}

function buildConsoleSummary(audit: PluginAudit[]): string {
  const lines: string[] = [];
  const total = audit.reduce((s, p) => s + p.ruleCount, 0);
  const totalCwe = audit.reduce((s, p) => s + p.counts.cwe, 0);
  const totalEmbedded = audit.reduce((s, p) => s + p.counts.cweEmbeddedInMessage, 0);
  lines.push(`Audit: ${audit.length} plugins · ${total} rules total`);
  lines.push('');
  lines.push('Plugin                                 Rules  Score  desc   url    cwe (embedded)');
  lines.push('────────────────────────────────────  ─────  ─────  ─────  ─────  ──────────────');
  const sorted = [...audit].sort((a, b) => b.avgScore - a.avgScore);
  for (const p of sorted) {
    lines.push([
      p.pluginName.padEnd(38),
      String(p.ruleCount).padStart(5),
      `${(p.avgScore * 100).toFixed(0)}%`.padStart(5),
      pct(p.counts.description, p.ruleCount).padStart(5),
      pct(p.counts.url, p.ruleCount).padStart(5),
      `${p.counts.cwe}/${p.ruleCount}`.padStart(7) + (p.counts.cweEmbeddedInMessage > 0 ? ` (+${p.counts.cweEmbeddedInMessage})` : ''),
    ].join('  '));
  }
  lines.push('');
  lines.push(`Across all plugins: ${totalCwe}/${total} rules expose CWE at meta.docs.cwe (formatter-visible).`);
  lines.push(`Embedded-only CWE  : ${totalEmbedded} more rule(s) have CWE inside formatLLMMessage but not at meta.docs.cwe — formatter cannot see them.`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// STRICT-MODE FLOORS
// ---------------------------------------------------------------------------

/**
 * Per-aspect completeness floors for `--strict` mode (CI gate).
 *
 * Philosophy: floors are set at the **current passing minimum** so the
 * gate is a "don't get worse" ratchet. Any regression below the floor
 * fails CI; manually bumping the floor (after fixing the lagging
 * plugin) is the way to ratchet quality upward.
 *
 * 2026-05-09 starting state (post-codemod):
 *   description: min = 75% (modernization 75%, modularity 83%, others ≥ 86%)
 *   overall score: min = 53% (modernization 53%, others ≥ 58%)
 *   cwe (security plugins only): min = 86% (nestjs-security 86%, others ≥ 91%)
 *
 * Ratchet targets — bump these when the lagging plugin clears.
 */
const STRICT_FLOORS = {
  descriptionPct: 0.75,
  scorePct: 0.5,
  cwePctSecurity: 0.85,
} as const;

const SECURITY_PLUGIN_RE = /-security$/;

function checkStrictFloors(audit: PluginAudit[]): string[] {
  const failures: string[] = [];
  for (const p of audit) {
    const descPct = p.counts.description / p.ruleCount;
    if (descPct < STRICT_FLOORS.descriptionPct) {
      failures.push(`${p.pluginName}: description ${pct(p.counts.description, p.ruleCount)} below floor ${STRICT_FLOORS.descriptionPct * 100}%`);
    }
    if (p.avgScore < STRICT_FLOORS.scorePct) {
      failures.push(`${p.pluginName}: overall score ${(p.avgScore * 100).toFixed(0)}% below floor ${STRICT_FLOORS.scorePct * 100}%`);
    }
    if (SECURITY_PLUGIN_RE.test(p.pluginName)) {
      const cwePct = p.counts.cwe / p.ruleCount;
      if (cwePct < STRICT_FLOORS.cwePctSecurity) {
        failures.push(`${p.pluginName}: CWE coverage ${pct(p.counts.cwe, p.ruleCount)} below security-plugin floor ${STRICT_FLOORS.cwePctSecurity * 100}%`);
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  const wantJson = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');
  const plugins = listPluginDirs();
  const audit = plugins.map(auditPlugin).filter((p): p is PluginAudit => p !== null);

  if (wantJson) {
    process.stdout.write(JSON.stringify(audit, null, 2) + '\n');
    return;
  }

  const md = buildMarkdown(audit);
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, md, 'utf8');

  console.log(buildConsoleSummary(audit));
  console.log('');
  console.log(`Wrote ${relative(REPO_ROOT, REPORT_PATH)}`);

  if (strict) {
    const failures = checkStrictFloors(audit);
    console.log('');
    if (failures.length === 0) {
      console.log(`Strict mode: PASS — every plugin clears the completeness floors (description ≥ ${STRICT_FLOORS.descriptionPct * 100}%, score ≥ ${STRICT_FLOORS.scorePct * 100}%, security-plugin CWE ≥ ${STRICT_FLOORS.cwePctSecurity * 100}%).`);
    } else {
      console.log(`Strict mode: FAIL — ${failures.length} plugin-level violation(s):`);
      for (const f of failures) console.log(`  • ${f}`);
      process.exit(1);
    }
  }
}

main();
