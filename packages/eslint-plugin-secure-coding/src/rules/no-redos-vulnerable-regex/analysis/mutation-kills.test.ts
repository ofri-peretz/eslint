/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Inputs that tell the analysis from a broken copy of itself.
 *
 * Each row below is a pattern (minimised from 140,000 generated ones) on which
 * a specific surviving mutant of the analysis, applied by hand and compared with
 * the real thing, returned a different set of reports. The comment on the row
 * names the mutants it separates. The expected string is what the analysis
 * returns now: `S` / `T` per report (Self, Trade), `!` when exponential, empty
 * for no report.
 *
 * Mutants no generated input separated are not here, and not tested: either the
 * answer cannot change (a cache that is rebuilt, a loop bound that reads one
 * `undefined` past the end, a fast path that gives the same set) or it is
 * reachable only through an input shape the analysis never builds.
 */
import { describe, expect, it } from 'vitest';
import { RegExpParser } from '../../../regex-parser';
import { analyse } from './backtracking';

function reports(source: string, flags: string): string {
  const pattern = new RegExpParser().parsePattern(source, 0, source.length, {
    unicode: flags.includes('u'),
  });
  return analyse({
    pattern,
    flags: {
      ignoreCase: flags.includes('i'),
      unicode: flags.includes('u'),
      unicodeSets: false,
      dotAll: flags.includes('s'),
      multiline: flags.includes('m'),
    },
  })
    .reports.map((r) => r.type[0] + (r.exponential ? '!' : ''))
    .join('');
}

const TABLE: Array<[string, string, string]> = [
  // kills: backtracking.ts:117 BlockStatement; backtracking.ts:119 ConditionalExpression; backtracking.ts:120 ConditionalExpression; backtracking.ts:125 ConditionalExpression; first-char.ts:279 ConditionalExpression
  ['(((\\b\\B)\\s(?<!\\}\\s+)))*', 'iu', 'T'],
  // kills: first-char.ts:212 ConditionalExpression; first-char.ts:212 ConditionalExpression
  ['((?<=(\\B|\\s[b]*){2,}}))', 'i', ''],
  // kills: first-char.ts:236 ConditionalExpression; first-char.ts:236 MethodExpression
  ['((x*)*(?<=(a\\W{2,})(\\b)))', 'u', 'S!'],
  // kills: first-char.ts:280 LogicalOperator
  ['((b(\\b\\b\\S*)+)[])', 'iu', ''],
  // kills: first-char.ts:323 ConditionalExpression
  ['(?!(\\W+\\S*\\B))b', '', ''],
  // kills: paths.ts:60 ConditionalExpression
  ['(?<=((?<!\\B)\\b)(]{2,})*)', 'i', 'S!'],
  // kills: paths.ts:61 MethodExpression
  ['(?<=((?<!\\B|x)\\b)(]{2,})*)', 'i', 'S!'],
  // kills: paths.ts:142 MethodExpression
  ['($|^\\S+)((?<=(\\1W+)))', 'i', 'T'],
];

describe('analysis, rows that separate surviving mutants', () => {
  it.each(TABLE)('%j /%s', (source, flags, expected) => {
    expect(reports(source, flags)).toBe(expected);
  });
});
