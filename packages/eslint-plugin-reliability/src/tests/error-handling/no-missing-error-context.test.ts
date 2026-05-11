/**
 * Comprehensive tests for no-missing-error-context rule
 * Error Handling: Detects thrown errors without context
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingErrorContext } from '../../rules/error-handling/no-missing-error-context';

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

describe('no-missing-error-context', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - errors with context', noMissingErrorContext, {
      valid: [
        // Error with message
        {
          code: 'throw new Error("Something went wrong");',
          options: [{ requireMessage: true }],
        },
        {
          code: 'throw new TypeError("Invalid type");',
          options: [{ requireMessage: true }],
        },
        // Template literal message
        {
          code: 'throw new Error(`Error: ${message}`);',
          options: [{ requireMessage: true }],
        },
        // String literal
        {
          code: 'throw "Error message";',
          options: [{ requireMessage: true }],
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'throw new Error();',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true, requireMessage: true }],
        },
        // Re-throw of caught error — original message + stack already attached.
        {
          code: 'try { run(); } catch (e) { throw e; }',
          options: [{ requireMessage: true }],
        },
        // Re-throw of a bare named identifier (e.g. forwarded error param).
        {
          code: 'function forward(error) { throw error; }',
          options: [{ requireMessage: true }],
        },
        // Re-throw also satisfies stack-trace requirement.
        {
          code: 'try { run(); } catch (err) { throw err; }',
          options: [{ requireStackTrace: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Error Context', () => {
    ruleTester.run('invalid - errors without message', noMissingErrorContext, {
      valid: [],
      invalid: [
        {
          code: 'throw new Error();',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
        {
          code: 'throw undefined;',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
        // `NaN` is a global identifier but carries no diagnostic value.
        {
          code: 'throw NaN;',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
        // `Infinity` — same reasoning.
        {
          code: 'throw Infinity;',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
      ],
    });

    ruleTester.run(
      'invalid - errors without stack trace',
      noMissingErrorContext,
      {
        valid: [],
        invalid: [
          {
            code: 'throw "Error message";',
            options: [{ requireStackTrace: true }],
            errors: [{ messageId: 'missingErrorContext' }],
          },
          // Global-constant identifiers don't carry a stack.
          {
            code: 'throw undefined;',
            options: [{ requireStackTrace: true }],
            errors: [{ messageId: 'missingErrorContext' }],
          },
          {
            code: 'throw NaN;',
            options: [{ requireStackTrace: true }],
            errors: [{ messageId: 'missingErrorContext' }],
          },
          {
            code: 'throw Infinity;',
            options: [{ requireStackTrace: true }],
            errors: [{ messageId: 'missingErrorContext' }],
          },
        ],
      },
    );
  });

  describe('Options', () => {
    ruleTester.run('options - requireMessage', noMissingErrorContext, {
      valid: [
        {
          code: 'throw new Error("message");',
          options: [{ requireMessage: true }],
        },
      ],
      invalid: [
        {
          code: 'throw new Error();',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
      ],
    });

    ruleTester.run('options - requireStackTrace', noMissingErrorContext, {
      valid: [
        {
          code: 'throw new Error("message");',
          options: [{ requireStackTrace: true }],
        },
      ],
      invalid: [
        {
          code: 'throw "message";',
          options: [{ requireStackTrace: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
      ],
    });
  });
});
