/**
 * Tests for consistent-existence-index-check rule
 * Enforce consistent style for checking object property existence
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentExistenceIndexCheck } from '../../rules/conventions/consistent-existence-index-check';

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

describe('consistent-existence-index-check', () => {
  describe('default (prefer "in")', () => {
    ruleTester.run('prefer in operator', consistentExistenceIndexCheck, {
      valid: [
        // Using 'in' operator (preferred)
        { code: '"key" in obj' },
        { code: 'if ("prop" in object) {}' },
        { code: 'const exists = "name" in user;' },
      ],
      invalid: [
        // hasOwnProperty should be flagged
        {
          code: 'obj.hasOwnProperty("key")',
          output: '"key" in obj',
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // Object.hasOwn should be flagged
        {
          code: 'Object.hasOwn(obj, "key")',
          output: '"key" in obj',
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });

  describe('prefer hasOwnProperty', () => {
    ruleTester.run('prefer hasOwnProperty', consistentExistenceIndexCheck, {
      valid: [
        // Using hasOwnProperty (preferred in this config)
        {
          code: 'obj.hasOwnProperty("key")',
          options: [{ preferred: 'hasOwnProperty' }],
        },
      ],
      invalid: [
        // 'in' operator should be flagged
        {
          code: '"key" in obj',
          output: 'obj.hasOwnProperty("key")',
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // Object.hasOwn should be flagged
        {
          code: 'Object.hasOwn(obj, "key")',
          output: 'obj.hasOwnProperty("key")',
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });

  describe('prefer Object.hasOwn', () => {
    ruleTester.run('prefer Object.hasOwn', consistentExistenceIndexCheck, {
      valid: [
        // Using Object.hasOwn (preferred in this config)
        {
          code: 'Object.hasOwn(obj, "key")',
          options: [{ preferred: 'Object.hasOwn' }],
        },
      ],
      invalid: [
        // 'in' operator should be flagged
        {
          code: '"key" in obj',
          output: 'Object.hasOwn(obj, "key")',
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // hasOwnProperty should be flagged
        {
          code: 'obj.hasOwnProperty("key")',
          output: 'Object.hasOwn(obj, "key")',
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });
});
