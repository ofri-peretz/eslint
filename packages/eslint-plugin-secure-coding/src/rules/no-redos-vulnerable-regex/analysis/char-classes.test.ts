/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RegExpParser } from '../../../regex-parser';
import { describe, expect, it } from 'vitest';
import {
  allChars,
  emptyChars,
  isCharacterLike,
  isUnicode,
  lineTerminatorChars,
  maxChar,
  toCharSet,
  wordChars,
  type Flags,
} from './char-classes';
import { UnsupportedPatternError } from './unsupported';

const parser = new RegExpParser();
const flagsOf = (f: string): Flags => ({
  ignoreCase: f.includes('i'),
  unicode: f.includes('u'),
  unicodeSets: f.includes('v'),
  dotAll: f.includes('s'),
  multiline: f.includes('m'),
});

/** The first element of `source`, as the regex parser builds it. */
const first = (source: string, flags = '') => {
  const ast = parser.parsePattern(source, 0, source.length, {
    unicode: flags.includes('u'),
    unicodeSets: flags.includes('v'),
  });
  return ast.alternatives[0].elements[0];
};
const set = (source: string, flags = '') =>
  toCharSet(first(source, flags), flagsOf(flags));
const has = (source: string, cp: string, flags = '') =>
  set(source, flags).has(cp.codePointAt(0)!);

describe('flag helpers', () => {
  it('unicode and unicodeSets both widen the alphabet', () => {
    expect(isUnicode(flagsOf(''))).toBe(false);
    expect(isUnicode(flagsOf('u'))).toBe(true);
    expect(isUnicode(flagsOf('v'))).toBe(true);
    expect(maxChar(flagsOf(''))).toBe(0xffff);
    expect(maxChar(flagsOf('u'))).toBe(0x10ffff);
  });

  it('shared constant sets', () => {
    expect(emptyChars(flagsOf('')).isEmpty).toBe(true);
    expect(emptyChars(flagsOf('u')).maximum).toBe(0x10ffff);
    expect(allChars(flagsOf('')).isAll).toBe(true);
    expect(allChars(flagsOf('u')).maximum).toBe(0x10ffff);
    expect(lineTerminatorChars(flagsOf('')).size).toBe(4);
    expect(lineTerminatorChars(flagsOf('u')).has(0x2028)).toBe(true);
  });

  it('wordChars is ASCII, plus the two characters that fold into it under /iu', () => {
    expect(wordChars(flagsOf('')).size).toBe(63);
    expect(wordChars(flagsOf('i')).size).toBe(63);
    expect(wordChars(flagsOf('u')).size).toBe(63);
    const folded = wordChars(flagsOf('iu'));
    expect(folded.has(0x17f)).toBe(true); // long s
    expect(folded.has(0x212a)).toBe(true); // Kelvin sign
    expect(wordChars(flagsOf('iu'))).toBe(folded);
  });

  it('isCharacterLike', () => {
    expect(isCharacterLike(first('a'))).toBe(true);
    expect(isCharacterLike(first('\\d'))).toBe(true);
    expect(isCharacterLike(first('[a]'))).toBe(true);
    expect(isCharacterLike(first('[a--b]', 'v'))).toBe(true);
    expect(isCharacterLike(first('(a)'))).toBe(false);
    expect(isCharacterLike(first('a*'))).toBe(false);
  });
});

describe('toCharSet', () => {
  it('a character, and the cache returns the same set for the same flags', () => {
    const node = first('a');
    const a = toCharSet(node, flagsOf(''));
    expect(a.ranges).toEqual([0x61, 0x61]);
    expect(toCharSet(node, flagsOf(''))).toBe(a);
    expect(toCharSet(node, flagsOf('i'))).not.toBe(a);
    expect(toCharSet(node, flagsOf('i')).size).toBe(2);
  });

  it('any character: everything but the four line terminators, or everything with /s', () => {
    expect(set('.').size).toBe(0x10000 - 4);
    expect(has('.', '\n')).toBe(false);
    expect(has('.', ' ')).toBe(false);
    expect(set('.', 's').isAll).toBe(true);
    expect(set('.', 'u').size).toBe(0x110000 - 4);
  });

  it('digit, space and word, and their negations', () => {
    expect(set('\\d').size).toBe(10);
    expect(set('\\D').size).toBe(0x10000 - 10);
    expect(has('\\s', ' ')).toBe(true);
    expect(has('\\s', '﻿')).toBe(true);
    expect(has('\\s', 'a')).toBe(false);
    expect(has('\\S', 'a')).toBe(true);
    expect(has('\\S', ' ')).toBe(false);
    expect(set('\\w').size).toBe(63);
    expect(has('\\W', '_')).toBe(false);
    expect(has('\\W', '-')).toBe(true);
    expect(has('\\w', 'ſ', 'iu')).toBe(true);
    expect(has('\\W', 'ſ', 'iu')).toBe(false);
    expect(has('\\w', 'ſ', 'i')).toBe(false);
  });

  it('case folding: UTF-16 and unicode modes differ', () => {
    expect(has('a', 'A', 'i')).toBe(true);
    expect(has('k', 'K', 'i')).toBe(false); // Kelvin: would fold into ASCII, so it does not
    expect(has('k', 'K', 'iu')).toBe(true);
    expect(has('s', 'ſ', 'iu')).toBe(true);
    expect(has('é', 'É', 'i')).toBe(true);
    expect(has('1', '1', 'i')).toBe(true);
    expect(set('[]', 'i').isEmpty).toBe(true);
  });

  it('a large class folds group by group, a small one member by member', () => {
    const big = set('[\\u0000-\\uffff]', 'i');
    expect(big.isAll).toBe(true);
    const mid = set('[\\u0100-\\u01ff]', 'i');
    expect(mid.has(0x1c4)).toBe(true);
    expect(mid.has(0x1c5)).toBe(true);
  });

  it('astral members above the maximum are not added in UTF-16 mode', () => {
    expect(set('a', 'i').maximum).toBe(0xffff);
    expect(has('\\u{10400}', '\u{10428}', 'iu')).toBe(true);
  });

  it('classes: ranges, escapes, negation', () => {
    expect(set('[a-c]').size).toBe(3);
    expect(set('[^a-c]').size).toBe(0x10000 - 3);
    expect(has('[\\d_]', '_')).toBe(true);
    expect(has('[\\d_]', '5')).toBe(true);
    expect(has('[^\\W]', 'a')).toBe(true);
    expect(has('[a-c]', 'B', 'i')).toBe(true);
    expect(has('[^a]', 'A', 'i')).toBe(false);
  });

  it('unicode property escapes from the vendored tables', () => {
    expect(has('\\p{Lu}', 'A', 'u')).toBe(true);
    expect(has('\\p{Lu}', 'a', 'u')).toBe(false);
    expect(has('\\p{Uppercase_Letter}', 'A', 'u')).toBe(true);
    expect(has('\\P{Lu}', 'a', 'u')).toBe(true);
    expect(has('\\P{Lu}', 'A', 'u')).toBe(false);
    expect(has('\\p{General_Category=Nd}', '7', 'u')).toBe(true);
    expect(has('\\p{gc=Nd}', '7', 'u')).toBe(true);
    expect(has('\\p{Script=Greek}', 'α', 'u')).toBe(true);
    expect(has('\\p{sc=Grek}', 'α', 'u')).toBe(true);
    expect(has('\\p{Script_Extensions=Greek}', 'α', 'u')).toBe(true);
    expect(has('\\p{scx=Grek}', 'α', 'u')).toBe(true);
    expect(has('\\p{ASCII}', 'a', 'u')).toBe(true);
    expect(has('\\p{ASCII}', 'é', 'u')).toBe(false);
    expect(has('\\p{Lu}', 'a', 'iu')).toBe(true);
    expect(has('\\p{Lu}', 'A', 'v')).toBe(true);
    expect(set('\\p{Any}', 'u').isAll).toBe(true);
  });

  it('a property the vendored data does not have is declined, not guessed', () => {
    expect(() => set('\\p{Script=Vithkuqi}', 'u')).toThrow(
      UnsupportedPatternError,
    );
  });

  it('a property of strings is declined', () => {
    expect(() => set('\\p{RGI_Emoji}', 'v')).toThrow(UnsupportedPatternError);
  });

  it('v-flag class set operations', () => {
    expect(set('[[a-z]--[aeiou]]', 'v').size).toBe(21);
    expect(set('[\\w&&\\d]', 'v').size).toBe(10);
    expect(set('[^\\d]', 'v').size).toBe(0x110000 - 10);
    expect(set('[[a-z]&&[^\\d]]', 'v').size).toBe(26);
    expect(has('[\\q{a|b}]', 'b', 'v')).toBe(true);
    expect(has('[\\q{a|b}x]', 'x', 'v')).toBe(true);
    expect(() => set('[\\q{ab}]', 'v')).toThrow(UnsupportedPatternError);
    expect(has('[a-c]', 'B', 'iv')).toBe(true);
    expect(has('[[a-z]--[b]]', 'B', 'iv')).toBe(false);
    expect(has('[[a-z]--[b]]', 'A', 'iv')).toBe(true);
  });

  it('an expression class can be negated', () => {
    const negated = set('[^[a-z]--[b]]', 'v');
    expect(negated.has(0x62)).toBe(true);
    expect(negated.has(0x61)).toBe(false);
  });

  it('a node that is not a character set is declined', () => {
    expect(() => toCharSet(first('(a)'), flagsOf(''))).toThrow(
      UnsupportedPatternError,
    );
  });
});
