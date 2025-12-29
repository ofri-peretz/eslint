/**
 * Tests for require-sufficient-length rule
 * CWE-330: Insufficient token length
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSufficientLength } from './index';

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

describe('require-sufficient-length', () => {
  ruleTester.run('require-sufficient-length', requireSufficientLength, {
    valid: [
      // Valid: Not imported from crypto-random-string
      { code: 'someLib({ length: 8 });' },
      // Valid: 32 characters (default minimum)
      {
        code: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 32 });
        `,
      },
      // Valid: 64 characters
      {
        code: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 64 });
        `,
      },
      // Valid: Variable length
      {
        code: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length });
        `,
      },
    ],
    invalid: [
      // Invalid: 8 characters (too short)
      {
        code: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 8 });
        `,
        errors: [{ messageId: 'insufficientLength', suggestions: [{ messageId: 'useMinLength', output: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 32 });
        ` }] }],
      },
      // Invalid: 16 characters
      {
        code: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 16 });
        `,
        errors: [{ messageId: 'insufficientLength', suggestions: [{ messageId: 'useMinLength', output: `
          import cryptoRandomString from 'crypto-random-string';
          cryptoRandomString({ length: 32 });
        ` }] }],
      },
      // Invalid: Renamed import with short length
      {
        code: `
          import genToken from 'crypto-random-string';
          genToken({ length: 10 });
        `,
        errors: [{ messageId: 'insufficientLength', suggestions: [{ messageId: 'useMinLength', output: `
          import genToken from 'crypto-random-string';
          genToken({ length: 32 });
        ` }] }],
      },
    ],
  });
});
