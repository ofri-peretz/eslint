/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The scanner replaced three global regexes with unbounded lazy bodies. Its
 * whole value is being IDENTICAL to them on well-formed input and LINEAR on
 * malformed input, so both halves are asserted here rather than inferred from
 * the rules' own suites.
 */
import { describe, expect, it } from 'vitest';
import { blankNonPlaceholderText, stripComments } from './sql-scan';

/** The alternations this scanner replaced, kept as the oracle. */
const SQL_COMMENTS = /--[^\n]*|\/\*[\s\S]*?\*\//g;
const NON_PLACEHOLDER_TEXT =
  /'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/|\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$/g;

const WELL_FORMED = [
  'SELECT 1',
  'SELECT 1 -- trailing',
  'SELECT 1 -- trailing\nSELECT 2',
  'SELECT /* inline */ 1',
  'SELECT /* one */ 1 /* two */',
  "SELECT 'it''s' , \"$1\" , $1",
  'SELECT $1, $2 FROM t',
  '$$ SELECT $1 $$',
  '$tag$ SELECT $1 $tag$',
  'SET search_path = public; SELECT 1',
  "COPY t FROM PROGRAM 'curl x'",
  '/* a */-- b\n$$c$$',
  'SELECT a - b',
  'SELECT 1/2',
];

describe('sql-scan matches the regexes it replaced', () => {
  it.each(WELL_FORMED)('stripComments(%j)', (text) => {
    expect(stripComments(text)).toBe(text.replace(SQL_COMMENTS, ''));
  });

  it.each(WELL_FORMED)('blankNonPlaceholderText(%j)', (text) => {
    expect(blankNonPlaceholderText(text)).toBe(
      text.replace(NON_PLACEHOLDER_TEXT, ' '),
    );
  });
});

describe('an unterminated construct is left in place', () => {
  // The regexes simply failed to match, so the text survived. A scanner that
  // "helpfully" ran to end-of-input would blank the tail of a malformed query
  // and change what every one of these rules reports.
  const UNTERMINATED = [
    'SELECT /* never closed',
    "SELECT 'never closed",
    'SELECT "never closed',
    'SELECT $tag$ never closed',
    'SELECT $$ never closed',
  ];

  it.each(UNTERMINATED)('stripComments(%j)', (text) => {
    expect(stripComments(text)).toBe(text.replace(SQL_COMMENTS, ''));
  });

  it.each(UNTERMINATED)('blankNonPlaceholderText(%j)', (text) => {
    expect(blankNonPlaceholderText(text)).toBe(
      text.replace(NON_PLACEHOLDER_TEXT, ' '),
    );
  });

  it('a lone $ is not a dollar quote', () => {
    expect(blankNonPlaceholderText('SELECT $ FROM t')).toBe('SELECT $ FROM t');
  });

  // A `$` or a half-written tag as the LAST character: the tag reader walks off
  // the end of the string, where every lookahead is `undefined`.
  it.each(['SELECT $', 'SELECT $ab'])('runs off the end of %j', (text) => {
    expect(blankNonPlaceholderText(text)).toBe(
      text.replace(NON_PLACEHOLDER_TEXT, ' '),
    );
  });
});

describe('the input that made the regexes quadratic', () => {
  // 20k openers with no `*\/` anywhere. Under
  // `String.replace(/\/\*[\s\S]*?\*\//g)` each opener scans to end of input
  // before failing and the search restarts one character later, so this is
  // ~n²/2 character visits.
  //
  // `'/* '` and not `'/*'`: the latter spells `*\/` at every odd offset, so it
  // CLOSES its comments and never reaches the slow path.
  it('is linear', () => {
    const hostile = '/* '.repeat(20_000);
    const started = performance.now();
    // Length, not the string: a mismatch here would otherwise print 60kB.
    expect(stripComments(hostile)).toHaveLength(hostile.length);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
