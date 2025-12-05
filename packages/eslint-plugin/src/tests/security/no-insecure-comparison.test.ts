/**
 * Comprehensive tests for no-insecure-comparison rule
 * CWE-697: Incorrect Comparison
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from '../../rules/security/no-insecure-comparison';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-insecure-comparison', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - strict equality operators', noInsecureComparison, {
      valid: [
        {
          code: 'if (x === y) {}',
        },
        {
          code: 'if (x !== y) {}',
        },
        {
          code: 'const result = a === b ? 1 : 0;',
        },
        {
          code: 'if (value !== null && value !== undefined) {}',
        },
        {
          code: 'if (user.id === userId) {}',
        },
        // Test files (when allowInTests is true)
        {
          code: 'if (x == y) {}',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['x == y'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Loose Equality', () => {
    ruleTester.run('invalid - loose equality operator', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: 'if (x == y) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: 'if (x === y) {}',
        },
        {
          code: 'if (user.id == userId) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (user.id === userId) {}',
                },
              ],
            },
          ],
          output: 'if (user.id === userId) {}',
        },
        {
          code: 'const result = a == b ? 1 : 0;',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'const result = a === b ? 1 : 0;',
                },
              ],
            },
          ],
          output: 'const result = a === b ? 1 : 0;',
        },
      ],
    });
  });

  describe('Invalid Code - Loose Inequality', () => {
    ruleTester.run('invalid - loose inequality operator', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: 'if (x != y) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x !== y) {}',
                },
              ],
            },
          ],
          output: 'if (x !== y) {}',
        },
        {
          code: 'if (value != null) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (value !== null) {}',
                },
              ],
            },
          ],
          output: 'if (value !== null) {}',
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noInsecureComparison, {
      valid: [
        {
          code: 'if (x == y) {}',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'if (x == y) {}',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: 'if (x === y) {}',
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noInsecureComparison, {
      valid: [
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['x == y'] }],
        },
        {
          code: 'if (a != b) {}',
          options: [{ ignorePatterns: ['a != b'] }],
        },
      ],
      invalid: [
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['other'] }],
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: 'if (x === y) {}',
        },
      ],
    });
  });
});

