import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { preferPoolQuery } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('prefer-pool-query', preferPoolQuery, {
  valid: [
    `
    async function valid() {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT ...');
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    }
    `,
    `
    // Multiple queries
    async function valid2() {
      const client = await pool.connect();
      await client.query('SELECT 1');
      await client.query('SELECT 2');
      client.release();
    }
    `,
    // Ignored cases (coverage)
    "async function f() { const client = await pool.connect(); client.foo(); client.release(); }", // other method usage
    "async function f() { const client = await pool.connect(); client.property; client.release(); }", // property access coverage
    // Line 43: Early return when init is not .connect()
    "async function f() { const client = await pool.other(); }",
    // Line 98: otherUsageCount++ when client is passed as value
    "async function f() { const client = await pool.connect(); doSomething(client); client.release(); }",
    // Line 47: no variable returned from getDeclaredVariables (shouldn't happen but coverage)
    // Line 81-83: check if parent is CallExpression with query args
    `
    async function withRollback() {
      const client = await pool.connect();
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
    `,
    // Lines 81-83: query with non-literal argument (template literal or identifier)
    `
    async function withTemplateLiteralQuery() {
      const client = await pool.connect();
      await client.query(\`SELECT * FROM \${table}\`);
      await client.query('SELECT 2');
      client.release();
    }
    `,
    // Lines 81-83: query with identifier argument
    `
    async function withIdentifierQuery() {
      const client = await pool.connect();
      await client.query(sqlQuery);
      await client.query('SELECT 2');
      client.release();
    }
    `,
  ],
  invalid: [
    {
      code: `
      async function invalid() {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      }
      `,
      errors: [{ messageId: 'preferPoolQuery' }],
    },
    {
       code: `
       async function invalidTry() {
         const client = await pool.connect();
         try {
           await client.query('SELECT * FROM users');
         } finally {
           client.release();
         }
       }
       `,
       errors: [{ messageId: 'preferPoolQuery' }],
    }
  ],
});
