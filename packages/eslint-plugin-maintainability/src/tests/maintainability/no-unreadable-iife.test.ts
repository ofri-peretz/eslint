/**
 * Tests for no-unreadable-iife rule
 * Prevent unreadable Immediately Invoked Function Expressions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnreadableIife } from '../../rules/maintainability/no-unreadable-iife';

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

describe('no-unreadable-iife', () => {
  describe('valid IIFEs', () => {
    ruleTester.run('allow simple IIFEs', noUnreadableIife, {
      valid: [
        // Simple IIFE with return
        {
          code: `const result = (() => 'value')();`,
        },
        // Simple IIFE with block and return
        {
          code: `const result = (() => { return 'value'; })();`,
        },
        // IIFE with one statement
        {
          code: `(() => { console.log('init'); })();`,
        },
        // IIFE with two statements (under default max)
        {
          code: `(() => { const x = 1; return x; })();`,
        },
        // Returning IIFE is allowed by default
        {
          code: `
            const config = (() => {
              const env = process.env.NODE_ENV;
              const debug = env === 'development';
              return { env, debug };
            })();
          `,
        },
      ],
      invalid: [],
    });
  });
});
