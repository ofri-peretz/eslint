/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RegExpParser } from '../../../regex-parser';
import { describe, expect, it } from 'vitest';
import type { Node } from './ast';
import type { Flags } from './char-classes';
import { firstCharAfter } from './first-char';

const flagsOf = (f: string): Flags => ({
  ignoreCase: f.includes('i'),
  unicode: f.includes('u'),
  unicodeSets: f.includes('v'),
  dotAll: f.includes('s'),
  multiline: f.includes('m'),
});

/** `firstCharAfter` for the first `X` in `source`, ranges flattened to "lo,hi,lo,hi". */
function after(source: string, dir: 'ltr' | 'rtl', flags: string) {
  const ast = new RegExpParser().parsePattern(source, 0, source.length, {
    unicode: flags.includes('u'),
  });
  let target: Node | undefined;
  const visit = (n: Node): void => {
    if (!target && n.type === 'Character' && n.raw === 'X') target = n;
    for (const k of ['alternatives', 'elements'] as const) {
      const kids = (n as unknown as Record<string, Node[] | undefined>)[k];
      if (Array.isArray(kids)) kids.forEach(visit);
    }
    const el = (n as { element?: Node }).element;
    if (el) visit(el);
  };
  visit(ast);
  const look = firstCharAfter(target!, dir, flagsOf(flags));
  return {
    ranges: look.char.ranges.join(','),
    edge: look.edge,
    exact: look.exact,
  };
}

// [pattern, direction, flags, ranges, edge, exact] — the answers
// regexp-ast-analysis 0.7.1 `getFirstCharAfter` gave for the same inputs,
// recorded from that library when it was replaced. `X` marks the node asked about.
const TABLE: Array<[string, 'ltr' | 'rtl', string, string, boolean, boolean]> =
  [
    ['Xa', 'ltr', '', '97,97', false, true],
    ['aX', 'rtl', '', '97,97', false, true],
    ['X', 'ltr', '', '0,65535', true, true],
    ['Xa?b', 'ltr', '', '97,98', false, true],
    ['Xa*', 'ltr', '', '0,65535', true, true],
    ['Xa{0}b', 'ltr', '', '98,98', false, true],
    ['X(?:a|b?)c', 'ltr', '', '97,99', false, true],
    ['X(?:ab)+c', 'ltr', '', '97,97', false, true],
    ['X$', 'ltr', '', '', true, true],
    ['X$', 'ltr', 'm', '10,10,13,13,8232,8233', true, true],
    ['^X', 'rtl', '', '', true, true],
    ['^X', 'rtl', 'm', '10,10,13,13,8232,8233', true, true],
    ['X^', 'ltr', '', '0,65535', true, false],
    ['X$', 'rtl', '', '0,65535', true, true],
    ['X(?=a|b)', 'ltr', '', '97,98', false, true],
    ['X(?<=a)b', 'ltr', '', '98,98', false, false],
    ['X(?!a)', 'ltr', '', '0,96,98,65535', true, true],
    ['X(?!ab)', 'ltr', '', '0,65535', true, false],
    ['X(?!(?=a))', 'ltr', '', '0,65535', true, false],
    ['X(?![])', 'ltr', '', '0,65535', true, true],
    ['X(?!a?)', 'ltr', '', '', false, true],
    ['X(?<=a)', 'ltr', '', '0,65535', true, false],
    ['(?<=a)X', 'rtl', '', '97,97', false, true],
    ['(?<!a)X', 'rtl', '', '0,96,98,65535', true, true],
    ['a\\bX', 'rtl', '', '', false, true],
    ['X\\ba', 'ltr', '', '', false, true],
    ['\\wX\\b', 'ltr', '', '0,47,58,64,91,94,96,96,123,65535', true, true],
    ['X\\B-', 'ltr', '', '', false, true],
    [
      'X\\b.',
      'ltr',
      '',
      '0,9,11,12,14,47,58,64,91,94,96,96,123,8231,8234,65535',
      false,
      true,
    ],
    ['X\\b\\b\\w', 'ltr', '', '', false, true],
    ['X\\b', 'ltr', '', '0,47,58,64,91,94,96,96,123,65535', true, true],
    ['X\\b$', 'ltr', '', '', true, true],
    ['X\\B', 'ltr', '', '48,57,65,90,95,95,97,122', false, true],
    ['\\bX\\b', 'ltr', '', '0,47,58,64,91,94,96,96,123,65535', true, true],
    ['(?:\\b)*X', 'ltr', '', '0,65535', true, true],
    ['(a)X\\1', 'ltr', '', '97,97', false, true],
    ['X\\1(a)', 'ltr', '', '97,97', false, true],
    ['(a|b)X\\1', 'ltr', '', '97,98', false, false],
    ['(a)?X\\1b', 'ltr', '', '97,98', false, true],
    ['(a)X\\1?b', 'ltr', '', '97,98', false, true],
    ['(ab)X\\1', 'ltr', '', '97,97', false, true],
    ['X[a-c]', 'ltr', 'i', '65,67,97,99', false, true],
    ['Xa', 'ltr', 'iu', '65,65,97,97', false, true],
    [
      'X\\w',
      'ltr',
      'iu',
      '48,57,65,90,95,95,97,122,383,383,8490,8490',
      false,
      true,
    ],
    ['X.', 'ltr', 's', '0,65535', false, true],
    ['X(?=\\b)a', 'ltr', '', '', false, true],
    ['X(?=a$)', 'ltr', '', '97,97', false, true],
    ['X(?=a)(?=b)', 'ltr', '', '', false, true],
    ['X(?!a)b', 'ltr', '', '98,98', false, true],
    ['(?=a)X', 'ltr', '', '0,65535', true, true],
    ['X(?:(?=a)|b)', 'ltr', '', '97,98', false, true],
    ['X(a)|b', 'ltr', '', '97,97', false, true],
    ['(?:X|a)b', 'ltr', '', '98,98', false, true],
    ['(?:Xa)+b', 'ltr', '', '97,97', false, true],
    ['(?:Xa?)+b', 'ltr', '', '88,88,97,98', false, true],
    ['(?:X|Y)+', 'ltr', '', '0,65535', true, true],
    ['X(?:a?|b?)c', 'ltr', '', '97,99', false, true],
    ['X(?:a?|b?)', 'ltr', '', '0,65535', true, true],
    ['X(?!a{1,2})', 'ltr', '', '0,65535', true, false],
    ['X(?!a{0})', 'ltr', '', '', false, true],
    ['X(?!(?:a|b))', 'ltr', '', '0,96,99,65535', true, true],
    ['(a)X(?!\\1)', 'ltr', '', '0,96,98,65535', true, true],
    ['(a)?X(?!\\1)', 'ltr', '', '', false, true],
    ['X(?=[])', 'ltr', '', '', false, true],
    ['X(?!a+)', 'ltr', '', '0,65535', true, false],
    ['X(?!a{2})', 'ltr', '', '0,65535', true, false],
    ['()X(?!\\1)', 'ltr', '', '', false, true],
    ['(a+)X(?!\\1)', 'ltr', '', '0,65535', true, false],
    ['X(?!(?:a|bc))', 'ltr', '', '0,65535', true, false],
    ['(a)?X(?=\\1)', 'ltr', '', '0,65535', true, true],
    ['(\\ba)X(?!\\1)', 'ltr', '', '0,65535', true, false],
    ['X(?!a{0}b)', 'ltr', '', '0,97,99,65535', true, true],
    ['X(?!(?:a{0}){2}b)', 'ltr', '', '0,97,99,65535', true, true],
    ['X(?!\\1b)(a)', 'ltr', '', '97,97', false, true],
    ['(a)?X(?!\\1b)', 'ltr', '', '0,65535', true, false],
    ['(a|b)?X(?=\\1)', 'ltr', '', '0,65535', true, true],
    ['(a$)X(?!\\1)', 'ltr', '', '0,96,98,65535', true, true],
  ];

describe('firstCharAfter', () => {
  it.each(TABLE)('%s (%s, /%s)', (source, dir, flags, ranges, edge, exact) => {
    expect(after(source, dir, flags)).toEqual({ ranges, edge, exact });
  });

  it('a backreference that may mean several groups is declined', () => {
    expect(() => after('(?:(?<n>a)|(?<n>b))X\\k<n>', 'ltr', '')).toThrow();
  });
});
