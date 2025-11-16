/**
 * Comprehensive tests for enhanced no-console-log rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleLog } from '../rules/development/no-console-log';

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
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: 'console.log("debug", data);',
          output: '',
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          options: [{ strategy: 'convert', loggerName: 'logger' }],
          output: 'logger.debug("test");',
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: 'console.log("test", data);',
          options: [{ strategy: 'convert', loggerName: 'myLogger' }],
          output: 'myLogger.debug("test", data);',
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
          errors: [{
            messageId: 'consoleLogFound',
          }],
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
            {
              messageId: 'consoleLogFound',
            },
            {
              messageId: 'consoleLogFound',
            },
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
          options: [{ strategy: 'convert', loggerName: 'winston' }],
          output: 'winston.debug("test");',
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: 'console.log("test");',
          options: [{ strategy: 'convert', loggerName: 'bunyan' }],
          output: 'bunyan.debug("test");',
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
      ],
    });
  });

  describe('Edge Cases - Uncovered Lines', () => {
    // Lines 199-205: ImportDeclaration detection of logger patterns
    ruleTester.run('line 199-205 - import declaration logger detection', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: `
            import logger from 'winston';
            logger.info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'logger' }],
          output: `
            import logger from 'winston';
            logger.info("test");
            logger.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: `
            import log from 'pino';
            log.info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'log' }],
          output: `
            import log from 'pino';
            log.info("test");
            log.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: `
            import { createLogger as winston } from 'winston';
            winston().info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'winston' }],
          output: `
            import { createLogger as winston } from 'winston';
            winston().info("test");
            winston.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
      ],
    });

    // Lines 217-220: VariableDeclaration detection of logger patterns via require
    ruleTester.run('line 217-220 - require logger detection', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: `
            const logger = require('winston');
            logger.info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'logger' }],
          output: `
            const logger = require('winston');
            logger.info("test");
            logger.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: `
            const log = require('pino');
            log.info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'log' }],
          output: `
            const log = require('pino');
            log.info("test");
            log.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
        {
          code: `
            const winston = require('winston');
            winston.info("test");
            console.log("debug");
          `,
          options: [{ strategy: 'convert', loggerName: 'winston' }],
          output: `
            const winston = require('winston');
            winston.info("test");
            winston.debug("debug");
          `,
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
      ],
    });

    // Line 276: Early return when CallExpression doesn't match expected structure
    ruleTester.run('line 276 - call expression structure check', noConsoleLog, {
      valid: [
        {
          code: 'someFunction();',
        },
        {
          code: 'obj.method();',
        },
        {
          code: 'obj["method"]();',
        },
        {
          code: 'obj[0]();',
        },
      ],
      invalid: [],
    });

    // Line 345: Default case in fixer (returns null)
    // The default case returns null when strategy is not 'remove', 'convert', 'comment', or 'warn'
    // This is defensive code. We can't easily test it because all valid strategies are handled.
    // The 'warn' strategy is handled, so this test verifies the warn path works.
    ruleTester.run('line 345 - warn strategy fixer', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          options: [{ strategy: 'warn' }],
          output: 'console.warn("test");',
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
      ],
    });

    // Line 396: Return null when no statement found - test getContainingStatement edge case
    // The findParentStatement function returns null when it can't find a parent statement.
    // This is defensive code that's hard to trigger with valid code, as console.log() is always
    // part of an ExpressionStatement. The null check prevents crashes if the AST structure is unexpected.
    // We test that the rule works normally, and the null case is defensive.
    ruleTester.run('line 396 - getContainingStatement normal case', noConsoleLog, {
      valid: [],
      invalid: [
        {
          code: 'console.log("test");',
          output: '',
          errors: [{
            messageId: 'consoleLogFound',
          }],
        },
      ],
    });
  });
});

