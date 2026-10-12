/**
 * Tests for knex-security/no-unscoped-mutation
 * CWE-284 — bulk mutations that reach every row in the table.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Knex *contract*:
 * `update()`'s argument is the values object rather than a filter, and every
 * spelling of the `where` family counts as scope.
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

/** Opens the rule's import gate; see `modules` on the factory config. */
const DRIVER = "import Knex from 'knex';\n";

describe('no-unscoped-mutation', () => {
  describe('Valid — a where clause is chained', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'del after where',
          code: DRIVER + "await knex('users').where({ id }).del();",
        },
        {
          name: 'del before where',
          code: DRIVER + "await knex('users').del().where({ id });",
        },
        {
          name: 'whereIn variant',
          code: DRIVER + "await knex('users').whereIn('id', ids).del();",
        },
        {
          name: 'whereRaw variant',
          code: DRIVER + "await knex('users').whereRaw('id = ?', [id]).del();",
        },
        {
          name: 'whereNull variant',
          code: DRIVER + "await knex('users').whereNull('deleted_at').del();",
        },
        {
          name: 'update with values and a filter',
          code:
            DRIVER +
            "await knex('users').where({ id }).update({ active: false });",
        },
        {
          name: 'andWhere chained after an initial clause',
          code:
            DRIVER +
            "await knex('users').where({ id }).andWhere({ tenant }).del();",
        },
        {
          name: 'reads are untouched',
          code: DRIVER + "await knex('users').select('*');",
        },
        {
          name: 'orWhereIn variant',
          code: DRIVER + "await knex('users').del().orWhereIn('id', ids);",
        },
        {
          name: 'orWhereNull variant',
          code: DRIVER + "await knex('users').del().orWhereNull('deleted_at');",
        },
        {
          name: 'orWhereRaw variant',
          code:
            DRIVER + "await knex('users').del().orWhereRaw('id = ?', [id]);",
        },
        {
          name: 'whereWrapped variant',
          code: DRIVER + "await knex('users').whereWrapped(fn).del();",
        },
        {
          name: 'whereILike variant',
          code: DRIVER + "await knex('users').whereILike('name', p).del();",
        },
        {
          name: 'Map.delete is not a query',
          code: DRIVER + 'cache.delete(key);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — the values object is not a filter', () => {
    ruleTester.run('invalid', noUnscopedMutation, {
      valid: [],
      invalid: [
        {
          name: 'del with no clause empties the table',
          code: DRIVER + "await knex('users').del();",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'update with values but no clause rewrites every row',
          code: DRIVER + "await knex('users').update({ role: 'admin' });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'returning does not scope the mutation',
          code: DRIVER + "await knex('users').del().returning('id');",
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-knex-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unscoped-mutation — fp/fn review 2026-10', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knex-um-'));
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    "import knex from 'knex';\nexport const qux = knex({ client: 'pg' });\n",
  );
  const ROUTE = path.join(dir, 'routes.ts');
  const K = "import knex from 'knex';\nconst foo = knex({ client: 'pg' });\n";

  ruleTester.run('fp-fn review 2026-10', noUnscopedMutation, {
    valid: [
      {
        // @found directus/directus:api/src/database/migrations/20211118A-add-notifications.ts:23
        name: "FP: a backfill inside a knex migration's up()",
        code: "import type { Knex } from 'knex';\nexport async function up(knex: Knex) { await knex('directus_users').update({ email_notifications: true }); }\nexport async function down(knex: Knex) { await knex('directus_users').update({ email_notifications: false }); }",
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (seed contract)
        name: 'FP: the del() that starts a knex seed',
        code: "import type { Knex } from 'knex';\nexports.seed = async function (knex: Knex) { await knex('users').del(); };",
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (builder scoped in another statement)
        name: 'FP: a builder scoped by another statement before the delete',
        code:
          K +
          "export async function h(bar) { const qb = foo('users'); if (bar) qb.where('id', bar); await qb.del(); }",
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (builder handed to a scoping helper)
        name: 'FP: a builder handed to a helper that may scope it',
        code:
          K +
          "declare function scope(q: unknown): void;\nexport async function h() { const qb = foo('users'); scope(qb); await qb.del(); }",
      },
    ],
    invalid: [
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (renamed handle)
        name: 'FN: a handle named anything at all',
        code:
          K + "export const h = () => foo('users').update({ active: false });",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (from() chain)
        name: 'FN: a chain that names its table with from()',
        code: K + "export const h = () => foo.from('users').del();",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (transaction handle)
        name: 'FN: the transaction handle knex passes to its callback',
        code:
          K +
          "export const h = () => foo.transaction(async (bar) => { await bar('logs').del(); });",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (typed parameter)
        name: 'FN: a parameter typed as a knex handle',
        code: "import type { Knex } from 'knex';\nexport async function h(bar: Knex.Transaction) { await bar('users').del(); }",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)
        name: 'FN: the handle comes from a relative module',
        filename: ROUTE,
        code: "import { qux as foo } from './db';\nexport const h = () => foo('users').del();",
        errors: [{ messageId: 'unscopedMutation' }],
      },
    ],
  });
});
