/**
 * Tests for no-instanceof-array rule
 * Prefer Array.isArray() over instanceof Array
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInstanceofArray } from '../rules/no-instanceof-array';

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

describe('no-instanceof-array', () => {
  describe('valid cases', () => {
    ruleTester.run('allow Array.isArray', noInstanceofArray, {
      valid: [
        // Using Array.isArray (correct)
        { code: 'if (Array.isArray(value)) {}' },
        { code: 'const isArr = Array.isArray(arr);' },
        { code: 'Array.isArray(items) && items.length > 0' },
        // Other instanceof checks are fine
        { code: 'value instanceof Object' },
        { code: 'error instanceof Error' },
        { code: 'element instanceof HTMLElement' },
      ],
      invalid: [
        // instanceof Array should be flagged
        {
          code: 'if (value instanceof Array) {}',
          errors: [{ messageId: 'noInstanceofArray' }],
        },
        {
          code: 'const isArr = arr instanceof Array;',
          errors: [{ messageId: 'noInstanceofArray' }],
        },
        {
          code: 'items instanceof Array && items.length > 0',
          errors: [{ messageId: 'noInstanceofArray' }],
        },
        {
          code: 'return data instanceof Array;',
          errors: [{ messageId: 'noInstanceofArray' }],
        },
      ],
    });
  });
});
