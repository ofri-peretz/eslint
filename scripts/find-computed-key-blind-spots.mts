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

/*
 * A case's own options, or `null` when it declares none or they cannot be read.
 *
 * 1,077 of the ledger's 7,515 TP cases carry options, and probing them under
 * the DEFAULT configuration is not probing them: a case that only fires with
 * `{ trustedSources: [...] }` set reports nothing by default, so the probe
 * skipped it as "never fired" and it was excluded from the measurement
 * entirely. The gate's own blind spot, in the instrument built to find blind
 * spots.
 *
 * The text is a TypeScript expression from our own test files rather than
 * JSON — `[{ insecureLoadKeys: ['cleartext'] }]` — so it is evaluated. It
 * comes from the repository being measured, which is the same trust boundary
 * as importing the rules themselves. A case whose options do not evaluate is
 * dropped rather than silently probed under defaults: a wrong reading is
 * worse than a missing one.
 */
function optionsOf(text: string | undefined): unknown[] | null {
  if (text === undefined || text.trim() === '') return null;
  try {
    const value: unknown = new Function(`return (${text});`)();
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Every string literal reachable inside a case's options, at any depth. */
function literalsIn(value: unknown): string[] {
  if (typeof value === 'string') return value === '' ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(literalsIn);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(literalsIn);
  }
  return [];
}

function reports(
  rule: unknown,
  name: string,
  code: string,
  options: unknown[] | null,
): number | null {
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
        rules: {
          [`p/${name}`]: options === null ? 'error' : ['error', ...options],
        } as never,
      },
    ],
    'case.tsx',
  );
  if (messages.some((m) => m.ruleId === null)) return null; // parse error
  return messages.length;
}

/**
 * `obj.method(` -> `obj["method"](`, and `obj.prop` -> `obj["prop"]`.
 *
 * ## Why reads, and not only calls
 *
 * Calls alone reached 282 of the ledger's 470 rules. A further 67 decide from
 * a member READ and never appear in a call at all — `cookie.httpOnly`,
 * `el.innerHTML`, `event.origin`, `req.body`. Those are exactly the rules
 * whose subjects a minifier rewrites, and the probe was silent about every one
 * of them: not "they pass", but "they were never asked".
 *
 * ## Why this was left out at first, and what changed
 *
 * The original comment said rewriting reads "would change `a.b.c` into
 * something the parser reads differently". Only the LAST segment is rewritten,
 * so `a.b.c` becomes `a.b["c"]` — the same member expression, not a different
 * one. The real hazard is TYPE positions: `const n: TSESTree.Node` cannot be
 * written `TSESTree["Node"]`, and a fixture carrying one stops parsing. That
 * degrades safely, because a rewrite that fails to parse is discarded as
 * "not evidence" rather than counted as a blind spot.
 *
 * Two shapes are still excluded, because rewriting them changes meaning rather
 * than spelling: a segment followed by `(` is a call (handled above), and one
 * followed by another `.` is a receiver, whose own last segment gets the
 * rewrite instead.
 */
/**
 * A string or template literal, matched so it can be passed through UNTOUCHED.
 *
 * Without this the read rewrite reached inside literals and produced fictions:
 * `spawn('cmd.exe', …)` became `spawn('cmd["exe"]', …)`, and a JWT fixture's
 * `eyJ…J9.eyJ…` payload was rewritten mid-token. Both then "went silent", and
 * both would have been reported as rule blind spots. The rewrite has to know
 * what is code and what is data, or it manufactures exactly the defect it
 * exists to detect.
 *
 * REGEX literals are data too, and cost a second false report before they were
 * added: `res.redirect(/^https:\/\/a\.example\.com/)` became
 * `a["example"]` inside the pattern. They need the lookbehind because `/` is
 * also division — only a slash in operand position can open a regex, and a
 * conservative miss just means one site is not rewritten, which is the safe
 * direction for a probe that reports defects.
 */
const LITERAL =
  /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|(?<=[(,=:[!&|?{};]\s*)\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/;

/**
 * An object literal KEY: `{ k: v }` -> `{ ['k']: v }`.
 *
 * The same property under both spellings, and the second is what a minifier
 * emits. `check:spellings` counts 195 sites reading a bare object key — the
 * largest of its three classes — and none of them was reachable by this probe,
 * which rewrote member access only. "1 rule goes silent" described the 117
 * dotted-property sites and said nothing about the 195.
 *
 * Two shapes are deliberately excluded because the rewrite would change
 * meaning rather than spelling:
 *   - a key followed by `(` is a method shorthand, `{ k() {} }`, where
 *     `{ ['k']() {} }` is valid but the rewrite below would produce `['k']:`
 *   - shorthand `{ k }` is a BINDING, not a property, and has no equivalent
 *
 * Requires the key to be preceded by `{` or `,` so a ternary's `? a : b` and a
 * type annotation's `x: T` are not mistaken for object keys.
 */
const KEY_SITE = /([{,]\s*)([A-Za-z_$][\w$]*)\s*:(?!\s*:)/;

const CALL_SITE =
  /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\(/;
const READ_SITE =
  /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\b(?!\s*[(.])/;

function rewriteOutsideLiterals(
  code: string,
  site: RegExp,
  render: (receiver: string, name: string) => string,
): string {
  const combined = new RegExp(`${LITERAL.source}|${site.source}`, 'g');
  return code.replace(combined, (match, receiver?: string, name?: string) =>
    receiver === undefined || name === undefined
      ? match // a literal: data, not code
      : render(receiver, name),
  );
}

/**
 * Does this case deliberately CONTRAST the two spellings?
 *
 * `no-improper-type-validation` owns
 *
 *     if (bag["k"] !== null && typeof bag.k === "object") { go(); }
 *
 * and it fires precisely BECAUSE the two operands are spelled differently: the
 * rule cannot prove the subscripted guard covers the dotted use, so it refuses
 * to treat the value as null-checked. Normalising both to `bag["k"]` makes the
 * guard match, the rule correctly falls silent, and the probe reads that as a
 * blind spot — when what actually happened is that the rewrite destroyed the
 * only thing the case was testing.
 *
 * So: a case containing BOTH `x["k"]` and `x.k` for the same member is asking
 * a question about the difference, and this probe has no business erasing it.
 * Narrow on purpose — 3% of TP cases contain a static subscript somewhere, and
 * excluding all of them would throw away the cases that pin the subscripted
 * spelling as reportable, which are the whole point of the sweep.
 */
function contrastsSpellings(code: string): boolean {
  const subscripts = code.matchAll(
    /([A-Za-z_$][\w$]*)\s*\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/g,
  );
  for (const [, receiver, key] of subscripts) {
    if (new RegExp(`\\b${receiver}\\s*\\.\\s*${key}\\b`).test(code))
      return true;
  }
  return false;
}

function toComputed(code: string): string {
  const calls = rewriteOutsideLiterals(
    code,
    CALL_SITE,
    (r, m) => `${r}["${m}"](`,
  );
  const reads = rewriteOutsideLiterals(
    calls,
    READ_SITE,
    (r, p) => `${r}["${p}"]`,
  );
  return rewriteOutsideLiterals(
    reads,
    KEY_SITE,
    (prefix, k) => `${prefix}['${k}']:`,
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
    if (contrastsSpellings(c.code)) continue;

    // A case that declares options it cannot parse is not measurable either
    // way; skipping beats probing it under a configuration it never asked for.
    if (c.options !== undefined && c.options.trim() !== '') {
      if (optionsOf(c.options) === null) continue;
    }
    const options = optionsOf(c.options);
    /*
     * Skip cases whose OPTIONS match the rewrite rather than the code.
     *
     * The probe's premise is that both spellings are the same program. An
     * option that matches SOURCE TEXT breaks that premise: this rule's case
     * sets `ignorePatterns: ['[']`, and `app["post"](…)` introduces the very
     * `[` the pattern suppresses on. The rule is not blind there — the
     * configuration stopped describing the same program, and reporting it as
     * a blind spot would be measuring the rewrite instead of the rule.
     *
     * Generic rather than an exclusion list: any string in the options that
     * the rewrite introduces and the original does not have perturbed the
     * configuration, whatever rule or option it belongs to.
     */
    if (
      options !== null &&
      literalsIn(options).some(
        (lit) => rewritten.includes(lit) && !c.code.includes(lit),
      )
    ) {
      continue;
    }
    const before = reports(rule, name, c.code, options);
    if (before === null || before === 0) continue; // only cases that DID fire
    const after = reports(rule, name, rewritten, options);
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
if (only === null) {
  /*
   * SHRINK-ONLY against a recorded baseline, not "must be zero".
   *
   * Zero was the honest answer while the probe rewrote calls only. Extending
   * it to member reads raised the rules it can reach from 282 to 349 and found
   * 22 that go silent — they had never been asked, which is not the same as
   * passing. Failing outright on all 22 would make the gate un-mergeable and
   * the pressure would be to weaken the probe; recording them makes the debt
   * visible, stops a 23rd arriving unnoticed, and lets the list be driven down.
   *
   * A rule that LEAVES the list must be removed from the baseline in the same
   * change, or the file stops describing the code and starts excusing it.
   */
  const baseline = new Set(
    (
      JSON.parse(
        fs.readFileSync(
          path.join(ROOT, '.agent', 'computed-key-baseline.json'),
          'utf8',
        ),
      ) as { rules: string[] }
    ).rules,
  );
  const arrived = [...byRule.keys()].filter((r) => !baseline.has(r)).sort();
  const fixed = [...baseline].filter((r) => !byRule.has(r)).sort();

  if (arrived.length > 0) {
    console.log(
      `\n  ⛔ ${arrived.length} rule(s) newly go silent on a string subscript:`,
    );
    for (const r of arrived) console.log(`     ${r}`);
    console.log(
      '     Fix the rule. Do not add it to .agent/computed-key-baseline.json.',
    );
    process.exitCode = 1;
  }
  if (fixed.length > 0) {
    console.log(
      `\n  ⛔ ${fixed.length} baseline rule(s) no longer go silent — remove them:`,
    );
    for (const r of fixed) console.log(`     ${r}`);
    console.log(
      '     Edit .agent/computed-key-baseline.json so it keeps describing the code.',
    );
    process.exitCode = 1;
  }
  if (arrived.length === 0 && fixed.length === 0) {
    console.log(`  baseline ${baseline.size} — no regression\n`);
  }
}
