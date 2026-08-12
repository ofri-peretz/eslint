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

ruleTester.run('no-missing-client-release', noMissingClientRelease, {
  valid: pg([
    {
       code: "async function f() { await pool.connect(); }",
       name: 'Ignored: No assignment'
    },
    {
       code: "async function f() { const { release } = await pool.connect(); release(); }",
       name: 'Ignored: Destructuring'
    }, 
    {
       code: "async function f() { const client = await pool.other(); }",
       name: 'Ignored: Not connect'
    },
    `
    async function noAwait() {
       const client = pool.connect();
       client.release(); 
    }
    `
  ]),
  invalid: pg([
    {
      code: `
      async function query() {
        const client = await pool.connect();
        await client.query('SELECT 1');
      }
      `,
      errors: [{ messageId: 'missingClientRelease' }],
    },
    {
      code: `
      async function query() {
        const c = await pool.connect();
        // Forgot to release c
      }
      `,
      errors: [{ messageId: 'missingClientRelease' }],
    }
  ]),
});
