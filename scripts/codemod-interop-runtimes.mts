#!/usr/bin/env -S npx tsx
/**
 * Write `meta.interop.runtimes` into every rule from the evidence; re-run after
 * `npm run oxlint:runtimes:survey` (as `npm run oxlint:runtimes`).
 *
 *   - type-aware rules (`.agent/type-awareness-scan.tsv` status ≠ unaware)
 *     → ['eslint'] (intent decision 4: oxlint has no parser services);
 *   - every case of the rule's own suite passed on oxlint
 *     (`.agent/oxlint-runtime-survey.json`) → ['eslint', 'oxlint'];
 *   - anything else, including a rule with no surveyed cases → ['eslint'].
 *
 * Each plugin's `rules` map is followed through the type checker to the rule
 * object, and the field is inserted at the top of its `meta` literal. Rules
 * built by a devkit factory get it once, in the factory: shared logic, shared
 * runtimes — oxlint only if every plugin's rule from that factory passed.
 *
 * Usage: tsx scripts/codemod-interop-runtimes.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  loadEvidence,
  nativeEquivalents,
  runtimesFor,
} from './lib/oxlint-runtimes.mts';

const ROOT = path.resolve(import.meta.dirname, '..');
const evidence = loadEvidence(ROOT);
const natives = nativeEquivalents(ROOT);

/** The whole `interop` property for one rule ID. */
const decide = (short: string, id: string): string => {
  const both =
    runtimesFor(evidence, `eslint-plugin-${short}/${id}`).runtimes.length === 2;
  const native = natives.get(`${short}/${id}`);
  const runtimes = both ? `['eslint', 'oxlint']` : `['eslint']`;
  return native
    ? `interop: { runtimes: ${runtimes}, nativeEquivalent: '${native}' },`
    : `interop: { runtimes: ${runtimes} },`;
};
/**
 * IDs sharing one meta must agree: a devkit factory's rules, or a rule also
 * exported under a legacy alias (`maintainability/x` beside `x`), whose alias
 * ID has no overlap row of its own. Runtimes: oxlint only if all pass. Native
 * equivalent: kept when every ID that has one names the same built-in.
 */
const settle = (votes: string[]): string => {
  const runtimes = votes.every((v) => v.includes("'oxlint'"))
    ? `['eslint', 'oxlint']`
    : `['eslint']`;
  const natives = new Set(
    votes
      .map((v) => /nativeEquivalent: '([^']+)'/.exec(v)?.[1])
      .filter(Boolean),
  );
  return natives.size === 1
    ? `interop: { runtimes: ${runtimes}, nativeEquivalent: '${[...natives][0]}' },`
    : `interop: { runtimes: ${runtimes} },`;
};

const edits = new Map<string, { pos: number; end: number; text: string }[]>();
const factoryVotes = new Map<
  ts.Node,
  { file: string; meta: ts.ObjectLiteralExpression; votes: string[] }
>();
const problems: string[] = [];
let inserted = 0;
let factoryBuilt = 0;

function metaOf(
  obj: ts.ObjectLiteralExpression,
): ts.ObjectLiteralExpression | null {
  const meta = obj.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === 'meta',
  );
  return meta && ts.isObjectLiteralExpression(meta.initializer)
    ? meta.initializer
    : null;
}

/** Insert `interop` at the top of `meta`, or rewrite it where it already is. */
function queue(file: string, meta: ts.ObjectLiteralExpression, text: string) {
  const list = edits.get(file) ?? [];
  const existing = meta.properties.find(
    (p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'interop',
  );
  if (existing) {
    const end =
      meta.getSourceFile().text[existing.getEnd()] === ','
        ? existing.getEnd() + 1
        : existing.getEnd();
    list.push({ pos: existing.getStart(), end, text });
  } else {
    list.push({
      pos: meta.getStart() + 1,
      end: meta.getStart() + 1,
      text: `\n${text}`,
    });
  }
  edits.set(file, list);
  inserted++;
}

for (const dir of fs
  .readdirSync(path.join(ROOT, 'packages'))
  .filter((d) => d.startsWith('eslint-plugin-'))) {
  const short = dir.slice('eslint-plugin-'.length);
  const pkg = path.join(ROOT, 'packages', dir);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    path.join(pkg, 'tsconfig.lib.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  )!;
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const index = program.getSourceFile(path.join(pkg, 'src/index.ts'))!;

  let map: ts.ObjectLiteralExpression | undefined;
  index.forEachChild((s) => {
    if (!ts.isVariableStatement(s)) return;
    for (const d of s.declarationList.declarations) {
      let init = d.initializer;
      while (
        init &&
        (ts.isSatisfiesExpression(init) || ts.isAsExpression(init))
      )
        init = init.expression;
      if (
        ts.isIdentifier(d.name) &&
        d.name.text === 'rules' &&
        init &&
        ts.isObjectLiteralExpression(init)
      ) {
        map = init;
      }
    }
  });
  if (!map) {
    problems.push(`${dir}: no \`rules\` object literal in src/index.ts`);
    continue;
  }

  for (const prop of map.properties) {
    const id =
      prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))
        ? prop.name.text
        : null;
    const value = ts.isPropertyAssignment(prop)
      ? prop.initializer
      : ts.isShorthandPropertyAssignment(prop)
        ? prop.name
        : null;
    if (!id || !value) {
      problems.push(
        `${dir}: unreadable rules entry ${prop.getText(index).slice(0, 60)}`,
      );
      continue;
    }
    let symbol = checker.getSymbolAtLocation(value);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias)
      symbol = checker.getAliasedSymbol(symbol);
    const decl = symbol?.valueDeclaration;
    if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer) {
      problems.push(`${dir}/${id}: cannot find its declaration`);
      continue;
    }
    const file = decl.getSourceFile().fileName;
    const init = decl.initializer;
    const runtimes = decide(short, id);

    let obj: ts.ObjectLiteralExpression | null = null;
    let factoryConfig: ts.ObjectLiteralExpression | null = null;
    if (ts.isObjectLiteralExpression(init)) obj = init;
    else if (ts.isCallExpression(init)) {
      const arg = init.arguments[0];
      const literal = arg && ts.isObjectLiteralExpression(arg) ? arg : null;
      if (/\b(createRule|RuleCreator)\b/.test(init.expression.getText()))
        obj = literal;
      else factoryConfig = literal ?? ({} as never);
    }
    if (obj) {
      const meta = metaOf(obj);
      if (!meta) problems.push(`${dir}/${id}: meta is not an object literal`);
      else {
        const slot = factoryVotes.get(meta) ?? { file, meta, votes: [] };
        slot.votes.push(runtimes);
        factoryVotes.set(meta, slot);
      }
      continue;
    }

    // Built by a devkit factory (createSqlInjectionRule, …): shared logic,
    // so `interop` is declared once in the factory's own meta, by hand, and
    // the interop lock checks every rule it builds against the evidence. A
    // copy in the plugin-side config would not even typecheck — remove it.
    if (factoryConfig) {
      const meta = factoryConfig.properties ? metaOf(factoryConfig) : null;
      const stray = meta?.properties.find(
        (p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'interop',
      );
      if (meta && stray) {
        const text = meta.getSourceFile().text;
        const end =
          text[stray.getEnd()] === ',' ? stray.getEnd() + 1 : stray.getEnd();
        const list = edits.get(file) ?? [];
        list.push({ pos: stray.getFullStart(), end, text: '' });
        edits.set(file, list);
      }
      factoryBuilt++;
      continue;
    }
    problems.push(`${dir}/${id}: unrecognised rule declaration`);
  }
}

for (const { file, meta, votes } of factoryVotes.values()) {
  queue(file, meta, settle(votes));
}

for (const [file, list] of edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const e of list.sort((a, b) => b.pos - a.pos))
    text = text.slice(0, e.pos) + e.text + text.slice(e.end);
  fs.writeFileSync(file, text);
}

console.log(
  JSON.stringify(
    { inserted, factoryBuilt, files: edits.size, problems },
    null,
    2,
  ),
);
