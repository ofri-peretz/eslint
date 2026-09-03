/**
 * Tests for drizzle-security/no-unsafe-query
 * CWE-89 — SQL injection through Drizzle's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-unsafe-query', () => {
  describe('Valid — parameterized and static SQL', () => {
    ruleTester.run('valid', noUnsafeQuery, {
      valid: [
        {
          name: 'safe idiom',
          code: 'import sql from "drizzle-orm";\ndb.select().from(users).where(sql`id = ${userId}`);',
        },
        {
          name: 'static SQL, no interpolation',
          code: "import sql from 'drizzle-orm';\nsql.raw('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import sql from "drizzle-orm";\nsql.raw();',
        },
        {
          name: 'unrelated code',
          code: 'import sql from "drizzle-orm";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import sql from 'drizzle-orm';\nconst sql = 'SELECT * FROM users'; sql.raw(sql);",
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — interpolated raw SQL', () => {
    ruleTester.run('invalid', noUnsafeQuery, {
      valid: [],
      invalid: [
        {
          name: 'template interpolation',
          code: 'import sql from "drizzle-orm";\nsql.raw(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import sql from 'drizzle-orm';\nsql.raw('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import sql from 'drizzle-orm';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'sql.raw(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
