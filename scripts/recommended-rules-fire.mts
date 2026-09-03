/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Does every rule in a `recommended` preset actually fire under that preset?
 *
 * ## The distinction this exists to make
 *
 * A rule's own test suite enables the rule directly, at `error`, with whatever
 * options the case supplies. A consumer installs a PRESET. Between those two
 * facts sit every way a rule can pass its tests and do nothing in the field:
 * omitted from the preset it claims to be in, enabled at a severity that is
 * filtered out, or carrying preset options its own cases never used.
 *
 * `docs/intents/default-on-rules-fire` opened on the measured version of this:
 * 327 rules enabled by default, 49 with any corpus finding, 278 never examined
 * at all. Of eight examined closely, five carried real defects — two reporting
 * false on every finding they produced.
 *
 * ## What it does
 *
 * For each rule in each plugin's `recommended` config, take a TP case the rule
 * already owns — a snippet its own suite says must report — and run it through
 * the preset rather than through the rule. A rule whose own true positive does
 * not report under its own preset is not enabled in any useful sense.
 *
 * ## THE NUMBER THIS PRINTS IS NOT YET A FINDING
 *
 * It reports 96 rules SILENT under their own preset. Most of that is the probe,
 * not the rules, and the reason is worth the space:
 *
 * Many rules are EVIDENCE-GATED — they refuse to fire in a file that does not
 * import the framework they are about, because a bare `app.use(cors(…))` in a
 * file with no Express is somebody else's `app`. The test suites supply that
 * evidence through a harness (`sdk()`, `lambda()`, `xp()`), which wraps each
 * case before the RuleTester sees it. The ledger records the FRAGMENT, not the
 * wrapped file. Measured directly:
 *
 *     app.use(cors({ origin: '*', credentials: true }));                 -> 0
 *     import express from 'express'; … the same line                     -> 1
 *
 * So this probe feeds rules a file their own harness would never have produced,
 * and a correct abstention reads as a defect. Fixing it means the ledger
 * recording the harness each case runs under — which is a change to
 * `rule-case-ledger.ts`, not to this script.
 *
 * Until then: use the per-rule output as a LEAD, verify by hand, and do not
 * quote the total. It is exactly the kind of number this repository has spent
 * a quarter learning not to publish.
 *
 * ## What it cannot tell you
 *
 * That the rule is CORRECT. A positive control proves the rule is reachable and
 * wired; it says nothing about precision, and nothing about the 278 rules whose
 * behaviour on real code remains unmeasured. It is the floor, not the ceiling:
 * a rule that cannot fire under its own preset needs no further examination to
 * be known broken.
 *
 *   npx tsx scripts/recommended-rules-fire.mts
 *   npx tsx scripts/recommended-rules-fire.mts --plugin=node-security
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
  process.argv
    .find((a) => a.startsWith('--plugin='))
    ?.slice('--plugin='.length) ?? null;

type Case = { kind: string; code: string; options?: string };
type Ledger = { rules: { rule: string; cases: Case[] }[] };

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as Ledger;
const casesByRule = new Map(ledger.rules.map((r) => [r.rule, r.cases]));
const linter = new Linter();

/** Two plugins publish under a prefix that differs from their directory. */
const PUBLISHED_PREFIX: Record<string, string> = {
  'jwt-security': 'jwt',
  'postgresql-security': 'pg',
};

type Verdict = 'fires' | 'SILENT' | 'no case' | 'unparseable';

const results: { rule: string; verdict: Verdict; sample?: string }[] = [];

for (const dir of fs.readdirSync(path.join(ROOT, 'packages')).sort()) {
  if (!dir.startsWith('eslint-plugin-')) continue;
  const name = dir.replace('eslint-plugin-', '');
  if (only !== null && name !== only) continue;

  const entry = path.join(ROOT, 'packages', dir, 'src', 'index.ts');
  if (!fs.existsSync(entry)) continue;

  const mod = (await import(entry)) as {
    default?: {
      configs?: Record<string, unknown>;
      rules?: Record<string, unknown>;
    };
    configs?: Record<string, unknown>;
    rules?: Record<string, unknown>;
  };
  const plugin = mod.default ?? mod;
  /*
   * `configs` is a NAMED export in most of these plugins and a property of the
   * default object in a few. Reading only the default found 7 rules across the
   * whole workspace where the intent counts 327 — a probe that quietly measured
   * four plugins and reported as though it had measured twenty-six.
   */
  const configs = mod.configs ?? plugin.configs;
  const recommended = configs?.['recommended'] as
    | { rules?: Record<string, unknown> }
    | { rules?: Record<string, unknown> }[]
    | undefined;
  if (recommended === undefined) continue;

  const presetRules =
    (Array.isArray(recommended)
      ? recommended.at(-1)?.rules
      : recommended.rules) ?? {};
  const prefix = PUBLISHED_PREFIX[name] ?? name;

  for (const [qualified, severity] of Object.entries(presetRules)) {
    const short = qualified.startsWith(`${prefix}/`)
      ? qualified.slice(prefix.length + 1)
      : qualified;
    const rule = (mod.rules ?? plugin.rules)?.[short];
    if (rule === undefined) {
      results.push({
        rule: qualified,
        verdict: 'SILENT',
        sample: 'not exported by the plugin',
      });
      continue;
    }

    const cases = (casesByRule.get(`${prefix}/${short}`) ?? []).filter(
      (c) => c.kind === 'TP' && c.code.trim() !== '',
    );
    if (cases.length === 0) {
      results.push({ rule: qualified, verdict: 'no case' });
      continue;
    }

    /*
     * The PRESET's severity and options, not the case's. That is the whole
     * question: a case proves the rule can report when asked directly; this
     * asks whether the configuration a consumer installs asks it.
     */
    let fired = false;
    let parsed = false;
    for (const c of cases.slice(0, 12)) {
      const messages = linter.verify(
        c.code,
        [
          {
            files: ['**/*.{ts,tsx}'],
            plugins: { [prefix]: { rules: { [short]: rule } } as never },
            languageOptions: {
              parser: tsparser as never,
              parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
              },
            },
            rules: { [qualified]: severity as never },
          },
        ],
        'case.tsx',
      );
      if (messages.some((m) => m.ruleId === null)) continue; // parse error
      parsed = true;
      if (messages.length > 0) {
        fired = true;
        break;
      }
    }
    results.push({
      rule: qualified,
      verdict: !parsed ? 'unparseable' : fired ? 'fires' : 'SILENT',
      sample: fired
        ? undefined
        : cases[0]?.code.replace(/\s+/g, ' ').slice(0, 84),
    });
  }
}

const fires = results.filter((r) => r.verdict === 'fires');
const silent = results.filter((r) => r.verdict === 'SILENT');
const noCase = results.filter((r) => r.verdict === 'no case');
const unparseable = results.filter((r) => r.verdict === 'unparseable');

console.log(
  `\n  ${results.length} rule(s) enabled in a \`recommended\` preset\n`,
);
console.log(
  `    fires under its own preset      ${String(fires.length).padStart(4)}`,
);
console.log(
  `    SILENT under its own preset     ${String(silent.length).padStart(4)}`,
);
console.log(
  `    no TP case to try               ${String(noCase.length).padStart(4)}`,
);
console.log(
  `    case did not parse              ${String(unparseable.length).padStart(4)}`,
);

if (silent.length > 0) {
  console.log(
    `\n  ${silent.length} rule(s) did not fire under their own preset — LEADS, NOT FINDINGS.` +
      '\n  Most are evidence-gated rules starved of the import their test harness supplies.' +
      '\n  See the header. Verify by hand before believing any of these.\n',
  );
  for (const r of silent.slice(0, 40)) {
    console.log(`     ${r.rule}`);
    if (r.sample !== undefined) console.log(`         ${r.sample}`);
  }
  if (silent.length > 40) console.log(`     … and ${silent.length - 40} more`);
}

if (noCase.length > 0) {
  console.log(
    `\n  ${noCase.length} rule(s) ship enabled with no true-positive case at all:\n`,
  );
  for (const r of noCase.slice(0, 20)) console.log(`     ${r.rule}`);
  if (noCase.length > 20) console.log(`     … and ${noCase.length - 20} more`);
}
