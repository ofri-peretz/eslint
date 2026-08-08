/**
 * Coverage-gap tests for require-secure-deletion (Layer 1).
 * Targets: UnaryExpression with a non-delete operator.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureDeletion } from './index';

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

describe('require-secure-deletion coverage gaps', () => {
  ruleTester.run('require-secure-deletion', requireSecureDeletion, {
    valid: [
      // Non-delete unary operators → operator check false
      { code: 'const negated = !flag;' },
      { code: 'const kind = typeof value;' },
      // `delete` of a non-member expression → no statically known property
      { code: 'delete window[Symbol.iterator];' },
      // Computed member with a non-string literal key
      { code: 'delete arr[0];' },
      // Custom fragment not configured → not sensitive
      { code: 'delete record.pinCode;' },
      // Argument is not a member expression at all → no property name
      { code: 'delete (a, b.password);' },
    ],
    invalid: [
      // Optional chaining still resolves to the property name
      { code: 'delete user?.password;', errors: [{ messageId: 'violationDetected' }] },
      // Custom fragment configured → reported
      {
        code: 'delete record.pinCode;',
        options: [{ additionalSensitiveProperties: ['pincode'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
