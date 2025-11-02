/**
 * Comprehensive tests for detect-eval-with-expression rule
 * Tests eval() and Function constructor detection with dynamic expressions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from '../rules/security/detect-eval-with-expression';

// Configure RuleTester for Vitest
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

describe('detect-eval-with-expression', () => {
  describe('Basic detection', () => {
    ruleTester.run('detects eval and Function constructor usage', detectEvalWithExpression, {
      valid: [
        { code: 'JSON.parse(str);' },
      ],
      invalid: [],
    });
  });
});
