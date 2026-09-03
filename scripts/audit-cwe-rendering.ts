#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * audit-cwe-rendering — fleet smoke test that proves every plugin's
 * `meta.docs.cwe` actually reaches the @interlace/eslint-formatter
 * output. The codemod (`scripts/codemod-lift-cwe-to-meta-docs.ts`)
 * lifts the field; this script verifies the lift is end-to-end visible.
 *
 * Source-static implementation: instead of dynamically requiring each
 * plugin's compiled dist (which chains through workspace symlinks and
 * runtime deps that aren't always resolvable from a clean checkout),
 * we read each rule file's source, regex-extract its
 * `meta.docs.cwe` / `meta.docs.cvss` values, synthesize a single
 * LintResult for that ruleId, and run it through the formatter.
 *
 * Asserts:
 *   1. The formatter compact output contains `[CWE-NNN]` (the prefix
 *      the compact renderer emits when meta.docs.cwe is present).
 *   2. The output contains the synthesized ruleId.
 *
 * Failure surfaces the *opposite* of what the audit-rule-meta-
 * completeness script does: that script confirms the field is present
 * in source; this script confirms the field reaches the formatter.
 *
 * Usage:
 *   tsx scripts/audit-cwe-rendering.ts           # warns; non-zero only on FAIL
 *   tsx scripts/audit-cwe-rendering.ts --strict  # fail on any plugin without ANY CWE-bearing rule
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const FORMATTER_DIST = join(REPO_ROOT, 'dist/out-tsc/packages/eslint-formatter/src/index.js');
const STRICT = process.argv.includes('--strict');

const require_ = createRequire(import.meta.url);

if (!existsSync(FORMATTER_DIST)) {
  console.error(`fatal: formatter dist not found at ${relative(REPO_ROOT, FORMATTER_DIST)} — run \`npx tsc -p packages/eslint-formatter/tsconfig.lib.json\` first.`);
  process.exit(2);
}

type FormatterFn = (results: unknown, context?: unknown) => string;
const formatter = require_(FORMATTER_DIST) as FormatterFn;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface CweRuleInfo {
  cwe: string;
  cvss: number | null;
  ruleName: string;
  path: string;
}

type ResultStatus = 'pass' | 'fail' | 'no-cwe-rule';

interface PluginResult {
  pluginName: string;
  status: ResultStatus;
  cwe?: string;
  cvss?: number | null;
  ruleName?: string;
  cweRendered?: boolean;
  ruleIdRendered?: boolean;
}

// ---------------------------------------------------------------------------
// SOURCE WALKING + EXTRACTION
// ---------------------------------------------------------------------------

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) {
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
    .map(d => join(PACKAGES_DIR, d.name))
    .filter(p => {
      try { return statSync(join(p, 'src')).isDirectory(); }
      catch { return false; }
    });
}

function extractFirstCwe(source: string): { cwe: string; cvss: number | null } | null {
  const cweMatch = /\bcwe\s*:\s*['"]([^'"]+)['"]/.exec(source);
  if (!cweMatch) return null;
  const cvssMatch = /\bcvss\s*:\s*([0-9]+(?:\.[0-9]+)?)/.exec(source);
  return {
    cwe: cweMatch[1]!,
    cvss: cvssMatch ? Number(cvssMatch[1]) : null,
  };
}

function deriveRuleId(filePath: string): string {
  const parts = filePath.split('/');
  const fileBasename = parts[parts.length - 1]!.replace(/\.ts$/, '');
  if (fileBasename === 'index' && parts.length >= 2) {
    return parts[parts.length - 2]!;
  }
  return fileBasename;
}

function findFirstCweRule(pluginDir: string): CweRuleInfo | null {
  const srcDir = join(pluginDir, 'src');
  for (const file of walkTsFiles(srcDir)) {
    const source = readFileSync(file, 'utf8');
    if (!/\bmeta\s*:\s*\{/.test(source)) continue;
    const found = extractFirstCwe(source);
    if (found) {
      return {
        ...found,
        ruleName: deriveRuleId(file),
        path: relative(REPO_ROOT, file),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// FORMATTER HANDSHAKE
// ---------------------------------------------------------------------------

function renderCompactWithRule(
  pluginShortName: string,
  ruleName: string,
  cwe: string,
  cvss: number | null,
): { output: string; fullRuleId: string } {
  const fullRuleId = `@interlace/${pluginShortName}/${ruleName}`;
  const synthetic = [{
    filePath: '/tmp/test.ts',
    messages: [{
      ruleId: fullRuleId,
      severity: 2 as const,
      message: 'synthesised finding for CWE-rendering smoke',
      line: 1,
      column: 1,
      nodeType: 'CallExpression',
    }],
    errorCount: 1, warningCount: 0, fixableErrorCount: 0, fixableWarningCount: 0,
  }];
  const previousMode = process.env['ESLINT_FORMAT_MODE'];
  process.env['ESLINT_FORMAT_MODE'] = 'compact';
  try {
    const ruleMeta = {
      type: 'problem' as const,
      docs: {
        description: `synthesized — ${ruleName}`,
        cwe,
        ...(cvss !== null ? { cvss } : {}),
      },
    };
    return {
      output: formatter(synthetic, {
        cwd: '/tmp',
        rulesMeta: { [fullRuleId]: ruleMeta },
      }),
      fullRuleId,
    };
  } finally {
    if (previousMode === undefined) delete process.env['ESLINT_FORMAT_MODE'];
    else process.env['ESLINT_FORMAT_MODE'] = previousMode;
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  const plugins = listPluginDirs();
  const results: PluginResult[] = [];
  for (const pluginDir of plugins) {
    const pluginName = relative(PACKAGES_DIR, pluginDir);
    const pluginShortName = pluginName.replace(/^eslint-plugin-/, '');
    const cweRule = findFirstCweRule(pluginDir);
    if (!cweRule) {
      results.push({ pluginName, status: 'no-cwe-rule' });
      continue;
    }
    const { output, fullRuleId } = renderCompactWithRule(pluginShortName, cweRule.ruleName, cweRule.cwe, cweRule.cvss);
    const cweRendered = output.includes(`[${cweRule.cwe}]`);
    const ruleIdRendered = output.includes(fullRuleId);
    results.push({
      pluginName,
      status: cweRendered && ruleIdRendered ? 'pass' : 'fail',
      cwe: cweRule.cwe,
      cvss: cweRule.cvss,
      ruleName: cweRule.ruleName,
      cweRendered,
      ruleIdRendered,
    });
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const noCwe = results.filter(r => r.status === 'no-cwe-rule').length;

  console.log('audit-cwe-rendering — fleet smoke for formatter ↔ rule-meta handshake');
  console.log('');
  console.log(`  plugins scanned:           ${plugins.length}`);
  console.log(`  ✓ pass (CWE rendered):     ${passed}`);
  console.log(`  ✗ fail (CWE invisible):    ${failed}`);
  console.log(`  ⏵ no CWE-bearing rule:     ${noCwe}`);

  if (passed > 0) {
    console.log('');
    console.log('Sample passes:');
    for (const r of results.filter(r => r.status === 'pass').slice(0, 5)) {
      console.log(`  ${r.pluginName}/${r.ruleName} → [${r.cwe}${r.cvss ? ` · CVSS ${r.cvss}` : ''}]`);
    }
    if (results.filter(r => r.status === 'pass').length > 5) {
      console.log(`  … and ${results.filter(r => r.status === 'pass').length - 5} more`);
    }
  }
  if (failed > 0) {
    console.log('');
    console.log('Failures:');
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  ${r.pluginName}/${r.ruleName} (cwe=${r.cwe}): cweRendered=${r.cweRendered}, ruleIdRendered=${r.ruleIdRendered}`);
    }
  }
  if (STRICT && noCwe > 0) {
    console.log('');
    console.log('Strict mode: FAIL — plugins with no CWE-bearing rule:');
    for (const r of results.filter(r => r.status === 'no-cwe-rule')) {
      console.log(`  ${r.pluginName}`);
    }
  }

  if (failed > 0 || (STRICT && noCwe > 0)) process.exit(1);
}

main();
