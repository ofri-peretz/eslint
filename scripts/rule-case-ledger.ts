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
 *   FN  invalid case  — a defect we MISSED in the wild and have since sealed.
 *                       A TP with provenance: it slipped past us on real code.
 *   GAP valid case    — a defect we know we still miss. Documented, not caught,
 *                       and deliberately NOT counted as protection.
 *
 * TP/TN follow from which array the case sits in, so they need no annotation.
 * FP/FN/GAP are claims about history that the array cannot carry, so they are
 * marked with a `FP:`, `FN:` or `GAP:` prefix on the case `name`.
 *
 * FP and FN are the two halves of the same asset: a mistake we made against
 * real third-party code, now held shut by a case that fails on the rule as it
 * was. Both are *protection*. GAP is the honest opposite — an admission with
 * no lock behind it — so it is tallied apart and never satisfies a floor.
 *
 * The array a marker sits in is therefore not free. `FN:` in `valid` would be
 * claiming a sealed miss that still passes silently, which is a contradiction;
 * `GAP:` in `invalid` would be claiming an open miss the rule already catches.
 * Both are rejected rather than silently reinterpreted.
 *
 * A case with no `name` still counts, but lands in the ledger as `(undescribed)`
 * — it proves behaviour without saying what behaviour, which is why `--check`
 * reports the count.
 *
 * Run:
 *   npx tsx scripts/rule-case-ledger.ts            # write the ledger
 *   npx tsx scripts/rule-case-ledger.ts --check    # gate: every rule has TP + TN
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readBaseline, readBaselineRecord } from './lib/read-baseline.ts';
import { changedRules } from './rule-audit-gate.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_JSON = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');
const OUT_MD = path.join(ROOT, 'benchmarks', 'RULE_CASES.md');
const BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'rule-case-baseline.json',
);

const CHECK = process.argv.includes('--check');
const TOUCHED = process.argv.includes('--touched');
const UPDATE = process.argv.includes('--update');

type Kind = 'TP' | 'TN' | 'FP' | 'FN' | 'GAP';
type Case = {
  id: string;
  kind: Kind;
  code: string;
  description: string;
  file: string;
  source?: string;
  found?: string;
};

/**
 * A stable name for one row of the matrix — `secure-coding/no-magic-numbers#TP-a3f1c2`.
 *
 * Derived from the rule, the kind, and the case's whole source text, so it
 * survives the things that actually happen to a test file: cases get
 * reordered, a description is reworded, a case moves between files. A
 * positional id (`#TP-3`) would change under every one of those and could not
 * be cited anywhere durable.
 *
 * The WHOLE case, not just its `code`: hashing code alone produced 727
 * collisions, because the same source under two different `options` is two
 * different claims and has to be two different rows.
 *
 * It moves when the code moves, and that is correct: changing what the rule was
 * shown makes it a different claim, and the old id should stop resolving rather
 * than silently point at something else.
 *
 * The kind is IN the id on purpose. A case that flips TP → FN is the most
 * important event this database records, and it should read as a new row rather
 * than the same row with a different label.
 */
function caseId(rule: string, kind: Kind, text: string): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${rule}\u0000${text}`)
    .digest('hex');
  return `${rule}#${kind}-${digest.slice(0, 6)}`;
}
type RuleEntry = {
  rule: string;
  cases: Case[];
  wild?: { count: number; repos: number };
};

/**
 * Two plugins publish under a prefix that differs from their directory, so an
 * inventory keyed by published rule id will not match the directory-derived
 * name without this.
 */
const PREFIX_ALIASES: Record<string, string> = {
  'jwt-security/': 'jwt/',
  'postgresql-security/': 'pg/',
};
const published = (rule: string): string => {
  for (const [dir, id] of Object.entries(PREFIX_ALIASES)) {
    if (rule.startsWith(dir)) return id + rule.slice(dir.length);
  }
  return rule;
};

/**
 * How often each rule fired across 158 cloned repositories (13,146 files).
 *
 * Firing is not catching — `no-insecure-comparison` accounts for 12,303 of
 * those findings and most are `===` on two config values. But NOT firing is
 * conclusive in the other direction: a rule that produced nothing across 13k
 * files of other people's code has never been shown a candidate, and whatever
 * its unit tests prove, it is not yet doing anything in the world.
 */
type Inventory = {
  rules: Record<string, { count: number; repos: number }>;
  withoutMaterial: string[];
  filesLinted: number;
  reposScanned: number;
  /** Hash of the ESLint config the scan ran with. Absent on pre-2026-08-30 files. */
  configHash?: string;
};
const INVENTORY_FILE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'real-world-rule-inventory.json',
);
let inventory: Inventory | null = null;
try {
  inventory = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8')) as Inventory;
} catch {
  inventory = null;
}

/**
 * Whether the inventory describes the config we would run today.
 *
 * "Scanned and never fired" is the strongest negative claim this ledger makes
 * about a rule — it says the rule has never been shown a candidate in 345,841
 * files of other people's code. That claim is worth nothing if the scan did
 * not actually ask the rule, and for seven whole plugins it did not: the
 * committed inventory predates `eslint.real-source.config.mjs`, so react-a11y,
 * react-features, conventions, maintainability, reliability, operability and
 * nestjs-security are recorded as silent when they were never run.
 *
 * A number that cannot be vouched for is not printed as a number.
 */
const CONFIG_FILE = path.join(ROOT, 'eslint.real-source.config.mjs');
const currentConfigHash = (() => {
  try {
    return createHash('sha256')
      .update(fs.readFileSync(CONFIG_FILE))
      .digest('hex')
      .slice(0, 16);
  } catch {
    return null;
  }
})();
const inventoryIsCurrent =
  inventory !== null &&
  inventory.configHash !== undefined &&
  inventory.configHash === currentConfigHash;

/**
 * Every rule the suite ships. `src/rules` nests in several plugins
 * (`rules/operability/no-verbose-error-messages`), so this walks rather than
 * reading one level — the flat version silently dropped 184 rules.
 */
function allRules(): { rule: string; module: string }[] {
  const out: { rule: string; module: string }[] = [];
  const pkgDir = path.join(ROOT, 'packages');
  for (const pkg of fs
    .readdirSync(pkgDir)
    .filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(full, 'index.ts'))) {
            out.push({
              rule: `${plugin}/${entry.name}`,
              module: path.join(full, 'index.ts'),
            });
          }
          walk(full);
        } else if (
          entry.name.endsWith('.ts') &&
          !/\.(test|spec)\./.test(entry.name) &&
          entry.name !== 'index.ts'
        ) {
          out.push({
            rule: `${plugin}/${entry.name.replace(/\.ts$/, '')}`,
            module: full,
          });
        }
      }
    };
    walk(rulesDir);
  }
  // A rule directory also holds helpers, and a helper is not a rule. The
  // generated manifest is the list of rules each plugin actually exports, so
  // the walk is intersected with it rather than guessed at by filename.
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, '.agent', 'plugin-rule-manifest.json'),
      'utf8',
    ),
  ) as Record<string, Record<string, unknown>>;
  const exported = new Set<string>();
  for (const [pkg, rules] of Object.entries(manifest)) {
    if (!fs.existsSync(path.join(pkgDir, pkg))) continue; // renamed packages linger in the manifest
    for (const name of Object.keys(rules))
      exported.add(`${pkg.replace('eslint-plugin-', '')}/${name}`);
  }
  const seen = new Set<string>();
  return out
    .filter(
      (r) => exported.has(r.rule) && !seen.has(r.rule) && seen.add(r.rule),
    )
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
  const pkg = path.basename(
    resolved.slice(0, resolved.indexOf(`${path.sep}src${path.sep}`)),
  );
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

/**
 * The case's own `code`, normalised to one line.
 *
 * The database records what the rule was shown, not only what somebody called
 * it. A description restates the code when the code is short and adds the
 * *reason* when it is not; both are worth having, but only one of them can be
 * checked against the rule, and it is this one.
 */
/**
 * The `options` a case runs under, as source text, or `''`.
 *
 * A case's verdict depends on its configuration, so `code` alone does not
 * identify what was proved. Importing FP cases into the case registry surfaced
 * this immediately: two `no-insecure-comparison` cases are valid only under
 * `reportLooseEquality: false`, and re-running them at defaults reported —
 * the register was testing something other than what the test tests.
 */
function optionsOf(element: ts.Expression, source: ts.SourceFile): string {
  if (!ts.isObjectLiteralExpression(element)) return '';
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : '';
    if (key !== 'options') continue;
    // `options: OFF` where `const OFF = [{ reportLooseEquality: false }]` is the
    // house idiom for a setting several cases share. The NAME is not the
    // configuration, so resolving it is the difference between a re-runnable
    // claim and one that quietly runs at defaults — which is exactly how the
    // first import of the case registry called two sealed cases regressions.
    const initializer = ts.isIdentifier(prop.initializer)
      ? (constInitializerIn(source, prop.initializer.text) ?? prop.initializer)
      : prop.initializer;
    return initializer
      .getText()
      .replace(/\s+/g, ' ')
      .replace(/ as const$/, '')
      .trim();
  }
  return '';
}

/** A top-level `const <name> = <expr>` in this file, if there is exactly one. */
function constInitializerIn(
  source: ts.SourceFile,
  name: string,
): ts.Expression | null {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer !== undefined
      ) {
        return declaration.initializer;
      }
    }
  }
  return null;
}

/** The `filename` a case runs under, or `''`. Test-file paths change verdicts. */
function filenameOf(element: ts.Expression): string {
  if (!ts.isObjectLiteralExpression(element)) return '';
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : '';
    if (key === 'filename' && ts.isStringLiteralLike(prop.initializer))
      return prop.initializer.text;
  }
  return '';
}

function codeOf(element: ts.Expression): string {
  const squash = (text: string): string =>
    text.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (ts.isStringLiteralLike(element)) return squash(element.text);
  if (!ts.isObjectLiteralExpression(element)) return '';
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : '';
    if (key !== 'code') continue;
    if (ts.isStringLiteralLike(prop.initializer))
      return squash(prop.initializer.text);
    // A template with interpolation, or a concatenation: keep the source text,
    // which still shows the shape even though the value is assembled at runtime.
    return squash(prop.initializer.getText());
  }
  return '';
}

/** Pull `name:` off a RuleTester case, whatever shape the case takes. */
function describeCase(element: ts.Expression): string {
  if (!ts.isObjectLiteralExpression(element)) return '';
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : '';
    if (key !== 'name') continue;
    return stringOf(prop.initializer) ?? '';
  }
  return '';
}

/**
 * Provenance. `@source <owner>/<repo> <path>:<line>` in the case's leading
 * comment (or in its name) says this case came out of code somebody actually
 * shipped, rather than out of our heads.
 *
 * The distinction is the whole question of whether a rule does something real.
 * A rule can pass a suite of fixtures its own author wrote and still never have
 * fired on a line of production code — the fixtures prove the rule matches the
 * author's idea of the defect, and nothing more. A cited case proves the shape
 * exists in the wild.
 */
const SOURCE = /@source\s+([^\n*]+?)\s*(?:\*\/|\n|$)/;
/**
 * `@found` is a different claim from `@source` and must not be folded into it.
 *
 * `@source` says: this code exists, here is the repository and line. `@found`
 * says: here is how we came to know we were wrong about it. A seal can have
 * both (we scanned real code and read the finding), or only the second (we
 * read the rule against a published standard and saw the gap before anybody
 * shipped it into a bug report).
 *
 * Keeping them apart is the whole point. Folding a spec citation into
 * `@source` would inflate "rules with a case drawn from real code", which is
 * the one number here that is not about our own imagination.
 */
const FOUND = /@found\s+([^\n*]+?)\s*(?:\*\/|\n|$)/;
function tagOf(
  re: RegExp,
  element: ts.Node,
  text: string,
  description: string,
): string | undefined {
  const inName = re.exec(description);
  if (inName !== null) return inName[1].trim();
  // The whole case, comments included. A `@source` note sits wherever it reads
  // best — above the object, or inside it next to the `filename` it explains —
  // and looking only at leading comments found none of them.
  const found = re.exec(text.slice(element.getFullStart(), element.getEnd()));
  return found === null ? undefined : found[1].trim();
}

/**
 * `FP:` / `FN:` / `GAP:` on the name overrides the array the case sits in —
 * but only in the one direction that is coherent. Each marker asserts a fact
 * about the rule's behaviour on this code, and the array already asserts one;
 * a marker that contradicts its array is a typo, not a subtler claim.
 */
const REQUIRED_ARRAY: Record<'FP' | 'FN' | 'GAP', 'valid' | 'invalid'> = {
  FP: 'valid', // sealed over-report: it must now stay quiet
  FN: 'invalid', // sealed miss: it must now report
  GAP: 'valid', // open miss: it still stays quiet, and we are saying so
};

function classify(
  description: string,
  array: 'valid' | 'invalid',
  where: string,
): { kind: Kind; description: string } {
  const marker = /^\s*(FP|FN|GAP)\s*:\s*/i.exec(description);
  if (marker) {
    const kind = marker[1].toUpperCase() as 'FP' | 'FN' | 'GAP';
    const wanted = REQUIRED_ARRAY[kind];
    if (array !== wanted) {
      throw new Error(
        `${where}: "${description}" is marked ${kind}, which belongs in the ` +
          `\`${wanted}\` array, but it sits in \`${array}\`. ` +
          (kind === 'FN'
            ? 'A sealed miss must be a case the rule now reports — otherwise nothing is sealed. Use `GAP:` for a miss that is still open.'
            : kind === 'GAP'
              ? 'An open miss must be a case that still passes silently. Use `FN:` once a fix makes it report.'
              : 'A sealed over-report must be a case the rule now stays quiet on.'),
      );
    }
    return { kind, description: description.slice(marker[0].length).trim() };
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
  const source_text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    source_text,
    ts.ScriptTarget.Latest,
    true,
  );
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
      for (const element of bindings.elements)
        byBinding.set(element.name.text, rule);
    }
    if (statement.importClause.name)
      byBinding.set(statement.importClause.name.text, rule);
  }

  const collect = (literal: ts.ObjectLiteralExpression, rule: string): void => {
    for (const prop of literal.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key =
        ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
          ? prop.name.text
          : '';
      if (key !== 'valid' && key !== 'invalid') continue;
      const array = arrayIn(prop.initializer);
      if (array === null) continue;
      for (const element of array.elements) {
        // `...SHARED_CASES` contributes cases this file does not describe.
        if (ts.isSpreadElement(element)) continue;
        const raw = describeCase(element);
        const { kind, description } = classify(raw, key, rel);
        const source = tagOf(SOURCE, element, source_text, raw);
        const found = tagOf(FOUND, element, source_text, raw);
        const list = out.get(rule) ?? [];
        const caseCode = codeOf(element);
        const caseOptions = optionsOf(element, element.getSourceFile());
        const caseFilename = filenameOf(element);
        list.push({
          id: caseId(rule, kind, element.getText()),
          kind,
          code: caseCode,
          description: description
            .replace(SOURCE, '')
            .replace(FOUND, '')
            .trim(),
          file: rel,
          ...(caseOptions ? { options: caseOptions } : {}),
          ...(caseFilename ? { filename: caseFilename } : {}),
          ...(source ? { source } : {}),
          ...(found ? { found } : {}),
        });
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
      const binding = ts.isIdentifier(target)
        ? byBinding.get(target.text)
        : undefined;
      const named = stringOf(node.arguments[0]);
      const rule =
        binding ??
        [...known].find((r) => named !== null && r.endsWith(`/${named}`));
      const config = node.arguments[2];
      if (rule !== undefined && ts.isObjectLiteralExpression(config))
        collect(config, rule);
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
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name.startsWith('.')
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTests(full);
    else if (/\.(test|spec)\.tsx?$/.test(entry.name)) testFiles.push(full);
  }
};
for (const pkg of fs
  .readdirSync(path.join(ROOT, 'packages'))
  .filter((d) => d.startsWith('eslint-plugin-'))) {
  const src = path.join(ROOT, 'packages', pkg, 'src');
  if (fs.existsSync(src)) walkTests(src);
}
for (const file of testFiles) {
  for (const [rule, cases] of casesIn(file, known))
    collected.get(rule)?.push(...cases);
}

/**
 * Byte-identical cases share an id, because they are the same claim written
 * twice. They are suffixed so every row still names exactly one, and counted,
 * because a duplicated case adds no coverage and reads like it does.
 */
let duplicates = 0;
function disambiguate(cases: Case[]): Case[] {
  const seen = new Map<string, number>();
  return cases.map((c) => {
    const n = (seen.get(c.id) ?? 0) + 1;
    seen.set(c.id, n);
    if (n === 1) return c;
    duplicates += 1;
    return { ...c, id: `${c.id}.${n}` };
  });
}

const entries: RuleEntry[] = rules.map((r) => {
  const wild = inventory?.rules[published(r.rule)];
  return {
    rule: r.rule,
    cases: disambiguate(collected.get(r.rule) ?? []),
    ...(wild ? { wild: { count: wild.count, repos: wild.repos } } : {}),
  };
});

const tally = (kind: Kind): number =>
  entries.reduce(
    (n, e) => n + e.cases.filter((c) => c.kind === kind).length,
    0,
  );
const counts = {
  TP: tally('TP'),
  TN: tally('TN'),
  FP: tally('FP'),
  FN: tally('FN'),
  GAP: tally('GAP'),
};
/**
 * The headline number, and the only one that is a claim about US rather than
 * about the fixtures we wrote. FP + FN are the mistakes we made against real
 * third-party code and then nailed shut; every other case is a position we
 * asserted from the armchair and then satisfied.
 */
const sealed = counts.FP + counts.FN;
const undescribed = entries.reduce(
  (n, e) => n + e.cases.filter((c) => !c.description).length,
  0,
);
/**
 * The question this answers is not "is the rule tested" but "has this rule
 * ever been shown a defect somebody else wrote". A suite of self-authored
 * fixtures cannot distinguish a rule that catches a real bug from one that
 * catches only the author's idea of it.
 */
const grounded = entries.filter((e) =>
  e.cases.some((c) => c.kind === 'TP' && c.source !== undefined),
);
/**
 * The weaker claim, and the more common one: the rule has been run over real
 * code and something was decided about what it did there — usually that a
 * report was wrong and the rule was narrowed. That is evidence of contact with
 * the world; it is not evidence the rule catches anything.
 */
const touched = entries.filter((e) =>
  e.cases.some((c) => c.source !== undefined),
);
/**
 * A case with no `name` proves behaviour without saying what behaviour. It
 * counts as a test and not as documentation, so the gate asks for a DESCRIBED
 * case of each kind — the point of the ledger is that a reader can see what a
 * rule has decided without opening the rule.
 */
const documented = (entry: RuleEntry, kinds: Kind[]): boolean =>
  entry.cases.some((c) => kinds.includes(c.kind) && c.description !== '');
// FN satisfies the TP requirement and FP satisfies the TN requirement: each is
// its plain counterpart plus provenance. GAP satisfies NEITHER — it is a
// documented miss, the opposite of a caught defect, and counting it as one
// would let a rule discharge its obligation by admitting it does not work.
const missing = entries.filter(
  (e) => !documented(e, ['TP', 'FN']) || !documented(e, ['TN', 'FP']),
);

/**
 * How many classified cases a rule needs on each side before its position is
 * pinned rather than merely asserted.
 *
 * THREE. One case proves the rule matches one string. Two is a pair and can
 * still be two spellings of the same thought. Three forces a shape: the
 * canonical form, a variation, and a near-miss that must stay quiet — and it is
 * the smallest number at which deleting any single case leaves the position
 * still legible.
 *
 * Counted on CODE, not on descriptions. A case the rule was actually shown is
 * checkable against the rule; a description is not. 440 of 470 rules already
 * meet it, so the floor records a standard the suite mostly reached by
 * accident and now has to keep.
 */
const CASE_FLOOR = 3;
const classified = (entry: RuleEntry, kinds: Kind[]): number =>
  entry.cases.filter((c) => kinds.includes(c.kind) && c.code !== '').length;
const belowFloor = entries.filter(
  (e) =>
    classified(e, ['TP', 'FN']) < CASE_FLOOR ||
    classified(e, ['TN', 'FP', 'GAP']) < CASE_FLOOR,
);
/**
 * A rule with an EMPTY `invalid` array claims nothing. It is not
 * under-documented — it asserts no defect exists that it catches, and its
 * whole suite passes by proving it stays quiet. Two of these were found by the
 * gate and both are honest about why in a comment: one waits on a property
 * ordering nobody has produced, the other cannot be reached at all because a
 * real parser ends the block comment before the rule ever sees the text.
 *
 * They are listed separately because "add a description" is not the fix.
 */
const claimsNothing = entries.filter(
  (e) => e.cases.length > 0 && !e.cases.some((c) => c.kind === 'TP'),
);

console.log(`  ${entries.length} rules`);
console.log(
  `  TP ${counts.TP}   TN ${counts.TN}   FP ${counts.FP}   FN ${counts.FN}`,
);
console.log(`  sealed against real code (FP+FN)        ${sealed}`);
console.log(`  open misses, documented not sealed      ${counts.GAP}`);
const NAMING_BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'rule-case-naming-baseline.json',
);

/**
 * A case named after the INSTRUMENT rather than the position it takes.
 *
 *     name: 'coverage - computed callee property (id 9 FALSE)'
 *     name: 'computed class members and literal property access (L67/L81/L95 false arms)'
 *
 * Both say the same thing: this case exists so a branch executes. Neither says
 * what the rule is supposed to DO with the input — and every package here is
 * gated at 100% branch coverage, so that gate was green while 47 such cases
 * asserted a rule's blind spot as intended behaviour. Six were flipped in one
 * week; two had been labelled "documented false negative" in the case comment,
 * and one rule's published DOCUMENTATION repeated the claim to users.
 *
 * Coverage proves a branch RAN. It says nothing about what the case CLAIMS
 * while running it, and the two have been treated as one.
 *
 * The NAME is checked rather than the assertion, because deciding whether a
 * rule should report on an input is exactly the judgement the case exists to
 * encode — a linter that could recover it would not need the case. The name is
 * the weaker signal and the only recoverable one. It is also the honest one:
 * `(id 9 FALSE)` told the truth about its own purpose and nobody looked.
 *
 * See docs/intents/coverage-is-not-pinning/.
 */
const NAMED_AFTER_THE_INSTRUMENT =
  /\bL\d+(?:\/L\d+)*\b|\bid \d+ (?:TRUE|FALSE)\b|\b(?:false|true) arms?\b|^coverage[\s\-–—:]/i;

const instrumentNamedByRule: Record<string, number> = {};
for (const entry of entries) {
  const n = entry.cases.filter(
    (c) => c.description && NAMED_AFTER_THE_INSTRUMENT.test(c.description),
  ).length;
  if (n > 0) instrumentNamedByRule[entry.rule] = n;
}

console.log(`  undescribed cases                       ${undescribed}`);
console.log(
  `  cases named after a branch              ${Object.values(instrumentNamedByRule).reduce((a, b) => a + b, 0)}`,
);
console.log(`  byte-identical duplicate cases          ${duplicates}`);
console.log(`  rules without a described TP and TN     ${missing.length}`);
console.log(
  `  rules that claim no defect at all       ${claimsNothing.length}`,
);
console.log(
  `  rules under ${CASE_FLOOR} classified cases a side     ${belowFloor.length}`,
);
const cited = entries.flatMap((e) =>
  e.cases.filter((c) => c.source !== undefined),
).length;
console.log(`  cases citing real code (@source)        ${cited}`);
console.log(`  rules with a TP taken from real code    ${grounded.length}`);
console.log(`  rules with ANY case from real code      ${touched.length}`);
/**
 * The scan covered the rule list as it was enumerated at the time, which was a
 * flat read of `src/rules` and so missed every rule in a nested directory. The
 * uncovered rules are not silent — they were never asked.
 */
const scanned =
  inventory === null
    ? new Set<string>()
    : new Set([...Object.keys(inventory.rules), ...inventory.withoutMaterial]);
const fires = entries.filter((e) => e.wild !== undefined);
const silent = entries.filter(
  (e) => e.wild === undefined && scanned.has(published(e.rule)),
);
const unscanned = entries.filter((e) => !scanned.has(published(e.rule)));
if (inventory !== null && inventoryIsCurrent) {
  console.log(
    `  fires on real code                      ${fires.length}   (${inventory.reposScanned} repos, ${inventory.filesLinted} files)`,
  );
  console.log(`  scanned and never fired                 ${silent.length}`);
  console.log(`  never scanned                           ${unscanned.length}`);
} else if (inventory !== null) {
  console.log(
    `  real-code inventory                     STALE — produced by a different` +
      `\n                                          eslint.real-source.config.mjs, so` +
      `\n                                          "never fired" cannot be distinguished` +
      `\n                                          from "never ran". Re-run:` +
      `\n                                          npx tsx scripts/real-source-scan.mts`,
  );
}

const FLOOR_BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'rule-case-floor-baseline.json',
);

const DESCRIPTION_BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'rule-case-description-baseline.json',
);

/**
 * Undescribed cases per rule.
 *
 * A case with no `name` runs, passes, and says nothing. It proves the rule
 * does *something* on that input; it does not say what the rule is claiming,
 * so nobody — reviewer or agent — can tell a deliberate assertion from a
 * fixture somebody pasted. 14,935 of them is not a backlog anyone will clear,
 * which is exactly the situation the ratchet pattern exists for: the count is
 * frozen PER RULE and may only fall.
 *
 * Per rule, not in total, on purpose. A single total lets one rule add two
 * hundred undescribed cases as long as another rule happens to describe two
 * hundred that week, and the number that moved would tell you nothing.
 */
const undescribedByRule: Record<string, number> = {};
for (const entry of entries) {
  const n = entry.cases.filter((c) => !c.description).length;
  if (n > 0) undescribedByRule[entry.rule] = n;
}

if (CHECK) {
  const floorBaseline = readBaseline(FLOOR_BASELINE, 'rules');
  const knownThin = new Set(floorBaseline);
  const thinned = belowFloor
    .map((e) => e.rule)
    .filter((r) => !knownThin.has(r));
  if (thinned.length > 0) {
    console.error(
      `\n  ⛔ ${thinned.length} rule(s) hold fewer than ${CASE_FLOOR} classified cases a side:`,
    );
    for (const rule of thinned) console.error(`     ${rule}`);
    console.error(
      `\n  A rule needs ${CASE_FLOOR} things it must catch and ${CASE_FLOOR} it must leave alone.` +
        '\n  One case proves it matches one string.',
    );
    process.exit(1);
  }

  const describedBaseline = readBaselineRecord(DESCRIPTION_BASELINE, 'rules');
  const describedRegressed = Object.entries(undescribedByRule)
    .filter(([rule, n]) => n > (describedBaseline[rule] ?? 0))
    .map(([rule, n]) => `${rule}  ${describedBaseline[rule] ?? 0} → ${n}`);
  if (describedRegressed.length > 0) {
    console.error(
      `\n  ⛔ ${describedRegressed.length} rule(s) gained an undescribed case:`,
    );
    for (const line of describedRegressed) console.error(`     ${line}`);
    console.error(
      '\n  A case with no `name` proves behaviour without saying what behaviour.' +
        '\n  Name it after the claim it makes, or run --update if a rule genuinely shrank.',
    );
    process.exit(1);
  }

  /*
   * `--touched`: the debt is charged to the rule being edited.
   *
   * The per-rule ratchet holds the line and has no downward force — a rule at
   * 189 undescribed cases may be edited forever provided it never reaches 190,
   * and 419 rules carry the debt with no mechanism to reduce it but somebody
   * deciding to. Nobody decides to; there is always a rule to fix instead.
   *
   * So an edit to a rule's source must leave its descriptions better than it
   * found them. STRICTLY LOWER, not zero: a rule at 189 cannot be cleared in
   * the change that fixes a bug in it, and demanding that makes the gate
   * something people route around. One name per edit drains the debt at the
   * rate the code is actually worked on, which is the only rate available.
   *
   * See docs/intents/the-description-ratchet-cannot-reach-the-debt/.
   */
  if (TOUCHED) {
    /*
     * The baseline as COMMITTED, not as it sits in the working tree.
     *
     * `--update` rewrites the baseline to match the current count, so a change
     * that names a case and updates the baseline in one commit would compare
     * 196 against 196 and read as a stall — the reduction it just made becomes
     * invisible to the gate that asked for it. Found immediately: this gate
     * blocked the commit that introduced it.
     *
     * Reading HEAD's copy makes the working tree's improvement visible, which
     * is the only comparison that answers "did this change make it better".
     */
    const committed = (() => {
      try {
        return JSON.parse(
          execFileSync(
            'git',
            ['show', `HEAD:${path.relative(ROOT, DESCRIPTION_BASELINE)}`],
            { cwd: ROOT, encoding: 'utf8' },
          ),
        ) as { rules?: Record<string, number> };
      } catch {
        return undefined;
      }
    })();
    const baseline =
      committed?.rules ?? readBaselineRecord(DESCRIPTION_BASELINE, 'rules');
    const stalled = changedRules()
      .filter((rule) => (baseline[rule] ?? 0) > 0)
      .filter((rule) => (undescribedByRule[rule] ?? 0) >= (baseline[rule] ?? 0))
      .map((rule) => `${rule}  ${undescribedByRule[rule] ?? 0} undescribed`);
    if (stalled.length > 0) {
      console.error(
        `\n  ⛔ ${stalled.length} rule(s) changed without describing a case:`,
      );
      for (const line of stalled) console.error(`     ${line}`);
      console.error(
        '\n  An edit to a rule must leave its case descriptions better than it' +
          '\n  found them. Name ONE case after the claim it makes — not all of' +
          '\n  them — then run `npm run rule-cases -- --update`.',
      );
      process.exit(1);
    }
    console.log('  touched rules: descriptions did not stall');
    process.exit(0);
  }

  const namingBaseline = readBaselineRecord(NAMING_BASELINE, 'rules');
  const namingRegressed = Object.entries(instrumentNamedByRule)
    .filter(([rule, n]) => n > (namingBaseline[rule] ?? 0))
    .map(([rule, n]) => `${rule}  ${namingBaseline[rule] ?? 0} → ${n}`);
  if (namingRegressed.length > 0) {
    console.error(
      `\n  ⛔ ${namingRegressed.length} rule(s) gained a case named after a branch:`,
    );
    for (const line of namingRegressed) console.error(`     ${line}`);
    console.error(
      '\n  A name like `(L67/L81/L95 false arms)` records which arms ran, not what' +
        '\n  the rule should do with the input. 100% coverage was green while 47 such' +
        '\n  cases asserted a blind spot as intended behaviour.' +
        '\n  Name the case after the claim it makes.',
    );
    process.exit(1);
  }

  /*
   * And the other direction: an entry LARGER than the truth is slack, and slack
   * is a regression nobody sees. A rule recorded at 5 that now holds 2 will
   * accept three new branch-named cases in silence — the file would have
   * stopped describing the code and started excusing it, which is the failure
   * every other ratchet here is written to avoid.
   */
  const namingStale = Object.entries(namingBaseline)
    .filter(([rule, n]) => n > (instrumentNamedByRule[rule] ?? 0))
    .map(([rule, n]) => `${rule}  ${n} → ${instrumentNamedByRule[rule] ?? 0}`);
  if (namingStale.length > 0) {
    console.error(
      `\n  ⛔ ${namingStale.length} naming-baseline entr(ies) no longer describe the code:`,
    );
    for (const line of namingStale) console.error(`     ${line}`);
    console.error(
      '\n  The count fell and the record did not. Run `npm run rule-cases -- --update`' +
        '\n  in the same change, so the baseline keeps describing what is there.',
    );
    process.exit(1);
  }

  const baseline = readBaseline(BASELINE, 'rules');
  const known = new Set(baseline);
  const regressed = missing.map((e) => e.rule).filter((r) => !known.has(r));
  if (regressed.length > 0) {
    console.error(
      `\n  ⛔ ${regressed.length} rule(s) lack a described TP or TN and are not in the baseline:`,
    );
    for (const rule of regressed) console.error(`     ${rule}`);
    console.error(
      `\n  Add the missing case, or run with --update if the baseline should shrink.`,
    );
    process.exit(1);
  }
  console.log(`  baseline ${baseline.length} — no regression`);
}

if (UPDATE) {
  const previous = readBaseline(BASELINE, 'rules');
  const now = missing.map((e) => e.rule).sort();
  const grew = now.filter((r) => !previous.includes(r));
  if (previous.length > 0 && grew.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the baseline by ${grew.length}: ${grew.join(', ')}`,
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: 'Rules with no described TP case, or no described TN/FP case. Shrink-only.',
        rules: now,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  baseline written: ${previous.length} → ${now.length}`);

  const previousDescribed = readBaselineRecord(DESCRIPTION_BASELINE, 'rules');
  const grewDescribed = Object.entries(undescribedByRule).filter(
    ([rule, n]) =>
      Object.keys(previousDescribed).length > 0 &&
      n > (previousDescribed[rule] ?? 0),
  );
  if (grewDescribed.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the description baseline for ${grewDescribed.length} rule(s): ` +
        grewDescribed.map(([rule]) => rule).join(', '),
    );
    process.exit(1);
  }
  fs.writeFileSync(
    DESCRIPTION_BASELINE,
    `${JSON.stringify(
      {
        note: 'Cases that run without a `name`, per rule. Shrink-only: a rule may never gain one.',
        rules: Object.fromEntries(
          Object.entries(undescribedByRule).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );

  const previousNaming = readBaselineRecord(NAMING_BASELINE, 'rules');
  const grewNaming = Object.entries(instrumentNamedByRule).filter(
    ([rule, n]) => n > (previousNaming[rule] ?? 0),
  );
  if (Object.keys(previousNaming).length > 0 && grewNaming.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the naming baseline: ${grewNaming
        .map(([r, n]) => `${r} ${previousNaming[r] ?? 0} → ${n}`)
        .join(', ')}`,
    );
    process.exit(1);
  }
  fs.writeFileSync(
    NAMING_BASELINE,
    `${JSON.stringify(
      {
        note:
          'Cases named after the coverage machinery they execute — `(L67/L81 false arms)`, ' +
          '`(id 9 FALSE)` — rather than the position they take. Shrink-only: a rule may ' +
          'never gain one. See docs/intents/coverage-is-not-pinning/.',
        rules: Object.fromEntries(
          Object.entries(instrumentNamedByRule).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );
  const totalUndescribed = Object.values(undescribedByRule).reduce(
    (a, b) => a + b,
    0,
  );
  console.log(
    `  description baseline written: ${Object.keys(undescribedByRule).length} rule(s), ${totalUndescribed} undescribed case(s)`,
  );

  const previousThin = readBaseline(FLOOR_BASELINE, 'rules');
  const nowThin = belowFloor.map((e) => e.rule).sort();
  const grewThin = nowThin.filter((r) => !previousThin.includes(r));
  if (previousThin.length > 0 && grewThin.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the case-floor baseline by ${grewThin.length}: ${grewThin.join(', ')}`,
    );
    process.exit(1);
  }
  fs.writeFileSync(
    FLOOR_BASELINE,
    `${JSON.stringify(
      {
        note: `Rules holding fewer than ${CASE_FLOOR} classified cases on a side. Shrink-only.`,
        rules: nowThin,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `  case-floor baseline: ${previousThin.length} → ${nowThin.length}`,
  );
}

/** Flattened views of the two history-bearing kinds, for the ledger's own tables. */
const withRule = (kinds: Kind[]): { rule: string; c: Case }[] =>
  entries.flatMap((e) =>
    e.cases
      .filter((c) => kinds.includes(c.kind))
      .map((c) => ({ rule: e.rule, c })),
  );
const sealedCases = withRule(['FP', 'FN']).sort(
  (a, b) => a.rule.localeCompare(b.rule) || a.c.kind.localeCompare(b.c.kind),
);
const gapCases = withRule(['GAP']).sort((a, b) => a.rule.localeCompare(b.rule));
const foundBy = new Map<string, number>();
for (const { c } of sealedCases) {
  const how = c.found ?? 'unrecorded';
  foundBy.set(how, (foundBy.get(how) ?? 0) + 1);
}

if (!CHECK) {
  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify({ counts, rules: entries }, null, 2)}\n`,
  );

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
    '| **FN** | an `invalid` case named `FN: …` — we MISSED this in the wild, and sealed it |',
    '| **GAP** | a `valid` case named `GAP: …` — a miss that is still open, and not protection |',
    '',
    `**${entries.length} rules · TP ${counts.TP} · TN ${counts.TN} · FP ${counts.FP} · FN ${counts.FN} · GAP ${counts.GAP}**`,
    '',
    '## What FP and FN actually count',
    '',
    `**${sealed} cases are sealed against real third-party code** — ${counts.FP} over-reports we`,
    `made and ${counts.FN} defects we walked past, each now held by a case that fails on`,
    'the rule as it was written and passes on the rule as it is. That is the only',
    'number here earned outside our own imagination: every TP and TN is a position',
    'we asserted and then satisfied, which proves consistency and not correctness.',
    '',
    'These are deliberately not a bug list. An entry arrives here **after** it is',
    'fixed; the case is the receipt. A mistake still open does not get an FP or an',
    `FN — it gets a \`GAP:\`, of which there are ${counts.GAP}, counted apart precisely so`,
    'that admitting a weakness can never be mistaken for defending against one.',
    '',
    'How each one was found, from the `@found` note on its case:',
    '',
    '| found by | sealed |',
    '|---|---:|',
    ...[...foundBy.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([how, n]) => `| ${how} | ${n} |`),
    '',
    '## Every sealed case',
    '',
    'The full list, so the protection can be audited without opening a test file.',
    'Each row fails on the rule as it was and passes on the rule as it is.',
    '',
    '| id | what we got wrong | found by | in real code |',
    '|---|---|---|---|',
    ...sealedCases.map(
      ({ c }) =>
        `| \`${c.id}\` | ${c.description || '(undescribed)'} | ${c.found ?? '—'} | ${c.source === undefined ? '—' : `\`${c.source}\``} |`,
    ),
    '',
    `## The ${counts.GAP} misses still open`,
    '',
    'Each is a `valid` case: the code passes, and it should not. They are here so',
    'that the gap is citable and closable one at a time, not so that it counts.',
    '',
    '| id | what we miss | why it is still open |',
    '|---|---|---|',
    ...gapCases.map(
      ({ c }) =>
        `| \`${c.id}\` | ${c.description || '(undescribed)'} | ${c.found ?? '—'} |`,
    ),
    '',
    `${missing.length} of ${entries.length} rules do not yet carry both a described TP and a described TN.`,
    `${undescribed} cases run without a \`name\`: they prove behaviour without saying what behaviour.`,
    '',
    `${claimsNothing.length} rules have an EMPTY \`invalid\` array: they claim no defect at all, and`,
    'their suites pass by proving they stay quiet. Adding a description is not the',
    "fix for those — see each one's own comment for why it has nothing to catch.",
    '',
    `**${grounded.length} of ${entries.length} rules have a TP taken from code somebody else shipped.**`,
    `${touched.length} have any case at all drawn from real code — usually a false positive we`,
    'narrowed the rule to stop making, which is contact with the world but not',
    'evidence the rule catches anything. The rest are proved only by fixtures we',
    'wrote, and a fixture cannot tell a rule that catches a real defect from one',
    "that catches its author's idea of the defect.",
    '',
    ...(inventory === null
      ? []
      : [
          `Separately, linting ${inventory.reposScanned} cloned repositories (${inventory.filesLinted} files):`,
          '',
          '| | rules |',
          '|---|---|',
          `| fired at least once | **${fires.length}** |`,
          `| scanned, never fired | ${silent.length} |`,
          `| never scanned | ${unscanned.length} |`,
          '',
          'Firing is not catching — `secure-coding/no-insecure-comparison` accounts for',
          '12,303 of those findings and most are `===` on two config values. But not',
          'firing is conclusive the other way: a rule that produced no candidate across',
          "13k files of other people's code has not yet been given the chance to be",
          'right. The unscanned rules were missed by the enumeration the scan used, not',
          'found silent. Each rule below carries its own count.',
        ]),
    '',
  ];
  for (const entry of entries) {
    const n = (k: Kind): number =>
      entry.cases.filter((c) => c.kind === k).length;
    md.push(`## \`${entry.rule}\``, '');
    if (entry.cases.length === 0) {
      md.push('*No RuleTester cases found.*', '');
      continue;
    }
    const wild =
      entry.wild !== undefined
        ? `fired ${entry.wild.count} times across ${entry.wild.repos} of ${inventory?.reposScanned ?? 0} scanned repositories`
        : scanned.has(published(entry.rule))
          ? 'never fired across the scanned repositories'
          : 'not covered by the real-code scan';
    const gap = n('GAP') === 0 ? '' : ` · GAP ${n('GAP')}`;
    md.push(
      `TP ${n('TP')} · TN ${n('TN')} · FP ${n('FP')} · FN ${n('FN')}${gap} — ${wild}`,
      '',
    );
    md.push('| id | case |', '|---|---|');
    for (const kind of ['TP', 'TN', 'FP', 'FN', 'GAP'] as Kind[]) {
      for (const c of entry.cases.filter((x) => x.kind === kind)) {
        // A pipe ends the cell early and takes the rest of the row with it;
        // a pair of underscores (`__proto__`, and this is a security suite, so
        // there are many) renders as bold. Both are escaped rather than
        // rewritten, so the ledger shows the description the test carries.
        const cell =
          c.description === ''
            ? '*(undescribed)*'
            : c.description.replaceAll('|', '\\|').replaceAll('_', '\\_');
        const cited =
          c.source === undefined
            ? ''
            : ` <br>↳ \`${c.source.replaceAll('|', '\\|')}\``;
        md.push(`| \`${c.id.split('#')[1]}\` | ${cell}${cited} |`);
      }
    }
    md.push('');
  }
  fs.writeFileSync(OUT_MD, `${md.join('\n')}\n`);
  console.log(
    `\n  wrote ${path.relative(ROOT, OUT_MD)} and ${path.relative(ROOT, OUT_JSON)}`,
  );
}
