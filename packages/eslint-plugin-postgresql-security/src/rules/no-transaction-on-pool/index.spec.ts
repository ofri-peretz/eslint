import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noTransactionOnPool } from './index';

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

ruleTester.run('no-transaction-on-pool', noTransactionOnPool, {
  valid: pg([
    // Ignored cases (coverage)
    "pool.otherMethod('BEGIN')",
    "pool.query(dynamicVar)", // Not literal
    "client.query()", // Empty args
    "pool.query()", // Empty args (on pool)
    "client.query('COMMIT')",
    "pool.query('SELECT 1')",
    "customClient.query('BEGIN')",
  ]),
  invalid: pg([
    {
      code: "pool.query('BEGIN')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: "myPool.query('COMMIT')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: "pool.query('ROLLBACK')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
  ]),
});
