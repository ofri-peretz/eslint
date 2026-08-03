import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noMissingClientRelease } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-missing-client-release', noMissingClientRelease, {
  valid: [
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
  ],
  invalid: [
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
  ],
});
