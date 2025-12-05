/**
 * Comprehensive tests for no-unreadable-iife rule
 * Prevent unreadable Immediately Invoked Function Expressions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnreadableIife } from '../../rules/architecture/no-unreadable-iife';

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

describe('no-unreadable-iife', () => {
  describe('Basic IIFE detection', () => {
    ruleTester.run('detect simple IIFEs', noUnreadableIife, {
      valid: [
        // Simple IIFEs that are readable
        {
          code: '(function() { return 42; })();',
        },
        {
          code: '(() => 42)();',
        },
        {
          code: '!function() { console.log("hello"); }();',
        },
        {
          code: 'void function() { return; }();',
        },
        // Non-IIFEs
        {
          code: 'const func = function() {}; func();',
        },
        {
          code: 'const arrow = () => {}; arrow();',
        },
        {
          code: 'setTimeout(function() {}, 1000);',
        },
      ],
      invalid: [
        // Too many statements
        {
          code: '(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
                },
              ],
            },
          ],
        },
        // Too many parameters (need allowReturningIIFE: false since it returns a value)
        {
          code: '(function(a, b, c, d) { return a + b + c + d; })(1, 2, 3, 4);',
          options: [{ allowReturningIIFE: false }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function(a, b, c, d) { return a + b + c + d; })(1, 2, 3, 4);',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function(a, b, c, d) { return a + b + c + d; })(1, 2, 3, 4);',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Statement count limits', () => {
    ruleTester.run('enforce statement count limits', noUnreadableIife, {
      valid: [
        // At limit
        {
          code: '(function() { const a = 1; const b = 2; const c = 3; })();',
          options: [{ maxStatements: 3 }],
        },
        // Under limit
        {
          code: '(function() { const a = 1; const b = 2; })();',
          options: [{ maxStatements: 3 }],
        },
      ],
      invalid: [
        // Over limit
        {
          code: '(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
          options: [{ maxStatements: 3 }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();',
                },
              ],
            },
          ],
        },
        // Custom limit
        {
          code: '(function() { const a = 1; const b = 2; })();',
          options: [{ maxStatements: 1 }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Nesting depth limits', () => {
    ruleTester.run('enforce nesting depth limits', noUnreadableIife, {
      valid: [
        // Simple IIFE with no nesting (no control flow)
        {
          code: '(function() { const x = 1; return x; })();',
          options: [{ maxDepth: 2 }],
        },
      ],
      invalid: [
        // Over depth limit
        {
          code: '(function() { if (true) { if (false) { if (maybe) { return; } } } })();',
          options: [{ maxDepth: 2 }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { if (true) { if (false) { if (maybe) { return; } } } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { if (true) { if (false) { if (maybe) { return; } } } })();',
                },
              ],
            },
          ],
        },
        // If statement is detected as complex control flow
        {
          code: '(function() { if (true) { return; } })();',
          options: [{ maxDepth: 2 }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { if (true) { return; } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { if (true) { return; } })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Complex control flow', () => {
    ruleTester.run('detect complex control flow', noUnreadableIife, {
      valid: [
        // Simple return without control flow
        {
          code: '(function() { return 1; })();',
          options: [{ maxStatements: 3 }],
        },
      ],
      invalid: [
        // If statement
        {
          code: '(function() { if (condition) { return 1; } else { return 0; } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { if (condition) { return 1; } else { return 0; } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { if (condition) { return 1; } else { return 0; } })();',
                },
              ],
            },
          ],
        },
        // For loop
        {
          code: '(function() { for (let i = 0; i < 10; i++) { console.log(i); } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { for (let i = 0; i < 10; i++) { console.log(i); } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { for (let i = 0; i < 10; i++) { console.log(i); } })();',
                },
              ],
            },
          ],
        },
        // While loop
        {
          code: '(function() { while (condition) { doSomething(); } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { while (condition) { doSomething(); } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { while (condition) { doSomething(); } })();',
                },
              ],
            },
          ],
        },
        // Switch statement
        {
          code: '(function() { switch (value) { case 1: return "one"; default: return "other"; } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { switch (value) { case 1: return "one"; default: return "other"; } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { switch (value) { case 1: return "one"; default: return "other"; } })();',
                },
              ],
            },
          ],
        },
        // Try-catch
        {
          code: '(function() { try { riskyOperation(); } catch (e) { handleError(e); } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { try { riskyOperation(); } catch (e) { handleError(e); } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { try { riskyOperation(); } catch (e) { handleError(e); } })();',
                },
              ],
            },
          ],
        },
        // Nested functions
        {
          code: '(function() { const inner = function() {}; inner(); })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const inner = function() {}; inner(); })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const inner = function() {}; inner(); })();',
                },
              ],
            },
          ],
        },
        // Arrow function assignment
        {
          code: '(function() { const func = () => {}; func(); })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const func = () => {}; func(); })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const func = () => {}; func(); })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Returning IIFEs', () => {
    ruleTester.run('handle returning IIFEs', noUnreadableIife, {
      valid: [
        // Returning IIFE (allowed by default)
        {
          code: '(function() { return 42; })();',
        },
        {
          code: '(() => { return "hello"; })();',
        },
        // Returning IIFE with simple logic
        {
          code: '(function() { const result = 1 + 2; return result; })();',
        },
      ],
      invalid: [
        // Complex returning IIFE (flagged for complexity)
        {
          code: '(function() { if (true) { return 1; } else { return 0; } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { if (true) { return 1; } else { return 0; } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { if (true) { return 1; } else { return 0; } })();',
                },
              ],
            },
          ],
        },
        // Complex returning IIFE not allowed
        {
          code: '(function() { const a = 1; const b = 2; return a + b; })();',
          options: [{ allowReturningIIFE: false, maxStatements: 2 }],
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; return a + b; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; return a + b; })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('IIFE patterns', () => {
    ruleTester.run('detect various IIFE patterns', noUnreadableIife, {
      valid: [
        // Parenthesized function expression
        {
          code: '(function() { return 42; })();',
        },
        // Parenthesized arrow function
        {
          code: '(() => { return 42; })();',
        },
        // Unary operator with function
        {
          code: '!function() { return true; }();',
        },
        {
          code: '+function() { return 1; }();',
        },
        {
          code: 'void function() { console.log("done"); }();',
        },
        // Arrow function with parentheses
        {
          code: '(x => x * 2)(5);',
        },
      ],
      invalid: [],
    });
  });

  describe('Multiple issues', () => {
    ruleTester.run('handle multiple issues', noUnreadableIife, {
      valid: [],
      invalid: [
        // Multiple issues combined
        {
          code: '(function(a, b, c, d) { if (condition) { for (let i = 0; i < 10; i++) { console.log(i); } } return a + b; })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function(a, b, c, d) { if (condition) { for (let i = 0; i < 10; i++) { console.log(i); } } return a + b; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function(a, b, c, d) { if (condition) { for (let i = 0; i < 10; i++) { console.log(i); } } return a + b; })();',
                },
              ],
            },
          ],
        },
        // Too many statements and complex control flow
        {
          code: '(function() { const a = 1; const b = 2; const c = 3; const d = 4; if (true) { if (false) { return; } } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; if (true) { if (false) { return; } } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; if (true) { if (false) { return; } } })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', noUnreadableIife, {
      valid: [],
      invalid: [
        // Complex IIFE suggestions
        {
          code: '(function() { if (condition) { return 1; } else { return 0; } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { if (condition) { return 1; } else { return 0; } })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { if (condition) { return 1; } else { return 0; } })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', noUnreadableIife, {
      valid: [
        // TypeScript IIFE with simple return
        {
          code: '((value: string): string => { return value.toUpperCase(); })("hello");',
        },
      ],
      invalid: [
        // Complex TypeScript IIFE - too many statements
        {
          code: '((param: number): number => { const result = param * 2; const adjusted = result + 1; const final = adjusted / 2; return final; })(5);',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n((param: number): number => { const result = param * 2; const adjusted = result + 1; const final = adjusted / 2; return final; })(5);',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n((param: number): number => { const result = param * 2; const adjusted = result + 1; const final = adjusted / 2; return final; })(5);',
                },
              ],
            },
          ],
        },
        // TypeScript with generics and control flow
        {
          code: '(<T>(value: T): T => { if (typeof value === "string") { return value.toUpperCase() as T; } return value; })("hello");',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(<T>(value: T): T => { if (typeof value === "string") { return value.toUpperCase() as T; } return value; })("hello");',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(<T>(value: T): T => { if (typeof value === "string") { return value.toUpperCase() as T; } return value; })("hello");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noUnreadableIife, {
      valid: [
        // Empty IIFE
        {
          code: '(function() {})();',
        },
        // IIFE with no body
        {
          code: '(() => {})();',
        },
        // Arrow function with expression body (simple)
        {
          code: '(() => 42)();',
        },
      ],
      invalid: [
        // Arrow function with block body but complex
        {
          code: '(() => { const a = 1; const b = 2; const c = 3; const d = 4; return a + b + c + d; })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; return a + b + c + d; })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; return a + b + c + d; })();',
                },
              ],
            },
          ],
        },
        // IIFE that looks like a function call but isn't
        {
          code: '(function() { console.log("first"); console.log("second"); console.log("third"); console.log("fourth"); })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: [
                {
                  messageId: 'suggestNamedFunction',
                  output: '// TODO: Extract complex IIFE to named function\n(function() { console.log("first"); console.log("second"); console.log("third"); console.log("fourth"); })();',
                },
                {
                  messageId: 'suggestBlockScope',
                  output: '// TODO: Consider using block scope { const x = ...; }\n(function() { console.log("first"); console.log("second"); console.log("third"); console.log("fourth"); })();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Real-world examples', () => {
    ruleTester.run('handle real-world patterns', noUnreadableIife, {
      valid: [
        // Module pattern (simple) - allowed with higher maxStatements
        {
          code: '(function() { const privateVar = "secret"; return { getSecret() { return privateVar; } }; })();',
          options: [{ maxStatements: 5 }],
        },
        // Simple returning IIFEs are valid by default
        {
          code: '(function() { const x = calculate(); return x * 2; })();',
        },
      ],
      invalid: [],
    });
  });
});
