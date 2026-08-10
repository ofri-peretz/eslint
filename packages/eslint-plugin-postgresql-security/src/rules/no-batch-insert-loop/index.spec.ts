import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noBatchInsertLoop } from './index';

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

ruleTester.run('no-batch-insert-loop', noBatchInsertLoop, {
  valid: pg([
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
  ]),
  invalid: pg([
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
  ]),
});
