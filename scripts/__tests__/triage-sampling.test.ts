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
  assertsVerdict,
  citesSample,
  findingCount,
  unsupportedVerdicts,
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

describe('unsupportedVerdicts', () => {
  const VERDICT = 'Correct — these are real.';

  it('flags a verdict on a high-volume rule with no stated basis', () => {
    expect(unsupportedVerdicts({ 'a/b': 200 }, { 'a/b': VERDICT })).toEqual([
      { rule: 'a/b', findings: 200 },
    ]);
  });

  it('exempts a low-volume rule, where the note can list every finding', () => {
    expect(unsupportedVerdicts({ 'a/b': CENSUS_CEILING }, { 'a/b': VERDICT })).toEqual([]);
  });

  it('accepts a high-volume verdict that states its basis', () => {
    expect(
      unsupportedVerdicts({ 'a/b': 200 }, { 'a/b': `${VERDICT} Stratified n=24 across 4 repos.` }),
    ).toEqual([]);
  });

  it('orders by findings, so the biggest unsupported claim reads first', () => {
    const out = unsupportedVerdicts(
      { 'a/b': 50, 'c/d': 500 },
      { 'a/b': VERDICT, 'c/d': VERDICT },
    );
    expect(out.map((u) => u.rule)).toEqual(['c/d', 'a/b']);
  });
});
