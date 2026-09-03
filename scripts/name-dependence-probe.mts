/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The litmus test, mechanised: rename every binding and see who stops working.
 *
 * The house rule is that a rule decides from AST STRUCTURE. A name is not
 * structure, and "not structure" splits in two:
 *
 *   somebody else's standard  `innerHTML` is WHATWG's, `alg` is RFC 7519's.
 *                             Stays in the rule, and must name its authority.
 *   our consumer's choice     `isAuthorized`, `email`, `maxSize`. Belongs in an
 *                             option that REPLACES the default.
 *
 * This probe cannot tell those apart by reading the rule — but it can tell
 * whether a rule depends on a name AT ALL, which is the first question.
 *
 * For every true positive in the case ledger it rewrites every LOCAL binding
 * to `foo1`, `foo2`, … and re-runs the rule. Member property names, imported
 * names and string literals are left alone, because those are where a
 * standard's vocabulary lives. So:
 *
 *   still reports  the verdict came from structure. The litmus passes.
 *   goes silent    the verdict came from what a binding was CALLED, and the
 *                  consumer cannot rename their own variable without losing
 *                  the finding.
 *
 * A rule that goes silent is not automatically wrong — a deliberate,
 * documented, REPLACEABLE vocabulary is the sanctioned exception, and
 * `no-timing-unsafe-compare` is supposed to fail this. The output is a list to
 * adjudicate, not a defect count.
 *
 *   npx tsx scripts/name-dependence-probe.mts [--rule <substring>]
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsparser from '@typescript-eslint/parser';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LEDGER = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');

// RULE_CASES.json is gitignored (135 k lines — see .gitignore). A fresh CI
// checkout never has it. Rather than crashing with ENOENT and letting the
// `if: failure()` reporter file a misleading issue, generate it on demand.
// This is the same as adding `npm run rule-cases` as a prerequisite step in
// the caller (comparison-refresh.yml), but self-contained so the probe works
// whether it is called from a workflow, a developer's shell, or a lock test.
if (!fs.existsSync(LEDGER)) {
  console.log(
    'benchmarks/RULE_CASES.json not found — generating with `npm run rule-cases`',
  );
  execFileSync('npm', ['run', 'rule-cases'], { cwd: ROOT, stdio: 'inherit' });
}

const filter = process.argv.includes('--rule')
  ? process.argv[process.argv.indexOf('--rule') + 1]
  : null;

type Case = {
  kind: string;
  code: string;
  description: string;
  options?: string;
};
type Ledger = { rules: { rule: string; cases: Case[] }[] };

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as Ledger;
const linter = new Linter();
const plugins = new Map<string, Record<string, unknown>>();

async function ruleFor(qualified: string): Promise<unknown | null> {
  const [pkg, ...rest] = qualified.split('/');
  if (!plugins.has(pkg)) {
    const entry = path.join(
      ROOT,
      'packages',
      `eslint-plugin-${pkg}`,
      'src',
      'index.ts',
    );
    if (!fs.existsSync(entry)) return null;
    const mod = (await import(entry)) as {
      default?: { rules?: Record<string, unknown> };
      rules?: Record<string, unknown>;
    };
    plugins.set(
      pkg,
      (mod.default?.rules ?? mod.rules ?? {}) as Record<string, unknown>,
    );
  }
  return plugins.get(pkg)?.[rest.join('/')] ?? null;
}

function reports(rule: unknown, name: string, code: string): number | null {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        plugins: { p: { rules: { [name]: rule } } as never },
        languageOptions: {
          parser: tsparser as never,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        rules: { [`p/${name}`]: 'error' },
      },
    ],
    'case.tsx',
  );
  if (messages.some((m) => m.ruleId === null)) return null;
  return messages.length;
}

/**
 * Rename every LOCAL binding, and nothing else.
 *
 * Deliberately conservative about what it will not touch:
 *
 *   member properties   `el.innerHTML` — the name is the DOM's.
 *   imported names      `import { verify }` — the name is the library's.
 *   object keys         `{ algorithm: 'md5' }` — the name is an API's.
 *   string literals     `require('crypto')` — the value is the module's.
 *   globals             `req`, `process`, `crypto` when never declared here,
 *                       because renaming a free identifier changes what the
 *                       code MEANS rather than what it is called.
 *
 * What is left is exactly the set a consumer is free to rename in their own
 * codebase without changing behaviour — which is the population the litmus is
 * about.
 */
function renameBindings(code: string): string | null {
  let ast: TSESTree.Program;
  try {
    ast = parser.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      range: true,
      loc: true,
      jsx: true,
    }) as TSESTree.Program;
  } catch {
    return null;
  }

  const declared = new Set<string>();
  const edits: { range: [number, number]; text: string }[] = [];
  const fresh = new Map<string, string>();

  // Pass 1: which names does this snippet DECLARE?
  const collect = (node: TSESTree.Node): void => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      declared.add(node.id.name);
    }
    if (
      (node.type === 'FunctionDeclaration' ||
        node.type === 'ClassDeclaration') &&
      node.id !== null
    ) {
      declared.add(node.id.name);
    }
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      for (const p of node.params)
        if (p.type === 'Identifier') declared.add(p.name);
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value)
          if (child && typeof child === 'object' && 'type' in child)
            collect(child as TSESTree.Node);
      } else if (value && typeof value === 'object' && 'type' in value) {
        collect(value as TSESTree.Node);
      }
    }
  };
  collect(ast);
  if (declared.size === 0) return null;

  // Pass 2: rewrite every reference to a declared name, skipping the positions
  // where a name belongs to somebody else.
  const walk = (
    node: TSESTree.Node,
    parentKey: string,
    parent: TSESTree.Node | null,
  ): void => {
    if (node.type === 'Identifier' && declared.has(node.name)) {
      const isMemberProperty =
        parent?.type === 'MemberExpression' &&
        parentKey === 'property' &&
        !parent.computed;
      const isObjectKey =
        (parent?.type === 'Property' ||
          parent?.type === 'PropertyDefinition') &&
        parentKey === 'key' &&
        !(parent as { computed?: boolean }).computed;
      const isImported =
        parent?.type === 'ImportSpecifier' ||
        parent?.type === 'ImportDefaultSpecifier';
      // `export { x as y }` — `y` is the name this module PUBLISHES, so it
      // belongs to the importer exactly as an imported name belongs to the
      // library. In the shorthand `export { x }` the two are distinct nodes
      // over the SAME range, so without this the local edit and the exported
      // edit are both applied to that one range and the code is corrupted
      // into something that no longer parses — which the probe then reads as
      // a changed verdict, i.e. a false name-dependence finding.
      const isExportedName =
        parent?.type === 'ExportSpecifier' && parentKey === 'exported';
      if (!isMemberProperty && !isObjectKey && !isImported && !isExportedName) {
        if (!fresh.has(node.name)) fresh.set(node.name, `foo${fresh.size + 1}`);
        edits.push({
          range: node.range as [number, number],
          text: fresh.get(node.name) as string,
        });
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value)
          if (child && typeof child === 'object' && 'type' in child)
            walk(child as TSESTree.Node, key, node);
      } else if (value && typeof value === 'object' && 'type' in value) {
        walk(value as TSESTree.Node, key, node);
      }
    }
  };
  walk(ast, '', null);
  if (edits.length === 0) return null;

  edits.sort((a, b) => b.range[0] - a.range[0]);
  let out = code;
  let lastStart = Number.POSITIVE_INFINITY;
  for (const e of edits) {
    // Two nodes over one range would each rewrite it, and the second would
    // splice against offsets the first already moved.
    if (e.range[0] >= lastStart) continue;
    out = out.slice(0, e.range[0]) + e.text + out.slice(e.range[1]);
    lastStart = e.range[0];
  }
  return out === code ? null : out;
}

type Finding = {
  rule: string;
  description: string;
  before: string;
  after: string;
};
const nameDependent: Finding[] = [];
let probed = 0;
let structural = 0;

for (const entry of ledger.rules) {
  if (filter !== null && !entry.rule.includes(filter)) continue;
  const rule = await ruleFor(entry.rule);
  if (rule === null) continue;
  const name = entry.rule.split('/').slice(1).join('/');
  for (const c of entry.cases) {
    // Only a case that REPORTS can demonstrate a rule going silent, and only
    // one with no options, since an option may itself carry the vocabulary.
    if (c.kind !== 'TP' && c.kind !== 'FN') continue;
    if (c.code === '' || c.code.length > 400 || c.options !== undefined)
      continue;
    const base = reports(rule, name, c.code);
    if (base === null || base === 0) continue;
    const renamed = renameBindings(c.code);
    if (renamed === null) continue;
    probed += 1;
    const after = reports(rule, name, renamed);
    if (after === null) continue;
    if (after > 0) structural += 1;
    else
      nameDependent.push({
        rule: entry.rule,
        description: c.description,
        before: c.code,
        after: renamed,
      });
  }
}

const byRule = new Map<string, Finding[]>();
for (const f of nameDependent)
  byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);

console.log(`\n  ${probed} true positives renamed`);
console.log(`  ${structural} still report — the verdict came from structure`);
console.log(
  `  ${nameDependent.length} go silent across ${byRule.size} rules — the verdict came from a name\n`,
);
const ranked = [...byRule.entries()].sort((a, b) => b[1].length - a[1].length);

// The detailed head, with a worked example each.
const DETAIL = 25;
for (const [rule, list] of ranked.slice(0, DETAIL)) {
  console.log(`  ${String(list.length).padStart(3)}  ${rule}`);
  console.log(
    `       reports: ${JSON.stringify(list[0].before).slice(0, 110)}`,
  );
  console.log(`       silent : ${JSON.stringify(list[0].after).slice(0, 110)}`);
}

// ...and then the rest, compactly. This used to stop at 25 with no mention
// that it had, so the printed list looked like the whole population while a
// third of it was invisible — the same silent cap the case registry is careful
// not to have. A number you cannot enumerate is one you cannot work down.
if (ranked.length > DETAIL) {
  console.log(
    `\n  the remaining ${ranked.length - DETAIL} rule(s), count first:\n`,
  );
  for (const [rule, list] of ranked.slice(DETAIL)) {
    console.log(`  ${String(list.length).padStart(3)}  ${rule}`);
  }
}
fs.writeFileSync(
  path.join(ROOT, 'benchmarks', 'NAME_DEPENDENCE.json'),
  `${JSON.stringify({ probed, structural, nameDependent }, null, 2)}\n`,
);

/*
 * The committed half.
 *
 * The file above is the full finding set — every renamed binding, before and
 * after — and it is gitignored, because it is large and regenerable. But
 * `check:name-vocabulary` needs the CONCLUSION, and it cannot run this probe:
 * renaming every binding in the suite and re-running it takes minutes, which
 * is not a per-PR cost.
 *
 * So the conclusion is committed, small, and stamped. The stamp is the hash of
 * this script, and the gate refuses to report a number when it does not match.
 * That lesson is expensive: `real-world-rule-inventory.json` sat with the right
 * date and the wrong instrument for four days, and "270 rules never fire" was
 * read as a fact about the rules when seven plugins had simply never been run.
 * An artifact that cannot say what produced it will eventually be believed
 * about something it never measured.
 */
const stamp = createHash('sha256')
  .update(fs.readFileSync(fileURLToPath(import.meta.url)))
  .digest('hex')
  .slice(0, 16);

const rules = Object.fromEntries(
  [...byRule.entries()]
    .map(([rule, list]) => [rule, list.length] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);

fs.writeFileSync(
  path.join(ROOT, 'benchmarks', 'budgets', 'name-dependence.json'),
  `${JSON.stringify(
    {
      note:
        'Rules whose verdict changed when every local binding was renamed to foo1, foo2, … ' +
        'The rename litmus, mechanised: a rule listed here decided from a NAME. That is only a ' +
        'defect when the consumer cannot replace the vocabulary — see scripts/check-name-vocabulary.ts. ' +
        'Regenerate with `npx tsx scripts/name-dependence-probe.mts`.',
      generated: new Date().toISOString().slice(0, 10),
      probeStamp: stamp,
      probed,
      structural,
      nameDependent: nameDependent.length,
      rules,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `\n  wrote benchmarks/budgets/name-dependence.json (${Object.keys(rules).length} rules, stamp ${stamp})`,
);
