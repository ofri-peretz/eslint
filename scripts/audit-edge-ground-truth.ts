#!/usr/bin/env -S npx tsx
/**
 * audit-edge-ground-truth — turn ILB-Edge "FP candidates" into labelled
 * ground truth, so "false positive" means false positive.
 *
 * The Edge corpus (three.js, webpack, lodash, babel, react) is declared
 * adversarial-real: findings on it are *candidates*, not confirmed FPs. That
 * label is an assumption, and it has been wrong — `listeners[type]` in
 * three.js EventDispatcher crashes on `addEventListener('__proto__', fn)`, and
 * a morph target named `__proto__001` reaches `animationToMorphTargets[name]`
 * through a `([\w-]*?)` capture. Both are true positives that a blanket
 * "suppress until the number is zero" pass would have deleted.
 *
 * So findings are grouped into *pattern classes* (a few dozen), each labelled
 * once in `.agent/edge-ground-truth.json` with a written justification:
 *
 *   FP — the rule should not fire here; the class is a bug to fix.
 *   TP — the rule is right; the class stays reported and belongs upstream.
 *
 * The audit then enforces two things:
 *   1. every class carries a label (an unlabelled class fails — no silent
 *      "we'll triage it later" that quietly becomes the published number)
 *   2. no finding remains in a class labelled FP
 *
 * That makes `FP == 0` a target that can be hit honestly, and keeps the TPs
 * reported instead of trading them away for a nicer scorecard.
 *
 * Usage:
 *   npm run ilb:edge:triage            # cluster + report
 *   npm run ilb:edge:triage -- --strict # fail on unlabelled or non-empty FP class
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const LABELS_PATH = path.join(REPO_ROOT, '.agent', 'edge-ground-truth.json');
const OUT_MD = path.join(REPO_ROOT, 'benchmark-results', 'edge-ground-truth.md');
/**
 * Shared clone root, same default as `scripts/ilb-wild.ts`. Resolved from the
 * home directory rather than relative to the repo, so the audit works from a
 * git worktree (which sits at an arbitrary depth) as well as a normal checkout.
 */
const CORPUS_ROOT =
  process.env.ILB_CORPUS_ROOT ??
  path.join(os.homedir(), 'repos', 'ofriperetz.dev', 'oos');

/** Mirrors the fpEdge entries of the ILB-Wild registry. */
const TARGETS = [
  { name: 'three.js', glob: 'src/**/*.js', plugins: ['secure-coding', 'node-security'] },
  { name: 'webpack', glob: 'lib/**/*.js', plugins: ['node-security', 'secure-coding'] },
  { name: 'lodash', glob: 'fp/**/*.js', plugins: ['secure-coding', 'node-security'] },
  { name: 'babel', glob: 'packages/babel-parser/src/**/*.{js,ts}', plugins: ['secure-coding', 'node-security'] },
  { name: 'react', glob: 'packages/react/src/**/*.js', plugins: ['secure-coding', 'node-security'] },
];

export interface Finding {
  rule: string;
  repo: string;
  file: string;
  line: number;
  text: string;
}

export interface ClassLabel {
  verdict: 'FP' | 'TP';
  reason: string;
}

/**
 * Derive a stable class id from a finding: the rule plus the *shape* of the
 * offending expression, with identifiers erased. Two findings share a class
 * when the same rule change would resolve both — which is the unit a human
 * can actually adjudicate.
 */
export function classifyFinding(f: Finding): string {
  const shape = shapeOf(f.text);
  return `${f.rule}::${shape}`;
}

export { escapeProse };

export function shapeOf(rawText: string): string {
  const text = rawText.trim();
  const bracket = text.match(/([A-Za-z_$][\w$.]*)\s*\[\s*([^\]]+?)\s*\]/);
  if (bracket) {
    const key = bracket[2];
    if (/^-?\d+$/.test(key)) return 'obj[<numeric literal>]';
    if (/^['"`]/.test(key)) return 'obj[<string literal>]';
    if (/\+\+|--/.test(key)) return 'obj[<update expr>]';
    if (/[+\-*/%]/.test(key)) return 'obj[<arithmetic expr>]';
    if (/^this\.[\w$]+$/.test(key)) return 'obj[this.<field>]';
    if (/^[A-Za-z_$][\w$]*\.[\w$]+$/.test(key)) return 'obj[<ident>.<field>]';
    if (/^[A-Za-z_$][\w$]*\[[^\]]+\]$/.test(key)) return 'obj[<ident>[<idx>]]';
    if (/^[A-Za-z_$][\w$]*$/.test(key)) return 'obj[<ident>]';
    return 'obj[<complex expr>]';
  }
  const call = text.match(/\b([A-Za-z_$][\w$.]*)\s*\(/);
  if (call) return `${call[1]}(...)`;
  return 'other';
}

export interface AuditResult {
  totalFindings: number;
  classes: { id: string; count: number; label?: ClassLabel; sample: Finding }[];
  unlabelled: string[];
  /** Classes labelled FP that still produce findings — the work list. */
  openFpClasses: { id: string; count: number; reason: string }[];
}

export function auditFindings(
  findings: Finding[],
  labels: Record<string, ClassLabel>,
): AuditResult {
  const byClass = new Map<string, Finding[]>();
  for (const f of findings) {
    const id = classifyFinding(f);
    const list = byClass.get(id);
    if (list) list.push(f);
    else byClass.set(id, [f]);
  }
  const classes = [...byClass.entries()]
    .map(([id, list]) => ({ id, count: list.length, label: labels[id], sample: list[0] }))
    .sort((a, b) => b.count - a.count);
  return {
    totalFindings: findings.length,
    classes,
    unlabelled: classes.filter((c) => !c.label).map((c) => c.id),
    openFpClasses: classes
      .filter((c) => c.label?.verdict === 'FP')
      .map((c) => ({ id: c.id, count: c.count, reason: c.label!.reason })),
  };
}

async function collectFindings(): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const t of TARGETS) {
    const repoDir = path.join(CORPUS_ROOT, t.name);
    if (!fs.existsSync(repoDir)) {
      console.warn(`  ⚠ corpus missing: ${repoDir} — skipping ${t.name}`);
      continue;
    }
    // Each plugin dist exports the flat-config plugin object as `default`
    // (just `{ meta, rules }`) and its shareable configs as a *separate*
    // `configs` named export — so the rule set has to be read off the module
    // namespace, not off the plugin.
    const pluginEntries = await Promise.all(
      t.plugins.map(async (p) => {
        const mod = (await import(
          path.join(REPO_ROOT, 'packages', `eslint-plugin-${p}`, 'dist/src/index.js')
        )) as Record<string, unknown>;
        const plugin = (mod.default ?? mod.plugin) as Record<string, unknown> | undefined;
        if (!plugin || !('rules' in plugin)) {
          throw new Error(`eslint-plugin-${p}: could not resolve plugin export`);
        }
        const configs = (mod.configs ?? plugin.configs) as
          | Record<string, { rules?: Record<string, Linter.RuleEntry> }>
          | undefined;
        return { name: p, plugin, configs };
      }),
    );
    const plugins = Object.fromEntries(pluginEntries.map((e) => [e.name, e.plugin]));
    // Activate exactly what ILB-Wild activates — each plugin's `recommended`
    // rule set — so this audit's counts are comparable with the bench's rather
    // than inflated by opt-in rules no adopter has switched on.
    const rules: Linter.RulesRecord = {};
    for (const { name, configs } of pluginEntries) {
      const recommended = configs?.recommended;
      if (!recommended?.rules) {
        throw new Error(`eslint-plugin-${name} has no recommended config to mirror`);
      }
      for (const [ruleId, level] of Object.entries(recommended.rules)) {
        if (ruleId.startsWith(`${name}/`)) rules[ruleId] = level as Linter.RuleEntry;
      }
    }
    const eslint = new ESLint({
      cwd: CORPUS_ROOT,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.{js,mjs,cjs,ts}'],
          languageOptions: { parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
          linterOptions: { reportUnusedDisableDirectives: 'off' },
          plugins,
          rules,
        },
      ],
    });
    const results = await eslint.lintFiles([path.join(repoDir, t.glob)]);
    for (const r of results) {
      if (!r.messages.length) continue;
      const src = fs.readFileSync(r.filePath, 'utf8').split('\n');
      for (const m of r.messages) {
        if (!m.ruleId) continue;
        out.push({
          rule: m.ruleId,
          repo: t.name,
          file: path.relative(CORPUS_ROOT, r.filePath),
          line: m.line,
          text: (src[m.line - 1] ?? '').trim(),
        });
      }
    }
  }
  return out;
}

/**
 * Render a snippet of real source as a table cell. The samples are arbitrary
 * third-party code, so they carry backticks, pipes, `__dunder__` runs and
 * padded brackets that markdownlint reads as malformed emphasis or code spans.
 * Normalise to a single-line, delimiter-free string before wrapping.
 */
function codeCell(raw: string): string {
  const flat = raw
    .replace(/\s+/g, ' ')
    .replace(/[`|]/g, '')
    .trim()
    .slice(0, 60)
    .trim();
  return flat.length === 0 ? '—' : `\`${flat}\``;
}

/**
 * Reasons are hand-written prose quoting real identifiers (`__proto__`,
 * `([\w-]*?)`), so they carry characters markdown reads as emphasis, code or
 * links. Escape every significant character in one pass — including the
 * backslash itself, which is why this is a character class rather than a
 * sequence of `.replace()` calls: escaping `_` before `\` would corrupt an
 * already-backslashed input.
 */
function escapeProse(text: string): string {
  return text.replace(/[\\`*_[\]<>|]/g, (ch) => `\\${ch}`);
}

function renderMarkdown(a: AuditResult): string {
  const lines: string[] = [];
  const labelled = a.classes.length - a.unlabelled.length;
  lines.push('# ILB-Edge ground truth');
  lines.push('');
  lines.push(
    `> ${a.totalFindings} findings across ${a.classes.length} pattern classes — ` +
      `${labelled} labelled, ${a.unlabelled.length} awaiting a verdict.`,
  );
  lines.push('');
  lines.push('Every finding on the Edge corpus belongs to a pattern class, and every class');
  lines.push('carries a written verdict. **FP** classes are rule bugs and must reach zero;');
  lines.push('**TP** classes are real findings that stay reported. A class with no verdict');
  lines.push('fails the strict audit — untriaged findings must never silently become the');
  lines.push('published FP number.');
  lines.push('');
  lines.push('| Findings | Verdict | Class | Example |');
  lines.push('|---:|:--|:--|:--|');
  for (const c of a.classes) {
    const v = c.label ? (c.label.verdict === 'FP' ? '🔴 FP' : '✅ TP') : '⚠️ unlabelled';
    lines.push(`| ${c.count} | ${v} | \`${c.id}\` | ${codeCell(c.sample.text)} |`);
  }
  lines.push('');
  if (a.openFpClasses.length) {
    lines.push('## Open FP classes (the work list)');
    lines.push('');
    for (const c of a.openFpClasses) {
      lines.push(`- **${c.count}× \`${c.id}\`** — ${escapeProse(c.reason)}`);
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const strict = process.argv.includes('--strict');
  const labels: Record<string, ClassLabel> = fs.existsSync(LABELS_PATH)
    ? JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8')).classes
    : {};

  const findings = await collectFindings();
  const audit = auditFindings(findings, labels);
  fs.writeFileSync(OUT_MD, renderMarkdown(audit));

  console.log(
    `Edge ground truth: ${audit.totalFindings} findings, ${audit.classes.length} classes ` +
      `(${audit.unlabelled.length} unlabelled, ${audit.openFpClasses.length} open FP classes).`,
  );
  for (const c of audit.openFpClasses) {
    console.error(`  FP-OPEN ${c.count}× ${c.id}`);
  }
  for (const id of audit.unlabelled) {
    console.error(`  UNLABELLED ${id}`);
  }
  if (strict && (audit.unlabelled.length > 0 || audit.openFpClasses.length > 0)) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit-edge-ground-truth.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
