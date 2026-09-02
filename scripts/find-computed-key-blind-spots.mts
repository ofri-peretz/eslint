/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which rules stop firing when a member access is written `o['k']`?
 *
 * `check:spellings` counts SITES where a rule reads `node.property.name`
 * directly. That is a proxy: a site behind a `property.type === Identifier`
 * guard may be genuinely blind, or the guard may be unreachable for that rule.
 * Converting sites without knowing which is satisfying the proxy — done once on
 * `detect-non-literal-fs-filename`, where 14 rewrites changed nothing
 * observable and the real gate was elsewhere.
 *
 * This asks the question directly. For every TP case a rule already owns, it
 * rewrites `obj.method(` to `obj["method"](` and re-runs the rule. A rule that
 * reported the dotted form and goes silent on the subscript form has a
 * demonstrated blind spot, with the exact case that shows it.
 *
 * `o['k']` is not exotic: minifiers emit it, generated clients emit it, and
 * anyone indexing by a constant writes it by hand.
 *
 *   npx tsx scripts/find-computed-key-blind-spots.mts
 *   npx tsx scripts/find-computed-key-blind-spots.mts --rule secure-coding/detect-object-injection
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsparser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LEDGER = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');
const only =
  process.argv.find((a) => a.startsWith('--rule='))?.slice('--rule='.length) ??
  null;

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
  if (messages.some((m) => m.ruleId === null)) return null; // parse error
  return messages.length;
}

/**
 * `obj.method(` -> `obj["method"](`.
 *
 * Only CALLS, and only where the receiver is a plain identifier or member
 * chain. Rewriting every dotted read would change `a.b.c` into something the
 * parser reads differently and produce false blind spots rather than find real
 * ones.
 */
function toComputed(code: string): string {
  return code.replace(
    /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\(/g,
    (_m, receiver: string, method: string) => `${receiver}["${method}"](`,
  );
}

const blind: { rule: string; description: string; code: string }[] = [];
let probed = 0;

for (const entry of ledger.rules) {
  if (only !== null && entry.rule !== only) continue;
  const rule = await ruleFor(entry.rule);
  if (rule === null) continue;
  const name = entry.rule.split('/').slice(1).join('/');

  for (const c of entry.cases) {
    if (c.kind !== 'TP' || c.code.trim() === '') continue;
    const rewritten = toComputed(c.code);
    if (rewritten === c.code) continue;

    const before = reports(rule, name, c.code);
    if (before === null || before === 0) continue; // only cases that DID fire
    const after = reports(rule, name, rewritten);
    if (after === null) continue; // the rewrite broke parsing; not evidence
    probed += 1;
    if (after === 0) {
      blind.push({
        rule: entry.rule,
        description: c.description,
        code: rewritten.replace(/\s+/g, ' ').slice(0, 88),
      });
    }
  }
}

const byRule = new Map<string, { description: string; code: string }[]>();
for (const b of blind) {
  const list = byRule.get(b.rule) ?? [];
  list.push({ description: b.description, code: b.code });
  byRule.set(b.rule, list);
}

console.log(`\n  probed ${probed} firing TP case(s) in both spellings.`);
console.log(`  ${byRule.size} rule(s) go SILENT on a string subscript:\n`);
for (const [rule, cases] of [...byRule.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`  ${String(cases.length).padStart(3)}x  ${rule}`);
  console.log(`        ${cases[0].code}`);
}
if (byRule.size === 0)
  console.log('  (none — every firing TP case survives the rewrite)\n');

/*
 * A rule that reports `o.k` and stays silent on `o["k"]` is a DEFECT, not a
 * report line — the two spellings are the same program, and the subscripted
 * one is what bundlers and minifiers emit. The count reached zero on
 * 2026-09-02; failing here is what keeps it there, because none of the 150
 * fixes that got it to zero is pinned by anything else. A rule can regress
 * with every one of its own tests still green: the gate that would notice
 * lives in this file and nowhere else.
 *
 * `--rule=` is a developer's magnifying glass, not a measurement of the
 * workspace, so it never fails the build.
 */
if (byRule.size > 0 && only === null) process.exitCode = 1;
