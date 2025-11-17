/**
 * Comprehensive tests for no-silent-errors rule
 * Error Handling: Detects empty catch blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSilentErrors } from '../rules/error-handling/no-silent-errors';

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

describe('no-silent-errors', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - catch blocks with handling', noSilentErrors, {
      valid: [
        // Catch with error logging
        {
          code: `
            try {
              doSomething();
            } catch (error) {
              console.error(error);
            }
          `,
        },
        {
          code: `
            try {
              doSomething();
            } catch (error) {
              handleError(error);
            }
          `,
        },
        // Catch with rethrow
        {
          code: `
            try {
              doSomething();
            } catch (error) {
              throw new CustomError(error);
            }
          `,
        },
        // Test files (if ignoreInTests is true)
        {
          code: `
            try {
              doSomething();
            } catch (error) {
            }
          `,
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Empty Catch Blocks', () => {
    ruleTester.run('invalid - empty catch blocks', noSilentErrors, {
      valid: [],
      invalid: [
        {
          code: `
            try {
              doSomething();
            } catch (error) {
            }
          `,
          errors: [{ messageId: 'silentError' }],
        },
        {
          code: `
            try {
              doSomething();
            } catch {
            }
          `,
          errors: [{ messageId: 'silentError' }],
        },
        {
          code: `
            try {
              doSomething();
            } catch (error) {
              // Empty
            }
          `,
          errors: [{ messageId: 'silentError' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noSilentErrors, {
      valid: [
        {
          code: `
            try {
              doSomething();
            } catch (error) {
            }
          `,
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: `
            try {
              doSomething();
            } catch (error) {
            }
          `,
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'silentError' }],
        },
      ],
    });
  });
});

