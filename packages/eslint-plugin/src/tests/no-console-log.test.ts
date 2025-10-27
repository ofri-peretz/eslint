/**
 * Test for no-console-log rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleLog } from '../rules/no-console-log';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-console-log', () => {
  ruleTester.run('no-console-log', noConsoleLog, {
    valid: [
      // Valid cases - code that should NOT trigger the rule
      {
        code: 'const logger = console;',
      },
      {
        code: 'console.error("error message");',
      },
      {
        code: 'console.warn("warning message");',
      },
      {
        code: 'console.info("info message");',
      },
      {
        code: 'function test() { return true; }',
      },
    ],
    invalid: [
      // Invalid cases - code that SHOULD trigger the rule
      {
        code: 'console.log("test");',
        errors: [
          {
            messageId: 'noConsoleLog',
          },
        ],
      },
      {
        code: 'console.log("debug", data);',
        errors: [
          {
            messageId: 'noConsoleLog',
          },
        ],
      },
      {
        code: `
          function debug() {
            console.log("debugging");
          }
        `,
        errors: [
          {
            messageId: 'noConsoleLog',
          },
        ],
      },
    ],
  });
});

