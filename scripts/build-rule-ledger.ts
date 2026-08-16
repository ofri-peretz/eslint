/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Per-rule ledger: what each rule catches, and what is known to be wrong with it.
 *
 * WHY THIS EXISTS
 *
 * "Are we ready to promote these plugins?" could not be answered, because nothing
 * tracked the four numbers the README's own FP/FN section is built on — per RULE,
 * rather than per corpus. A rule with 40 test cases and a rule with 2 both looked
 * the same from outside, and `no-ssrf` deciding taint from a parameter's SPELLING
 * was invisible until a separate gate happened to surface it.
 *
 * WHAT IS DERIVED VS ASSERTED
 *
 * Everything here is read from the repo — rule metadata, test-case counts, corpus
 * fixtures, the name-inference registry. Nothing is hand-entered, so the ledger
 * cannot drift from the code the way BENCHMARK-RESULTS.md drifted from its own
 * JSON (five different values for one measurement, 2026-08-16).
 *
 * It deliberately does NOT claim a rule is correct. Test cases prove someone
 * wrote a case down; they do not prove the case is right — this repo has shipped
 * a suite that asserted a false positive as expected behaviour (`display-name`,
 * every named component). The ledger reports COVERAGE and KNOWN DEFECTS so the
 * gaps are countable; reading the rule is still the only thing that proves it.
 *
 * Usage:
 *   tsx scripts/build-rule-ledger.ts                     # all three core plugins
 *   tsx scripts/build-rule-ledger.ts --plugin=node-security
 *   tsx scripts/build-rule-ledger.ts --json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES = path.join(REPO_ROOT, 'packages');
const CORPUS = path.join(REPO_ROOT, 'benchmarks', 'corpus');

/** The three the campaign leads with. Others are opt-in via --plugin. */
const DEFAULT_PLUGINS = ['secure-coding', 'node-security', 'browser-security'];

export interface RuleEntry {
  rule: string;
  plugin: string;
  cwe: string;
  severity: string;
  recommended: boolean;
  /** Cases the suite asserts SHOULD report — the true positives it claims. */
  invalidCases: number;
  /** Cases the suite asserts must stay quiet — the false positives it guards. */
  validCases: number;
  /** Fixtures in benchmarks/corpus for this rule's CWE, if any. */
  corpusVulnerable: number;
  corpusSafe: number;
  /** Registered name-inference debt, and which way it fails. */
  nameDebt: 'report' | 'suppress' | null;
  /** Blocking problems, in priority order. */
  gaps: string[];
}

function readMeta(source: string): { cwe: string; severity: string; recommended: boolean } {
  const cwe = /cwe:\s*'([^']+)'/.exec(source)?.[1] ?? '—';
  const severity = /severity:\s*'([A-Z]+)'/.exec(source)?.[1] ?? '—';
  return { cwe, severity, recommended: false };
}

/**
 * Count RuleTester cases by counting `code:` keys inside each array.
 *
 * Crude on purpose. A parser would be exact and would also be a second thing to
 * keep working; the number is used to spot rules with NO negative cases, and for
 * that a close count is enough. Where it matters, read the file.
 */
function countCases(source: string): { valid: number; invalid: number } {
  const count = (key: 'valid' | 'invalid'): number => {
    let total = 0;
    const re = new RegExp(`${key}\\s*:\\s*\\[`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      let depth = 1;
      let i = m.index + m[0].length;
      const start = i;
      while (i < source.length && depth > 0) {
        const c = source[i];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        i++;
      }
      total += (source.slice(start, i).match(/\bcode\s*:/g) ?? []).length;
    }
    return total;
  };
  return { valid: count('valid'), invalid: count('invalid') };
}

function corpusCounts(cwe: string): { vulnerable: number; safe: number } {
  const dir = path.join(CORPUS, cwe);
  const n = (kind: string): number => {
    const d = path.join(dir, kind);
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter((f) => /\.[jt]sx?$/.test(f)).length;
  };
  return { vulnerable: n('vulnerable'), safe: n('safe') };
}

function nameDebtIndex(): Map<string, 'report' | 'suppress'> {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'lint-name-inference.ts'), 'utf8');
  const out = new Map<string, 'report' | 'suppress'>();
  const re = /file:\s*'([^']+)',\s*\n\s*direction:\s*'(report|suppress)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.set(m[1], m[2] as 'report' | 'suppress');
  return out;
}

export function buildLedger(plugins: string[]): RuleEntry[] {
  const debt = nameDebtIndex();
  const entries: RuleEntry[] = [];

  for (const plugin of plugins) {
    const rulesDir = path.join(PACKAGES, `eslint-plugin-${plugin}`, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;

    for (const rule of fs.readdirSync(rulesDir).sort()) {
      const ruleDir = path.join(rulesDir, rule);
      if (!fs.statSync(ruleDir).isDirectory()) continue;
      const index = path.join(ruleDir, 'index.ts');
      if (!fs.existsSync(index)) continue;

      const source = fs.readFileSync(index, 'utf8');
      const meta = readMeta(source);

      const tests = fs
        .readdirSync(ruleDir)
        .filter((f) => f.endsWith('.test.ts'))
        .map((f) => fs.readFileSync(path.join(ruleDir, f), 'utf8'))
        .join('\n');
      const cases = tests ? countCases(tests) : { valid: 0, invalid: 0 };
      const corpus = corpusCounts(meta.cwe);

      const relative = `eslint-plugin-${plugin}/src/rules/${rule}/index.ts`;
      const nameDebt = debt.get(relative) ?? null;

      const gaps: string[] = [];
      // Ordered by what actually reaches a user.
      if (nameDebt === 'report') {
        gaps.push('DECIDES BY NAME (reports) — false positives ship to users');
      }
      if (cases.valid === 0) {
        gaps.push('no valid cases — nothing asserts when this rule must stay quiet');
      }
      if (cases.invalid === 0) {
        gaps.push('no invalid cases — nothing asserts what it catches');
      }
      if (corpus.vulnerable === 0) {
        gaps.push(`no corpus fixture for ${meta.cwe} — unmeasured by the benchmark`);
      }
      if (nameDebt === 'suppress') {
        gaps.push('decides by name (suppresses) — costs recall, not trust');
      }
      if (meta.cwe === '—') {
        gaps.push('no CWE in metadata — cannot appear in CWE coverage claims');
      }

      entries.push({
        rule,
        plugin,
        cwe: meta.cwe,
        severity: meta.severity,
        recommended: meta.recommended,
        invalidCases: cases.invalid,
        validCases: cases.valid,
        corpusVulnerable: corpus.vulnerable,
        corpusSafe: corpus.safe,
        nameDebt,
        gaps,
      });
    }
  }
  return entries;
}

function main(): void {
  const args = process.argv.slice(2);
  const pluginArg = args.find((a) => a.startsWith('--plugin='))?.split('=')[1];
  const plugins = pluginArg ? [pluginArg] : DEFAULT_PLUGINS;
  const entries = buildLedger(plugins);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ generated: new Date().toISOString().slice(0, 10), entries }, null, 2));
    return;
  }

  for (const plugin of plugins) {
    const rows = entries.filter((e) => e.plugin === plugin);
    if (!rows.length) continue;
    const clean = rows.filter((r) => r.gaps.length === 0).length;
    const reports = rows.filter((r) => r.nameDebt === 'report').length;
    const noValid = rows.filter((r) => r.validCases === 0).length;
    const noCorpus = rows.filter((r) => r.corpusVulnerable === 0).length;

    console.log(`\n══ eslint-plugin-${plugin} — ${rows.length} rules`);
    console.log(
      `   ${clean} with no known gap · ${reports} decide by name (report) · ` +
        `${noValid} with no valid cases · ${noCorpus} with no corpus fixture`,
    );
    console.log(`   ${'rule'.padEnd(42)} ${'CWE'.padEnd(9)} inv/val  corpus  gaps`);
    for (const r of rows.sort((a, b) => b.gaps.length - a.gaps.length)) {
      const corpus = `${r.corpusVulnerable}v/${r.corpusSafe}s`;
      const flag = r.nameDebt === 'report' ? '⛔' : r.gaps.length ? '⚠️ ' : '✅';
      console.log(
        `   ${flag} ${r.rule.padEnd(40)} ${r.cwe.padEnd(9)} ` +
          `${String(r.invalidCases).padStart(3)}/${String(r.validCases).padEnd(3)} ` +
          `${corpus.padEnd(7)} ${r.gaps[0] ?? ''}`,
      );
    }
  }

  const all = entries.length;
  const clean = entries.filter((e) => e.gaps.length === 0).length;
  console.log(`\nTOTAL ${clean}/${all} rules with no known gap.`);
}

if (process.argv[1] && import.meta.url.startsWith('file:') && process.argv[1].endsWith('build-rule-ledger.ts')) {
  main();
}
