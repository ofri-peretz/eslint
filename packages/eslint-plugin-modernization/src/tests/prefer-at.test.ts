/**
 * Tests for prefer-at rule
 * Prefer .at() method over bracket notation for accessing elements from the end
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferAt } from '../rules/prefer-at';

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

describe('prefer-at', () => {
  describe('array.length - n pattern', () => {
    ruleTester.run('prefer .at() for last element', preferAt, {
      valid: [
        // Already using .at()
        { code: 'const last = array.at(-1);' },
        { code: 'const second = array.at(-2);' },
        // Normal array access is fine
        { code: 'const first = array[0];' },
        { code: 'const item = array[index];' },
        // Length without subtraction
        { code: 'const len = array.length;' },
      ],
      invalid: [
        // array[array.length - 1] -> array.at(-1)
        {
          code: 'const last = array[array.length - 1];',
          output: 'const last = array.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        // array[array.length - 2] -> array.at(-2)
        {
          code: 'const second = array[array.length - 2];',
          output: 'const second = array.at(-2);',
          errors: [{ messageId: 'preferAtMethod' }],
        },
        // Using in expression
        {
          code: 'return items[items.length - 1];',
          output: 'return items.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
      ],
    });
  });

  describe('variable offset pattern', () => {
    ruleTester.run('prefer .at() for variable offset', preferAt, {
      valid: [],
      invalid: [
        // array[array.length - n] where n is a variable
        {
          code: 'const item = array[array.length - offset];',
          output: 'const item = array.at(-offset);',
          errors: [{ messageId: 'preferAtMethod' }],
        },
      ],
    });
  });

  describe('negative index pattern', () => {
    ruleTester.run('prefer .at() for negative index', preferAt, {
      valid: [
        // Already using .at()
        { code: 'const last = array.at(-1);' },
        // Non-computed access
        { code: 'const item = array.foo;' },
      ],
      invalid: [
        // array[-1] -> array.at(-1)
        {
          code: 'const last = array[-1];',
          output: 'const last = array.at(-1);',
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
        // array[-3] -> array.at(-3)
        {
          code: 'const item = array[-3];',
          output: 'const item = array.at(-3);',
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
      ],
    });
  });
});
