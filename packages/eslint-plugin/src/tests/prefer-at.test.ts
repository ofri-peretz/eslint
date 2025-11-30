/**
 * Tests for prefer-at rule
 * Prefer .at() method over bracket notation for accessing elements from the end
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferAt } from '../rules/architecture/prefer-at';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('prefer-at', () => {
  describe('Basic array access patterns', () => {
    ruleTester.run('detect array.length - N patterns', preferAt, {
      valid: [
        // Already using .at() method
        {
          code: 'const last = array.at(-1);',
        },
        {
          code: 'const secondToLast = array.at(-2);',
        },
        // Regular array access
        {
          code: 'const first = array[0];',
        },
        {
          code: 'const item = array[index];',
        },
        // Non-array access
        {
          code: 'const prop = obj.property;',
        },
        {
          code: 'const method = obj.method();',
        },
      ],
      invalid: [
        // array[array.length - 1] should be flagged
        {
          code: 'const last = array[array.length - 1];',
          errors: [
            {
              messageId: 'useAtForLastElement',
            },
          ],
          output: 'const last = array.at(-1);',
        },
      ],
    });
  });

  describe('Negative index patterns', () => {
    ruleTester.run('detect negative index access', preferAt, {
      valid: [
        // Positive indices
        {
          code: 'const item = array[0];',
        },
        {
          code: 'const item = array[5];',
        },
        // Variable indices
        {
          code: 'const item = array[index];',
        },
      ],
      invalid: [
        // array[-1] should be flagged
        {
          code: 'const last = array[-1];',
          errors: [
            {
              messageId: 'useAtForNegativeIndex',
            },
          ],
          output: 'const last = array.at(-1);',
        },
      ],
    });
  });
});
