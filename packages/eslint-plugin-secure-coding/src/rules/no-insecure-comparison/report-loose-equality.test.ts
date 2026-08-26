/**
 * Lock for the `reportLooseEquality` option.
 *
 * The option lets a project keep the findings only a security plugin makes —
 * `==` or `===` on a token, password or signature — and leave generic type
 * coercion to `eqeqeq`. It exists because the two are not the same claim:
 * IGNF/cartes.gouv.fr-entree-carto suppressed this rule fifteen times, every
 * one annotated "comparaison de clefs metier, pas de secret".
 *
 * The regression these cases exist for: the first version of the option
 * returned early on ANY non-secret-path report, which silenced
 * `if (apiKey == provided)` — loose equality on a credential, which is worse
 * than strict, not better. Removing the carve-out below makes that case pass
 * silently again.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const OFF = [{ reportLooseEquality: false }] as const;

describe('no-insecure-comparison — reportLooseEquality', () => {
  ruleTester.run('reportLooseEquality', noInsecureComparison, {
    valid: [
      {
        // 69 findings across the scanned corpus were this exact shape.
        name: 'FP: an error code is not a credential — 69 findings in the wild',
        code: `if (e.code == 'MODULE_NOT_FOUND') { retry(); }`,
        options: OFF,
      },
      {
        // 71 findings, the largest single shape for this rule.
        // @source IGNF/cartes.gouv.fr-entree-carto
        name: 'FP: a filename is not a credential — 71 findings, the largest shape',
        code: `if (key == filename) { use(key); }`,
        options: OFF,
      },
    ],
    invalid: [
      {
        name: 'opting out never silences a secret compared strictly',
        code: `if (token === expected) { grant(); }`,
        options: OFF,
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output: `if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) { grant(); }`,
              },
            ],
          },
        ],
      },
      {
        name: 'opting out never silences a secret compared loosely',
        code: `if (apiKey == provided) { grant(); }`,
        options: OFF,
        errors: [
          {
            messageId: 'insecureComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output: `if (apiKey === provided) { grant(); }`,
              },
            ],
          },
        ],
      },
      {
        name: 'the default is unchanged — plain loose equality still reports',
        code: `if (e.code == 'MODULE_NOT_FOUND') { retry(); }`,
        errors: [
          {
            messageId: 'insecureComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output: `if (e.code === 'MODULE_NOT_FOUND') { retry(); }`,
              },
            ],
          },
        ],
      },
    ],
  });
});
