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

/**
 * Every fixture that is meant to BE a pool now binds one.
 *
 * These cases used to read `pool.query('BEGIN')` with nothing named `pool`
 * declared anywhere in the file, and they passed — because the rule decided
 * from `objectName.toLowerCase().includes('pool')`. They asserted the
 * name-inference defect as correct behaviour, which is also why
 * `carpoolClient.query('BEGIN')` was a finding and a real Pool bound to `db`
 * was not.
 */
const declarePool = (code: string): string => `const pool = new Pool();\n${code}`;

ruleTester.run('no-transaction-on-pool', noTransactionOnPool, {
  valid: pg([
    // Ignored cases (coverage)
    declarePool("pool.otherMethod('BEGIN')"),
    declarePool('pool.query(dynamicVar)'), // Not a statically known statement
    'client.query()', // Empty args
    declarePool('pool.query()'), // Empty args (on pool)
    "client.query('COMMIT')",
    declarePool("pool.query('SELECT 1')"),
    "customClient.query('BEGIN')",
    // An identifier bound to nothing this file can see is not a proven pool.
    "unboundPool.query('BEGIN')",
  ]),
  invalid: pg([
    {
      code: declarePool("pool.query('BEGIN')"),
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: "const myPool = new Pool();\nmyPool.query('COMMIT')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: declarePool("pool.query('ROLLBACK')"),
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
  ]),
});
