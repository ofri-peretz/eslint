/**
 * Tests for knex-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on knex code.
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
 * The module gate, and a knex handle. `db` used to be left undeclared and
 * recognised by its NAME; it is now a handle because it is written from the
 * knex import — `foo` would do exactly as well.
 */
const DRIVER = `import knexFactory from 'knex';\nconst db = knexFactory({ client: 'pg' });\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code: DRIVER + `await db('users').insert({ name: req.body.name });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await db.insert(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await db.insert({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports knex is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await db.insert(req.body);`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await db.insert(req.query);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await db.insert(req.body);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await db.insert({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-knex-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-mass-assignment — fp/fn review 2026-10', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knex-ma-'));
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    "import knex from 'knex';\nexport const qux = knex({ client: 'pg' });\n",
  );
  const ROUTE = path.join(dir, 'routes.ts');
  const K = "import knex from 'knex';\nconst foo = knex({ client: 'pg' });\n";

  ruleTester.run('fp-fn review 2026-10', noMassAssignment, {
    valid: [
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (a Map named like a handle)
        name: 'FP: a Map named like a database handle',
        code:
          K +
          'const db = new Map();\nexport const h = (req) => db.update(req.body);',
      },
      {
        name: 'named fields picked off a destructured rest',
        code:
          K +
          "export const h = (bar) => { const { id, ...baz } = bar.body; return foo('users').where({ id }).update({ name: baz.name }); };",
      },
    ],
    invalid: [
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (renamed handle)
        name: 'FN: a handle named anything at all, request named anything at all',
        code:
          K + "export const h = (bar, baz) => foo('users').insert(bar.body);",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (transaction handle)
        name: 'FN: the transaction handle knex passes to its callback',
        code:
          K +
          "export const h = (bar) => foo.transaction(async (baz) => { await baz('users').insert(bar.body); });",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (rest of the payload)
        name: 'FN: the rest of a destructured payload',
        code:
          K +
          "export const h = (bar) => { const { id, ...baz } = bar.body; return foo('users').where({ id }).update(baz); };",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (upsert merge)
        name: "FN: an upsert's merge() half",
        code:
          K +
          "export const h = (bar) => foo('users').insert({ id: 1 }).onConflict('id').merge(bar.body);",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)
        name: 'FN: the handle comes from a relative module',
        filename: ROUTE,
        code: "import { qux as foo } from './db';\nexport const h = (bar) => foo('users').insert({ ...bar.body });",
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});
