import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noSelectAll } from './index';

/**
 * Every fixture imports a PostgreSQL client, because the rule now abstains in
 * files that use no PostgreSQL at all. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the import
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const withPg = (code: string): string => `import { Pool } from 'pg';\n${code}`;
const pg = <T,>(cases: T[]): T[] =>
  cases.map((c) =>
    typeof c === 'string'
      ? (withPg(c) as T)
      : ({ ...c, code: withPg((c as { code: string }).code) } as T),
  );


const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-select-all', noSelectAll, {
  valid: pg([
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
  ]),
  invalid: pg([
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
  ]),
});
