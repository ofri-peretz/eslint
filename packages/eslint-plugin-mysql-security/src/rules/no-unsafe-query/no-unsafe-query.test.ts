/**
 * Tests for mysql-security/no-unsafe-query
 * CWE-89 — SQL injection through MySQL's raw-SQL escapes.
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
          code: "import mysql from 'mysql2';\nconn.execute('SELECT * FROM users WHERE id = ?', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import mysql from 'mysql2';\nconn.query('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import mysql from "mysql2";\nconn.query();',
        },
        {
          name: 'unrelated code',
          code: 'import mysql from "mysql2";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import mysql from 'mysql2';\nconst sql = 'SELECT * FROM users'; conn.query(sql);",
        },
        {
          name: 'non-SQL text into the same sink is not a SQL finding',
          code: 'import mysql from "mysql2";\njob.execute(`retry ${attempt}`);',
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
          code: 'import mysql from "mysql2";\nconn.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import mysql from 'mysql2';\nconn.query('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import mysql from 'mysql2';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'conn.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'execute() sink',
          code: 'import mysql from "mysql2";\nconn.execute(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
