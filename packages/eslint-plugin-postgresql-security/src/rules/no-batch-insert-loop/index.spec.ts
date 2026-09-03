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
    // `map` PRODUCES an array of promises; whoever consumes it decides the
    // concurrency, and `await Promise.all(xs.map(...))` is the shape people
    // write to escape the sequential round trips this rule catches.
    "items.map(item => client.query('SELECT 1'))",
    "async function f() { await Promise.all(items.map(item => client.query('INSERT', [item]))); }",
    // Pagination: a statement that returns a PAGE, in a loop that iterates a
    // condition rather than a collection.
    `
    async function exportAll() {
      while (true) {
        const { rows } = await client.query('SELECT id FROM t ORDER BY id LIMIT $1 OFFSET $2', [500, offset]);
        if (rows.length === 0) break;
      }
    }
    `,
    // A lambda the loop STORES rather than invokes.
    `
    for (const id of ids) {
      jobs.push(() => client.query('INSERT INTO t VALUES ($1)', [id]));
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
      // REGRESSION LOCK. This was in the `valid` array, commented
      // "SELECT inside loop is acceptable for this rule (targeted at
      // mutations)". It is the N+1 problem by its textbook definition — one
      // parent query, then one child SELECT per parent row — and it is the
      // exact shape the rule's own documentation link describes. The
      // statement-kind filter that excused it also only ran when the argument
      // was a plain string, so the identical SELECT written as a template
      // literal reported and the string form did not.
      code: `
      for (const id of ids) {
        await client.query('SELECT * FROM items WHERE id = $1', [id]);
      }
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    {
      // A `map` nested inside a real loop: treating `map` as a value producer
      // must not make the enclosing loop invisible.
      code: `
      for (const tenant of tenants) {
        await Promise.all(tenant.skus.map(sku => client.query('UPDATE p SET t = $1 WHERE sku = $2', [tenant.id, sku])));
      }
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
    {
      // The sequential-reduce idiom — visible only if the walk passes through
      // `.then`.
      code: `
      statements.reduce((chain, s) => chain.then(() => client.query('INSERT INTO log (s) VALUES ($1)', [s])), Promise.resolve());
      `,
      errors: [{ messageId: 'noBatchInsertLoop' }],
    },
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
