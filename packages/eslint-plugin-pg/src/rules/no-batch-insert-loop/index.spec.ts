import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noBatchInsertLoop } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-batch-insert-loop', noBatchInsertLoop, {
  valid: [
    `
    async function insert() {
      await client.query('INSERT INTO users ...');
    }
    `,
    `
    async function update() {
      // Bulk update
      await client.query('UPDATE users SET ... WHERE id = ANY($1)', [ids]);
    }
    `,
    // Non-loop functions (coverage)
    "function foo() { client.query('INSERT'); }",
    "const bar = () => client.query('UPDATE');",
    "class C { method() { client.query('INSERT'); } }",
    "client.query()", // Empty args
    "client.query(123)", // Non-string literal
    "items.map(item => client.query('SELECT 1'))", // Map but SELECT (ignored)
    `
    // SELECT inside loop is acceptable for this rule (targeted at mutations)
    for (const id of ids) {
       await client.query('SELECT * FROM items WHERE id = $1', [id]);
    }
    `,
    // Coverage: Line 92 - function boundary break (function NOT inside CallExpression parent)
    `
    const handler = async () => {
      await client.query('INSERT INTO items VALUES (1)');
    };
    `,
    // Line 92: FunctionExpression in object property (parent is Property, not CallExpression)
    `
    const obj = {
      handler: async function() {
        await client.query('INSERT INTO items VALUES (1)');
      }
    };
    `,
    // Line 92: ArrowFunction as function parameter (parent IS CallExpression, so won't break)
    // Need to ensure the parent is NOT map/forEach/reduce/filter to trigger break
    `
    setTimeout(async () => {
      await client.query('INSERT INTO items VALUES (1)');
    }, 1000);
    `
  ],
  invalid: [
    {
      code: `
      for (const item of items) {
        await client.query('INSERT INTO items VALUES ($1)', [item]);
      }
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    {
      code: `
      items.forEach(async item => {
        await pool.query('UPDATE items SET val = $1 WHERE id = $2', [item.val, item.id]);
      });
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    {
      code: `
      while(condition) {
        client.query('INSERT ...');
      }
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    // Line 72: filter callback with INSERT
    {
      code: `
      items.filter(item => {
        client.query('INSERT INTO items VALUES (1)');
        return item.valid;
      });
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    // Line 72: reduce callback with INSERT
    {
      code: `
      items.reduce((acc, item) => {
        client.query('INSERT INTO items VALUES (1)');
        return acc;
      }, []);
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    }
  ],
});
