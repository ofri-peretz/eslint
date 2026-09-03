/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The rewrite must change SPELLING, never meaning.
 *
 * `find-computed-key-blind-spots` rewrites a fixture into the subscript
 * notation and asks whether the rule still fires. That only measures anything
 * if the rewrite leaves the fixture's behaviour alone — a corrupted fixture
 * produces a blind spot that does not exist, which is worse than missing one.
 *
 * The bug this pins: `LITERAL` recognised a regex only after PUNCTUATION, so
 * `return /foo.bar/` was not seen as a literal and the rewrite ran inside the
 * pattern, turning it into `return /foo["bar"]/` — a different pattern
 * matching different text.
 */

import { describe, expect, it } from 'vitest';
import { LITERAL, toComputed } from '../computed-key-rewrite.ts';

describe('a regex literal is data, whatever opens it', () => {
  // Every one of these puts the parser in operand position, so the slash
  // starts a regex rather than dividing.
  it.each([
    ['assignment', 'const re = /foo.bar/;'],
    ['return', 'return /foo.bar/;'],
    ['typeof', 'typeof /foo.bar/'],
    ['case', 'case /foo.bar/.source:'],
    ['await', 'await /foo.bar/.test(x)'],
    ['argument', 'match(/foo.bar/)'],
  ])('%s', (_label, code) => {
    expect(code.match(LITERAL)?.[0]).toBe('/foo.bar/');
    expect(
      toComputed(code),
      'the pattern was rewritten, so the fixture no longer matches what it did',
    ).toContain('/foo.bar/');
  });
});

describe('a slash that is division is not a regex', () => {
  // `)` and `]` end an expression, so what follows divides. Treating these as
  // regex opens would swallow real code as if it were data.
  it.each([
    ['after a closing paren', 'const half = (a + b) / 2;'],
    ['after a subscript', 'const q = arr[i] / n;'],
  ])('%s', (_label, code) => {
    expect(code.match(LITERAL)?.[0]).not.toBe('/ 2');
    expect(toComputed(code)).toContain('/');
  });
});

describe('the rewrite still does its job', () => {
  it('rewrites a call, a read and an object key', () => {
    expect(toComputed('obj.method()')).toBe('obj["method"]()');
    expect(toComputed('const x = obj.prop;')).toBe('const x = obj["prop"];');
    expect(toComputed('f({ key: 1 })')).toContain("['key']:");
  });

  it('leaves string contents alone', () => {
    // The whole point of tracking literals: `a.b` inside a string is text.
    expect(toComputed("const s = 'a.b';")).toBe("const s = 'a.b';");
    expect(toComputed('const s = "a.b";')).toBe('const s = "a.b";');
  });
});
