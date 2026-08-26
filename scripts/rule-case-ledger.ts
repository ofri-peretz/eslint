/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * rule-case-ledger.ts — what each rule has decided, read from its own tests.
 *
 * ## Why the tests and not a corpus
 *
 * `case-ledger.mts` answers "what does this rule do to 40k files of real
 * source". That is the right question for triage and the wrong question for
 * documentation: it is unbounded, most of what it surfaces is noise, and it
 * cannot be finished. A rule does not need a verdict on every shape that
 * exists. It needs a verdict on the shapes WE take a position on.
 *
 * Those positions are already written down — they are the RuleTester cases.
 * An `invalid` case is a claim "this must report" (TP). A `valid` case is a
 * claim "this must stay quiet" (TN). This script reads those claims back out
 * and publishes them, so the ledger is a projection of the test suite rather
 * than a second thing to keep in sync. Delete a case and it leaves the ledger;
 * there is no drift to detect because there is no copy.
 *
 * ## The four categories
 *
 *   TP  invalid case  — a defect we intend to catch
 *   TN  valid case    — code we intend to leave alone
 *   FP  valid case    — a report we made in the WILD and have since sealed.
 *                       A TN with provenance: it fired on someone's repo.
 *   FN  either        — a defect we know we miss. Documented, not caught.
 *
 * TP/TN follow from which array the case sits in, so they need no annotation.
 * FP and FN are claims about history that the array cannot carry, so they are
 * marked with a `FP:` or `FN:` prefix on the case `name`.
 *
 * A case with no `name` still counts, but lands in the ledger as `(undescribed)`
 * — it proves behaviour without saying what behaviour, which is why `--check`
 * reports the count.
 *
 * Run:
 *   npx tsx scripts/rule-case-ledger.ts            # write the ledger
 *   npx tsx scripts/rule-case-ledger.ts --check    # gate: every rule has TP + TN
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_JSON = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');
const OUT_MD = path.join(ROOT, 'benchmarks', 'RULE_CASES.md');
const BASELINE = path.join(ROOT, 'benchmarks', 'budgets', 'rule-case-baseline.json');

const CHECK = process.argv.includes('--check');
const UPDATE = process.argv.includes('--update');

type Kind = 'TP' | 'TN' | 'FP' | 'FN';
type Case = { kind: Kind; description: string; file: string };
type RuleEntry = { rule: string; cases: Case[] };

/**
 * Every rule the suite ships. `src/rules` nests in several plugins
 * (`rules/operability/no-verbose-error-messages`), so this walks rather than
 * reading one level — the flat version silently dropped 184 rules.
 */
function allRules(): { rule: string; module: string }[] {
  const out: { rule: string; module: string }[] = [];
  const pkgDir = path.join(ROOT, 'packages');
  for (const pkg of fs.readdirSync(pkgDir).filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(full, 'index.ts'))) {
            out.push({ rule: `${plugin}/${entry.name}`, module: path.join(full, 'index.ts') });
          }
          walk(full);
        } else if (entry.name.endsWith('.ts') && !/\.(test|spec)\./.test(entry.name) && entry.name !== 'index.ts') {
          out.push({ rule: `${plugin}/${entry.name.replace(/\.ts$/, '')}`, module: full });
        }
      }
    };
    walk(rulesDir);
  }
  // A rule directory also holds helpers, and a helper is not a rule. The
  // generated manifest is the list of rules each plugin actually exports, so
  // the walk is intersected with it rather than guessed at by filename.
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent', 'plugin-rule-manifest.json'), 'utf8')) as Record<
    string,
    Record<string, unknown>
  >;
  const exported = new Set<string>();
  for (const [pkg, rules] of Object.entries(manifest)) {
    if (!fs.existsSync(path.join(pkgDir, pkg))) continue; // renamed packages linger in the manifest
    for (const name of Object.keys(rules)) exported.add(`${pkg.replace('eslint-plugin-', '')}/${name}`);
  }
  const seen = new Set<string>();
  return out
    .filter((r) => exported.has(r.rule) && !seen.has(r.rule) && seen.add(r.rule))
    .sort((a, b) => a.rule.localeCompare(b.rule));
}

/**
 * Attribute a test file's cases by the module it IMPORTS, not by where it sits.
 * Tests live in `src/tests/`, beside the rule, and two levels of subdirectory
 * deep depending on the plugin; only the import is reliable.
 */
function ruleOfImport(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(from), specifier);
  const marker = `${path.sep}src${path.sep}rules${path.sep}`;
  const at = resolved.indexOf(marker);
  if (at === -1) return null;
  const pkg = path.basename(resolved.slice(0, resolved.indexOf(`${path.sep}src${path.sep}`)));
  if (!pkg.startsWith('eslint-plugin-')) return null;
  const tail = resolved.slice(at + marker.length).replace(/\/index$/, '');
  const name = path.basename(tail);
  return `${pkg.replace('eslint-plugin-', '')}/${name}`;
}

const stringOf = (node: ts.Node): string | null => {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return null;
  return null;
};

/** Pull `name:` off a RuleTester case, whatever shape the case takes. */
function describeCase(element: ts.Expression): string {
  if (!ts.isObjectLiteralExpression(element)) return '';
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : '';
    if (key !== 'name') continue;
    return stringOf(prop.initializer) ?? '';
  }
  return '';
}

/** `FP:` / `FN:` on the name overrides the array the case sits in. */
function classify(description: string, array: 'valid' | 'invalid'): { kind: Kind; description: string } {
  const marker = /^\s*(FP|FN)\s*:\s*/i.exec(description);
  if (marker) {
    return {
      kind: marker[1].toUpperCase() as Kind,
      description: description.slice(marker[0].length).trim(),
    };
  }
  const stripped = description.replace(/^\s*(TP|TN)\s*:\s*/i, '').trim();
  return { kind: array === 'invalid' ? 'TP' : 'TN', description: stripped };
}

/**
 * `valid:` is not always an array literal. Several plugins wrap it —
 * `valid: xp([...])` expands a matrix, `valid: [...].map(withOptions)` applies
 * shared options — and the first version of this script read only the bare
 * literal, which reported 82 rules as having no cases at all when in fact one
 * whole plugin used a wrapper.
 */
function arrayIn(node: ts.Expression): ts.ArrayLiteralExpression | null {
  if (ts.isArrayLiteralExpression(node)) return node;
  let found: ts.ArrayLiteralExpression | null = null;
  const dig = (n: ts.Node): void => {
    if (found !== null) return;
    if (ts.isArrayLiteralExpression(n)) {
      found = n;
      return;
    }
    ts.forEachChild(n, dig);
  };
  dig(node);
  return found;
}

/**
 * Cases in a file, grouped by the rule each `ruleTester.run(name, rule, {...})`
 * call targets. A file may exercise several rules; each block is attributed to
 * the rule its second argument was imported from.
 */
function casesIn(file: string, known: Set<string>): Map<string, Case[]> {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const rel = path.relative(ROOT, file);
  const byBinding = new Map<string, string>();
  const out = new Map<string, Case[]>();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const specifier = stringOf(statement.moduleSpecifier);
    if (specifier === null) continue;
    const rule = ruleOfImport(file, specifier);
    if (rule === null || !known.has(rule)) continue;
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) byBinding.set(element.name.text, rule);
    }
    if (statement.importClause.name) byBinding.set(statement.importClause.name.text, rule);
  }

  const collect = (literal: ts.ObjectLiteralExpression, rule: string): void => {
    for (const prop of literal.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : '';
      if (key !== 'valid' && key !== 'invalid') continue;
      const array = arrayIn(prop.initializer);
      if (array === null) continue;
      for (const element of array.elements) {
        // `...SHARED_CASES` contributes cases this file does not describe.
        if (ts.isSpreadElement(element)) continue;
        const { kind, description } = classify(describeCase(element), key);
        const list = out.get(rule) ?? [];
        list.push({ kind, description, file: rel });
        out.set(rule, list);
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'run' &&
      node.arguments.length >= 3
    ) {
      const target = node.arguments[1];
      const binding = ts.isIdentifier(target) ? byBinding.get(target.text) : undefined;
      const named = stringOf(node.arguments[0]);
      const rule =
        binding ?? [...known].find((r) => named !== null && r.endsWith(`/${named}`));
      const config = node.arguments[2];
      if (rule !== undefined && ts.isObjectLiteralExpression(config)) collect(config, rule);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

const rules = allRules();
const known = new Set(rules.map((r) => r.rule));
const collected = new Map<string, Case[]>(rules.map((r) => [r.rule, []]));

const testFiles: string[] = [];
const walkTests = (dir: string): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTests(full);
    else if (/\.(test|spec)\.tsx?$/.test(entry.name)) testFiles.push(full);
  }
};
for (const pkg of fs.readdirSync(path.join(ROOT, 'packages')).filter((d) => d.startsWith('eslint-plugin-'))) {
  const src = path.join(ROOT, 'packages', pkg, 'src');
  if (fs.existsSync(src)) walkTests(src);
}
for (const file of testFiles) {
  for (const [rule, cases] of casesIn(file, known)) collected.get(rule)?.push(...cases);
}

const entries: RuleEntry[] = rules.map((r) => ({ rule: r.rule, cases: collected.get(r.rule) ?? [] }));

const tally = (kind: Kind): number => entries.reduce((n, e) => n + e.cases.filter((c) => c.kind === kind).length, 0);
const counts = { TP: tally('TP'), TN: tally('TN'), FP: tally('FP'), FN: tally('FN') };
const undescribed = entries.reduce((n, e) => n + e.cases.filter((c) => !c.description).length, 0);
/**
 * A case with no `name` proves behaviour without saying what behaviour. It
 * counts as a test and not as documentation, so the gate asks for a DESCRIBED
 * case of each kind — the point of the ledger is that a reader can see what a
 * rule has decided without opening the rule.
 */
const documented = (entry: RuleEntry, kinds: Kind[]): boolean =>
  entry.cases.some((c) => kinds.includes(c.kind) && c.description !== '');
// An FN does NOT satisfy the TP requirement: it is a documented miss, the
// opposite of a caught defect. An FP does satisfy the TN requirement — it is a
// TN that arrived with provenance.
const missing = entries.filter((e) => !documented(e, ['TP']) || !documented(e, ['TN', 'FP']));

console.log(`  ${entries.length} rules`);
console.log(`  TP ${counts.TP}   TN ${counts.TN}   FP ${counts.FP}   FN ${counts.FN}`);
console.log(`  undescribed cases                       ${undescribed}`);
console.log(`  rules without a described TP and TN     ${missing.length}`);

if (CHECK) {
  const baseline: string[] = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as { rules: string[] }).rules
    : [];
  const known = new Set(baseline);
  const regressed = missing.map((e) => e.rule).filter((r) => !known.has(r));
  if (regressed.length > 0) {
    console.error(`\n  ⛔ ${regressed.length} rule(s) lack a described TP or TN and are not in the baseline:`);
    for (const rule of regressed) console.error(`     ${rule}`);
    console.error(`\n  Add the missing case, or run with --update if the baseline should shrink.`);
    process.exit(1);
  }
  console.log(`  baseline ${baseline.length} — no regression`);
}

if (UPDATE) {
  const previous: string[] = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as { rules: string[] }).rules
    : [];
  const now = missing.map((e) => e.rule).sort();
  const grew = now.filter((r) => !previous.includes(r));
  if (previous.length > 0 && grew.length > 0) {
    console.error(`\n  ⛔ refusing to grow the baseline by ${grew.length}: ${grew.join(', ')}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      { note: 'Rules with no described TP case, or no described TN/FP case. Shrink-only.', rules: now },
      null,
      2,
    )}\n`,
  );
  console.log(`  baseline written: ${previous.length} → ${now.length}`);
}

if (!CHECK) {
  fs.writeFileSync(OUT_JSON, `${JSON.stringify({ counts, rules: entries }, null, 2)}\n`);

  const md: string[] = [
    '# Rule case ledger',
    '',
    'What every rule has decided, read straight out of its own RuleTester cases.',
    'Generated by `scripts/rule-case-ledger.ts` — edit the tests, not this file.',
    '',
    '| | meaning |',
    '|---|---|',
    '| **TP** | an `invalid` case: a defect we intend to catch |',
    '| **TN** | a `valid` case: code we intend to leave alone |',
    '| **FP** | a `valid` case named `FP: …` — we reported this in the wild, and sealed it |',
    '| **FN** | a case named `FN: …` — a defect we know we miss |',
    '',
    `**${entries.length} rules · TP ${counts.TP} · TN ${counts.TN} · FP ${counts.FP} · FN ${counts.FN}**`,
    '',
    `${missing.length} of ${entries.length} rules do not yet carry both a described TP and a described TN.`,
    `${undescribed} cases run without a \`name\`: they prove behaviour without saying what behaviour.`,
    '',
  ];
  for (const entry of entries) {
    const n = (k: Kind): number => entry.cases.filter((c) => c.kind === k).length;
    md.push(`## \`${entry.rule}\``, '');
    if (entry.cases.length === 0) {
      md.push('*No RuleTester cases found.*', '');
      continue;
    }
    md.push(`TP ${n('TP')} · TN ${n('TN')} · FP ${n('FP')} · FN ${n('FN')}`, '');
    md.push('| | case |', '|---|---|');
    for (const kind of ['TP', 'TN', 'FP', 'FN'] as Kind[]) {
      for (const c of entry.cases.filter((x) => x.kind === kind)) {
        // A pipe ends the cell early and takes the rest of the row with it;
        // a pair of underscores (`__proto__`, and this is a security suite, so
        // there are many) renders as bold. Both are escaped rather than
        // rewritten, so the ledger shows the description the test carries.
        const cell =
          c.description === ''
            ? '*(undescribed)*'
            : c.description.replaceAll('|', '\\|').replaceAll('_', '\\_');
        md.push(`| ${kind} | ${cell} |`);
      }
    }
    md.push('');
  }
  fs.writeFileSync(OUT_MD, `${md.join('\n')}\n`);
  console.log(`\n  wrote ${path.relative(ROOT, OUT_MD)} and ${path.relative(ROOT, OUT_JSON)}`);
}
