import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { preventDoubleRelease } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('prevent-double-release', preventDoubleRelease, {
  valid: [
    `
    async function basic() {
        const client = await pool.connect();
        client.release();
    }
    `,
    `
    // If/Else separation - different blocks - naive rule ignores this (safe)
    async function validControlFlow() {
      const client = await pool.connect();
      if (err) {
        client.release();
        return;
      }
      client.release();
    }
    `,
    `
    // Early return in same block
    async function validReturn() {
      const client = await pool.connect();
      client.release();
      return;
      client.release(); // Unreachable but logically separated by return
    }
    `,
    `
    async function invalidComplexControlFlow() {
      const client = await pool.connect();
      try {
        // some operation
      } finally {
        client.release();
      }
      client.release(); // Error but ignored by rule (diff blocks)
    }
    `,
    // Line 98 coverage: indexB <= indexA (no error when callB comes before callA in block body)
    // This is a valid case where the order check prevents false positives
    `
    async function validOrderCheck() {
      const client = await pool.connect();
      client.release();
      // Some other code after
    }
    `
  ],
  invalid: [
    {
      code: `
      async function invalid() {
        const client = await pool.connect();
        client.release();
        client.release();
      }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    {
      code: `
        async function run(pool) {
          const client = await pool.connect();
          if (err) {
            client.release();
            return;
          }
          client.release(); 
          client.release(); // Error
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    {
      code: `
        async function invalidDestructuring() {
          const { release } = await pool.connect();
          release();
          release(); // Error
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
  ],
});
