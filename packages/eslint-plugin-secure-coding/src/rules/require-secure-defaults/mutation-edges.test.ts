/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureDefaults } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const violation = [{ messageId: 'violationDetected' as const }];

describe('require-secure-defaults (mutation edges)', () => {
  ruleTester.run('require-secure-defaults', requireSecureDefaults, {
    valid: [
      {
        name: 'a callback returning a computed verdict can fail verification',
        code: 'const o = { checkServerIdentity: () => verdict };',
      },
      {
        name: 'a computed key is a variable, not the option name',
        code: 'const o = { [strictSSL]: false };',
      },
      {
        name: 'a property is not its own cookie corroboration',
        options: [{ additionalCookieAttributes: ['secure'] }],
        code: 'const o = { secure: false };',
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a callback returning false still reports success to Node',
        code: 'const o = { checkServerIdentity: () => false };',
        errors: violation,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a block callback returning a string still reports success to Node',
        code: "const o = { checkServerIdentity: () => { return 'ok'; } };",
        errors: violation,
      },
    ],
  });
});
