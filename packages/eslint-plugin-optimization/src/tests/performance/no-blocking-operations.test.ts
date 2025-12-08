/**
 * Comprehensive tests for no-blocking-operations rule
 * Performance: Detects blocking operations in async code
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBlockingOperations } from '../../rules/performance/no-blocking-operations';

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

describe('no-blocking-operations', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - async operations or sync context', noBlockingOperations, {
      valid: [
        // Async versions
        {
          code: 'await fs.promises.readFile(path);',
        },
        {
          code: 'await fs.promises.writeFile(path, data);',
        },
        // Sync operations in sync context
        {
          code: 'function syncFunction() { fs.readFileSync(path); }',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'async function fn() { fs.readFileSync(path); }',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Blocking in Async', () => {
    ruleTester.run('invalid - blocking operations in async', noBlockingOperations, {
      valid: [],
      invalid: [
        {
          code: 'async function fn() { fs.readFileSync(path); }',
          errors: [{ messageId: 'blockingOperation' }],
        },
        {
          code: 'async () => { fs.writeFileSync(path, data); }',
          errors: [{ messageId: 'blockingOperation' }],
        },
        {
          code: 'async function fn() { fs.existsSync(path); }',
          errors: [{ messageId: 'blockingOperation' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noBlockingOperations, {
      valid: [
        {
          code: 'async function fn() { fs.readFileSync(path); }',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'async function fn() { fs.readFileSync(path); }',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'blockingOperation' }],
        },
      ],
    });

    ruleTester.run('options - blockingMethods', noBlockingOperations, {
      valid: [],
      invalid: [
        {
          code: 'async function fn() { customSyncMethod(); }',
          options: [{ blockingMethods: ['customSyncMethod'] }],
          errors: [{ messageId: 'blockingOperation' }],
        },
      ],
    });
  });
});

