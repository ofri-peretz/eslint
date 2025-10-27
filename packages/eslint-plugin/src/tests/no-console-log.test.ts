/**
 * Comprehensive tests for enhanced no-console-log rule
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
  describe('Basic Functionality', () => {
    ruleTester.run('basic detection', noConsoleLog, {
      valid: [
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
        {
          code: 'console.log("test");',
          output: '',
          errors: [{ messageId: 'consoleLogFound' }],
        },
        {
          code: 'console.log("debug", data);',
          output: '',
          errors: [{ messageId: 'consoleLogFound' }],
        },
        {
          code: `
            function debug() {
              console.log("debugging");
            }
          `,
          output: `
            function debug() {
              
            }
          `,
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('Strategy: remove', () => {
    ruleTester.run('remove strategy', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'remove' }],
          output: '',
          errors: [{ messageId: 'consoleLogFound' }],
        },
        {
          code: `
function test() {
  console.log("debug");
  return true;
}`,
          options: [{ strategy: 'remove' }],
          output: `
function test() {
  
  return true;
}`,
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('Strategy: convert', () => {
    ruleTester.run('convert strategy', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'convert', customLogger: 'logger' }],
          output: 'logger.debug("test");',
          errors: [{ messageId: 'consoleLogFound' }],
        },
        {
          code: 'console.log("test", data);',
          options: [{ strategy: 'convert', customLogger: 'myLogger' }],
          output: 'myLogger.debug("test", data);',
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('Strategy: comment', () => {
    ruleTester.run('comment strategy', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'comment' }],
          output: '// console.log("test");',
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('Strategy: warn', () => {
    ruleTester.run('warn strategy', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'warn' }],
          output: 'console.warn("test");',
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('ignorePaths Option', () => {
    ruleTester.run('ignore paths', noConsoleLog, {
      valid: [
        {
          code: 'console.log("test");',
          filename: '/project/test/debug.ts',
          options: [{ ignorePaths: ['test'] }],
        },
        {
          code: 'console.log("test");',
          filename: '/project/scripts/build.ts',
          options: [{ ignorePaths: ['scripts', 'test'] }],
        },
        {
          code: 'console.log("test");',
          filename: '/project/src/debug.test.ts',
          options: [{ ignorePaths: ['*.test.ts'] }],
        },
      ],
      invalid: [
        {
          code: 'console.log("test");',
          filename: '/project/src/app.ts',
          options: [{ ignorePaths: ['test'] }],
          output: '',
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });

  describe('maxOccurrences Option', () => {
    ruleTester.run('max occurrences limit', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: `
console.log("first");
console.log("second");
console.log("third");
console.log("fourth");`,
          options: [{ maxOccurrences: 2 }],
          output: [
            `


console.log("third");
console.log("fourth");`,
            `



`,
          ],
          errors: [
            { messageId: 'consoleLogFound' },
            { messageId: 'consoleLogFound' },
          ],
        },
      ],
    });
  });

  // Note: Suggestions are tested by verifying they exist in practice
  // Testing exact output of suggestions is complex with dynamic fixes

  describe('Custom Logger Names', () => {
    ruleTester.run('custom logger', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'convert', customLogger: 'winston' }],
          output: 'winston.debug("test");',
          errors: [{ messageId: 'consoleLogFound' }],
        },
        {
          code: 'console.log("test");',
          options: [{ strategy: 'convert', customLogger: 'bunyan' }],
          output: 'bunyan.debug("test");',
          errors: [{ messageId: 'consoleLogFound' }],
        },
      ],
    });
  });
});

