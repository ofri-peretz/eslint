import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMagicNumbers } from '../../rules/conventions/no-magic-numbers';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-magic-numbers', () => {
  ruleTester.run('no-magic-numbers', noMagicNumbers, {
    valid: [
      // Default allowed values: -1, 0, 1, 2
      { code: 'const x = 0;' },
      { code: 'const x = 1;' },
      { code: 'const x = -1;' },
      { code: 'const x = 2;' },
      // Named constants — value is the definition itself
      { code: 'const TIMEOUT_MS = 5000;' },
      { code: 'const MAX_RETRIES = 3;' },
      // Exported constants
      { code: 'export const PAGE_SIZE = 20;' },
      // Array index access (default: allowed)
      { code: 'const third = items[3];' },
      // Default parameter (default: allowed)
      { code: 'function delay(ms = 1000) {}' },
      // Enum initializer (default: allowed)
      { code: 'enum Status { Active = 1, Inactive = 2 }' },
      // Object property key — numeric key as a key literal
      { code: 'const map = { 404: "Not Found" };' },
      // Custom ignore list
      { code: 'const t = 60;', options: [{ ignore: [60] }] },
    ],
    invalid: [
      {
        code: 'setTimeout(cb, 5000);',
        errors: [{ messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_5000 = 5000;\nsetTimeout(cb, MAGIC_5000);' }] }],
      },
      {
        code: 'const limit = users.length > 100 ? users.slice(0, 100) : users;',
        errors: [
          { messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_100 = 100;\nconst limit = users.length > MAGIC_100 ? users.slice(0, 100) : users;' }] },
          { messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_100 = 100;\nconst limit = users.length > 100 ? users.slice(0, MAGIC_100) : users;' }] },
        ],
      },
      {
        code: 'if (response.status === 404) {}',
        errors: [{ messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_404 = 404;\nif (response.status === MAGIC_404) {}' }] }],
      },
      {
        code: 'const scaled = value * 1.5;',
        errors: [{ messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_1_5 = 1.5;\nconst scaled = value * MAGIC_1_5;' }] }],
      },
    ],
  });

  ruleTester.run('no-magic-numbers — ignoreArrayIndexes: false', noMagicNumbers, {
    valid: [],
    invalid: [
      {
        code: 'const x = arr[5];',
        options: [{ ignoreArrayIndexes: false }],
        errors: [{ messageId: 'noMagicNumber', suggestions: [{ messageId: 'extractConst', output: 'const MAGIC_5 = 5;\nconst x = arr[MAGIC_5];' }] }],
      },
    ],
  });
});

/**
 * The two classes the 20-repository ledger named.
 *
 * This rule produced 22,942 findings there — 1,147 per repository against 204
 * on the pinned 8, and the highest volume of any rule in the ecosystem. Four
 * classes dominated, and these are the two that are unambiguously not magic:
 *
 *   for (let j = 0; j < 4; j++)     the number IS the loop's shape
 *   arguments.length === 3          the number IS the arity
 *
 * The other two — protocol constants like `response.status >= 400`, and config
 * files where every tuning number is data — stay reported and stay recorded as
 * gaps, because neither can be told apart from an arbitrary number without
 * knowing what is being compared.
 */
describe('no-magic-numbers — loop bounds and arity', () => {
  ruleTester.run('valid - idiomatic positions', noMagicNumbers, {
    valid: [
      { code: 'for (let i = 0; i < 4; i += 1) { run(i); }' },
      // Each clause of the header in turn: init, test, update.
      //
      // The values dodge two earlier exemptions on purpose. DEFAULT_IGNORE
      // holds -1/0/1/2, so a `-= 2` step never reaches this check; and
      // `isVariableDeclarator` runs first, so a `let i = 7` init is exempted
      // as a named constant before the loop check sees it. The init case
      // therefore needs a bare assignment rather than a declaration.
      // An object property VALUE. Off by default, matching ESLint core's own
      // `detectObjects: false` — a config object is a place to write literals.
      // Measured as 31% of all findings on the 20-repository corpus, the
      // single largest context by a factor of two.
      { code: 'const cfg = { timeout: 5000, retries: 7 };' },
      { code: 'send({ port: 8080 });' },
      { code: 'for (let i = 0; i > n; i -= 7) { run(i); }' },
      { code: 'for (i = 7; i > n; i--) { run(i); }' },
      // Nested arbitrarily deep in the header. A fixed ancestry limit stopped
      // exempting these at whatever depth it happened to choose.
      { code: 'for (let i = 0; i < f(g(h(9))); i++) { run(i); }' },
      { code: 'for (let i = 0; i < a[b[c[7]]]; i++) { run(i); }' },
      // The literal on either side of the comparison.
      { code: 'function f() { if (3 === arguments.length) { return 1; } return 0; }' },
      { code: 'function f() { if (arguments.length === 3) { return 1; } return 0; }' },
      { code: 'function f(args) { if (args.length !== 2) { return 1; } return 0; }' },
      {
        code: 'for (let i = 0; i < 4; i += 1) { run(i); }',
        options: [{ ignoreLoopBounds: true }],
      },
    ],
    invalid: [
      {
        // FN GUARD: the loop BODY is ordinary code. Only the header is idiom.
        code: 'for (let i = 0; i < 4; i += 1) { run(i * 7); }',
        errors: [
          {
            messageId: 'noMagicNumber',
            suggestions: [
              {
                messageId: 'extractConst',
                output:
                  'for (let i = 0; i < 4; i += 1) { const MAGIC_7 = 7;\n                                 run(i * MAGIC_7); }',
              },
            ],
          },
        ],
      },
      {
        // FN GUARD: turning detectObjects ON restores the finding.
        code: 'const cfg = { timeout: 5000 };',
        options: [{ detectObjects: true }],
        errors: [
          {
            messageId: 'noMagicNumber',
            suggestions: [
              {
                messageId: 'extractConst',
                output: 'const MAGIC_5000 = 5000;\nconst cfg = { timeout: MAGIC_5000 };',
              },
            ],
          },
        ],
      },
      {
        // FN GUARD: `.length` must be the SIBLING of the comparison, not just
        // present somewhere in the expression.
        code: 'const r = compute(bar.length, 3);',
        errors: [
          {
            messageId: 'noMagicNumber',
            suggestions: [
              {
                messageId: 'extractConst',
                output: 'const MAGIC_3 = 3;\nconst r = compute(bar.length, MAGIC_3);',
              },
            ],
          },
        ],
      },
      {
        // FN GUARD: turning the option off restores the finding.
        code: 'for (let i = 0; i < 4; i += 1) { run(i); }',
        options: [{ ignoreLoopBounds: false }],
        errors: [
          {
            messageId: 'noMagicNumber',
            suggestions: [
              {
                messageId: 'extractConst',
                output: 'const MAGIC_4 = 4;\nfor (let i = 0; i < MAGIC_4; i += 1) { run(i); }',
              },
            ],
          },
        ],
      },
      {
        code: 'function f() { if (arguments.length === 3) { return 1; } return 0; }',
        options: [{ ignoreLengthComparisons: false }],
        errors: [
          {
            messageId: 'noMagicNumber',
            suggestions: [
              {
                messageId: 'extractConst',
                output:
                  'function f() { const MAGIC_3 = 3;\n               if (arguments.length === MAGIC_3) { return 1; } return 0; }',
              },
            ],
          },
        ],
      },
    ],
  });
});
