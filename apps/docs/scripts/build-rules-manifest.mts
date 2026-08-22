/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * build-rules-manifest.ts — one file describing every rule we ship.
 *
 * ## Why this exists
 *
 * `apps/docs/src/data/plugin-rules/` covers NINE plugins. There are thirty, and
 * 478 rules. Anything asking "what do we ship, and how good is it" had to read
 * the plugins themselves, and so nothing did.
 *
 * ## Where each field comes from, and why that matters
 *
 * The rule's own `meta` is the only authority for what a rule IS — description,
 * CWE, CVSS, type, fixability. Reading it from the built plugin rather than
 * from a doc file means the manifest cannot drift from the code: a rule that
 * changed its CWE and forgot its `.md` shows the CWE it actually reports.
 *
 * The QUALITY fields come from the two instruments that measure real source,
 * and they are deliberately nullable:
 *
 *   corpusFindings   how many times the rule fires across the 8 pinned
 *                    repositories. `null` means it has no budget entry, which
 *                    means zero — a rule absent from the budget is allowed
 *                    none.
 *   budgetReason     the recorded answer to "why is this allowed", from the
 *                    triage key. A number with no reason beside it is how a
 *                    budget quietly becomes an excuse.
 *   seal             axes met out of twelve, or `null` for the 400+ rules with
 *                    no record. `null` is the honest answer and must render as
 *                    "no record", never as zero-of-twelve, which would imply
 *                    someone looked.
 *
 * Every field is null-safe on purpose: a missing measurement must be visibly
 * missing rather than silently zero.
 *
 * ## It will not always agree with plugin-stats.json
 *
 * `apps/docs/scripts/sync-plugin-stats.ts` counts by TEXT-PARSING each
 * `src/index.ts` and doing alias arithmetic on the result. This reads the built
 * export map. They currently disagree by one rule on `import-next` — 56 here,
 * 55 there — and this one is the authority, because a rule that exists is a
 * rule the export map returns. Recorded rather than reconciled: the two are
 * measuring different things and the parser-based count is the one that should
 * eventually go.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeJsonIfChanged } from './lib/write-json-if-changed.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OUT = path.join(ROOT, 'apps/docs/src/data/rules-manifest.json');

type RuleMeta = {
  type?: string;
  deprecated?: boolean | object;
  fixable?: string;
  hasSuggestions?: boolean;
  docs?: { description?: string; cwe?: string; cvss?: number; confidence?: string; url?: string };
};

type Entry = {
  plugin: string;
  prefix: string;
  rule: string;
  id: string;
  description: string | null;
  cwe: string | null;
  cvss: number | null;
  confidence: string | null;
  type: string | null;
  fixable: boolean;
  hasSuggestions: boolean;
  deprecated: boolean;
  recommended: 'error' | 'warn' | null;
  docsUrl: string | null;
  corpusFindings: number | null;
  budgetReason: string | null;
  seal: { axesMet: number; axesTotal: number; status: string; knownGaps: number } | null;
  detection: Detection | null;
};

/**
 * What the rule's own fixture corpus measured.
 *
 * `tp` is what it CAUGHT, `fn` what it MISSED, `fp` what it wrongly reported,
 * and `tn` the safe fixtures it correctly stayed quiet on. All four are needed:
 * precision alone hides misses, recall alone hides noise, and a rule with no
 * safe fixtures at all can score a perfect 1.0 on both while being useless.
 * `fixtures` and `vulnerable` are carried so a score can be read against the
 * size of the sample that produced it — 1.0 over 19 fixtures is a different
 * claim from 1.0 over 3.
 *
 * `competitors` is the duel: the same fixtures scored against every other
 * plugin that ships a comparable rule. It is the only number here that is not
 * our opinion of our own output.
 */
type Detection = {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  fixtures: number | null;
  vulnerable: number | null;
  missed: string[];
  falsePositives: string[];
  competitors: { name: string; tp: number; fp: number; fn: number; f1: number | null }[];
};

/**
 * Absent is fine. Unreadable is not.
 *
 * These inputs are optional — a rule with no budget entry and no seal record is
 * the normal case — so a MISSING file returns null. A file that exists and
 * cannot be read or parsed throws, because the alternative is a manifest that
 * looks complete while every quality field silently reads null. That is the
 * exact shape of failure this manifest is meant to expose, and it would be
 * indistinguishable from "nobody has measured this yet".
 */
function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T;
  } catch (cause) {
    throw new Error(`${path.relative(ROOT, file)} exists but could not be read as JSON`, { cause });
  }
}

const budget = readJson<{ budgets: Record<string, number>; triage?: Record<string, string> }>(
  path.join(ROOT, '.agent/corpus-findings-budget.json'),
) ?? { budgets: {}, triage: {} };

/** Seal records, keyed by the rule id they name. */
const seals = new Map<string, Entry['seal']>();
const sealDir = path.join(ROOT, 'benchmarks/rule-corpus');
if (existsSync(sealDir)) {
  for (const dir of readdirSync(sealDir)) {
    const record = readJson<{
      rule?: string;
      status?: string;
      axes?: Record<string, { state?: string }>;
      knownGaps?: unknown[];
    }>(path.join(sealDir, dir, 'SEAL.json'));
    if (!record?.rule) continue;
    const axes = Object.values(record.axes ?? {});
    seals.set(record.rule, {
      axesMet: axes.filter((a) => a?.state === 'met').length,
      axesTotal: axes.length,
      status: record.status ?? 'open',
      knownGaps: (record.knownGaps ?? []).length,
    });
  }
}

/** Detection scores, keyed by rule id, from each rule corpus RESULTS.json. */
const detections = new Map<string, Detection>();
if (existsSync(sealDir)) {
  for (const dir of readdirSync(sealDir)) {
    const results = readJson<{
      rule?: string;
      fixtures?: number;
      vulnerable?: number;
      results?: {
        name?: string;
        tp?: number;
        fp?: number;
        fn?: number;
        tn?: number;
        precision?: number;
        recall?: number;
        f1?: number;
        missed?: unknown[];
        falsePositives?: unknown[];
      }[];
    }>(path.join(sealDir, dir, 'RESULTS.json'));
    if (!results?.rule || !Array.isArray(results.results) || results.results.length === 0) continue;

    // Ours is the entry naming this ecosystem; everything else in the array is
    // a competitor scored on the SAME fixtures. Matching on the `Interlace`
    // prefix rather than on position, because position is not a contract.
    const mine = results.results.find((r) => r.name?.startsWith('Interlace')) ?? results.results[0];
    const others = results.results.filter((r) => r !== mine);
    const asName = (x: unknown) => (typeof x === 'string' ? x : JSON.stringify(x));
    detections.set(results.rule, {
      tp: mine.tp ?? 0,
      fp: mine.fp ?? 0,
      fn: mine.fn ?? 0,
      tn: mine.tn ?? 0,
      precision: typeof mine.precision === 'number' ? mine.precision : null,
      recall: typeof mine.recall === 'number' ? mine.recall : null,
      f1: typeof mine.f1 === 'number' ? mine.f1 : null,
      fixtures: results.fixtures ?? null,
      vulnerable: results.vulnerable ?? null,
      missed: (mine.missed ?? []).map(asName),
      falsePositives: (mine.falsePositives ?? []).map(asName),
      competitors: others.map((c) => ({
        name: c.name ?? 'unknown',
        tp: c.tp ?? 0,
        fp: c.fp ?? 0,
        fn: c.fn ?? 0,
        f1: typeof c.f1 === 'number' ? c.f1 : null,
      })),
    });
  }
}

const entries: Entry[] = [];

for (const dirName of readdirSync(path.join(ROOT, 'packages'))) {
  if (!dirName.startsWith('eslint-plugin-')) continue;
  const dist = path.join(ROOT, 'packages', dirName, 'dist/src/index.js');
  if (!existsSync(dist)) {
    console.warn(`skip ${dirName}: no dist — run the build first`);
    continue;
  }
  const mod = (await import(pathToFileURL(dist).href)) as {
    rules?: Record<string, { meta?: RuleMeta }>;
    configs?: Record<string, { rules?: Record<string, string> } | Array<{ rules?: Record<string, string> }>>;
    default?: { rules?: Record<string, { meta?: RuleMeta }> };
  };
  const rules = mod.rules ?? mod.default?.rules ?? {};

  // The recommended preset is the only place that says a rule is ON by default,
  // and the prefix is DERIVED from it rather than guessed from the package
  // name — the same reasoning as scripts/corpus-scan.ts, where guessing broke
  // when a plugin renamed its prefix.
  // Every fragment, not just the first. Flat config presets are allowed to be
  // an ARRAY, and `rec[0]` silently drops whatever a later fragment enables —
  // a rule would show as not-recommended because of where it sits in the list.
  const rec = mod.configs?.recommended;
  const recRules: Record<string, string> = Array.isArray(rec)
    ? Object.assign({}, ...rec.map((fragment) => fragment?.rules ?? {}))
    : (rec?.rules ?? {});
  const firstKey = Object.keys(recRules)[0];
  const prefix = firstKey?.includes('/')
    ? firstKey.slice(0, firstKey.indexOf('/'))
    : dirName.replace('eslint-plugin-', '');

  // Categorised aliases (`error-handling/no-silent-errors`) duplicate the bare
  // name in the same export map. Keep the bare one so a rule appears once.
  for (const [name, rule] of Object.entries(rules)) {
    if (name.includes('/')) continue;
    const meta = rule?.meta ?? {};
    const id = `${prefix}/${name}`;
    const severity = recRules[id] ?? recRules[name];
    entries.push({
      plugin: dirName,
      prefix,
      rule: name,
      id,
      description: meta.docs?.description ?? null,
      cwe: meta.docs?.cwe ?? null,
      cvss: typeof meta.docs?.cvss === 'number' ? meta.docs.cvss : null,
      confidence: meta.docs?.confidence ?? null,
      type: meta.type ?? null,
      fixable: Boolean(meta.fixable),
      hasSuggestions: Boolean(meta.hasSuggestions),
      deprecated: Boolean(meta.deprecated),
      recommended: severity === 'error' || severity === 'warn' ? severity : null,
      docsUrl: meta.docs?.url ?? null,
      corpusFindings: budget.budgets[id] ?? null,
      budgetReason: budget.triage?.[id] ?? null,
      seal: seals.get(id) ?? null,
      detection: detections.get(id) ?? null,
    });
  }
}

entries.sort((a, b) => a.id.localeCompare(b.id));

const manifest = {
  generatedAt: new Date().toISOString(),
  totals: {
    plugins: new Set(entries.map((e) => e.plugin)).size,
    rules: entries.length,
    recommended: entries.filter((e) => e.recommended !== null).length,
    deprecated: entries.filter((e) => e.deprecated).length,
    withCwe: entries.filter((e) => e.cwe).length,
    withSealRecord: entries.filter((e) => e.seal).length,
    sealed: entries.filter((e) => e.seal?.status === 'sealed').length,
    firingOnCorpus: entries.filter((e) => (e.corpusFindings ?? 0) > 0).length,
    withDetection: entries.filter((e) => e.detection).length,
    perfectDetection: entries.filter(
      (e) => e.detection && e.detection.fp === 0 && e.detection.fn === 0 && e.detection.tp > 0,
    ).length,
    duelled: entries.filter((e) => (e.detection?.competitors.length ?? 0) > 0).length,
  },
  rules: entries,
};

// Routed through the shared helper: it skips the write when nothing but the
// timestamp moved, which is the only thing keeping `generatedAt` from
// rewriting this file on every run.
writeJsonIfChanged(OUT, manifest, 'rules-manifest.json');

console.log(
  `wrote ${entries.length} rules across ${manifest.totals.plugins} plugins → ${path.relative(ROOT, OUT)}`,
);
console.log(
  `  recommended ${manifest.totals.recommended} · with CWE ${manifest.totals.withCwe} · seal records ${manifest.totals.withSealRecord} · sealed ${manifest.totals.sealed}`,
);
