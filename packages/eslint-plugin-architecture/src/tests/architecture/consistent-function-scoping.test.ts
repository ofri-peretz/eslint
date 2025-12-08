/**
 * Comprehensive tests for consistent-function-scoping rule
 * Disallow functions that are declared in a scope which does not capture any variables from the outer scope
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentFunctionScoping } from '../../rules/architecture/consistent-function-scoping';

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

describe('consistent-function-scoping', () => {
  describe('Function declarations in function scope', () => {
    ruleTester.run('detect function declarations that can be moved to higher scope', consistentFunctionScoping, {
      valid: [
        // Function declarations at module level
        {
          code: 'function doBar(bar) { return bar === "bar"; }',
        },
        // Functions that capture outer variables (should stay in scope)
        {
          code: `
            export function doFoo(foo) {
              function doBar(bar) {
                return bar === "bar" && foo === "foo";
              }
              return doBar;
            }
          `,
        },
        // Functions that use parameters from outer function
        {
          code: `
            function outer(param) {
              function inner() {
                return param;
              }
              return inner;
            }
          `,
        },
        // Arrow functions that capture variables
        {
          code: `
            function outer(foo) {
              const inner = () => foo + "bar";
              return inner;
            }
          `,
        },
      ],
      invalid: [
        // Function in conditional block that doesn't capture outer variables
        {
          code: `
            if (condition) {
              function test() {
                return "test";
              }
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'test' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            if (condition) {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function test() {
                return "test";
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Multiple functions that can be moved
        {
          code: `
            function outer() {
              function helper1() {
                return "helper1";
              }
              function helper2() {
                return "helper2";
              }
              return [helper1, helper2];
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'helper1' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function helper1() {
                return "helper1";
              }
              function helper2() {
                return "helper2";
              }
              return [helper1, helper2];
            }
          `,
                },
              ],
            },
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'helper2' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              function helper1() {
                return "helper1";
              }
              // TODO: Move this function to module scope - it doesn't capture outer variables
function helper2() {
                return "helper2";
              }
              return [helper1, helper2];
            }
          `,
                },
              ],
            },
          ],
        },
        // Nested function scopes
        {
          code: `
            function outer() {
              function middle() {
                function inner() {
                  return "inner";
                }
                return inner;
              }
              return middle;
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'middle' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function middle() {
                function inner() {
                  return "inner";
                }
                return inner;
              }
              return middle;
            }
          `,
                },
              ],
            },
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'inner' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              function middle() {
                // TODO: Move this function to module scope - it doesn't capture outer variables
function inner() {
                  return "inner";
                }
                return inner;
              }
              return middle;
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Arrow function option', () => {
    ruleTester.run('checkArrowFunctions option', consistentFunctionScoping, {
      valid: [
        // Arrow functions should be ignored when checkArrowFunctions is false
        {
          code: `
            function doFoo(foo) {
              const doBar = bar => {
                return bar === "bar";
              };
              return doBar;
            }
          `,
          options: [{ checkArrowFunctions: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', consistentFunctionScoping, {
      valid: [
        // Function expression assigned to variable
        {
          code: `
            function outer() {
              const func = function() {
                return "test";
              };
              return func;
            }
          `,
        },
      ],
      invalid: [
        // Empty function that doesn't capture outer variables
        {
          code: `
            function outer() {
              function empty() {}
              return empty;
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'empty' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function empty() {}
              return empty;
            }
          `,
                },
              ],
            },
          ],
        },
        // Function with only local variables
        {
          code: `
            function outer() {
              function local() {
                const x = 1;
                return x;
              }
              return local;
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'local' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function local() {
                const x = 1;
                return x;
              }
              return local;
            }
          `,
        },
      ],
            },
          ],
        },
        // Function that references global variables (not outer scope variables)
        {
          code: `
            function outer() {
              function usesGlobal() {
                return console.log("test");
              }
              return usesGlobal;
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'usesGlobal' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function usesGlobal() {
                return console.log("test");
              }
              return usesGlobal;
            }
          `,
                },
              ],
            },
          ],
        },
        // IIFE that doesn't capture outer variables
        {
          code: `
            function outer() {
              (function() {
                return "test";
              })();
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'anonymous function' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            function outer() {
              (// TODO: Move this function to module scope - it doesn't capture outer variables
function() {
                return "test";
              })();
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Complex scenarios', () => {
    ruleTester.run('complex function analysis', consistentFunctionScoping, {
      valid: [
        // Function that uses outer function parameter
        {
          code: `
            function processData(data) {
              function validate() {
                return data.length > 0;
              }
              return validate;
            }
          `,
        },
        // Function that uses variable from closure
        {
          code: `
            function createCounter() {
              let count = 0;
              function increment() {
                count++;
                return count;
              }
              return increment;
            }
          `,
        },
      ],
      invalid: [
        // Function in class method that doesn't capture
        {
          code: `
            class Processor {
              process(data) {
                function helper() {
                  return "static result";
                }
                return helper() + data;
              }
            }
          `,
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              data: { functionName: 'helper' },
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `
            class Processor {
              process// TODO: Move this function to module scope - it doesn't capture outer variables
(data) {
                function helper() {
                  return "static result";
                }
                return helper() + data;
              }
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
