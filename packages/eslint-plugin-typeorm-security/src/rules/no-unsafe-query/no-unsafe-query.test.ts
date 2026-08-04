/**
 * Tests for typeorm-security/no-unsafe-query
 * CWE-89 — SQL injection through TypeORM's raw-SQL escapes.
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
          code: "await dataSource.query('SELECT * FROM users WHERE id = $1', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "dataSource.query('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'dataSource.query();',
        },
        {
          name: 'unrelated code',
          code: 'const x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "const sql = 'SELECT * FROM users'; dataSource.query(sql);",
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
          code: 'dataSource.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "dataSource.query('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'dataSource.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
