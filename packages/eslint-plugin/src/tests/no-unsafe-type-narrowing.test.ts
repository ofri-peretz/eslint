/**
 * Comprehensive tests for no-unsafe-type-narrowing rule
 * Quality: Detects unsafe type narrowing patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeTypeNarrowing } from '../rules/quality/no-unsafe-type-narrowing';

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

describe('no-unsafe-type-narrowing', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe type assertions', noUnsafeTypeNarrowing, {
      valid: [
        // Simple type assertion
        {
          code: 'const value = data as string;',
        },
        // Type guard usage
        {
          code: 'if (isString(value)) { const str = value as string; }',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Type Assertions', () => {
    ruleTester.run('invalid - unsafe double assertion', noUnsafeTypeNarrowing, {
      valid: [],
      invalid: [
        {
          code: 'const value = data as unknown as string;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'const result = input as unknown as MyType;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'const value = data as any as string;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'function fn<T>(data: unknown) { return data as unknown as T; }',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnsafeTypeNarrowing, {
      valid: [
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
      ],
    });
  });
});

