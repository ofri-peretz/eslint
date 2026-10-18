/**
 * Tests for drizzle-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on drizzle code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noMassAssignment } from './index';

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
 * The module gate, and a Drizzle instance. `db` used to be left undeclared and
 * recognised by its NAME; it is a handle now because it is written from
 * `drizzle()` — `foo` would do exactly as well.
 */
const DRIVER = `import { drizzle } from 'drizzle-orm';\nconst db = drizzle(process.env.DATABASE_URL);\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code:
          DRIVER + `await db.insert(users).values({ name: req.body.name });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await db.values(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await db.values({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports drizzle-orm is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await db.values(req.body);`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await db.values(req.query);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await db.values(req.body);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await db.values({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-drizzle-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-mass-assignment — fp/fn review 2026-10', () => {
  const D =
    "import { drizzle } from 'drizzle-orm/node-postgres';\nimport { sql } from 'drizzle-orm';\nimport { pgTable, serial, text } from 'drizzle-orm/pg-core';\nconst foo = drizzle(process.env.DATABASE_URL);\nconst bar = pgTable('t', { id: serial('id'), name: text('name') });\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-ma-'));
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    "import { drizzle } from 'drizzle-orm/node-postgres';\nexport const db = drizzle(process.env.DATABASE_URL);\n",
  );
  const ROUTE = path.join(dir, 'route.ts');

  ruleTester.run('fp-fn review 2026-10', noMassAssignment, {
    valid: [
      {
        name: 'Object.values() of the request in a file that imports Drizzle',
        code: D + 'export const h = (req) => Object.values(req.body);',
      },
    ],
    invalid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (db from a local module)
        name: 'FN: the instance from a relative module, the body from await request.json()',
        filename: ROUTE,
        code: "import { db as foo } from './db';\nimport { users } from './schema';\nexport async function POST(bar: Request) { const baz = await bar.json(); await foo.insert(users).values(baz); await foo.update(users).set(baz); }",
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedPayload' },
        ],
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (upsert set)
        name: "FN: an upsert's onConflictDoUpdate({ set })",
        code:
          D +
          'export const h = (baz) => foo.insert(bar).values({ name: baz.body.name }).onConflictDoUpdate({ target: bar.id, set: baz.body });',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (transaction handle)
        name: 'FN: the transaction handle Drizzle passes to its callback',
        code:
          D +
          'export const h = (baz) => foo.transaction(async (qux) => { await qux.insert(bar).values(baz.body); });',
        errors: [{ messageId: 'untrustedPayload' }],
      },
    ],
  });
});
