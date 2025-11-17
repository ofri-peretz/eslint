/**
 * Comprehensive tests for no-unbounded-cache rule
 * Performance: Detects caches without size limits
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnboundedCache } from '../rules/performance/no-unbounded-cache';

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

describe('no-unbounded-cache', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - bounded caches', noUnboundedCache, {
      valid: [
        // LRU cache
        {
          code: 'const cache = new LRUCache({ max: 100 });',
        },
        // Map with size limit
        {
          code: 'const cache = new Map(); cache.maxSize = 100;',
        },
        // Cache with TTL
        {
          code: 'const cache = { maxSize: 100, ttl: 3600 };',
        },
        // Not a cache
        {
          code: 'const data = new Map();',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'const cache = new Map();',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unbounded Caches', () => {
    ruleTester.run('invalid - caches without limits', noUnboundedCache, {
      valid: [],
      invalid: [
        {
          code: 'const cache = new Map();',
          errors: [{ messageId: 'unboundedCache' }],
        },
        {
          code: 'const myCache = new Map();',
          errors: [{ messageId: 'unboundedCache' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnboundedCache, {
      valid: [
        {
          code: 'const cache = new Map();',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'const cache = new Map();',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'unboundedCache' }],
        },
      ],
    });

    ruleTester.run('options - cachePatterns', noUnboundedCache, {
      valid: [
        {
          code: 'const storage = new Map();',
          options: [{ cachePatterns: ['cache', 'Cache'] }], // storage not in patterns
        },
      ],
      invalid: [
        {
          code: 'const cache = new Map();',
          options: [{ cachePatterns: ['cache', 'Cache'] }],
          errors: [{ messageId: 'unboundedCache' }],
        },
      ],
    });
  });
});

