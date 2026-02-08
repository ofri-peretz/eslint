/**
 * Tests for no-unreadable-iife rule
 * Prevent unreadable Immediately Invoked Function Expressions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnreadableIife } from '../../rules/maintainability/no-unreadable-iife';

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

describe('no-unreadable-iife', () => {
  ruleTester.run('no-unreadable-iife', noUnreadableIife, {
    valid: [
      // Simple IIFE with return (expression body)
      {
        code: `const result = (() => 'value')();`,
      },
      // Simple IIFE with block and return
      {
        code: `const result = (() => { return 'value'; })();`,
      },
      // IIFE with one statement
      {
        code: `(() => { console.log('init'); })();`,
      },
      // IIFE with two statements (under default max)
      {
        code: `(() => { const x = 1; return x; })();`,
      },
      // Returning IIFE is allowed by default
      {
        code: `
          const config = (() => {
            const env = process.env.NODE_ENV;
            const debug = env === 'development';
            return { env, debug };
          })();
        `,
      },
      // Simple function expression IIFE
      {
        code: `(function() { console.log('init'); })();`,
      },
      // Simple unary IIFE
      {
        code: `!function() { console.log('init'); }();`,
      },
    ],

    invalid: [
      // Too many statements (default max is 3)
      {
        code: `(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
          ],
        }],
      },
      // Complex control flow (if statement in IIFE body)
      {
        code: `(() => { if (condition) { doSomething(); } })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(() => { if (condition) { doSomething(); } })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(() => { if (condition) { doSomething(); } })();` },
          ],
        }],
      },
      // Too many parameters (>2) + too many statements
      {
        code: `((a, b, c) => { const x = a + b + c; const y = x * 2; const z = y + 1; const w = z * 3; })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n((a, b, c) => { const x = a + b + c; const y = x * 2; const z = y + 1; const w = z * 3; })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n((a, b, c) => { const x = a + b + c; const y = x * 2; const z = y + 1; const w = z * 3; })();` },
          ],
        }],
      },
      // Complex unary IIFE (!function)
      {
        code: `!function() { const a = 1; const b = 2; const c = 3; const d = 4; }();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `!// TODO: Extract complex IIFE to named function\nfunction() { const a = 1; const b = 2; const c = 3; const d = 4; }();` },
            { messageId: 'suggestBlockScope', output: `!// TODO: Consider using block scope { const x = ...; }\nfunction() { const a = 1; const b = 2; const c = 3; const d = 4; }();` },
          ],
        }],
      },
      // Complex function expression IIFE
      {
        code: `(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(function() { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
          ],
        }],
      },
      // Nested function declaration in IIFE
      {
        code: `(function() { function inner() {} })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(function() { function inner() {} })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(function() { function inner() {} })();` },
          ],
        }],
      },
      // Custom maxStatements: 1 makes 2-statement IIFEs invalid
      {
        code: `(() => { const a = 1; const b = 2; })();`,
        options: [{ maxStatements: 1 }],
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(() => { const a = 1; const b = 2; })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(() => { const a = 1; const b = 2; })();` },
          ],
        }],
      },
      // allowReturningIIFE: false flags complex returning IIFEs
      {
        code: `const x = (() => { if (condition) { return 1; } return 2; })();`,
        options: [{ allowReturningIIFE: false }],
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `const x = // TODO: Extract complex IIFE to named function\n(() => { if (condition) { return 1; } return 2; })();` },
            { messageId: 'suggestBlockScope', output: `const x = // TODO: Consider using block scope { const x = ...; }\n(() => { if (condition) { return 1; } return 2; })();` },
          ],
        }],
      },
    ],
  });
});
