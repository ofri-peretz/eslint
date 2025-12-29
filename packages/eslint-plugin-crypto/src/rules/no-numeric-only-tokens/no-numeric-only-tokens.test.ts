/**
 * Tests for no-numeric-only-tokens rule
 * CWE-330: Numeric-only tokens have lower entropy
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNumericOnlyTokens } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-numeric-only-tokens', () => {
  ruleTester.run('no-numeric-only-tokens', noNumericOnlyTokens, {
    valid: [
      // Valid: Not imported from crypto-random-string
      { code: 'someLib({ type: "numeric" });' },
      // Valid: Alphanumeric type
      {
        code: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'alphanumeric' });`,
      },
      // Valid: URL-safe type
      {
        code: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'url-safe' });`,
      },
      // Valid: Hex type
      {
        code: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'hex' });`,
      },
    ],
    invalid: [
      // Invalid: Numeric type
      {
        code: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'numeric' });`,
        errors: [{ messageId: 'numericOnlyToken', suggestions: [
          { messageId: 'useAlphanumeric', output: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'alphanumeric' });` },
          { messageId: 'useUrlSafe', output: `import cryptoRandomString from 'crypto-random-string';
cryptoRandomString({ length: 32, type: 'url-safe' });` },
        ] }],
      },
      // Invalid: Renamed import with numeric
      {
        code: `import genToken from 'crypto-random-string';
genToken({ length: 16, type: 'numeric' });`,
        errors: [{ messageId: 'numericOnlyToken', suggestions: [
          { messageId: 'useAlphanumeric', output: `import genToken from 'crypto-random-string';
genToken({ length: 16, type: 'alphanumeric' });` },
          { messageId: 'useUrlSafe', output: `import genToken from 'crypto-random-string';
genToken({ length: 16, type: 'url-safe' });` },
        ] }],
      },
    ],
  });
});
