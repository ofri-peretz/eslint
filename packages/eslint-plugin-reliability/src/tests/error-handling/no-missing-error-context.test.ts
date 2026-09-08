/**
 * Comprehensive tests for no-missing-error-context rule
 * Error Handling: Detects thrown errors without context
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
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
  describe('Custom Error Classes and Stack Traces', () => {
    ruleTester.run('custom error constructor arguments', noMissingErrorContext, {
      valid: [
        // Non-string argument to a custom *Error class — the constructor
        // argument IS the context
        { code: 'throw new UserNotFoundError(userId);', filename: 'src/app.ts' },
        // Template literal thrown directly carries interpolated context
        { code: 'throw `failed for ${id}`;', filename: 'src/app.ts' },
      ],
      invalid: [
        // Non-string argument to the BASE Error class proves nothing
        {
          code: 'throw new Error(someVar);',
          filename: 'src/app.ts',
          errors: [{ messageId: 'missingErrorContext' }],
        },
      ],
    });

    ruleTester.run('stack trace requirement', noMissingErrorContext, {
      valid: [
        // *Error-suffixed class satisfies the stack-trace requirement
        {
          code: "throw new CustomError('x');",
          filename: 'src/app.ts',
          options: [{ requireMessage: false, requireStackTrace: true }],
        },
      ],
      invalid: [
        // Non-Error constructor has no guaranteed stack trace
        {
          code: "throw new Foo('x');",
          filename: 'src/app.ts',
          options: [{ requireMessage: false, requireStackTrace: true }],
          errors: [{ messageId: 'missingErrorContext' }],
        },
      ],
    });
  });

  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests for parser-unreachable branches
  // ---------------------------------------------------------------------

  describe('Layer 2: throw without an argument (synthetic AST)', () => {
    // `throw;` is a SyntaxError in JS, so node.argument === null can only be
    // produced synthetically.
    it('reports missing message for an argument-less throw (options null fallback)', () => {
      const { listeners, reports } = createWithMockContext(noMissingErrorContext, {
        options: [null],
      });
      const node = { type: 'ThrowStatement', argument: null } as unknown as TSESTree.ThrowStatement;
      (listeners['ThrowStatement'] as (n: TSESTree.ThrowStatement) => void)(node);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'missingErrorContext',
        data: { missing: 'message' },
      });
    });

    it('reports missing message and stack trace when both are required', () => {
      const { listeners, reports } = createWithMockContext(noMissingErrorContext, {
        options: [{ requireMessage: true, requireStackTrace: true }],
      });
      const node = { type: 'ThrowStatement', argument: null } as unknown as TSESTree.ThrowStatement;
      (listeners['ThrowStatement'] as (n: TSESTree.ThrowStatement) => void)(node);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'missingErrorContext',
        data: { missing: 'message and stack trace' },
      });
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
    ruleTester.run('custom error classes and re-throws', noMissingErrorContext, {
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
    });
  });
});
