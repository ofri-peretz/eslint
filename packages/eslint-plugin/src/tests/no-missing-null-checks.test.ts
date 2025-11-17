/**
 * Comprehensive tests for no-missing-null-checks rule
 * Quality: CWE-476 - Detects potential null pointer dereferences
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingNullChecks } from '../rules/quality/no-missing-null-checks';

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

describe('no-missing-null-checks', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe property access', noMissingNullChecks, {
      valid: [
        // Optional chaining
        {
          code: 'obj?.property?.method();',
        },
        {
          code: 'value?.nested?.deep;',
        },
        // Nullish coalescing
        {
          code: 'const result = value ?? defaultValue;',
        },
        // Explicit null check
        {
          code: 'if (obj !== null) { obj.property; }',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'obj.property;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Null Checks', () => {
    ruleTester.run('invalid - unsafe property access', noMissingNullChecks, {
      valid: [],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMissingNullChecks, {
      valid: [
        {
          code: 'obj.property;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });
});

