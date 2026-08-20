/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The oracle's retraction, at both report sites.
 *
 * RuleTester cannot reach these. The rule consults the oracle immediately
 * before reporting, so a retraction shows up only as SILENCE — and a valid-case
 * assertion that a pattern is quiet passes just as well when the pattern was
 * never flagged in the first place. That is the same defect as a probe with no
 * positive control, and this file is here because a real-corpus pattern chosen
 * for the job turned out to be quiet either way.
 *
 * So the oracle is stubbed instead, and each direction is asserted against the
 * SAME input:
 *
 *   stub says "vulnerable"  -> the rule reports        (positive control)
 *   stub says "safe"        -> the rule is silent      (the retraction)
 *
 * Two patterns, because the rule has two report sites and they are reached by
 * different shapes: one where scslre returns nothing and the structural
 * catastrophe check fires, and one where scslre itself produces a report.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it, afterEach } from 'vitest';
import { noRedosVulnerableRegex } from './index';
import { __setOracleForTests, resetOracleForTests } from '../../utils/redos-oracle';

const linter = new Linter({ configType: 'flat' });
const config = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022 as const,
      sourceType: 'module' as const,
    },
    plugins: { probe: { rules: { redos: noRedosVulnerableRegex } } },
    rules: { 'probe/redos': 'error' as const },
  },
];

const findings = (pattern: string): number =>
  linter.verify(`export default /${pattern}/;\n`, config, 'x.ts').filter((m) => m.ruleId).length;

/** Everything is vulnerable — the rule's own judgement stands. */
const CONFIRMS = { checkSync: () => ({ status: 'vulnerable' as const }) };
/** Everything is safe — every finding must be withdrawn. */
const RETRACTS = { checkSync: () => ({ status: 'safe' as const }) };

describe('no-redos-vulnerable-regex — oracle retraction', () => {
  afterEach(() => {
    resetOracleForTests();
  });

  // `^(a|a)*$` returns ZERO reports from scslre and is timed at 8,581 ms, so it
  // reaches the structural-catastrophe report site and no other.
  describe('the structural-catastrophe site', () => {
    it('reports when the oracle confirms', () => {
      __setOracleForTests(CONFIRMS);
      expect(findings('^(a|a)*$')).toBe(1);
    });

    it('is silent when the oracle retracts', () => {
      __setOracleForTests(RETRACTS);
      expect(findings('^(a|a)*$')).toBe(0);
    });
  });

  // `(x+x+)+y` is the measured-exponential automaton from the adversarial wave;
  // scslre produces a report for it, so it reaches the other site.
  describe('the scslre-report site', () => {
    it('reports when the oracle confirms', () => {
      __setOracleForTests(CONFIRMS);
      expect(findings('(x+x+)+y')).toBe(1);
    });

    it('is silent when the oracle retracts', () => {
      __setOracleForTests(RETRACTS);
      expect(findings('(x+x+)+y')).toBe(0);
    });
  });

  it('an absent oracle changes nothing at either site', () => {
    // The consumer default. Both patterns must still report — this is what
    // makes the oracle optional rather than load-bearing.
    resetOracleForTests(true);
    expect(findings('^(a|a)*$')).toBe(1);
    expect(findings('(x+x+)+y')).toBe(1);
  });
});
