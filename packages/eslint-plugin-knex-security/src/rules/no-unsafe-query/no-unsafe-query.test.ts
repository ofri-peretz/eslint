/**
 * Tests for knex-security/no-unsafe-query
 * CWE-89 — SQL injection through Knex's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users WHERE id = ?', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import knex from "knex";\nknex.raw();',
        },
        {
          name: 'unrelated code',
          code: 'import knex from "knex";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import knex from 'knex';\nconst sql = 'SELECT * FROM users'; knex.raw(sql);",
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
          code: 'import knex from "knex";\nknex.raw(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import knex from 'knex';\nknex.raw('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import knex from 'knex';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'knex.raw(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-knex-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const K = "import knex from 'knex';\nconst foo = knex({ client: 'pg' });\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knex-uq-'));
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    "import knex from 'knex';\nexport const qux = knex({ client: 'pg' });\n",
  );
  const ROUTE = path.join(dir, 'routes.ts');

  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found directus/directus:api/src/database/helpers/schema/dialects/postgres.ts:73
        name: 'FP: a ternary between two SQL keywords',
        code:
          K +
          "export const h = (bar) => foo.raw(`CREATE ${bar ? 'UNIQUE ' : ''}INDEX ?? ON ?? (??)`, ['a', 'b', 'c']);",
      },
      {
        // @found directus/directus:api/src/database/helpers/schema/dialects/mysql.ts:28
        name: 'FP: a ?? identifier-placeholder list',
        code:
          K +
          "export const h = (bar: string[]) => { const baz = bar.map(() => '??').join(', '); return foo.raw(`ALTER TABLE ?? ADD PRIMARY KEY (${baz})`, ['t', ...bar]); };",
      },
      {
        // @found directus/directus:api/src/database/helpers/fn/dialects/postgres.ts:17
        name: 'FP: a local helper that only returns fixed fragments',
        code:
          K +
          "const bar = (t?: string) => { if (t === 'timestamp') return \" AT TIME ZONE 'UTC'\"; return ''; };\n" +
          'export const h = (baz) => foo.raw(`EXTRACT(YEAR FROM ??.??${bar(baz?.type)})`, [1, 2]);',
      },
      {
        // @found directus/directus:api/src/database/helpers/fn/types.ts:105
        name: 'FP: a sub-statement a caller composed, wrapped in parentheses',
        code:
          K +
          'export const h = (bar: string, baz: unknown[]) => foo.raw(`(${bar})`, baz);',
      },
      {
        // @found directus/directus:api/src/database/run-ast/lib/get-db-query.ts:206
        name: 'FP: an ORDER BY list a caller composed from ?? placeholders',
        code:
          K +
          "export const h = (bar: string, baz: string[]) => foo.raw(`partition by ?? order by ${bar}`, ['t.id', ...baz]);",
      },
      {
        // @found directus/directus:api/src/database/run-ast/utils/get-column.ts:86
        name: "FP: a value the program types as knex's own Raw",
        code: "import knex, { type Knex } from 'knex';\nconst foo = knex({ client: 'pg' });\nexport const h = (bar: () => unknown) => { const baz = bar() as Knex.Raw; return foo.raw(baz + ' AS ??', ['a']); };",
      },
      {
        // @found laurent22/joplin:packages/server/src/models/BaseModel.ts:376
        name: 'FP: a savepoint name the class generates',
        code:
          K +
          "import { v4 as bar } from 'uuid';\nexport async function h() { const baz = `sp_${bar()}`; await foo.raw(`SAVEPOINT ${baz}`); }",
      },
      {
        // @found laurent22/joplin:packages/server/src/db.ts:165
        name: 'FP: a migration helper composing the table and column it is given',
        code:
          K +
          'export const h = async (bar: string, baz: string) => { await foo.raw(`ALTER TABLE ${bar} ALTER COLUMN ${baz} SET DATA TYPE text`); };',
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (fixed column list)
        name: 'FP: a fixed column list joined into the select list',
        code:
          K +
          "const bar = ['id', 'name'];\nfoo.raw(`SELECT ${bar.join(', ')} FROM users`);",
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (allowlisted sort column)
        name: 'FP: a sort column chosen through an allowlist ternary',
        code:
          K +
          "export const h = (bar) => { const baz = ['name', 'email'].includes(bar.query.sort) ? bar.query.sort : 'id'; return foo('users').orderByRaw(`${baz} DESC`); };",
      },
      {
        // @found Budibase/budibase:packages/server/src/integrations/tests/utils/mysql.ts:61
        name: 'FP: a test utility creating a scratch database',
        filename: '/repo/packages/server/src/integrations/tests/utils/mysql.ts',
        code:
          K +
          'export const h = (bar: string) => foo.raw(`CREATE DATABASE \\`${bar}\\``);',
      },
    ],
    invalid: [
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (whereRaw)
        name: 'FN: whereRaw with an interpolated value',
        code:
          K +
          "export const h = (bar) => foo('users').whereRaw(`name = '${bar.query.name}'`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (orderByRaw)
        name: 'FN: orderByRaw with a sort column from the request',
        code:
          K +
          "export const h = (bar) => { const { sort } = bar.query; return foo('users').orderByRaw(`${sort} DESC`); };",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (havingRaw)
        name: 'FN: havingRaw with a value after a comparison',
        code:
          K +
          "export const h = (bar) => foo('users').groupBy('a').havingRaw(`count(*) > ${bar.query.n}`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (joinRaw / fromRaw)
        name: 'FN: joinRaw and fromRaw',
        code:
          K +
          "export const h = (bar) => foo.fromRaw(`(SELECT * FROM ${bar.query.t}) AS x`).joinRaw(`JOIN y ON y.a = '${bar.query.a}'`);",
        errors: [
          { messageId: 'unsafeTemplateLiteral' },
          { messageId: 'unsafeTemplateLiteral' },
        ],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)
        name: 'FN: the knex handle comes from a relative module',
        filename: ROUTE,
        code: "import { qux as foo } from './db';\nexport const h = (bar) => foo.raw(`SELECT * FROM users WHERE id = ${bar.params.id}`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (objection raw)
        name: "FN: objection's standalone raw()",
        code: "import { raw as foo } from 'objection';\nexport const h = (bar) => foo(`lower(name) = '${bar.query.n}'`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found directus/directus:api/src/database/helpers/fn/dialects/oracle.ts:82
        name: 'a JSON path spliced inside a quoted SQL literal',
        code:
          K +
          "export const h = (bar: string) => foo.raw(`JSON_VALUE(??.??, '${bar}' RETURNING NUMBER)`, ['t', 'c']);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
