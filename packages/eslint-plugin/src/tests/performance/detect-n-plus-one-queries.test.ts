/**
 * Comprehensive tests for detect-n-plus-one-queries rule
 * Performance: Detects N+1 query patterns in database access
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNPlusOneQueries } from '../../rules/performance/detect-n-plus-one-queries';

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

describe('detect-n-plus-one-queries', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - queries outside loops', detectNPlusOneQueries, {
      valid: [
        {
          code: `
            const user = await User.findById(userId);
            const posts = await Post.find({ userId });
          `,
        },
        {
          code: `
            const users = await User.find();
            // Process users without queries
            users.forEach(user => console.log(user.name));
          `,
        },
        {
          code: `
            const data = await fetchData();
            return data;
          `,
        },
        {
          code: `
            // Test file - should be ignored
            for (const id of ids) {
              await User.findById(id);
            }
          `,
          filename: 'test.spec.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - N+1 Query Patterns', () => {
    ruleTester.run('invalid - queries inside loops', detectNPlusOneQueries, {
      valid: [],
      invalid: [
        {
          code: `
            for (const userId of userIds) {
              const user = await User.findById(userId);
            }
          `,
          errors: [{ messageId: 'nPlusOneQuery' }],
        },
        {
          code: `
            userIds.forEach(async (userId) => {
              const user = await User.findOne({ id: userId });
            });
          `,
          errors: [{ messageId: 'nPlusOneQuery' }],
        },
        {
          code: `
            for (const id of ids) {
              await db.query('SELECT * FROM users WHERE id = ?', [id]);
            }
          `,
          errors: [{ messageId: 'nPlusOneQuery' }],
        },
        {
          code: `
            users.map(async (user) => {
              const posts = await Post.find({ userId: user.id });
            });
          `,
          errors: [{ messageId: 'nPlusOneQuery' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom query methods', detectNPlusOneQueries, {
      valid: [
        {
          code: `
            for (const id of ids) {
              await customMethod(id);
            }
          `,
          options: [{ queryMethods: ['find', 'findOne'] }],
        },
      ],
      invalid: [
        {
          code: `
            for (const id of ids) {
              await User.find(id);
            }
          `,
          options: [{ queryMethods: ['find', 'findOne'] }],
          errors: [{ messageId: 'nPlusOneQuery' }],
        },
      ],
    });
  });
});

