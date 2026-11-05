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

/** The report on an IIFE that starts at the first `(` of `code`. */
const iifeError = (code: string) => {
  const at = code.indexOf('(');
  const insert = (text: string) => code.slice(0, at) + text + code.slice(at);
  return [
    {
      messageId: 'unreadableIIFE' as const,
      suggestions: [
        {
          messageId: 'suggestNamedFunction' as const,
          output: insert('// TODO: Extract complex IIFE to named function\n'),
        },
        {
          messageId: 'suggestBlockScope' as const,
          output: insert(
            '// TODO: Consider using block scope { const x = ...; }\n',
          ),
        },
      ],
    },
  ];
};

describe('no-unreadable-iife', () => {
  ruleTester.run('no-unreadable-iife', noUnreadableIife, {
    valid: [
      // Fidelity divergences (no_unreadable_iife): a short IIFE was reported
      // for holding one `if` / `try`, a helper function or three parameters,
      // none of which exceeds a documented limit.
      {
        name: 'a short IIFE holding a single if',
        code: `(() => { if (condition) { doSomething(); } })();`,
      },
      {
        name: 'the async entry point with try/catch',
        code: `(async () => { try { await main(); } catch (e) { fail(e); } })();`,
      },
      {
        name: 'an IIFE declaring a helper function',
        code: `(function() { function inner() {} inner(); })();`,
      },
      {
        name: 'an IIFE taking three parameters',
        code: `((a, b, c) => { use(a + b + c); })(1, 2, 3);`,
      },
      {
        name: 'a short returning IIFE with a branch, allowReturningIIFE: false',
        code: `const x = (() => { if (condition) { return 1; } return 2; })();`,
        options: [{ allowReturningIIFE: false }],
      },
      {
        name: 'a returning IIFE over maxStatements is an initializer',
        code: `const v = (() => { const a = read(); const b = read(); use(a); use(b); return a + b; })();`,
      },
      {
        name: 'a bare `return;` does not make an IIFE an initializer, but is short',
        code: `(() => { use(1); return; })();`,
      },
      {
        name: 'a member call on a function that is not call/apply',
        code: `(function () { a(); b(); c(); d(); }).bind(this);`,
      },
      {
        name: 'nesting at maxDepth',
        code: `(() => { if (ready()) { for (const x of list()) use(x); } })();`,
      },
      // Simple IIFE with return (expression body)
      {
        name: 'a one-expression IIFE still reads',
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
        name: 'a multi-statement IIFE inline',
        code: `(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();`,
        errors: [{
          messageId: 'unreadableIIFE',
          suggestions: [
            { messageId: 'suggestNamedFunction', output: `// TODO: Extract complex IIFE to named function\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
            { messageId: 'suggestBlockScope', output: `// TODO: Consider using block scope { const x = ...; }\n(() => { const a = 1; const b = 2; const c = 3; const d = 4; })();` },
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
      {
        name: 'a returning IIFE over maxStatements, allowReturningIIFE: false',
        code: `const v = (() => { const a = read(); const b = read(); use(a); use(b); return a + b; })();`,
        options: [{ allowReturningIIFE: false }],
        errors: iifeError(`const v = (() => { const a = read(); const b = read(); use(a); use(b); return a + b; })();`),
      },
      {
        name: 'a returning IIFE nested past maxDepth',
        code: `const v = (() => { if (ready()) { for (const x of list()) { if (x) return x; } } return 0; })();`,
        errors: iifeError(`const v = (() => { if (ready()) { for (const x of list()) { if (x) return x; } } return 0; })();`),
      },
      {
        name: 'an IIFE invoked through .call',
        code: `(function () { a(); b(); c(); d(); }).call(this);`,
        errors: iifeError(`(function () { a(); b(); c(); d(); }).call(this);`),
      },
      {
        name: 'an IIFE invoked through .apply',
        code: `(function () { a(); b(); c(); d(); }).apply(this, []);`,
        errors: iifeError(`(function () { a(); b(); c(); d(); }).apply(this, []);`),
      },
      {
        name: "an IIFE invoked through ['call']",
        code: `(() => { a(); b(); c(); d(); })['call'](this);`,
        errors: iifeError(`(() => { a(); b(); c(); d(); })['call'](this);`),
      },
    ],
  });
});
