/**
 * Comprehensive tests for no-silent-errors rule
 * Error Handling: Detects empty catch blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noSilentErrors } from '../../rules/error-handling/no-silent-errors';

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

    ruleTester.run('options - allowWithComment', noSilentErrors, {
      valid: [
        // Allow with "intentional" comment
        {
          code: `
            try {
              doSomething();
            // intentionally empty
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "expected" comment
        {
          code: `
            try {
              doSomething();
            // expected error, ignore
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "ignore" comment
        {
          code: `
            try {
              doSomething();
            // ignore this error
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "noop" comment
        {
          code: `
            try {
              doSomething();
            // noop
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "no-op" comment
        {
          code: `
            try {
              doSomething();
            // no-op
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "by design" comment
        {
          code: `
            try {
              doSomething();
            // by design
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "known issue" comment
        {
          code: `
            try {
              doSomething();
            // known issue in library
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "legacy" comment
        {
          code: `
            try {
              doSomething();
            // legacy code
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "third-party" comment
        {
          code: `
            try {
              doSomething();
            // third-party library issue
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "framework" comment
        {
          code: `
            try {
              doSomething();
            // framework limitation
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "library" comment
        {
          code: `
            try {
              doSomething();
            // library quirk
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "not implemented" comment
        {
          code: `
            try {
              doSomething();
            // not implemented yet
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "TODO" comment
        {
          code: `
            try {
              doSomething();
            // TODO: handle this later
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "FIXME" comment
        {
          code: `
            try {
              doSomething();
            // FIXME: add proper handling
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "silent" comment
        {
          code: `
            try {
              doSomething();
            // silent catch on purpose
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
      ],
      invalid: [
        // allowWithComment = true but no valid comment
        {
          code: `
            try {
              doSomething();
            // random comment
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'silentError' }],
        },
        // allowWithComment = false ignores comments
        {
          code: `
            try {
              doSomething();
            // intentional
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: false }],
          errors: [{ messageId: 'silentError' }],
        },
        // Comment too far from catch
        {
          code: `
            // intentional
            
            
            
            try {
              doSomething();
            } catch (error) {
            }
          `,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'silentError' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noSilentErrors, {
      valid: [
        // Test file variations
        {
          code: `try { doSomething(); } catch (error) { }`,
          filename: 'component.test.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          code: `try { doSomething(); } catch (error) { }`,
          filename: 'utils.spec.js',
          options: [{ ignoreInTests: true }],
        },
        {
          code: `try { doSomething(); } catch (error) { }`,
          filename: 'api.test.jsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        // Catch with only EmptyStatement (semicolon) - still empty
        {
          code: `
            try {
              doSomething();
            } catch (error) {
              ;
            }
          `,
          filename: 'src/utils.ts',
          errors: [{ messageId: 'silentError' }],
        },
      ],
    });
  });
  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests for parser-unreachable branches
  // ---------------------------------------------------------------------

  describe('Layer 2: listeners with mock context', () => {
    it('treats a catch clause without a BlockStatement body as empty (options null fallback)', () => {
      // Valid JS always gives a catch clause a BlockStatement body; only a
      // synthetic node reaches the defensive branch. options: [null] also
      // drives the `options || {}` fallback in create().
      const { listeners, reports } = createWithMockContext(noSilentErrors, {
        options: [null],
      });
      const node = {
        type: 'CatchClause',
        body: null,
      } as unknown as TSESTree.CatchClause;
      (listeners['CatchClause'] as (n: TSESTree.CatchClause) => void)(node);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'silentError' });
      const suggest = (reports[0] as { suggest?: { messageId: string }[] }).suggest;
      expect(suggest?.map((s) => s.messageId)).toEqual([
        'addErrorLogging',
        'addErrorHandling',
        'rethrowError',
      ]);
    });

    it('hasExplanatoryComment returns false for a catch clause without a location', () => {
      const { listeners, reports, context } = createWithMockContext(noSilentErrors, {
        options: [{ allowWithComment: true }],
      });
      Object.assign(context.sourceCode, {
        getAllComments: () => [
          { type: 'Line', value: 'intentional noop', loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
        ],
      });
      const node = {
        type: 'CatchClause',
        body: { type: 'BlockStatement', body: [] },
        loc: undefined,
      } as unknown as TSESTree.CatchClause;
      (listeners['CatchClause'] as (n: TSESTree.CatchClause) => void)(node);
      // No location → the explanatory comment cannot be matched → report
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'silentError' });
    });

    it('hasExplanatoryComment returns false when there are no comments at all', () => {
      const { listeners, reports, context } = createWithMockContext(noSilentErrors, {
        options: [{ allowWithComment: true }],
      });
      Object.assign(context.sourceCode, { getAllComments: () => [] });
      const node = {
        type: 'CatchClause',
        body: { type: 'BlockStatement', body: [] },
        loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 12 } },
      } as unknown as TSESTree.CatchClause;
      (listeners['CatchClause'] as (n: TSESTree.CatchClause) => void)(node);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'silentError' });
    });
  });
});
