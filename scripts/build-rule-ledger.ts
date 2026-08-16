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
 *   tsx scripts/build-rule-ledger.ts --dossier            # per-rule decision record
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { auditRule, collectFacts, CHECK_SUMMARY, type Finding } from './rule-audit.js';

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
  /**
   * Every check that fired, from scripts/rule-audit.ts.
   *
   * Split by TIER when you read this, always. `defects` are facts about the
   * artifact; `smells` are patterns that need a behavioural probe and have
   * already, once, been miscounted as defects in a summary that reached the
   * user. Never total the two together.
   */
  findings: Finding[];
  /** Convenience: findings.filter(tier === 'defect').map(detail). */
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
    const facts = collectFacts(PACKAGES, plugin, (rule, cwe) => {
      const dir = path.join(PACKAGES, `eslint-plugin-${plugin}`, 'src', 'rules', rule);
      const tests = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.test.ts'))
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
        .join('\n');
      const cases = tests ? countCases(tests) : { valid: 0, invalid: 0 };
      return {
        validCases: cases.valid,
        invalidCases: cases.invalid,
        corpusVulnerable: corpusCounts(cwe).vulnerable,
        nameDebt: debt.get(`eslint-plugin-${plugin}/src/rules/${rule}/index.ts`) ?? null,
      };
    });

    for (const f of facts) {
      const findings = auditRule(f);
      const meta = readMeta(f.source);
      entries.push({
        rule: f.rule,
        plugin,
        cwe: f.cwe,
        severity: meta.severity,
        recommended: meta.recommended,
        invalidCases: f.invalidCases,
        validCases: f.validCases,
        corpusVulnerable: f.corpusVulnerable,
        corpusSafe: corpusCounts(f.cwe).safe,
        nameDebt: f.nameDebt,
        findings,
        // DEFECTS ONLY. A smell in this list would be counted in the summary
        // line, and that is precisely how "16 rules decide by name" — a claim
        // that survived no probe and turned out to be false for all sixteen —
        // reached the user on 2026-08-16. Smells stay in `findings`, and the
        // dossier prints them under their own heading, with their probe.
        gaps: findings.filter((x) => x.tier === 'defect').map((x) => x.detail),
      });
    }
  }
  return entries;
}

/**
 * The rationale attached to a RuleTester case.
 *
 * Every `code:` in these suites is preceded by the comment explaining WHY the case
 * exists — "Traversal literal assigned to a variable with no archive-ish name",
 * "entry-named variable assigned from entry.name (tracked, no report)". Those
 * comments ARE the decision record; they were just never readable in one place.
 *
 * Read as text rather than parsed: the shapes vary (block comments, `name:` keys,
 * bare `//` runs) and a parser strict enough to be correct would miss the loose
 * ones, which are the majority.
 */
function extractCases(source: string, key: 'valid' | 'invalid'): string[] {
  const out: string[] = [];
  const re = new RegExp(`${key}\\s*:\\s*\\[`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '[') depth++;
      else if (source[i] === ']') depth--;
      i++;
    }
    const block = source.slice(start, i);
    const lines = block.split('\n');
    let pending: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('//')) {
        pending.push(line.replace(/^\/\/\s?/, ''));
        continue;
      }
      const named = /^name:\s*['"`](.+?)['"`]/.exec(line);
      if (named) {
        pending.push(named[1]);
        continue;
      }
      if (/^code\s*:/.test(line)) {
        const snippet = line.replace(/^code\s*:\s*/, '').replace(/[,`]$/, '').slice(0, 90);
        // Sanitise before wrapping in a code span. These snippets are sliced out
        // of real test files, so they carry template-literal backticks and the
        // ragged edges of a 90-char cut — both of which produce markdownlint
        // MD038/MD039 errors and fail the commit hook on a purely generated file.
        const span = snippet.replace(/`/g, "'").replace(/\s+/g, ' ').trim();
        if (!span) continue;
        out.push(pending.length ? `${pending.join(' ')} — \`${span}\`` : `\`${span}\``);
        pending = [];
        continue;
      }
      if (line === '' || line === '},' || line === '{') pending = [];
    }
  }
  return out;
}

/**
 * Make author prose safe to embed in a linted markdown file.
 *
 * These dossiers are generated, but they land in a repo whose pre-commit hook
 * runs markdownlint over everything — so a rule whose doc comment contains
 * `<h1>` or a code span with a ragged edge blocks the commit, in a file no
 * human wrote. Fixing it at the source (editing 121 doc comments to please a
 * markdown linter) would be the tail wagging the dog.
 */
function sanitizeProse(text: string): string {
  return text
    .replace(/`([^`\n]*)`/g, (_, inner: string) => (inner.trim() ? `\`${inner.trim()}\`` : ''))
    .replace(/<(\/?[A-Za-z][\w-]*)/g, '&lt;$1')
    // Doc comments indent their bullet lists for readability inside the `*`
    // gutter. Lifted verbatim into markdown that becomes a top-level list at
    // the wrong indent (MD007).
    .replace(/^ {1,3}([-*] )/gm, '$1');
}

/** The rule's own header comment — the WHY, in the author's words. */
function ruleDoc(source: string): string {
  const m = /\/\*\*([\s\S]*?)\*\//g.exec(source.slice(source.indexOf('*/') + 2));
  if (!m) return '';
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

function writeDossiers(entries: RuleEntry[]): void {
  const outDir = path.join(REPO_ROOT, 'docs', 'rule-ledger');
  fs.mkdirSync(outDir, { recursive: true });

  for (const e of entries) {
    const ruleDir = path.join(PACKAGES, `eslint-plugin-${e.plugin}`, 'src', 'rules', e.rule);
    const source = fs.readFileSync(path.join(ruleDir, 'index.ts'), 'utf8');
    const tests = fs
      .readdirSync(ruleDir)
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => fs.readFileSync(path.join(ruleDir, f), 'utf8'))
      .join('\n');

    const tp = extractCases(tests, 'invalid');
    const guards = extractCases(tests, 'valid');

    const lines = [
      `# \`${e.plugin}/${e.rule}\``,
      '',
      `**${e.cwe}** · severity ${e.severity} · ${e.invalidCases} catch cases · ${e.validCases} quiet cases`,
      '',
      '> Generated by `npm run rule-ledger -- --dossier`. Every line below is read from',
      '> the rule and its tests — edit those, not this file.',
      '',
    ];

    const defects = e.findings.filter((f) => f.tier === 'defect');
    const smells = e.findings.filter((f) => f.tier === 'smell');

    lines.push(
      '## Audit',
      '',
      `${defects.length} defect(s), ${smells.length} smell(s). A defect is a fact about this`,
      'rule\'s files. A smell is a pattern that co-occurs with a defect class and **proves',
      'nothing on its own** — each carries the probe that would settle it. Do not add the',
      'two together, and do not report a smell as a finding until its probe has been run.',
      '',
    );

    if (defects.length) {
      lines.push('### Defects — established', '');
      for (const d of defects) lines.push(`- **\`${d.id}\`** (${d.category}) — ${d.detail}`);
      lines.push('');
    }
    if (smells.length) {
      lines.push('### Smells — unproven, each with its probe', '');
      for (const s of smells) {
        lines.push(`- **\`${s.id}\`** (${s.category}) — ${s.detail}${s.probe ? ` **Probe:** ${s.probe}` : ''}`);
      }
      lines.push('');
    }
    if (!e.findings.length) {
      lines.push('No check fired. That means no KNOWN gap — it is not evidence of correctness.', '');
    }

    const why = ruleDoc(source);
    if (why) lines.push('## Why this rule exists', '', sanitizeProse(why), '');

    lines.push(
      '## True positives — what it catches',
      '',
      `${tp.length} asserted case(s). These are the claims; each is only as good as the case.`,
      '',
    );
    for (const c of tp) lines.push(`- ${c}`);

    lines.push(
      '',
      '## False-positive guards — what it must NOT flag',
      '',
      `${guards.length} asserted case(s). A rule with few of these has not been argued with.`,
      '',
    );
    for (const c of guards) lines.push(`- ${c}`);

    lines.push(
      '',
      '## Not covered',
      '',
      e.corpusVulnerable === 0
        ? `No \`benchmarks/corpus/${e.cwe}/\` fixture, so this rule contributes nothing to the` +
          ' published detection or false-positive figures. It is untested by the benchmark.'
        : `Corpus: ${e.corpusVulnerable} vulnerable, ${e.corpusSafe} safe fixtures under \`${e.cwe}\`.`,
      '',
    );

    fs.writeFileSync(path.join(outDir, `${e.plugin}__${e.rule}.md`), lines.join('\n') + '\n');
  }
  writeIndex(entries, outDir);
  console.log(`Wrote ${entries.length} dossiers to docs/rule-ledger/`);
}

/**
 * The worklist. One row per CHECK, not per rule — because "101 rules carry a
 * defect" is not a task anyone can pick up, whereas "46 rules ship a suggestion
 * ESLint discards" is.
 */
function writeIndex(entries: RuleEntry[], outDir: string): void {
  const byCheck = new Map<string, { tier: string; category: string; detail: string; rules: string[] }>();
  for (const e of entries) {
    for (const f of e.findings) {
      const row = byCheck.get(f.id) ?? { tier: f.tier, category: f.category, detail: f.detail, rules: [] };
      row.rules.push(`${e.plugin}/${e.rule}`);
      byCheck.set(f.id, row);
    }
  }
  const sorted = [...byCheck].sort((a, b) => b[1].rules.length - a[1].rules.length);
  const tier = (t: string) => sorted.filter(([, r]) => r.tier === t);

  const lines = [
    '# Rule ledger — per-rule decision records',
    '',
    `${entries.length} rules across ${new Set(entries.map((e) => e.plugin)).size} plugins.`,
    'Generated by `npm run rule-ledger -- --dossier`. Do not edit by hand.',
    '',
    '## How to read this',
    '',
    'Findings come in two tiers, and **they must never be added together**.',
    '',
    '| Tier | Means | Action |',
    '| --- | --- | --- |',
    '| **Defect** | A fact about the rule\'s files. Countable, falsifiable by reading them. | Fix it. |',
    '| **Smell** | A pattern that co-occurs with a defect class and proves nothing alone. | Run the probe in the dossier, *then* decide. |',
    '',
    'This distinction is not pedantry. On 2026-08-16 a summary asserted "16 rules decide',
    'by name — false positives ship to users" from pattern presence alone. All 16 were then',
    'probed with benign snippets whose only trigger was a matching identifier; every one',
    'stayed quiet. The claim was false, and acting on it would have meant rewriting 16',
    'healthy rules. A smell reported as a defect is how that happens.',
    '',
    'Nothing here proves a rule *correct*. `display-name` once had green tests asserting a',
    'false positive as expected behaviour. Coverage is not correctness.',
    '',
    '## Defects — established, ranked by reach',
    '',
    '| Count | Check | Category | What it means |',
    '| ---: | --- | --- | --- |',
  ];
  for (const [id, r] of tier('defect')) {
    lines.push(`| ${r.rules.length} | \`${id}\` | ${r.category} | ${CHECK_SUMMARY[id] ?? r.detail} |`);
  }
  lines.push(
    '',
    '## Smells — unproven; each dossier carries its probe',
    '',
    '| Count | Check | Category | What it means |',
    '| ---: | --- | --- | --- |',
  );
  for (const [id, r] of tier('smell')) {
    lines.push(`| ${r.rules.length} | \`${id}\` | ${r.category} | ${CHECK_SUMMARY[id] ?? r.detail} |`);
  }

  lines.push('', '## Affected rules, by check', '');
  for (const [id, r] of sorted) {
    lines.push(`### \`${id}\` — ${r.tier}, ${r.rules.length} rule(s)`, '');
    for (const rule of r.rules) {
      lines.push(`- [\`${rule}\`](${rule.replace('/', '__')}.md)`);
    }
    lines.push('');
  }

  const clean = entries.filter((e) => e.findings.length === 0);
  lines.push(
    '## Nothing flagged',
    '',
    `${clean.length} rule(s). No check fired — which is not the same as verified.`,
    '',
    ...clean.map((e) => `- [\`${e.plugin}/${e.rule}\`](${e.plugin}__${e.rule}.md)`),
    '',
  );

  fs.writeFileSync(path.join(outDir, 'README.md'), lines.join('\n') + '\n');
}

function main(): void {
  const args = process.argv.slice(2);
  const pluginArg = args.find((a) => a.startsWith('--plugin='))?.split('=')[1];
  const plugins = pluginArg ? [pluginArg] : DEFAULT_PLUGINS;
  const entries = buildLedger(plugins);

  if (args.includes('--dossier')) {
    writeDossiers(entries);
    return;
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify({ generated: new Date().toISOString().slice(0, 10), entries }, null, 2));
    return;
  }

  // Tally by check id, split by tier. The per-check breakdown is the actionable
  // view: "12 rules have an untested fixer" is a work item; "47 rules have gaps"
  // is not.
  const tally = new Map<string, { tier: string; category: string; rules: string[] }>();
  for (const e of entries) {
    for (const f of e.findings) {
      const row = tally.get(f.id) ?? { tier: f.tier, category: f.category, rules: [] };
      row.rules.push(`${e.plugin}/${e.rule}`);
      tally.set(f.id, row);
    }
  }

  for (const plugin of plugins) {
    const rows = entries.filter((e) => e.plugin === plugin);
    if (!rows.length) continue;
    const clean = rows.filter((r) => r.findings.length === 0).length;
    const withDefects = rows.filter((r) => r.gaps.length > 0).length;

    console.log(`\n══ eslint-plugin-${plugin} — ${rows.length} rules`);
    console.log(`   ${clean} with nothing flagged · ${withDefects} with at least one DEFECT`);
    console.log(`   ${'rule'.padEnd(42)} ${'CWE'.padEnd(9)} inv/val  corpus  def/smell`);
    for (const r of rows.sort((a, b) => b.gaps.length - a.gaps.length)) {
      const corpus = `${r.corpusVulnerable}v/${r.corpusSafe}s`;
      const smells = r.findings.length - r.gaps.length;
      const flag = r.gaps.length ? '⚠️ ' : smells ? '· ' : '✅';
      console.log(
        `   ${flag} ${r.rule.padEnd(40)} ${r.cwe.padEnd(9)} ` +
          `${String(r.invalidCases).padStart(3)}/${String(r.validCases).padEnd(3)} ` +
          `${corpus.padEnd(7)} ${r.gaps.length}/${smells}  ${r.gaps[0]?.slice(0, 60) ?? ''}`,
      );
    }
  }

  console.log('\n══ by check — DEFECTS (facts about the artifact)');
  for (const [id, row] of [...tally].filter(([, r]) => r.tier === 'defect').sort((a, b) => b[1].rules.length - a[1].rules.length)) {
    console.log(`   ${String(row.rules.length).padStart(3)}  ${id.padEnd(26)} ${row.category}`);
  }
  console.log('\n══ by check — SMELLS (unproven; each needs its probe run)');
  for (const [id, row] of [...tally].filter(([, r]) => r.tier === 'smell').sort((a, b) => b[1].rules.length - a[1].rules.length)) {
    console.log(`   ${String(row.rules.length).padStart(3)}  ${id.padEnd(26)} ${row.category}`);
  }

  const all = entries.length;
  const clean = entries.filter((e) => e.findings.length === 0).length;
  const defective = entries.filter((e) => e.gaps.length > 0).length;
  console.log(`\nTOTAL ${all} rules · ${defective} carry a defect · ${clean} carry nothing at all.`);
  console.log('Nothing flagged ≠ correct. No check here proves a rule right.');
}

if (process.argv[1] && import.meta.url.startsWith('file:') && process.argv[1].endsWith('build-rule-ledger.ts')) {
  main();
}
