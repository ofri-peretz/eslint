/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lift every FP, FN and GAP case into the case registry.
 *
 * Those three kinds already carry everything a registry entry needs: a
 * description of the claim, `@source` provenance, an `@found` method, the code,
 * and the rule that owns them. They are the cases we learned something from, so
 * they are the ones worth being accountable for by name rather than by count.
 *
 * Import is ADDITIVE and idempotent. An entry already in the registry is left
 * exactly as it is — hand-written rationale, CWE, severity, references and
 * peers all survive re-runs, because the whole point of the register is that
 * human judgement accumulates in it and is never overwritten by a regenerated
 * default. Matching is on (rule, code), which is what the case IS; the id is
 * assigned once and never moves.
 *
 *   npx tsx scripts/case-registry-import.mts [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LEDGER = path.join(ROOT, 'benchmarks', 'RULE_CASES.json');
const REGISTRY = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');
const DRY = process.argv.includes('--dry');

type LedgerCase = {
  id: string;
  kind: string;
  code: string;
  description: string;
  file: string;
  options?: string;
  filename?: string;
  source?: string;
  found?: string;
};
type Ledger = { rules: { rule: string; cases: LedgerCase[] }[] };
type Registry = { note: string; cases: Record<string, unknown>[] };

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as Ledger;
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) as Registry;

/** What the case IS, independent of the number we gave it. */
const identity = (rule: string, code: string): string =>
  `${rule} ${code.trim()}`;
const present = new Set(
  registry.cases.map((c) =>
    identity(
      (c['coverage'] as { rule: string }[] | undefined)?.[0]?.rule ?? '',
      String(c['code']),
    ),
  ),
);

const nextId = ((): (() => string) => {
  let n = registry.cases.reduce((max, c) => {
    const m = /^ILB-(\d+)$/.exec(String(c['id']));
    return m === null ? max : Math.max(max, Number(m[1]));
  }, 0);
  return () => {
    n += 1;
    return `ILB-${String(n).padStart(4, '0')}`;
  };
})();

/** Options are captured as SOURCE TEXT, which is only re-runnable when it is JSON. */
function parseOptions(text: string | undefined): unknown[] | null {
  if (text === undefined || text.trim() === '') return null;
  try {
    const value: unknown = JSON.parse(
      text
        .replace(/(['"])?([A-Za-z_$][\w$]*)\1?\s*:/g, '"$2":')
        .replace(/'/g, '"'),
    );
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const ADDED = process.env['CASE_REGISTRY_DATE'] ?? '2026-08-26';

let added = 0;
let skipped = 0;
for (const entry of ledger.rules) {
  for (const c of entry.cases) {
    if (c.kind !== 'FP' && c.kind !== 'FN' && c.kind !== 'GAP') continue;
    if (c.code.trim() === '' || c.description.trim() === '') continue;
    if (present.has(identity(entry.rule, c.code))) {
      skipped += 1;
      continue;
    }
    const where = c.source === undefined ? '' : ` in real code (${c.source})`;
    // FP  -> looks like the rule and is not: a decoy, and it must stay silent.
    // FN  -> a defect the rule missed and now catches.
    // GAP -> a defect the rule STILL misses. Registered with NO coverage, so it
    //        reads as a hole rather than as an achievement.
    const rationale =
      c.kind === 'FP'
        ? `Looks like a ${entry.rule} finding and is not. We reported it${where} and have since sealed it.`
        : c.kind === 'FN'
          ? `A defect this rule missed${where} and now catches. Imported from the sealed case that proved it.`
          : 'A defect this rule still misses. Registered with no coverage so the hole is visible rather than implied.';
    registry.cases.push({
      id: nextId(),
      added: ADDED,
      title: c.description,
      rationale,
      cwe: null,
      severity: { cvss: null, vector: null, source: null },
      references: [],
      occurrences:
        c.source === undefined
          ? []
          : [
              {
                repo: c.source.split(' ')[0],
                path: c.source.split(' ').slice(1).join(' ') || undefined,
              },
            ],
      code: c.code,
      kind: c.kind === 'FP' ? 'decoy' : 'defect',
      coverage:
        c.kind === 'GAP'
          ? []
          : [
              {
                rule: entry.rule,
                expect: c.kind === 'FP' ? 'silent' : 'report',
                evidence: c.file,
                // The options are part of what the case proves, so they travel
                // with the claim. Parsed from source text, and left off when it
                // is not plain JSON — a computed option is a claim this
                // register cannot re-run, and saying nothing beats guessing.
                ...(parseOptions(c.options) === null
                  ? {}
                  : { options: parseOptions(c.options) }),
                ...(c.filename === undefined ? {} : { filename: c.filename }),
              },
            ],
      importedFrom: c.id,
      foundBy: c.found ?? null,
    });
    added += 1;
  }
}

console.log(`\n  ${added} case(s) imported, ${skipped} already present`);
if (!DRY) {
  fs.writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`  registry now holds ${registry.cases.length} cases\n`);
}
