/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectWeakPasswordValidation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const weak = [{ messageId: 'violationDetected' as const }];

describe('detect-weak-password-validation (mutation edges)', () => {
  ruleTester.run(
    'detect-weak-password-validation',
    detectWeakPasswordValidation,
    {
      valid: [
        {
          name: 'a string literal threshold is not a length',
          code: "if (password.length >= '6') {}",
        },
        {
          name: 'a const bound to a string is not a length',
          code: "const MIN = '6'; if (password.length >= MIN) {}",
        },
        {
          name: 'a parameter threshold is not resolvable',
          code: 'function check(password, min) { return password.length >= min; }',
        },
        {
          name: 'a transformation chain longer than four calls is not followed',
          code: 'if (password.trim().trim().trim().trim().trim().length < 6) {}',
        },
        {
          name: 'a free function of the password is not a method on it',
          code: 'if (normalize(password).length < 6) {}',
        },
      ],
      invalid: [
        {
          name: '== pins the length, a minimum of exactly n',
          code: 'if (password.length == 7) {}',
          errors: weak,
        },
        {
          name: '>= n enforces a minimum of n',
          code: 'if (password.length >= 7) {}',
          errors: weak,
        },
        {
          name: 'a minimum of exactly two is a real (weak) policy',
          code: 'if (password.length >= 2) {}',
          errors: weak,
        },
        {
          name: 'a four-call transformation chain is still followed',
          code: 'if (password.trim().trim().trim().trim().length < 6) {}',
          errors: weak,
        },
      ],
    },
  );
});
