/**
 * Two ways this rule called a public value a secret.
 *
 * 1. DESTRUCTURING A SIBLING PROPERTY. `const { kind } = token` binds
 *    `token.kind`, not `token` — but the name resolver walked the declarator's
 *    initializer whole, so every property pulled off an object named `token`
 *    inherited that object's secret-ness. An argv token's `kind`, an SGR token's
 *    `code`. Renaming the same value (`const { token: t } = session`) still
 *    resolves through the destructuring KEY, which is where that hop belongs.
 *
 * 2. COMPARING AGAINST A SOURCE LITERAL. A timing attack needs the attacker to
 *    vary one side a character at a time; a literal written in the file cannot be
 *    varied. `token === '--'` is a parser reading the option terminator. Comparing
 *    a secret to a hardcoded string is a finding — a hardcoded-credential finding,
 *    which this rule deliberately does not make (see the CWE-208/CWE-798 split at
 *    the top of the rule).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-insecure-comparison — a public value is not a secret', () => {
  ruleTester.run(
    'destructured siblings and literal operands',
    noInsecureComparison,
    {
      valid: [
        {
          name: 'a sibling property of an object named `token`',
          code: `
          function split(tokens) {
            for (const token of tokens) {
              const { kind } = token;
              if (kind === label) return kind;
            }
          }
        `,
        },
        {
          name: 'an SGR code destructured off a token',
          code: `
          function colorStyle(token) {
            const { code } = token;
            return code === extended;
          }
        `,
        },
        {
          name: 'a renamed destructure of a non-secret sibling',
          code: `
          function f(token, expected) {
            const { kind: k } = token;
            return k === expected;
          }
        `,
        },
        {
          name: 'compared against a string literal — the attacker cannot vary a constant',
          code: `
          function singleDashHint(argv) {
            for (const token of argv) {
              if (token === '--') return undefined;
            }
          }
        `,
        },
        {
          name: 'compared against a template literal with no expressions',
          code: 'function f(apiKey) { return apiKey === `--`; }',
        },
        {
          name: 'compared against a negative numeric literal',
          code: 'function f(token) { return token === -1; }',
        },
      ],
      invalid: [
        {
          name: 'renaming the secret itself still resolves through the destructuring key',
          code: `
          function check(session, presented) {
            const { token: t } = session;
            return t === presented;
          }
        `,
          errors: [
            {
              messageId: 'timingUnsafeComparison' as const,
              suggestions: [
                {
                  messageId: 'useTimingSafeEqual' as const,
                  output: `
          function check(session, presented) {
            const { token: t } = session;
            return crypto.timingSafeEqual(Buffer.from(t), Buffer.from(presented));
          }
        `,
                },
              ],
            },
          ],
        },
        {
          name: 'an ARRAY destructure keeps resolving its initializer — it binds no key',
          code: `
          function check(tokenCandidates, presented) {
            const [expected] = tokenCandidates;
            return expected === presented;
          }
        `,
          errors: [
            {
              messageId: 'timingUnsafeComparison' as const,
              suggestions: [
                {
                  messageId: 'useTimingSafeEqual' as const,
                  output: `
          function check(tokenCandidates, presented) {
            const [expected] = tokenCandidates;
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
          }
        `,
                },
              ],
            },
          ],
        },
        {
          name: 'a non-destructured hop still carries the name',
          code: `
          function check(config, presented) {
            const expected = config.callback.token;
            return expected === presented;
          }
        `,
          errors: [
            {
              messageId: 'timingUnsafeComparison' as const,
              suggestions: [
                {
                  messageId: 'useTimingSafeEqual' as const,
                  output: `
          function check(config, presented) {
            const expected = config.callback.token;
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
          }
        `,
                },
              ],
            },
          ],
        },
        {
          name: 'two secrets compared directly are untouched by either guard',
          code: 'function check(expectedPassword, presentedPassword) { return expectedPassword === presentedPassword; }',
          errors: [
            {
              messageId: 'timingUnsafeComparison' as const,
              suggestions: [
                {
                  messageId: 'useTimingSafeEqual' as const,
                  output:
                    'function check(expectedPassword, presentedPassword) { return crypto.timingSafeEqual(Buffer.from(expectedPassword), Buffer.from(presentedPassword)); }',
                },
              ],
            },
          ],
        },
      ],
    },
  );
});
