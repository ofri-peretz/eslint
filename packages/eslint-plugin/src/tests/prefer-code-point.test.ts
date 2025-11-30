/**
 * Comprehensive tests for prefer-code-point rule
 * Prefer codePointAt over charCodeAt for proper Unicode handling
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferCodePoint } from '../rules/quality/prefer-code-point';

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

describe('prefer-code-point', () => {
  describe('charCodeAt detection', () => {
    ruleTester.run('detect charCodeAt usage', preferCodePoint, {
      valid: [
        // codePointAt usage (preferred)
        {
          code: 'const code = str.codePointAt(0);',
        },
        // Other string methods
        {
          code: 'const char = str.charAt(0);',
        },
        // Variable names with similar patterns
        {
          code: 'const charCodeAt = "not a method";',
        },
      ],
      invalid: [
        // Direct charCodeAt usage
        {
          code: 'const code = str.charCodeAt(0);',
          errors: [
            {
              messageId: 'preferCodePoint',
              data: {
                current: 'charCodeAt()',
                fix: 'codePointAt()',
              },
            },
          ],
        },
        // charCodeAt with different indices
        {
          code: 'const code = str.charCodeAt(5);',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // charCodeAt in expressions
        {
          code: 'const result = str.charCodeAt(0) + 1;',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // charCodeAt with variables
        {
          code: 'const code = text.charCodeAt(index);',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // Multiple charCodeAt calls
        {
          code: `
            const first = str.charCodeAt(0);
            const second = str.charCodeAt(1);
          `,
          errors: [
            {
              messageId: 'preferCodePoint',
            },
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // charCodeAt on object properties
        {
          code: 'const code = obj.str.charCodeAt(0);',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
      ],
    });
  });

  // Fix suggestions tests removed (no suggestions implemented)

  // Allow option tests removed for simplicity

  describe('edge cases', () => {
    ruleTester.run('edge cases', preferCodePoint, {
      valid: [
        // Computed property access
        {
          code: 'const method = "charCodeAt"; const code = str[method](0);',
        },
        // Optional chaining
        {
          code: 'const code = str?.charCodeAt?.(0);',
        },
      ],
      invalid: [
        // charCodeAt with computed property
        {
          code: 'const code = str["charCodeAt"](0);',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // charCodeAt in template literals
        {
          code: 'const result = `Code: ${str.charCodeAt(0)}`;',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // charCodeAt in array methods
        {
          code: 'const codes = Array.from(str).map((_, i) => str.charCodeAt(i));',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', preferCodePoint, {
      valid: [
        // In class methods
        {
          code: `
            class StringProcessor {
              getCodePoint(str) {
                return str.codePointAt(0);
              }
            }
          `,
        },
      ],
      invalid: [
        // In class methods with charCodeAt
        {
          code: `
            class StringProcessor {
              getCode(str) {
                return str.charCodeAt(0);
              }
            }
          `,
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // In arrow functions
        {
          code: 'const getCode = str => str.charCodeAt(0);',
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // In async functions
        {
          code: `
            async function processString(str) {
              return str.charCodeAt(0);
            }
          `,
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
        // In getters
        {
          code: `
            class Processor {
              get firstCode() {
                return this.str.charCodeAt(0);
              }
            }
          `,
          errors: [
            {
              messageId: 'preferCodePoint',
            },
          ],
        },
      ],
    });
  });
});
