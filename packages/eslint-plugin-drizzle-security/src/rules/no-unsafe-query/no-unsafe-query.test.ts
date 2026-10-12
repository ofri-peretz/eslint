/**
 * Tests for drizzle-security/no-unsafe-query
 * CWE-89 — SQL injection through Drizzle's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

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

describe('no-unsafe-query', () => {
  describe('Valid — parameterized and static SQL', () => {
    ruleTester.run('valid', noUnsafeQuery, {
      valid: [
        {
          name: 'safe idiom',
          code: 'import sql from "drizzle-orm";\ndb.select().from(users).where(sql`id = ${userId}`);',
        },
        {
          name: 'static SQL, no interpolation',
          code: "import sql from 'drizzle-orm';\nsql.raw('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import sql from "drizzle-orm";\nsql.raw();',
        },
        {
          name: 'unrelated code',
          code: 'import sql from "drizzle-orm";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import sql from 'drizzle-orm';\nconst sql = 'SELECT * FROM users'; sql.raw(sql);",
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — interpolated raw SQL', () => {
    ruleTester.run('invalid', noUnsafeQuery, {
      valid: [],
      invalid: [
        {
          name: 'template interpolation',
          code: 'import sql from "drizzle-orm";\nsql.raw(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import sql from 'drizzle-orm';\nsql.raw('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import sql from 'drizzle-orm';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'sql.raw(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-drizzle-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const D =
    "import { drizzle } from 'drizzle-orm/node-postgres';\nimport { sql } from 'drizzle-orm';\nimport { pgTable, serial, text } from 'drizzle-orm/pg-core';\nconst foo = drizzle(process.env.DATABASE_URL);\nconst bar = pgTable('t', { id: serial('id'), name: text('name') });\n";
  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found payload:packages/drizzle/src/queries/getTableColumnFromPath.ts:801
        name: 'FP: a map lookup keyed by a parameter field returns what the map holds',
        code:
          "import { sql } from 'drizzle-orm';\n" +
          'export function foo(bar, baz) {\n' +
          '  const qux = bar.tableNameMap.get(toSnakeCase(bar.payload.collections[baz].config.slug));\n' +
          '  return sql.raw(`"t"."${qux}_id"`);\n' +
          '}',
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (constant in sql.raw)
        name: 'FP: sql.raw over a constant',
        code:
          D +
          "const baz = 'name';\nfoo.execute(sql.raw(`select * from ${baz}`));",
      },
      {
        // @found payloadcms/payload:packages/drizzle/src/find/buildPolymorphicJoinQuery.ts:169
        name: 'FP: quoted identifiers composed into sql.raw',
        code:
          D +
          'export const h = (baz: string, qux: string, quux: string) => sql.raw(`"${baz}"."${qux}" = "${quux}"."id"`);',
      },
      {
        // @found payloadcms/payload:packages/drizzle/src/utilities/json.ts:37
        name: 'FP: a key checked against an anchored allowlist pattern first',
        code:
          D +
          'const baz = /^[a-zA-Z0-9_]+$/;\n' +
          "export function h(qux: Record<string, unknown>) { const out: unknown[] = []; Object.entries(qux).forEach(([quux]) => { if (!baz.test(quux)) { throw new Error('unsafe'); } out.push(sql.raw(`'${quux}',`)); }); return out; }",
      },
      {
        // @found payloadcms/payload:packages/drizzle/src/postgres/predefinedMigrations/v2-v3/migrateRelationships.ts:75
        name: 'FP: a whole statement a migration helper composed',
        code:
          D +
          'export async function h(baz: string) { await foo.execute(sql.raw(`${baz}`)); }',
      },
      {
        name: 'the sql template parameterises every hole',
        code:
          D +
          'export const h = (baz) => foo.execute(sql`select * from ${bar} where ${bar.name} = ${baz.body.name}`);',
      },
      {
        name: "a builder's values() takes a row, not SQL",
        code:
          D +
          'export const h = (baz) => foo.insert(bar).values({ name: String(baz.body.name) });',
      },
    ],
    invalid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (plain-string execute)
        name: 'FN: a plain string handed to execute()',
        code:
          D +
          'export const h = (baz) => foo.execute(`select * from t where id = ${baz.query.id}`);',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (sql.raw of request data)
        name: 'FN: sql.raw over a value read from the request body',
        code: "import { sql as qux } from 'drizzle-orm';\nexport async function POST(baz: Request) { const quux = await baz.json(); return qux`select * from ${qux.raw(quux.table)}`; }",
        errors: [{ messageId: 'noUnsafeQuery' }],
      },
      {
        // @found payloadcms/payload:packages/drizzle/src/sqlite/predefinedMigrations/localize-status/index.ts:158
        name: 'values spliced inside quoted SQL literals in sql.raw',
        code:
          D +
          "export const h = (baz: string, qux: string, quux: number) => sql.raw(`UPDATE \"t_locales\" SET version__status = '${baz}' WHERE _parent_id = ${quux} AND _locale = '${qux}'`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
