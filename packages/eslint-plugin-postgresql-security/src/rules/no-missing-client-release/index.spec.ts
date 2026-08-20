import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noMissingClientRelease } from './index';

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
 * Every fixture that is meant to check a client OUT now binds a real pool.
 *
 * These cases used to call `pool.connect()` with nothing named `pool` declared
 * anywhere in the file. They passed because the rule matched the METHOD NAME
 * alone — which is also why `broker.connect()` and `WebSocket.connect(...)`,
 * neither of which has a `release()` to call, were reported as leaked
 * PostgreSQL clients.
 */
const declarePool = (code: string): string => `const pool = new Pool();\n${code}`;

ruleTester.run('no-missing-client-release', noMissingClientRelease, {
  valid: pg([
    {
      code: declarePool('async function f() { await pool.connect(); }'),
      name: 'Ignored: No assignment',
    },
    {
      code: declarePool(
        'async function f() { const { release } = await pool.connect(); release(); }',
      ),
      name: 'Ignored: Destructuring',
    },
    {
      code: declarePool('async function f() { const client = await pool.other(); }'),
      name: 'Ignored: Not connect',
    },
    {
      code: declarePool(
        'async function f() { const client = await notAPool.connect(); }',
      ),
      name: 'Ignored: receiver is not a proven pg Pool',
    },
    declarePool(`
    async function noAwait() {
       const client = pool.connect();
       try { await client.query('SELECT 1'); } finally { client.release(); }
    }
    `),
  ]),
  invalid: pg([
    {
      code: declarePool(`
      async function query() {
        const client = await pool.connect();
        await client.query('SELECT 1');
      }
      `),
      errors: [{ messageId: 'missingClientRelease' }],
    },
    {
      code: declarePool(`
      async function query() {
        const c = await pool.connect();
        // Forgot to release c
      }
      `),
      errors: [{ messageId: 'missingClientRelease' }],
    },
  ]),
});
