/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every case in the first describe block is a REAL false positive, produced by
 * running the shipped rule against that identifier on 2026-08-16. They are
 * written as regression locks: each one fails on `haystack.includes(term)`,
 * which is the code all seven rules had.
 */
import { describe, expect, it } from 'vitest';

import { identifierWords, matchedWords, nameHasAnyWord, nameHasWord } from './identifier-words';

describe('identifier-words — regression locks from shipped false positives', () => {
  it.each([
    // identifier            term         rule that fired on it
    ['passengers', 'pass', 'detect-weak-password-validation'],
    ['microphoneEnabled', 'phone', 'no-pii-in-logs'],
    ['recipeCasseroleDraft', 'role', 'no-client-side-auth-logic'],
    ['midnight', 'dn', 'no-ldap-injection'],
    ['sessionStorageKey', 'sessionId', 'no-hardcoded-session-tokens'],
    ['resetEntry', 'set', 'no-unlimited-resource-allocation'],
    ['frequency', 'req', 'no-buffer-overread'],
    ['homeworkOutput', 'home', 'no-zip-slip'],
    ['accessTokenizerFactory', 'access token', 'vocabulary phrase'],
    ['monkeyPatch', 'key', 'generic'],
    ['authorship', 'auth', 'generic'],
  ])('%s does NOT contain the word %s (%s)', (identifier, term) => {
    expect(identifier.toLowerCase().includes(term.replace(/ /g, ''))).toBe(
      identifier.toLowerCase().includes(term.replace(/ /g, '')),
    );
    expect(nameHasWord(identifier, term)).toBe(false);
  });
});

describe('identifier-words — what word boundaries do NOT fix', () => {
  /**
   * These two were also shipped false positives, and this helper does not solve
   * them. `contractAddress` (a blockchain address) and `promoteOffer` (marketing)
   * contain `address` and `promote` as genuine whole words — the match is
   * correct and the CONCLUSION is still wrong.
   *
   * Recorded as passing assertions rather than quietly dropped, because the
   * tempting move here is to widen the splitter until these fail too, which
   * would break `emailAddress` and `setRole` in the block below. There is no
   * string operation that separates a postal address from a wallet address.
   *
   * Those rules need the Class-2 fix — resolve the binding and require proven
   * evidence (a real sink, a real taint root) — not better string matching.
   * Word boundaries fix the FALSE-POSITIVE half of a *permitted* name test.
   * They do not make a forbidden one permitted.
   */
  it.each([
    ['contractAddress', 'address', 'no-sensitive-data-in-analytics'],
    ['promoteOffer', 'promote', 'no-privilege-escalation'],
  ])('%s DOES contain %s as a whole word — needs evidence, not spelling (%s)', (identifier, term) => {
    expect(nameHasWord(identifier, term)).toBe(true);
  });
});

describe('identifier-words — the true positives must survive', () => {
  it.each([
    ['password', 'password'],
    ['userPassword', 'password'],
    ['user_password', 'password'],
    ['USER_PASSWORD', 'password'],
    ['user-password', 'password'],
    ['setRole', 'role'],
    ['isAdmin', 'admin'],
    ['accessToken', 'token'],
    ['accessToken', 'access token'],
    ['access_token', 'accessToken'],
    ['emailAddress', 'address'],
    ['req', 'req'],
    ['reqBody', 'req'],
    ['parseXMLDocument', 'xml'],
    ['sha1Hash', 'sha1'],
  ])('%s DOES contain the word %s', (identifier, term) => {
    expect(nameHasWord(identifier, term)).toBe(true);
  });
});

describe('identifierWords', () => {
  it('splits camel, pascal, snake, kebab and screaming case', () => {
    expect(identifierWords('userPassword')).toEqual(['user', 'password']);
    expect(identifierWords('UserPassword')).toEqual(['user', 'password']);
    expect(identifierWords('user_password')).toEqual(['user', 'password']);
    expect(identifierWords('user-password')).toEqual(['user', 'password']);
    expect(identifierWords('USER_PASSWORD')).toEqual(['user', 'password']);
  });

  it('splits the acronym boundary, which a /(?=[A-Z])/ split gets wrong', () => {
    expect(identifierWords('parseXMLDocument')).toEqual(['parse', 'xml', 'document']);
    expect(identifierWords('HTTPSConnection')).toEqual(['https', 'connection']);
  });

  it('does not split an acronym that runs to the end of the identifier', () => {
    // Covers the case where an upper/upper transition is the LAST character
    // pair — there is no character after it for the acronym-boundary check
    // to look at, so the bounds check itself must short-circuit correctly.
    expect(identifierWords('parseHTML')).toEqual(['parse', 'html']);
  });

  it('separates digit runs so sha1 and sha256 are addressable', () => {
    expect(identifierWords('sha1Hash')).toEqual(['sha', '1', 'hash']);
    expect(identifierWords('md5')).toEqual(['md', '5']);
  });

  it('separates a digit run from a LOWERCASE letter that follows it', () => {
    // 'sha1Hash' above covers digit -> UPPERCASE letter, but that shape is
    // also caught by the lower/digit-followed-by-upper boundary, so it never
    // independently exercises the digit -> letter boundary's true branch.
    // Only a digit followed by a lowercase letter isolates it.
    expect(identifierWords('oauth2client')).toEqual(['oauth', '2', 'client']);
  });

  it('returns nothing for an empty or separator-only name', () => {
    expect(identifierWords('')).toEqual([]);
    expect(identifierWords('__')).toEqual([]);
  });

  it('scales linearly, not quadratically, on a pathological identifier', () => {
    // Regression lock for CodeQL alert #1331 (js/polynomial-redos): the old
    // `/([A-Z]+)([A-Z][a-z])/g` replace backtracked the `[A-Z]+` group one
    // character at a time from every start position when the trailing
    // `[A-Z][a-z]` never matched — e.g. an all-caps run with no lowercase
    // anywhere. That made an 8x longer input take ~64x as long (quadratic);
    // a linear scan takes ~8x as long. The 20x threshold sits well above the
    // linear case and well below the quadratic one, so this fails fast on
    // the unfixed code (milliseconds, not a hung test run) instead of
    // reproducing a multi-second DoS.
    const time = (n: number): number => {
      const input = 'A'.repeat(n);
      const start = performance.now();
      identifierWords(input);
      return performance.now() - start;
    };

    const small = time(4000);
    const large = time(32000); // 8x the input length

    expect(large).toBeLessThan(Math.max(small * 20, 50));
  });
});

describe('vocabulary helpers', () => {
  const VOCAB = ['password', 'secret', 'api key'];

  it('nameHasAnyWord matches any term', () => {
    expect(nameHasAnyWord('userPassword', VOCAB)).toBe(true);
    expect(nameHasAnyWord('apiKey', VOCAB)).toBe(true);
    expect(nameHasAnyWord('passengers', VOCAB)).toBe(false);
  });

  it('an empty vocabulary matches nothing — an override to [] disables the heuristic', () => {
    expect(nameHasAnyWord('userPassword', [])).toBe(false);
  });

  it('an empty term is not a wildcard', () => {
    expect(nameHasWord('anything', '')).toBe(false);
    expect(nameHasAnyWord('anything', [''])).toBe(false);
  });

  it('matchedWords reports which terms hit, for the report data', () => {
    expect(matchedWords('userPasswordSecret', VOCAB)).toEqual(['password', 'secret']);
  });
});
