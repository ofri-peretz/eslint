/**
 * Tests for knex-security/no-unsafe-query
 * CWE-89 — SQL injection through Knex's raw-SQL escapes.
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
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users WHERE id = ?', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import knex from "knex";\nknex.raw();',
        },
        {
          name: 'unrelated code',
          code: 'import knex from "knex";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import knex from 'knex';\nconst sql = 'SELECT * FROM users'; knex.raw(sql);",
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
          code: 'import knex from "knex";\nknex.raw(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import knex from 'knex';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'knex.raw(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
