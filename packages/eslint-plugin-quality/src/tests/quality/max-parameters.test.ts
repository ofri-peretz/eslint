/**
 * Comprehensive tests for max-parameters rule
 * Detects functions with too many parameters
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { maxParameters } from '../../rules/quality/max-parameters';

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

describe('max-parameters', () => {
  describe('default configuration (max: 4)', () => {
    ruleTester.run('default max parameters', maxParameters, {
      valid: [
        // Functions with 4 or fewer parameters
        {
          code: 'function func(a, b, c, d) {}',
        },
        {
          code: 'const func = (a, b, c) => {};',
        },
        {
          code: 'function func(a) {}',
        },
        {
          code: 'const obj = { method(a, b, c, d) {} };',
        },
      ],
      invalid: [
        // Functions with more than 4 parameters
        {
          code: 'function func(a, b, c, d, e) {}',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
        {
          code: 'const func = (a, b, c, d, e, f) => {};',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
      ],
    });
  });

  describe('custom max configuration', () => {
    ruleTester.run('custom max parameters', maxParameters, {
      valid: [
        // With max: 6, these should be valid
        {
          code: 'function func(a, b, c, d, e, f) {}',
          options: [{ max: 6 }],
        },
      ],
      invalid: [
        // With max: 3, these should be invalid
        {
          code: 'function func(a, b, c, d) {}',
          options: [{ max: 3 }],
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
      ],
    });
  });

  describe('ignore constructors option', () => {
    ruleTester.run('ignore constructors', maxParameters, {
      valid: [
        // Constructor-like function with many parameters (ignored)
        {
          code: 'function Component(a, b, c, d, e, f) {}',
          options: [{ ignoreConstructors: true }],
        },
      ],
      invalid: [
        // Regular function still checked
        {
          code: 'function func(a, b, c, d, e) {}',
          options: [{ ignoreConstructors: true }],
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
      ],
    });
  });

  describe('different function types', () => {
    ruleTester.run('different function types', maxParameters, {
      valid: [],
      invalid: [
        // Function declaration
        {
          code: 'function func(a, b, c, d, e) {}',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
        // Arrow function
        {
          code: 'const func = (a, b, c, d, e) => {};',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
        // Function expression
        {
          code: 'const func = function(a, b, c, d, e) {};',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
        // Method
        {
          code: 'const obj = { method(a, b, c, d, e) {} };',
          errors: [
            {
              messageId: 'tooManyParameters',
            },
          ],
        },
      ],
    });
  });
});