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
    ],
    invalid: [],
  });
});
