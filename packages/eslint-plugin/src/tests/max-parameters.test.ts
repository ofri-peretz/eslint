/**
 * Comprehensive tests for max-parameters rule
 * Quality: Detects functions with too many parameters
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { maxParameters } from '../rules/quality/max-parameters';

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

describe('max-parameters', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - functions within limit', maxParameters, {
      valid: [
        // Functions with acceptable parameter count
        {
          code: 'function simple(a, b) { return a + b; }',
          options: [{ max: 4 }],
        },
        {
          code: 'function process(a, b, c, d) { return a + b + c + d; }',
          options: [{ max: 4 }],
        },
        {
          code: 'const fn = (a, b) => a + b;',
          options: [{ max: 4 }],
        },
        {
          code: 'function MyClass(a, b, c, d, e) { }',
          options: [{ max: 4, ignoreConstructors: true }], // Constructor ignored
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Too Many Parameters', () => {
    ruleTester.run('invalid - excessive parameters', maxParameters, {
      valid: [],
      invalid: [
        {
          code: 'function tooMany(a, b, c, d, e) { return a + b + c + d + e; }',
          options: [{ max: 4 }],
          errors: [{ messageId: 'tooManyParameters' }],
        },
        {
          code: 'const fn = (a, b, c, d, e, f) => a + b;',
          options: [{ max: 4 }],
          errors: [{ messageId: 'tooManyParameters' }],
        },
        {
          code: `
            function complex(a, b, c, d, e, f, g) {
              return a + b + c + d + e + f + g;
            }
          `,
          options: [{ max: 4 }],
          errors: [{ messageId: 'tooManyParameters' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - max', maxParameters, {
      valid: [
        {
          code: 'function fn(a, b, c) { }',
          options: [{ max: 3 }],
        },
      ],
      invalid: [
        {
          code: 'function fn(a, b, c, d) { }',
          options: [{ max: 3 }],
          errors: [{ messageId: 'tooManyParameters' }],
        },
      ],
    });

    ruleTester.run('options - ignoreConstructors', maxParameters, {
      valid: [
        {
          code: 'function MyClass(a, b, c, d, e) { }',
          options: [{ max: 4, ignoreConstructors: true }],
        },
      ],
      invalid: [
        {
          code: 'function regularFunction(a, b, c, d, e) { }',
          options: [{ max: 4, ignoreConstructors: true }],
          errors: [{ messageId: 'tooManyParameters' }], // Not a constructor
        },
      ],
    });
  });
});

