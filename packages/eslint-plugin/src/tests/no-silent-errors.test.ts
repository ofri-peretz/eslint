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
});

