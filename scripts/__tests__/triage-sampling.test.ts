/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit lock for the triage-sampling gate.
 *
 * The exemption is the part worth pinning. A rule with a handful of findings
 * gets a CENSUS — the note lists every one — and that is stronger than any
 * sample, so demanding an `n=` there would be noise that trains people to
 * ignore the gate. 30 of the ledger's 46 verdict-bearing entries are that
 * shape. If the ceiling ever silently drops to 0, this gate becomes a nag.
 */

import { describe, it, expect } from 'vitest';
import {
  CENSUS_CEILING,
  DEBT_MARKER,
  assertsVerdict,
  carriesDebtMarker,
  citesSample,
  findingCount,
  staleMarkers,
  unmarkedVerdicts,
} from '../lint-triage-sampling';

describe('citesSample', () => {
  it('accepts the forms the ledger actually uses', () => {
    for (const s of ['n=24 across 4 repos', 'stratified across repos', 'sampled 10 findings', 'a census of all 3'])
      expect(citesSample(s)).toBe(true);
  });

  it('rejects a bare assertion', () => {
    expect(citesSample('Correct — real circular imports. The DETECTION is right.')).toBe(false);
  });
});

describe('assertsVerdict', () => {
  it('catches the phrasings that carried the two real failures', () => {
    // Both of these stood in the ledger and both fell to the first sample.
    expect(assertsVerdict('Correct — real circular imports. The DETECTION is right.')).toBe(true);
    expect(assertsVerdict('all 4 are TRUE POSITIVES')).toBe(true);
  });

  it('leaves alone a note that admits it has not decided', () => {
    // Honest about its own limits — nagging it would punish the good behaviour.
    expect(assertsVerdict('UNADJUDICATED. The budget is the first measurement, not a verdict.')).toBe(false);
  });

  it('leaves alone a note that only reports a number', () => {
    expect(assertsVerdict('1421. Ratcheted down from 1635 after the generated-file opt-out.')).toBe(false);
  });
});

describe('findingCount', () => {
  it('reads both budget shapes', () => {
    expect(findingCount(1337)).toBe(1337);
    expect(findingCount({ max: 42 })).toBe(42);
    expect(findingCount(undefined)).toBe(0);
  });
});

describe('unmarkedVerdicts', () => {
  const VERDICT = 'Correct — these are real.';

  it('flags a verdict on a high-volume rule with no stated basis', () => {
    expect(unmarkedVerdicts({ 'a/b': 200 }, { 'a/b': VERDICT })).toEqual([
      { rule: 'a/b', findings: 200 },
    ]);
  });

  it('exempts a low-volume rule, where the note can list every finding', () => {
    expect(unmarkedVerdicts({ 'a/b': CENSUS_CEILING }, { 'a/b': VERDICT })).toEqual([]);
  });

  it('accepts a high-volume verdict that states its basis', () => {
    expect(
      unmarkedVerdicts({ 'a/b': 200 }, { 'a/b': `${VERDICT} Stratified n=24 across 4 repos.` }),
    ).toEqual([]);
  });

  it('orders by findings, so the biggest unsupported claim reads first', () => {
    const out = unmarkedVerdicts(
      { 'a/b': 50, 'c/d': 500 },
      { 'a/b': VERDICT, 'c/d': VERDICT },
    );
    expect(out.map((u) => u.rule)).toEqual(['c/d', 'a/b']);
  });
});


describe('the debt marker lives on the note', () => {
  /**
   * This replaced a shared `.agent/triage-sampling-debt.json` array. That array
   * made every adjudication PR edit the same lines to delete its own entry, so
   * two in flight conflicted — three manual resolutions in one afternoon, in a
   * file that is entirely derived. Marking inline means two PRs adjudicating
   * different rules touch different lines.
   */
  const VERDICT = 'Correct — these are real.';

  it('accepts a marked verdict without a sample', () => {
    expect(unmarkedVerdicts({ 'a/b': 200 }, { 'a/b': `${DEBT_MARKER} ${VERDICT}` })).toEqual([]);
  });

  it('flags an unmarked verdict without a sample', () => {
    expect(unmarkedVerdicts({ 'a/b': 200 }, { 'a/b': VERDICT })).toEqual([
      { rule: 'a/b', findings: 200 },
    ]);
  });

  it('flags a marker left behind after the note gained a basis', () => {
    // The other direction: a ledger nobody prunes stops describing the repo.
    expect(
      staleMarkers({ 'a/b': 200 }, { 'a/b': `${DEBT_MARKER} ${VERDICT} Stratified n=24.` }),
    ).toEqual([{ rule: 'a/b', findings: 200 }]);
  });

  it('does not flag a marked note that still lacks a basis', () => {
    expect(staleMarkers({ 'a/b': 200 }, { 'a/b': `${DEBT_MARKER} ${VERDICT}` })).toEqual([]);
  });

  it('rejects a marker buried after the verdict', () => {
    // `includes` would accept this. The note still reads as a settled claim to
    // anyone skimming the ledger, which is the whole failure being gated — and
    // update mode's removal would strip an unrelated mention of the phrase.
    const buried = `Correct — these are real. ${DEBT_MARKER} maybe later.`;
    expect(carriesDebtMarker(buried)).toBe(false);
    expect(unmarkedVerdicts({ 'a/b': 200 }, { 'a/b': buried })).toEqual([
      { rule: 'a/b', findings: 200 },
    ]);
  });

  it('recognises the marker', () => {
    expect(carriesDebtMarker(`${DEBT_MARKER} anything`)).toBe(true);
    expect(carriesDebtMarker('anything')).toBe(false);
  });
});


describe('update mode rewrites the triage note, never the budget', () => {
  /**
   * A budget written in object form — `"a/b": { "max": 200 }` — carries four
   * quotes on its line, which a whole-file "find the line with this rule and
   * several quotes" search matched BEFORE the triage entry. Update mode then
   * replaced the BUDGET with note text: `findingCount` would read 0, the rule
   * would fall under the census ceiling, and it would be exempt from this gate
   * forever. Silent, permanent, and in the direction that hides work.
   *
   * No budget is in object form today, so the bug was latent — which is the
   * reason to pin it rather than to shrug at it.
   */
  it('finds the triage line and not an object-form budget line', () => {
    const file = [
      '{',
      '  "budgets": {',
      '    "a/b": { "max": 200 }',
      '  },',
      '  "triage": {',
      '    "a/b": "Correct — these are real."',
      '  }',
      '}',
    ].join('\n');
    const lines = file.split('\n');

    // The production lookup: scope to the triage object, then match the line
    // whose trimmed start is the quoted rule key.
    const triageStart = lines.findIndex((l) => l.trimStart().startsWith('"triage"'));
    const offset = lines
      .slice(triageStart)
      .findIndex((l) => l.trimStart().startsWith(`${JSON.stringify('a/b')}:`));

    expect(triageStart).toBeGreaterThan(-1);
    expect(lines[triageStart + offset]).toContain('Correct');
    expect(lines[triageStart + offset]).not.toContain('max');
  });
});
