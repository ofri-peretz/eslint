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
        { name: '.at(-1) already', code: 'const last = array.at(-1);' },
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
          name: 'indexing the last element through .length',
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
        // array[array.length - n] where n is a variable.
        //
        // This case previously asserted `output: 'const item = array.at(-offset);'`.
        // That assertion pinned the defect rather than the intent: the two
        // forms diverge at `offset === 0` (undefined vs. the FIRST element,
        // since -0 normalises to 0) and for any negative offset, and nothing
        // in scope proves offset is a positive integer. The report is right;
        // the rewrite was not safe to apply unattended.
        {
          name: 'a variable offset is reported but not rewritten — it is only equivalent for positive integers',
          code: 'const item = array[array.length - offset];',
          output: null,
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
        // These two cases previously asserted the rewrite to `.at(-n)`. That
        // assertion pinned the defect: on an array `array[-1]` is a plain
        // property read that is always undefined, while `array.at(-1)` is the
        // last element — so `--fix` turned dead code into live code. The rule
        // also cannot prove the object is an array, so on a Record holding a
        // '-1' key, or on `arguments`, the rewrite replaced working code with
        // a TypeError. Reported, not rewritten.
        {
          name: 'a negative literal index is reported but not rewritten — .at(-1) is not what arr[-1] means',
          code: 'const last = array[-1];',
          output: null,
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
        {
          name: 'the same holds for any negative literal index',
          code: 'const item = array[-3];',
          output: null,
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
      ],
    });
  });
});
