/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A triage verdict on a high-volume rule must say how much of it was looked at.
 *
 * The triage ledger in `.agent/corpus-findings-budget.json` is the record
 * people read INSTEAD of re-deriving an analysis. That is its value and its
 * hazard: an unsupported verdict there does not read as a guess, it reads as
 * settled. Twice in one week a verdict in it failed under the first sample
 * anyone took:
 *
 *   - `no-cycle` said "correct — real circular imports … the DETECTION is
 *     right". A stratified n=24 came back 66.7% type-only — imports TypeScript
 *     erases before emit, where the hazard the rule's own message claims
 *     cannot occur (#702, fixed in #705).
 *   - `no-extraneous-dependencies` sat at UNADJUDICATED while describing a bug
 *     that had already shipped fixed in 2.4.0 (#693).
 *
 * Neither was caught by a test, because neither is code.
 *
 * ## The bar, and why it is not "cite a sample for everything"
 *
 * A rule with a handful of findings gets a CENSUS: the note enumerates every
 * one, which is stronger evidence than any sample. Most of the ledger's
 * verdict-bearing entries are that shape and are exempt by construction.
 *
 * Above `CENSUS_CEILING` findings, enumeration stops being plausible and the
 * note has to state its own basis: an explicit `n=`, the word `stratified`, or
 * `sampled`. BENCHMARK-CRITERIA §A2 already sets the protocol — ≥20 findings,
 * stratified across repos, each labelled with a one-line reason. This gate does
 * not re-litigate that; it only refuses a verdict that is silent about it.
 *
 * A note that says UNADJUDICATED, or that only reports a number, is left alone.
 * Punishing a note for admitting its limits would select for false confidence,
 * which is the exact failure being gated.
 *
 * ## The debt marker lives on the note, not in a shared list
 *
 * This started as a `.agent/triage-sampling-debt.json` array of rule names.
 * That was a mistake, and a costly one: EVERY adjudication PR had to edit the
 * same lines to delete its own entry, so two in flight conflicted with each
 * other. It forced three manual conflict resolutions in a single afternoon
 * (#721, #723 twice), and the conflicts were in a file that is entirely
 * derived — the worst kind to merge by hand, because a wrong resolution is
 * invisible.
 *
 * Now a rule carries its own debt inline, as a `UNSAMPLED-DEBT.` prefix on its
 * triage note. Two PRs adjudicating different rules touch different lines, and
 * git merges them without help. Adjudicating a rule means rewriting its note
 * anyway, so the marker disappears as a side effect of the real work rather
 * than as a second bookkeeping step someone can forget.
 *
 *   npm run lint:triage-sampling
 *   npm run lint:triage-sampling -- --update
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const BUDGET = path.join(ROOT, '.agent', 'corpus-findings-budget.json');

/** At or below this many findings, a note can plausibly enumerate them all. */
export const CENSUS_CEILING = 10;

/** Prefix marking a verdict that is known to be unsupported and not yet redone. */
export const DEBT_MARKER = 'UNSAMPLED-DEBT.';

/** Does the note state the basis of its verdict? */
export const citesSample = (note: string): boolean =>
  /\bn\s*=\s*\d+|\bstratified\b|\bsampled?\b|\bcensus\b/i.test(note);

/** Is this note carrying the debt marker? */
export const carriesDebtMarker = (note: string): boolean => note.includes(DEBT_MARKER);

/**
 * Does the note actually assert something about correctness?
 *
 * A note that only reports a number, or that says outright it has not been
 * adjudicated, is honest about its own limits and is not what this gate is for.
 */
export const assertsVerdict = (note: string): boolean => {
  if (/\bUNADJUDICATED\b|\bnot (yet )?adjudicated\b|\bunmeasured\b/i.test(note)) return false;
  return /\bcorrect\b|\btrue positives?\b|\bnot (an? )?(FP|false positive)|\bDETECTION is right\b|\blegitimate\b|\breal\b/i.test(
    note,
  );
};

export const findingCount = (budget: unknown): number =>
  typeof budget === 'number' ? budget : ((budget as { max?: number })?.max ?? 0);

export interface Finding {
  rule: string;
  findings: number;
}

/** Verdicts above the ceiling that neither cite a sample nor admit the debt. */
export function unmarkedVerdicts(
  budgets: Record<string, unknown>,
  triage: Record<string, string>,
): Finding[] {
  const out: Finding[] = [];
  for (const [rule, note] of Object.entries(triage)) {
    const findings = findingCount(budgets[rule]);
    if (findings <= CENSUS_CEILING) continue;
    if (!assertsVerdict(note)) continue;
    if (citesSample(note)) continue;
    if (carriesDebtMarker(note)) continue;
    out.push({ rule, findings });
  }
  return out.sort((a, b) => b.findings - a.findings);
}

/** Notes still marked as debt although they now state a basis. */
export function staleMarkers(
  budgets: Record<string, unknown>,
  triage: Record<string, string>,
): Finding[] {
  const out: Finding[] = [];
  for (const [rule, note] of Object.entries(triage)) {
    if (!carriesDebtMarker(note)) continue;
    if (!citesSample(note)) continue;
    out.push({ rule, findings: findingCount(budgets[rule]) });
  }
  return out.sort((a, b) => b.findings - a.findings);
}

function main(): void {
  const update = process.argv.includes('--update');
  const raw = fs.readFileSync(BUDGET, 'utf8');
  const { budgets = {}, triage = {} } = JSON.parse(raw);

  const unmarked = unmarkedVerdicts(budgets, triage);
  const stale = staleMarkers(budgets, triage);

  if (update) {
    const lines = raw.split('\n');
    const rewrite = (rule: string, next: string) => {
      const idx = lines.findIndex((l) => l.includes(`"${rule}":`) && (l.match(/"/g) ?? []).length > 3);
      if (idx === -1) return;
      const comma = lines[idx].trimEnd().endsWith(',') ? ',' : '';
      lines[idx] = `    ${JSON.stringify(rule)}: ${JSON.stringify(next)}${comma}`;
    };
    for (const { rule } of unmarked) rewrite(rule, `${DEBT_MARKER} ${triage[rule]}`);
    for (const { rule } of stale)
      rewrite(rule, triage[rule].replace(`${DEBT_MARKER} `, '').replace(DEBT_MARKER, '').trim());
    const next = lines.join('\n');
    JSON.parse(next);
    fs.writeFileSync(BUDGET, next);
    console.log(`Marked ${unmarked.length}, cleared ${stale.length}.`);
    return;
  }

  const total = Object.values(triage).filter((n) => carriesDebtMarker(n as string)).length;
  console.log(`${Object.keys(triage).length} triage entries, ${total} carrying ${DEBT_MARKER}`);

  if (unmarked.length) {
    console.error(`\n✗ ${unmarked.length} verdict(s) with nothing behind them:\n`);
    for (const u of unmarked) console.error(`    ${u.rule} — ${u.findings} findings`);
    console.error(
      '\n  State the basis in the note: an explicit n=, "stratified", or a census.\n' +
        '  BENCHMARK-CRITERIA §A2 sets the protocol — >=20, stratified across repos,\n' +
        '  each labelled with a one-line reason. Saying "correct" is not a measurement:\n' +
        `  no-cycle carried "the DETECTION is right" until a sample read 66.7% wrong.\n\n` +
        `  If you are not redoing it now, prefix the note with ${DEBT_MARKER} so the\n` +
        '  claim reads as owed rather than settled.\n',
    );
  }
  if (stale.length) {
    console.error(`\n✗ ${stale.length} note(s) still marked ${DEBT_MARKER} but now cite a basis:\n`);
    for (const s of stale) console.error(`    ${s.rule}`);
    console.error('\n  Run: npm run lint:triage-sampling -- --update\n');
  }
  if (unmarked.length || stale.length) process.exit(1);
  console.log('✅ Every verdict above the census ceiling states its basis or admits the debt.');
}

if (require.main === module) main();
