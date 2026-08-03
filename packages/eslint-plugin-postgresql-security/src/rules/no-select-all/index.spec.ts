import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noSelectAll } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-select-all', noSelectAll, {
  valid: [
    // Ignored cases (coverage)
    "client.query(dynamicSql)", // Dynamic query string
    "client.other('SELECT *')", // Not .query method
    "client.query('DELETE * FROM users')", // * but no SELECT
    "client.query('SELECT a, b FROM users')", // Valid SELECT without *
    "other.method('SELECT *')", // Not query method
    "pool.query('SELECT COUNT( * ) FROM users')",
    // Line 40: empty args
    "client.query()",
    // Line 44: non-string literal arg
    "client.query(123)",
    // Line 61: comma followed by * but no SELECT keyword (inner check fails)
    "client.query('INSERT INTO foo VALUES (1, *)')",
    // SELECT * FROM UNNEST is idiomatic for bulk inserts
    "pool.query('INSERT INTO users SELECT * FROM unnest($1::int[], $2::text[])', [ids, names])",
    "pool.query('INSERT INTO logs SELECT * FROM UNNEST($1::text[])', [messages])",
  ],
  invalid: [
    {
      code: "client.query('SELECT * FROM users')",
      errors: [{ messageId: 'noSelectAll' }],
    },
    {
      code: "pool.query('select * from users')",
      errors: [{ messageId: 'noSelectAll' }],
    },
    {
      code: "client.query('SELECT a, b, * FROM table')", // Rare but possible in some SQL dialects or logic
      errors: [{ messageId: 'noSelectAll' }],
    },
  ],
});
