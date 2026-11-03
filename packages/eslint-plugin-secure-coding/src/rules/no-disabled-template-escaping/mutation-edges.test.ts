/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDisabledTemplateEscaping } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const disabled = [{ messageId: 'escapingDisabled' as const }];

describe('no-disabled-template-escaping (mutation edges)', () => {
  ruleTester.run('no-disabled-template-escaping', noDisabledTemplateEscaping, {
    valid: [
      {
        name: '||= false leaves an enabled escape alone',
        code: 'env.escapeMarkup ||= false;',
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: &&= false turns an enabled escape off',
        code: 'env.escapeMarkup &&= false;',
        errors: disabled,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: ??= false turns an unset (default) escape off',
        code: 'env.escapeMarkup ??= false;',
        errors: disabled,
      },
    ],
  });
});
