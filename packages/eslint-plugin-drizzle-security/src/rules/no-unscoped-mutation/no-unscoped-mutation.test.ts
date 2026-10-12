/**
 * Tests for drizzle-security/no-unscoped-mutation
 * CWE-284 — bulk mutations that reach every row in the table.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Drizzle
 * *contract*: the table argument is never mistaken for a filter, and scope is
 * read from the chained `.where()`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noUnscopedMutation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/**
 * Opens the rule's import gate and binds `db` to a Drizzle instance. `db` used
 * to be left undeclared and recognised by its NAME; untraceable, `db.delete(t)`
 * is the same program as `cache.delete(key)`. It is a handle now because it is
 * written from `drizzle()` — `foo` would do exactly as well.
 */
const DRIVER =
  "import { eq } from 'drizzle-orm';\nimport { drizzle } from 'drizzle-orm/node-postgres';\nconst db = drizzle(process.env.DATABASE_URL);\n";

describe('no-unscoped-mutation', () => {
  describe('Valid — a where clause is chained', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'delete with a chained where',
          code: DRIVER + 'await db.delete(users).where(eq(users.id, id));',
        },
        {
          name: 'update with set and where',
          code:
            DRIVER +
            'await db.update(users).set({ active: false }).where(eq(users.id, id));',
        },
        {
          name: 'where before returning',
          code:
            DRIVER +
            'await db.delete(users).where(eq(users.id, id)).returning();',
        },
        {
          name: 'reads are untouched',
          code: DRIVER + 'await db.select().from(users);',
        },
        {
          name: 'insert is not a bulk mutation',
          code: DRIVER + 'await db.insert(users).values({ name });',
        },
        {
          name: 'Map.delete is not a query',
          code: DRIVER + 'cache.delete(key);',
        },
        {
          name: 'Set.delete is not a query',
          code: DRIVER + 'seen.delete(value);',
        },
        {
          name: 'a store update is not a query',
          code: DRIVER + 'store.update(patch);',
        },
        {
          name: 'a file that never imports the driver is skipped entirely',
          code: 'const cache = new Map(); cache.delete(key); db.delete(users);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — the table argument is not a filter', () => {
    ruleTester.run('invalid', noUnscopedMutation, {
      valid: [],
      invalid: [
        {
          name: 'delete with no where empties the table',
          code: DRIVER + 'await db.delete(users);',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'update with set but no where rewrites every row',
          code: DRIVER + 'await db.update(users).set({ role: "admin" });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'returning does not scope the mutation',
          code: DRIVER + 'await db.delete(users).returning();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-drizzle-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unscoped-mutation — fp/fn review 2026-10', () => {
  const D =
    "import { drizzle } from 'drizzle-orm/node-postgres';\nimport { sql } from 'drizzle-orm';\nimport { pgTable, serial, text } from 'drizzle-orm/pg-core';\nconst foo = drizzle(process.env.DATABASE_URL);\nconst bar = pgTable('t', { id: serial('id'), name: text('name') });\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-um-'));
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    "import { drizzle } from 'drizzle-orm/node-postgres';\nexport const db = drizzle(process.env.DATABASE_URL);\n",
  );
  fs.writeFileSync(
    path.join(dir, 'schema.ts'),
    "import { pgTable, serial, text } from 'drizzle-orm/pg-core';\nexport const users = pgTable('users', { id: serial('id'), name: text('name') });\n",
  );
  const ROUTE = path.join(dir, 'route.ts');

  ruleTester.run('fp-fn review 2026-10', noUnscopedMutation, {
    valid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (Map.delete named db)
        name: 'FP: a Map named like a database handle',
        code: "import { eq } from 'drizzle-orm';\nconst db = new Map();\nexport const h = (baz) => db.delete(baz);",
      },
      {
        // @found drizzle-orm integration tests (drizzle-team/drizzle-orm:integration-tests/tests/sqlite/sqlite-common.ts:1899)
        name: "FP: a test's full-table update",
        filename: '/repo/integration-tests/tests/sqlite/sqlite-common.ts',
        code:
          D +
          "const db = foo;\nexport const h = () => db.update(bar).set({ name: 'x' });",
      },
    ],
    invalid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (db and table from local modules)
        name: 'FN: the instance and the table from relative modules',
        filename: ROUTE,
        code: "import { db as foo } from './db';\nimport { users as bar } from './schema';\nexport const h = () => foo.delete(bar);",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (transaction handle)
        name: 'FN: the transaction handle Drizzle passes to its callback',
        code:
          D +
          'export const h = () => foo.transaction(async (qux) => { await qux.delete(bar); });',
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (untraceable handle, known table)
        name: 'FN: an untraceable handle deleting a table the file built',
        code: D + 'export const h = (qux) => qux.delete(bar);',
        errors: [{ messageId: 'unscopedMutation' }],
      },
    ],
  });
});
