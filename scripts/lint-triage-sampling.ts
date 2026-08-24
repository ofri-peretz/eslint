/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A triage verdict on a high-volume rule must say how much of it was looked at.
 *
 * The triage ledger in `.agent/corpus-findings-budget.json` is the record people
 * read INSTEAD of re-deriving an analysis. That is its value and its hazard: an
 * unsupported verdict there does not read as a guess, it reads as settled.
 *
 * Twice now a verdict in it has failed under the first sample anyone took:
 *
 *   - `no-cycle` said "correct — real circular imports … the DETECTION is
 *     right". A stratified n=24 came back 66.7% type-only — imports TypeScript
 *     erases before emit, where the hazard the rule's own message claims cannot
 *     occur (#702, fixed in #705).
 *   - `no-extraneous-dependencies` sat at UNADJUDICATED while describing a bug
 *     that had already shipped fixed in 2.4.0 (#693).
 *
 * Neither was caught by a test, because neither is code.
 *
 * ## The bar, and why it is not "cite a sample for everything"
 *
 * A rule with a handful of findings gets a CENSUS: the note enumerates every
 * one, which is stronger evidence than any sample. 30 of the ledger's 46
 * verdict-bearing entries are that shape and are exempt by construction.
 *
 * Above `CENSUS_CEILING` findings, enumeration stops being plausible and the
 * note has to state its own basis: an explicit `n=`, the word `stratified`, or
 * `sampled`. BENCHMARK-CRITERIA §A2 already sets the protocol — ≥20 findings,
 * stratified across repos, each labelled with a one-line reason. This gate does
 * not re-litigate that; it only refuses a verdict that is silent about it.
 *
 * ## Ratchet
 *
 * `.agent/triage-sampling-debt.json` records what is unsupported today. A new
 * unsupported verdict fails, and so does a debt entry that has since been
 * supported — a ledger nobody prunes stops describing the repo, the same
 * bidirectional shape `lint:severity-consistency` uses.
 *
 *   npm run lint:triage-sampling
 *   npm run lint:triage-sampling -- --update
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const BUDGET = path.join(ROOT, '.agent', 'corpus-findings-budget.json');
const DEBT_FILE = path.join(ROOT, '.agent', 'triage-sampling-debt.json');

/** At or below this many findings, a note can plausibly enumerate them all. */
export const CENSUS_CEILING = 10;

/** Does the note state the basis of its verdict? */
export const citesSample = (note: string): boolean =>
  /\bn\s*=\s*\d+|\bstratified\b|\bsampled?\b|\bcensus\b/i.test(note);

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

export interface Unsupported {
  rule: string;
  findings: number;
}

export function unsupportedVerdicts(
  budgets: Record<string, unknown>,
  triage: Record<string, string>,
): Unsupported[] {
  const out: Unsupported[] = [];
  for (const [rule, note] of Object.entries(triage)) {
    const findings = findingCount(budgets[rule]);
    if (findings <= CENSUS_CEILING) continue;
    if (!assertsVerdict(note)) continue;
    if (citesSample(note)) continue;
    out.push({ rule, findings });
  }
  return out.sort((a, b) => b.findings - a.findings);
}

function main(): void {
  const update = process.argv.includes('--update');
  const { budgets = {}, triage = {} } = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  const current = unsupportedVerdicts(budgets, triage);
  const currentRules = current.map((u) => u.rule).sort();

  if (update) {
    fs.mkdirSync(path.dirname(DEBT_FILE), { recursive: true });
    fs.writeFileSync(DEBT_FILE, `${JSON.stringify(currentRules, null, 2)}\n`);
    console.log(`Recorded ${currentRules.length} unsupported verdict(s).`);
    return;
  }

  const debt: string[] = fs.existsSync(DEBT_FILE)
    ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8'))
    : [];
  const known = new Set(debt);
  const added = current.filter((u) => !known.has(u.rule));
  const fixed = debt.filter((r) => !currentRules.includes(r));

  console.log(
    `${Object.keys(triage).length} triage entries, ${current.length} asserting a verdict above ` +
      `${CENSUS_CEILING} findings without stating a sample.`,
  );

  if (added.length) {
    console.error(`\n✗ ${added.length} verdict(s) with nothing behind them:\n`);
    for (const u of added) console.error(`    ${u.rule} — ${u.findings} findings`);
    console.error(
      '\n  State the basis in the note: an explicit n=, "stratified", or a census.\n' +
        '  BENCHMARK-CRITERIA §A2 sets the protocol — >=20, stratified across repos,\n' +
        '  each labelled with a one-line reason. Saying "correct" is not a measurement:\n' +
        '  no-cycle carried "the DETECTION is right" until a sample read 66.7% wrong.\n',
    );
  }
  if (fixed.length) {
    console.error(`\n✗ ${fixed.length} debt entry/entries now state a basis — prune the ledger:\n`);
    for (const r of fixed) console.error(`    ${r}`);
    console.error('\n  Run: npm run lint:triage-sampling -- --update\n');
  }
  if (added.length || fixed.length) process.exit(1);
  console.log('✅ No unsupported triage verdicts.');
}

if (require.main === module) main();
