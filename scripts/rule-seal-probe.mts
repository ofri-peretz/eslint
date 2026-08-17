/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The §B criteria that only appear when the rule RUNS.
 *
 * `scripts/rule-audit.ts` reads rule source and catches everything structural.
 * It cannot catch these, because they are properties of the rule's *behaviour*:
 *
 *   §B1  self-skips test files — by filename (`*.test.*`, `*.spec.*`) AND by
 *        path (`__tests__/`, `test/`), independent of the harness
 *   §B1  deduplicated — one defect, one finding. Two reports at the same
 *        (line, column, messageId) is a bug
 *   §B2  schema defaults agree with `defaultOptions` and with runtime. A rule
 *        whose `meta.schema` advertises `default: false` while it behaves as
 *        `true` lies to every consumer that reads the schema — IDE tooling and
 *        the docs generator both do. This shipped in `detect-non-literal-regexp`
 *        and nothing caught it
 *   §B3  never writes to stdout/stderr — a `console.log` in a rule corrupts the
 *        JSON and SARIF formatters. This reached npm once
 *   §B3  deterministic — same input, same findings, same order
 *
 * POSITIVE CONTROL FIRST. Every "quiet" verdict here is meaningless unless the
 * rule is first shown to REPORT on the same code — that is the rule at the top
 * of CLAUDE.md, and it is the reason this probe drives itself from the corpus
 * `vulnerable/` fixtures rather than from snippets written here: those files are
 * already, by definition, code this rule must report.
 *
 *   npx tsx scripts/rule-seal-probe.mts secure-coding/detect-object-injection
 *   npx tsx scripts/rule-seal-probe.mts --all        # every rule with a corpus
 */
import { Linter } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'benchmarks/rule-corpus');

type Probe = { ok: boolean; detail: string };
type Report = { rule: string; probes: Record<string, Probe> };

const corpusDir = (ruleId: string) => path.join(CORPUS, ruleId.replace('/', '__'));

const loadRule = async (ruleId: string) => {
  const [prefix, rule] = ruleId.split('/');
  const dir = path.join(ROOT, 'packages', `eslint-plugin-${prefix}`, 'src/rules', rule, 'index.ts');
  const mod = await import(dir);
  const found = Object.values(mod).find((v: unknown) => typeof (v as { create?: unknown })?.create === 'function');
  if (!found) throw new Error(`No rule export found in ${dir}`);
  return found as { create: unknown; meta?: Record<string, unknown>; defaultOptions?: unknown[] };
};

/**
 * Two traps, both of which produced a wrong verdict from this file before they
 * were fixed:
 *
 * 1. `files: ['**\/*']` does NOT make a flat config apply. ESLint answers with
 *    `No matching configuration found for <file>` — a message with `ruleId:
 *    null`, severity 1. A probe counting `messages.length` reads that as ONE
 *    FINDING, so every rule looked like it reported on every test file and the
 *    whole §B1 column came back FAIL. Extensions must be listed explicitly.
 * 2. Anything with a null `ruleId` is ESLint talking about the run, never the
 *    rule. Filtered below rather than trusted.
 */
const lint = (rule: unknown, name: string, code: string, filename: string) => {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    [
      {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
        languageOptions: {
          parser: tsParser as never,
          ecmaVersion: 2022 as const,
          sourceType: 'module' as const,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { probe: { rules: { [name]: rule } } },
        rules: { [`probe/${name}`]: 'error' },
      },
    ] as never,
    filename,
  ).filter((m) => m.ruleId);
};

/**
 * The fixture that produces the most findings, so dedup and skip probes run on
 * the richest available signal rather than on whichever file sorts first.
 */
const pickControl = (rule: unknown, name: string, dir: string) => {
  const vuln = path.join(dir, 'vulnerable');
  if (!fs.existsSync(vuln)) return null;
  let best: { file: string; code: string; count: number } | null = null;
  for (const f of fs.readdirSync(vuln)) {
    const code = fs.readFileSync(path.join(vuln, f), 'utf8');
    const count = lint(rule, name, code, path.join('src', `case${path.extname(f)}`)).length;
    if (!best || count > best.count) best = { file: f, code, count };
  }
  return best;
};

/**
 * §B2. `meta.schema` is what a consumer READS; `defaultOptions` and `create()`
 * are what the rule DOES. Nothing in the toolchain makes them agree, so compare
 * them directly, per top-level property.
 */
const schemaDefaultDrift = (rule: { meta?: Record<string, unknown>; defaultOptions?: unknown[] }) => {
  const schema = (rule.meta as { schema?: unknown })?.schema;
  const first = Array.isArray(schema) ? schema[0] : (schema as { properties?: unknown });
  const props = (first as { properties?: Record<string, { default?: unknown }> })?.properties;
  const defaults = (rule.defaultOptions?.[0] ?? {}) as Record<string, unknown>;
  if (!props) return [];
  const drift: string[] = [];
  for (const [key, spec] of Object.entries(props)) {
    if (!('default' in spec)) continue;
    if (!(key in defaults)) continue;
    if (JSON.stringify(spec.default) !== JSON.stringify(defaults[key])) {
      drift.push(`${key}: schema says ${JSON.stringify(spec.default)}, defaultOptions says ${JSON.stringify(defaults[key])}`);
    }
  }
  return drift;
};

const probe = async (ruleId: string): Promise<Report> => {
  const name = ruleId.split('/')[1];
  const rule = await loadRule(ruleId);
  const dir = corpusDir(ruleId);
  const probes: Record<string, Probe> = {};

  const control = fs.existsSync(dir) ? pickControl(rule, name, dir) : null;
  probes['§B positive control'] = control?.count
    ? { ok: true, detail: `${control.file} reports ${control.count}` }
    : { ok: false, detail: control ? `no vulnerable fixture reports — every probe below is void` : 'no corpus' };

  if (!control?.count) return { rule: ruleId, probes };

  // §B1 — self-skip, by filename and by path. Note this is a REQUIREMENT, not a
  // nicety: a consumer's own config may lint test files, and a security rule
  // firing on `expect(...)` assertions is pure noise it can never act on.
  for (const [label, file] of [
    ['§B1 skips *.test.ts', 'src/case.test.ts'],
    ['§B1 skips *.spec.ts', 'src/case.spec.ts'],
    ['§B1 skips __tests__/', 'src/__tests__/case.ts'],
  ] as const) {
    const n = lint(rule, name, control.code, file).length;
    probes[label] = { ok: n === 0, detail: n === 0 ? 'skipped' : `reported ${n}` };
  }

  // §B1 — one defect, one finding.
  const found = lint(rule, name, control.code, 'src/case.ts');
  const keys = found.map((m) => `${m.line}:${m.column}:${m.messageId}`);
  const dupes = keys.length - new Set(keys).size;
  probes['§B1 deduplicated'] = { ok: dupes === 0, detail: dupes === 0 ? 'no duplicates' : `${dupes} duplicate report(s)` };

  // §B3 — determinism.
  const again = lint(rule, name, control.code, 'src/case.ts');
  probes['§B3 deterministic'] = {
    ok: JSON.stringify(found) === JSON.stringify(again),
    detail: JSON.stringify(found) === JSON.stringify(again) ? 'stable across runs' : 'DIVERGED between two runs',
  };

  // §B3 — silence on stdout/stderr, checked by capturing during a real lint.
  const writes: string[] = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((c: string) => (writes.push(String(c)), true)) as never;
  process.stderr.write = ((c: string) => (writes.push(String(c)), true)) as never;
  try {
    lint(rule, name, control.code, 'src/case.ts');
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  probes['§B3 no stdout/stderr'] = { ok: writes.length === 0, detail: writes.length === 0 ? 'silent' : `wrote ${writes.length} chunk(s)` };

  // §B2 — schema vs defaultOptions.
  const drift = schemaDefaultDrift(rule);
  probes['§B2 schema defaults'] = { ok: drift.length === 0, detail: drift.length === 0 ? 'agree' : drift.join('; ') };

  // §C3 — the feedback-quality metrics that are COUNTABLE. Actionability,
  // localisation and FP-recognition need a model in the loop and are not
  // attempted here; token budget and the §C4 defects are arithmetic, and
  // arithmetic that nobody had run.
  //
  // Messages are collected across every vulnerable fixture, so this is the
  // rule's real output and not one hand-picked string.
  const messages = fs
    .readdirSync(path.join(dir, 'vulnerable'))
    .flatMap((f) =>
      lint(rule, name, fs.readFileSync(path.join(dir, 'vulnerable', f), 'utf8'), path.join('src', `case${path.extname(f)}`)).map(
        (m) => m.message,
      ),
    );

  if (messages.length) {
    // ~4 chars per token. An approximation, and labelled as one — the §C3
    // budget is 120, and these come in far enough under or over that a real
    // tokenizer would not change the verdict.
    const tokens = messages.map((m) => Math.ceil(m.length / 4));
    const worst = Math.max(...tokens);
    const mean = Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length);
    probes['§C3 tokens/finding'] = { ok: worst <= 120, detail: `mean ${mean}, worst ${worst} (budget 120, ~4 chars/token)` };

    // §C4: "Severity is uncalibrated. CVSS:9.8 on a missing-auth finding, and on
    // object injection, and on command injection. If everything is 9.8 the field
    // carries no information." Reported per rule so the ecosystem-wide question
    // can be answered by running --all.
    const cvss = [...new Set(messages.flatMap((m) => m.match(/CVSS:([\d.]+)/g) ?? []))];
    probes['§C4 CVSS value(s)'] = { ok: true, detail: cvss.join(', ') || 'none in message' };

    // §C2.4: "a sentence naming the safe pattern lets an agent close a finding
    // instead of 'fixing' correct code. Nothing in either plugin does this
    // today. Biggest available win." Still true until a rule says otherwise.
    const saysWhatIsSafe = messages.every((m) => /Not a finding( if|:)|Safe if|Legitimate (if|when)/i.test(m));
    probes['§C2.4 FP guidance'] = {
      ok: saysWhatIsSafe,
      detail: saysWhatIsSafe ? 'names the safe pattern' : 'no message says what a false positive looks like',
    };
  }

  return { rule: ruleId, probes };
};

const args = process.argv.slice(2);
const targets = args.includes('--all')
  ? fs
      .readdirSync(CORPUS)
      .filter((d) => d.includes('__'))
      .map((d) => d.replace('__', '/'))
  : args.filter((a) => !a.startsWith('--'));

if (!targets.length) {
  console.error('usage: rule-seal-probe.mts <plugin>/<rule> [...] | --all');
  process.exit(1);
}

let failures = 0;
for (const t of targets) {
  let r: Report;
  try {
    r = await probe(t);
  } catch (e) {
    console.log(`\n${t}\n  ERROR  ${(e as Error).message}`);
    failures++;
    continue;
  }
  const bad = Object.values(r.probes).filter((p) => !p.ok).length;
  failures += bad;
  console.log(`\n${r.rule}${bad ? `  — ${bad} FAILING` : '  — sealed on §B behavioural probes'}`);
  for (const [label, p] of Object.entries(r.probes)) {
    console.log(`  ${p.ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(24)} ${p.detail}`);
  }
}

console.log(`\n${failures} failing probe(s) across ${targets.length} rule(s).`);
process.exit(failures ? 1 : 0);
