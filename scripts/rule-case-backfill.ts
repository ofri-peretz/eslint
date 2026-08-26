/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * rule-case-backfill.ts — give a rule's first valid and invalid case a name.
 *
 * `rule-case-ledger.ts` publishes what each rule has decided by reading the
 * `name` on its RuleTester cases. Most cases predate that convention and carry
 * no name, so this walks the same files and inserts one.
 *
 *   npx tsx scripts/rule-case-backfill.ts --show <plugin>
 *       print the first UNNAMED valid and invalid case of every rule in a
 *       plugin, so the description can be written against the actual code.
 *
 *   npx tsx scripts/rule-case-backfill.ts <table.json>
 *       apply `{ "<plugin>/<rule>": { file, tp, tn } }`. `file` is a substring
 *       of the test file the name may land in, and it is not optional in
 *       practice: without it the codemod takes the first unnamed case in
 *       readdir order, which on the first run put six descriptions onto
 *       coverage-branch cases they did not describe. Every insertion prints
 *       the code it landed on — read that output, it is the only check.
 */

const SHOW = process.argv[2] === '--show' ? process.argv[3] : null;
/**
 * `--show <plugin> own` restricts the dump to each rule's own
 * `<rule>.test.ts`. Several plugins keep a shared `coverage-*.test.ts` whose
 * cases exercise branches rather than the rule's position, and readdir order
 * puts it first — which is the wrong file to write a description against.
 */
const OWN = process.argv[4] === 'own';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// `file` narrows which test file a name may land in. Without it the codemod
// takes the first unnamed case in readdir order, which put six descriptions on
// coverage-branch cases they did not describe.
const table: Record<string, { tp?: string; tn?: string; file?: string }> =
  SHOW === null ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {};
const root = process.cwd();

const files: string[] = [];
const walk = (d: string): void => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(test|spec)\.tsx?$/.test(e.name)) files.push(f);
  }
};
for (const pkg of fs.readdirSync(path.join(root, 'packages')).filter((d) => d.startsWith('eslint-plugin-'))) {
  if (SHOW !== null && pkg !== `eslint-plugin-${SHOW}`) continue;
  const src = path.join(root, 'packages', pkg, 'src');
  if (fs.existsSync(src)) walk(src);
}

const text = (n: ts.Node): string | null => (ts.isStringLiteralLike(n) ? n.text : null);
const arrayIn = (n: ts.Expression): ts.ArrayLiteralExpression | null => {
  let f: ts.ArrayLiteralExpression | null = null;
  const dig = (x: ts.Node): void => { if (f) return; if (ts.isArrayLiteralExpression(x)) { f = x; return; } ts.forEachChild(x, dig); };
  dig(n); return f;
};
const hasName = (el: ts.Node): boolean =>
  ts.isObjectLiteralExpression(el) &&
  el.properties.some((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'name');

const ruleOfImport = (from: string, spec: string): string | null => {
  if (!spec.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(from), spec);
  const marker = `${path.sep}src${path.sep}rules${path.sep}`;
  const at = resolved.indexOf(marker);
  if (at === -1) return null;
  const pkg = path.basename(resolved.slice(0, resolved.indexOf(`${path.sep}src${path.sep}`)));
  if (!pkg.startsWith('eslint-plugin-')) return null;
  return `${pkg.replace('eslint-plugin-', '')}/${path.basename(resolved.replace(/\/index$/, ''))}`;
};

const done = new Set<string>();
for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  let src = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const byBinding = new Map<string, string>();
  for (const st of src.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const spec = text(st.moduleSpecifier);
    if (spec === null) continue;
    const rule = ruleOfImport(file, spec);
    if (rule === null) continue;
    const b = st.importClause.namedBindings;
    if (b && ts.isNamedImports(b)) for (const e of b.elements) byBinding.set(e.name.text, rule);
    if (st.importClause.name) byBinding.set(st.importClause.name.text, rule);
  }

  type Edit = { pos: number; insert: string };
  const edits: Edit[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'run' && node.arguments.length >= 3) {
      const target = node.arguments[1];
      const rule = ts.isIdentifier(target) ? byBinding.get(target.text) : undefined;
      const cfg = node.arguments[2];
      const wanted =
        rule === undefined ? undefined : OWN ? `${rule.split('/')[1]}.test.ts` : table[rule]?.file;
      const fileOk = wanted === undefined || file.includes(wanted);
      const wanting = rule !== undefined && (SHOW !== null || table[rule] !== undefined);
      if (wanting && fileOk && ts.isObjectLiteralExpression(cfg)) {
        for (const p of cfg.properties) {
          if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
          const kind = p.name.text === 'invalid' ? 'tp' : p.name.text === 'valid' ? 'tn' : null;
          if (kind === null) continue;
          const label = SHOW === null ? table[rule][kind] : '';
          if (label === undefined || done.has(`${rule}:${kind}`)) continue;
          const arr = arrayIn(p.initializer);
          if (arr === null) continue;
          const first = arr.elements.find((e) => !ts.isSpreadElement(e) && ts.isObjectLiteralExpression(e) && !hasName(e));
          if (first === undefined) continue;
          if (SHOW !== null) {
            done.add(`${rule}:${kind}`);
            const code = (first as ts.ObjectLiteralExpression).properties
              .filter(ts.isPropertyAssignment)
              .find((x) => ts.isIdentifier(x.name) && x.name.text === 'code');
            console.log(`${rule} ${kind}  ${path.relative(root, file)}`);
            console.log(`  ${code?.initializer.getText().replace(/\s+/g, ' ').slice(0, 150) ?? '(no code)'}`);
            continue;
          }
          // Match the indentation of the property that follows, and quote the
          // way the repo does, so the insertion needs no formatter pass. A
          // `prettier --write` over the whole file would reformat everything
          // else in it too — 56 unrelated test files churned that way once.
          const object = first as ts.ObjectLiteralExpression;
          const anchor = object.properties[0];
          const quoted = label.includes("'") ? JSON.stringify(label) : `'${label}'`;
          const openLine = src.getLineAndCharacterOfPosition(object.getStart()).line;
          const firstLine =
            anchor === undefined ? openLine : src.getLineAndCharacterOfPosition(anchor.getStart()).line;
          const insert =
            openLine === firstLine
              ? ` name: ${quoted},`
              : `\n${' '.repeat(src.getLineAndCharacterOfPosition(anchor!.getStart()).character)}name: ${quoted},`;
          edits.push({ pos: object.getStart() + 1, insert });
          done.add(`${rule}:${kind}`);
          // Print what the name actually landed on. Files are visited in
          // readdir order, so "the first unnamed case" is not always the one
          // the description was written for — six names went onto the wrong
          // cases the first time this ran, and only this line catches it.
          const landed = (first as ts.ObjectLiteralExpression).properties
            .filter(ts.isPropertyAssignment)
            .find((x) => ts.isIdentifier(x.name) && x.name.text === 'code');
          console.log(`    ${rule} ${kind}: ${label}\n      ↳ ${landed?.initializer.getText().replace(/\s+/g, ' ').slice(0, 110) ?? '(no code)'}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  if (edits.length === 0) continue;
  for (const e of edits.sort((a, b) => b.pos - a.pos)) source = source.slice(0, e.pos) + e.insert + source.slice(e.pos);
  fs.writeFileSync(file, source);
  console.log(`  ${edits.length} name(s) → ${path.relative(root, file)}`);
}
if (SHOW !== null) process.exit(0);
const missed = Object.entries(table).flatMap(([r, v]) =>
  (['tp', 'tn'] as const).filter((k) => v[k] !== undefined && !done.has(`${r}:${k}`)).map((k) => `${r}:${k}`),
);
if (missed.length > 0) console.log(`\n  NOT APPLIED (no unnamed object case): ${missed.join(', ')}`);
