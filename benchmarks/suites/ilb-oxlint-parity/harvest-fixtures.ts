#!/usr/bin/env -S npx tsx
/**
 * harvest-fixtures.mjs — extract RuleTester `code` blocks into standalone JS
 * fixtures for the parity bench.
 *
 * Each rule's *.test.ts contains valid + invalid cases. The invalid ones are
 * known-positive examples — both ESLint and oxlint should fire on them. The
 * valid ones are known-negative — both should be silent. Either way they
 * exercise the rule's actual code paths, far more thoroughly than the small
 * hand-crafted CWE corpus.
 *
 * We extract every \`code: \\`...\\`\` block via a deliberately simple regex
 * (no full TS parser — these test files follow a uniform shape). Each extract
 * is written to harvested-fixtures/<plugin>/<rule>/<idx>.ts so the parity bench
 * can lint the directory.
 *
 * The extension is `.ts`, not `.js`, and that is load-bearing. These blocks are
 * lifted out of TypeScript test files, so many carry TS syntax. ESLint's config
 * here puts `@typescript-eslint/parser` on `.js` and `.ts` alike and parses them
 * either way; oxlint keys on the extension and REFUSES a `.js` file holding a
 * type assertion or a `!:` declaration. A refused file is linted by neither
 * engine's rules, so every rule ESLint reported on it counted as an oxlint gap:
 * that alone was all 112 divergences behind #912, and it made portability look
 * broken where nothing was. TypeScript is a superset of JavaScript, so `.ts` is
 * correct for both kinds of block.
 *
 * Usage: tsx benchmarks/suites/ilb-oxlint-parity/harvest-fixtures.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ts from 'typescript';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PACKAGES = path.join(REPO_ROOT, 'packages');
const OUT_DIR = path.join(HERE, 'harvested-fixtures');

/*
 * `code:` blocks are read with TypeScript's parser, not a regex.
 *
 * The regex this replaced — /code:\s*`([\s\S]*?)`/ — was non-greedy to a
 * backtick, so a test case containing a NESTED template literal (which these
 * files escape as \\`) ended at that inner backtick. The fixture was truncated
 * mid-expression, and the backslashes survived into it verbatim. 557 of ~4000
 * fixtures were damaged this way: broken input, linted and scored as if it
 * were the rule's real test case.
 *
 * The parser has no such failure mode. A template literal node's `.text` is
 * the COOKED value — \\` is already a backtick and \\${ already a dollar-brace —
 * which is exactly the source the test intended to lint.
 */
export function codeBlocks(src, testFile) {
  const sf = ts.createSourceFile(
    testFile,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const out = [];
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'code'
    ) {
      const init = node.initializer;
      // A template with `${}` substitutions is built at runtime; its text is
      // not the code the rule sees, so it cannot become a fixture.
      if (
        ts.isNoSubstitutionTemplateLiteral(init) ||
        ts.isStringLiteral(init)
      ) {
        out.push(init.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function harvestFile(testFile, pluginShort, ruleName) {
  const src = fs.readFileSync(testFile, 'utf-8');
  const blocks = [];
  for (const raw of codeBlocks(src, testFile)) {
    const code = raw.trim();
    // Skip empty / trivially-short cases
    if (code.length < 8) continue;
    // Skip cases that are only valid inside RuleTester's per-test parser
    // options — top-level `return` needs commonjs sourceType, and a leading
    // decorator needs the decorator plugin. Neither is valid in a standalone
    // module, so both engines would reject the file and it could measure
    // nothing.
    if (/^\s*return\b/m.test(code)) continue;
    if (/^\s*@\w+/m.test(code)) continue; // decorator
    /*
     * There used to be two more skips here, pattern-matching TypeScript syntax
     * so it never reached a `.js` fixture: a list of primitive type
     * annotations, and `satisfies` / `interface` / `type X =`. Both were
     * guesses at a parser's job and both leaked — `'x' as string` and
     * `public conn!: WebSocket` are TS, match neither pattern, and landed in
     * `.js` files that oxlint then refused. Writing `.ts` removes the reason
     * they existed, and dropping them also stops silently discarding every
     * TS-flavoured test case in a repo whose tests are all TypeScript.
     */
    blocks.push(raw);
  }
  return blocks;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(test|spec)\.ts$/.test(e.name)) out.push(full);
  }
  return out;
}

if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = { plugins: 0, rules: 0, fixtures: 0 };

for (const pluginDir of fs.readdirSync(PACKAGES)) {
  if (!pluginDir.startsWith('eslint-plugin-')) continue;
  const rulesDir = path.join(PACKAGES, pluginDir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) continue;

  const short = pluginDir.replace(/^eslint-plugin-/, '');
  const testFiles = walk(rulesDir);
  if (testFiles.length === 0) continue;

  let pluginCount = 0;
  for (const testFile of testFiles) {
    // Derive a stable rule slug from the path
    const rel = path
      .relative(rulesDir, testFile)
      .replace(/\.(test|spec)\.ts$/, '');
    const ruleSlug = rel.replace(/\//g, '__').replace(/\\/g, '__');
    const blocks = harvestFile(testFile, short, ruleSlug);
    if (blocks.length === 0) continue;

    const ruleOutDir = path.join(OUT_DIR, short, ruleSlug);
    fs.mkdirSync(ruleOutDir, { recursive: true });
    // Content-hashed filenames: a stable code block always maps to the same
    // file across regenerations, so a one-line edit to a test file shifts
    // exactly one fixture instead of renumbering every subsequent one.
    // 8 hex chars = 32 bits, plenty for ~100 fixtures per rule.
    const seen = new Set();
    for (const code of blocks) {
      const hash = crypto
        .createHash('sha256')
        .update(code)
        .digest('hex')
        .slice(0, 8);
      if (seen.has(hash)) continue; // identical duplicate code blocks collapse
      seen.add(hash);
      fs.writeFileSync(path.join(ruleOutDir, `${hash}.ts`), code + '\n');
      summary.fixtures++;
    }
    summary.rules++;
    pluginCount++;
  }
  if (pluginCount > 0) summary.plugins++;
}

/*
 * Drop fixtures that are not valid standalone modules.
 *
 * A RuleTester `code` block does not have to be a whole module — some are
 * class-body fragments, some are truncated mid-expression. Extracted to a file
 * they parse under nobody's rules, and the parity bench cannot measure a file
 * that never gets linted: ESLint's parser recovers from the damage and reports
 * findings anyway, oxlint refuses the file outright, and the difference lands
 * in the report as an oxlint gap. That is a defect in this harvester's output
 * being published as a portability number.
 *
 * The judge is TypeScript's own parser, deliberately NOT oxlint. Asking oxlint
 * whether to keep a file it will later be graded on is how a real parser gap
 * disappears into a shrinking corpus: anything oxlint alone cannot read stays
 * in, stays divergent, and stays visible as the finding it is.
 */
const invalid = [];
let jsxFixtures = 0;
const parseErrors = (file, src, kind) =>
  ts.createSourceFile(file, src, ts.ScriptTarget.Latest, false, kind)
    .parseDiagnostics ?? [];
const collect = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      collect(full);
      continue;
    }
    if (!full.endsWith('.ts')) continue;
    const src = fs.readFileSync(full, 'utf-8');
    if (parseErrors(full, src, ts.ScriptKind.TS).length === 0) continue;
    // JSX needs .tsx — `<Foo>` is a type assertion in .ts and an element in
    // .tsx, and only the extension can say which. This replaced a
    // `code.includes('<') && code.includes('/>')` guess that saw only
    // self-closing tags and dropped the rest as unparseable.
    const asTsx = full.replace(/\.ts$/, '.tsx');
    if (parseErrors(asTsx, src, ts.ScriptKind.TSX).length === 0) {
      fs.renameSync(full, asTsx);
      jsxFixtures++;
      continue;
    }
    invalid.push({
      file: path.relative(OUT_DIR, full),
      reason: ts.flattenDiagnosticMessageText(
        parseErrors(full, src, ts.ScriptKind.TS)[0].messageText,
        ' ',
      ),
    });
    fs.rmSync(full);
    summary.fixtures--;
  }
};
collect(OUT_DIR);

console.log(
  `harvested ${summary.fixtures} fixtures from ${summary.rules} rule test files across ${summary.plugins} plugins`,
);
if (jsxFixtures > 0) console.log(`  ${jsxFixtures} written as .tsx (JSX)`);
if (invalid.length > 0) {
  console.log(
    `dropped ${invalid.length} fixture(s) that are not valid standalone modules:`,
  );
  for (const { file, reason } of invalid) console.log(`  ${file} — ${reason}`);
}
console.log(`output: ${path.relative(REPO_ROOT, OUT_DIR)}`);
