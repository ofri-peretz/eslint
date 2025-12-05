/**
 * Comprehensive tests for no-instanceof-array rule
 * Prefer Array.isArray() over instanceof Array
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInstanceofArray } from '../../rules/architecture/no-instanceof-array';

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

describe('no-instanceof-array', () => {
  describe('instanceof Array detection', () => {
    ruleTester.run('detect instanceof Array usage', noInstanceofArray, {
      valid: [
        // Array.isArray() usage (preferred)
        {
          code: 'if (Array.isArray(arr)) { return true; }',
        },
        // Other instanceof checks
        {
          code: 'if (obj instanceof Object) { return true; }',
        },
        {
          code: 'if (date instanceof Date) { return true; }',
        },
        // Not instanceof operations
        {
          code: 'const isArray = Array.isArray(arr);',
        },
      ],
      invalid: [
        // Direct instanceof Array usage
        {
          code: 'arr instanceof Array;',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        {
          code: 'if (arr instanceof Array) { return true; }',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // instanceof Array in various contexts
        {
          code: 'const isArr = arr instanceof Array;',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        {
          code: 'return value instanceof Array ? value : [];',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // Multiple instanceof Array usages
        {
          code: `
            function checkArrays(a, b) {
              if (a instanceof Array && b instanceof Array) {
                return true;
              }
              return false;
            }
          `,
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
      ],
    });
  });

  describe('allow option', () => {
    ruleTester.run('allow option functionality', noInstanceofArray, {
      valid: [
        // Allowed context
        {
          code: `
            // Legacy code context
            if (arr instanceof Array) {
              return true;
            }
          `,
          options: [{ allow: ['Legacy code context'] }],
        },
        // Multiple allowed contexts
        {
          code: `
            // Browser compatibility check
            if (arr instanceof Array) {
              return true;
            }
          `,
          options: [{ allow: ['Legacy code context', 'Browser compatibility check'] }],
        },
      ],
      invalid: [
        // Context not in allow list
        {
          code: `
            // Some other context
            if (arr instanceof Array) {
              return true;
            }
          `,
          options: [{ allow: ['Legacy code context'] }],
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
      ],
    });
  });


  describe('edge cases', () => {
    ruleTester.run('edge cases', noInstanceofArray, {
      valid: [
        // Array constructor check (different from instanceof)
        {
          code: 'if (arr.constructor === Array) { return true; }',
        },
        // typeof checks
        {
          code: 'if (typeof arr === "object") { return true; }',
        },
      ],
      invalid: [
        // instanceof Array in different positions
        {
          code: 'const result = arr instanceof Array;',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // In function parameters
        {
          code: 'function check(value = arr instanceof Array) {}',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // Array.isArray with instanceof (nested)
        {
          code: 'if (Array.isArray(arr) && arr instanceof Array) { return true; }',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', noInstanceofArray, {
      valid: [
        // In class methods
        {
          code: `
            class Validator {
              isArray(value) {
                return Array.isArray(value);
              }
            }
          `,
        },
      ],
      invalid: [
        // In class methods with instanceof
        {
          code: `
            class Validator {
              isArray(value) {
                return value instanceof Array;
              }
            }
          `,
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // In arrow functions
        {
          code: 'const check = arr => arr instanceof Array;',
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
        // In async functions
        {
          code: `
            async function validate(arr) {
              if (arr instanceof Array) {
                return true;
              }
            }
          `,
          errors: [
            {
              messageId: 'noInstanceofArray',
            },
          ],
        },
      ],
    });
  });
});
