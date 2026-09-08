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
          name: 'an Error that names what went wrong',
          code: 'throw new Error("Something went wrong");',
          options: [{ requireMessage: true }],
        },
        {
          name: 'a built-in Error subclass with a message',
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
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Error Context', () => {
    ruleTester.run('invalid - errors without message', noMissingErrorContext, {
      valid: [],
      invalid: [
        {
          name: 'an Error with no context for whoever reads the log',
          code: 'throw new Error();',
          options: [{ requireMessage: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
        {
          code: 'throw undefined;',
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

  /**
   * Burgee's `UsageError extends Error { constructor(message, readonly hint?) }`
   * is thrown with a literal message and a hint, and re-throws caught errors —
   * and turned this rule off for two files. The reliability twin already
   * accepted both shapes (a custom *Error given any argument; a re-thrown
   * identifier) and the maintainability twin did not. The cases are the same in
   * both files so the twins cannot drift apart again.
   * See docs/intents/burgee-false-positives/.
   */
  describe('a custom Error subclass carries its own context (burgee)', () => {
    ruleTester.run(
      'custom error classes and re-throws',
      noMissingErrorContext,
      {
        valid: [
          {
            name: 'FP: a subclass whose first parameter is the message, given a literal and a hint',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: 'class UsageError extends Error { constructor(message: string, readonly hint?: string) { super(message); } }\nfunction g() { throw new UsageError("missing required option", "pass --x"); }',
            filename: 'src/execute.ts',
          },
          {
            name: 'FP: the same subclass given a template message',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: 'class UsageError extends Error { constructor(message: string, readonly hint?: string) { super(message); } }\nfunction f(name: string) { throw new UsageError(`missing required option --${name}`, `pass --${name} <value>`); }',
            filename: 'src/execute.ts',
          },
          {
            name: 'FP: a custom *Error given a non-literal message — the argument IS the context',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: 'function g(msg: string) { throw new UsageError(msg, "pass --x"); }',
            filename: 'src/execute.ts',
          },
          {
            name: 'FP: re-throwing a caught error keeps the message and stack it already has',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: 'try { run(); } catch (err) { if (err.code !== "commander.executeSubCommandAsync") throw err; }',
            filename: 'src/commander-command.ts',
          },
          {
            name: 'FP: a re-throw also satisfies the stack-trace requirement',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: 'const throwing = (err: CommanderError): void => { throw err; };',
            filename: 'src/commander-command.ts',
            options: [{ requireMessage: true, requireStackTrace: true }],
          },
        ],
        invalid: [
          {
            name: 'a non-string argument to the BASE Error class proves nothing',
            code: 'throw new Error(someVar);',
            filename: 'src/execute.ts',
            errors: [{ messageId: 'missingErrorContext' }],
          },
          {
            name: '`throw undefined` is an identifier with no diagnostic value',
            code: 'throw undefined;',
            filename: 'src/execute.ts',
            errors: [{ messageId: 'missingErrorContext' }],
          },
          {
            name: 'an empty Error beside the subclass still reports',
            code: 'class UsageError extends Error {}\nfunction g() { throw new Error(); }',
            filename: 'src/execute.ts',
            errors: [{ messageId: 'missingErrorContext' }],
          },
        ],
      },
    );
  });
});
