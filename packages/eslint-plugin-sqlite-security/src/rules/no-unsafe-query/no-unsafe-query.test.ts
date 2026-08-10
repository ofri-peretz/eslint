/**
 * Tests for sqlite-security/no-unsafe-query
 * CWE-89 — SQL injection through SQLite's raw-SQL escapes.
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
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users WHERE id = ?').get(userId);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import Database from "better-sqlite3";\ndb.prepare();',
        },
        {
          name: 'unrelated code',
          code: 'import Database from "better-sqlite3";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import Database from 'better-sqlite3';\nconst sql = 'SELECT * FROM users'; db.prepare(sql);",
        },
        {
          name: 'non-SQL text into the same sink is not a SQL finding',
          code: 'import Database from "better-sqlite3";\ntask.run(`step ${i}`);',
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
          code: 'import Database from "better-sqlite3";\ndb.prepare(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import Database from 'better-sqlite3';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'db.prepare(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'exec() sink',
          code: 'import Database from "better-sqlite3";\ndb.exec(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'run() sink',
          code: 'import Database from "better-sqlite3";\ndb.run(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'all() sink',
          code: 'import Database from "better-sqlite3";\ndb.all(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'get() sink',
          code: 'import Database from "better-sqlite3";\ndb.get(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
