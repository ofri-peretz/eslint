/**
 * Tests for consistent-function-scoping rule
 * Move function definitions to the highest possible scope
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentFunctionScoping } from '../../rules/maintainability/consistent-function-scoping';

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

describe('consistent-function-scoping', () => {
  describe('valid cases', () => {
    ruleTester.run('allow properly scoped functions', consistentFunctionScoping, {
      valid: [
        // Module-level function (already at top scope)
        {
          code: `
            function helper() {
              return 'value';
            }
          `,
        },
        // Module-level arrow function
        {
          code: `
            const helper = () => 'value';
          `,
        },
        // Function that captures outer variable
        {
          code: `
            function outer() {
              const message = 'hello';
              function inner() {
                return message;
              }
              return inner();
            }
          `,
        },
        // Arrow function capturing outer variable
        {
          code: `
            function outer() {
              const count = 0;
              const increment = () => count + 1;
              return increment();
            }
          `,
        },
        // Exported function
        {
          code: `
            export function helper() {
              return 'value';
            }
          `,
        },
        // Export default function
        {
          code: `
            export default function helper() {
              return 'value';
            }
          `,
        },
        // Arrow function that doesn't capture but checkArrowFunctions is false
        {
          code: `
            function outer() {
              const helper = () => 'value';
              return helper();
            }
          `,
          options: [{ checkArrowFunctions: false }],
        },
      ],
      invalid: [
        // Function that doesn't capture outer variables
        {
          code: `
            function outer() {
              function helper() {
                return 'value';
              }
              return helper();
            }
          `,
          errors: [{ 
            messageId: 'inconsistentFunctionScoping',
            suggestions: [{ 
              messageId: 'moveToModuleScope',
              output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function helper() {
                return 'value';
              }
              return helper();
            }
          `,
            }],
          }],
        },
      ],
    });
  });
});
