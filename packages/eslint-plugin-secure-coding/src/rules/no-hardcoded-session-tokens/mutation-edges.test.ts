/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedSessionTokens } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const found = [{ messageId: 'violationDetected' as const }];
/** `eyJ` + dots, padded to an exact length. */
const jwtShaped = (length: number): string =>
  `eyJ.a.${'b'.repeat(length - 'eyJ.a.'.length)}`;

describe('no-hardcoded-session-tokens (mutation edges)', () => {
  ruleTester.run('no-hardcoded-session-tokens', noHardcodedSessionTokens, {
    valid: [
      {
        name: 'a short eyJ string with dots is not a JWT',
        code: "const s = 'eyJ.a.b';",
      },
      {
        name: 'a JWT-shaped string of exactly 50 characters is under the length bar',
        code: `const s = '${jwtShaped(50)}';`,
      },
      {
        name: 'a long dotted string that does not start with eyJ is not a JWT',
        code: `const s = 'https://cdn.example.com/assets/app.bundle.min.js?v=1234567890';`,
      },
      {
        name: 'a short Bearer string is not a token',
        code: "const s = 'Bearer x';",
      },
      {
        name: 'a Bearer string of exactly 20 characters is under the length bar',
        code: `const s = 'Bearer ${'x'.repeat(13)}';`,
      },
      {
        name: 'a destructured declaration has no single name to judge',
        code: "const [sessionId] = 'abcdefghijklmnop1234';",
      },
      {
        name: 'a 15-character session value is under the length bar',
        code: `const sessionId = '${'a'.repeat(15)}';`,
      },
      {
        name: 'a session value with punctuation is not a token',
        code: "const sessionId = 'session-abcdefghijk';",
      },
    ],
    invalid: [
      {
        name: 'a 16-character alphanumeric session value is a token',
        code: `const sessionId = '${'a'.repeat(16)}';`,
        errors: found,
      },
    ],
  });
});
