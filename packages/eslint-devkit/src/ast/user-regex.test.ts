/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { describe, expect, it } from 'vitest';

import { compileUserPattern, compileUserPatterns, matchesAnyUserPattern } from './user-regex';

describe('compileUserPattern — the measured hangs', () => {
  /**
   * Each of these was timed against the shipped rule before this helper existed:
   * 54.9s, 58.2s and 47.5s respectively, versus ~1.3s controls. The assertion is
   * a wall-clock bound, because "does not hang" is the whole contract.
   */
  it.each([
    ['(a+)+$'],
    ['(a*)*$'],
    ['^(\\w+\\s?)*$'],
    ['(a|a)+$'],
    ['(a|ab)+$'],
    // Adjacent unbounded quantifiers over a shared alphabet — the third shape
    // `looksCatastrophic` screens for. `(a)+(a)+` has no nesting and no
    // alternation, so the first two tests miss it.
    ['(a)+(a)+$'],
  ])(
    'refuses the catastrophic pattern %s and answers instantly',
    (pattern) => {
      const matcher = compileUserPattern(pattern, 'i');
      expect(matcher.mode).toBe('literal-catastrophic');

      const subject = `${'a'.repeat(40)}!`;
      const started = performance.now();
      matcher.test(subject);
      expect(performance.now() - started).toBeLessThan(50);
    },
  );
});

describe('compileUserPattern — the measured crashes', () => {
  it.each([['['], ['('], ['*'], ['\\']])(
    'degrades the invalid pattern %s instead of throwing out of create()',
    (pattern) => {
      const matcher = compileUserPattern(pattern);
      expect(matcher.mode).toBe('literal-invalid');
      expect(() => matcher.test('anything')).not.toThrow();
    },
  );

  it('an invalid pattern still matches it as a literal, which is usually what was meant', () => {
    // A user writing `api.key` means the name, not "any character".
    expect(compileUserPattern('[').test('arr[0]')).toBe(true);
    expect(compileUserPattern('[').test('plain')).toBe(false);
  });
});

describe('compileUserPattern — ordinary patterns still work', () => {
  it('compiles and applies flags', () => {
    const matcher = compileUserPattern('^secret', 'i');
    expect(matcher.mode).toBe('regex');
    expect(matcher.test('SecretToken')).toBe(true);
    expect(matcher.test('mySecret')).toBe(false);
  });

  it('is stateless across calls even with a sticky/global flag', () => {
    // A /g/ regex advances `lastIndex`, so the second call on a reused matcher
    // would answer differently from the first — a rule that reuses one matcher
    // for every identifier in a file would report every other match.
    const matcher = compileUserPattern('Token', 'g');
    expect(matcher.test('authToken')).toBe(true);
    expect(matcher.test('authToken')).toBe(true);
    expect(matcher.test('authToken')).toBe(true);
  });

  it('exposes the original source for diagnostics', () => {
    expect(compileUserPattern('^a+$').source).toBe('^a+$');
  });
});

describe('list helpers', () => {
  it('compiles a list and matches any', () => {
    const matchers = compileUserPatterns(['^req', 'body$'], 'i');
    expect(matchesAnyUserPattern(matchers, 'reqQuery')).toBe(true);
    expect(matchesAnyUserPattern(matchers, 'parsedBody')).toBe(true);
    expect(matchesAnyUserPattern(matchers, 'unrelated')).toBe(false);
  });

  it('an empty list matches nothing', () => {
    expect(matchesAnyUserPattern(compileUserPatterns([]), 'anything')).toBe(false);
  });

  it('a safe pattern in a list is unaffected by a dangerous sibling', () => {
    const matchers = compileUserPatterns(['(a+)+$', '^secret'], 'i');
    expect(matchers[0].mode).toBe('literal-catastrophic');
    expect(matchers[1].mode).toBe('regex');
    expect(matchesAnyUserPattern(matchers, 'secretValue')).toBe(true);
  });
});
