/**
 * Tests for drizzle-security/no-raw-identifier-interpolation
 * CWE-89 — identifiers spliced into a template that only parameterizes values.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Drizzle
 * *contract*: the `sql` tag is gated on the drizzle-orm import, value holes
 * stay silent, and `sql.identifier()` — the fix the message recommends — is
 * never itself a finding.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noRawIdentifierInterpolation } from './index';

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
const DRIVER = "import { sql } from 'drizzle-orm';\n";

describe('no-raw-identifier-interpolation', () => {
  describe('Valid — value positions, which the template does parameterize', () => {
    ruleTester.run('valid', noRawIdentifierInterpolation, {
      valid: [
        {
          name: 'a WHERE value is exactly what the tag is for',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);',
        },
        {
          name: 'LIMIT and OFFSET take bind parameters',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users LIMIT ${n} OFFSET ${o}`);',
        },
        {
          name: 'INSERT values',
          code:
            DRIVER +
            'await db.execute(sql`INSERT INTO users (name) VALUES (${name})`);',
        },
        {
          name: 'UPDATE ... SET value',
          code:
            DRIVER +
            'await db.execute(sql`UPDATE users SET name = ${name} WHERE id = ${id}`);',
        },
        {
          name: 'a literal identifier is developer-written, not input',
          code: DRIVER + "await db.execute(sql`SELECT * FROM ${'users'}`);",
        },
        {
          name: 'sql.identifier() is the remediation, never a finding',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM ${sql.identifier(table)}`);',
        },
        {
          name: 'a nested sql fragment is the composition primitive',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${sql`users`}`);',
        },
        {
          name: 'sql.join composes chunks, it does not splice text',
          code:
            DRIVER +
            'await db.execute(sql`SELECT ${sql.join(cols, sql`, `)} FROM users`);',
        },
        {
          name: 'sql.placeholder is a bind placeholder',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users ORDER BY name ${sql.placeholder("dir")}`);',
        },
        {
          name: 'no interpolation at all',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users`);',
        },
        {
          name: 'an ORDER BY hole that a later clause has left',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM t ORDER BY created_at LIMIT ${n}`);',
        },
        {
          // The gate is the whole reason this rule can live in a driver plugin.
          name: 'a project-local sql helper in a file that never imports drizzle',
          code: 'await db.execute(sql`SELECT * FROM ${table}`);',
        },
        {
          // Regression: the gate keyed on AST shape, so a `sql` reached through
          // a member expression skipped it and reported under drizzle-security
          // in a file with no Drizzle in it at all.
          name: "someone else's query builder that happens to expose .sql",
          code:
            "import { createQueryBuilder } from 'some-internal-lib';\n" +
            'const q = createQueryBuilder();\n' +
            'await q.sql`SELECT * FROM ${table}`;',
        },
        {
          name: 'a different tag entirely',
          code: DRIVER + 'const s = gql`query { user(id: ${id}) }`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — identifier positions, where no bind parameter can reach', () => {
    ruleTester.run('invalid', noRawIdentifierInterpolation, {
      valid: [],
      invalid: [
        {
          // GHSA-gpj5-g38j-94v9, reduced.
          name: 'table name after FROM',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${table}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'column name after ORDER BY',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users ORDER BY ${column}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'sort direction inside the ORDER BY clause',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users ORDER BY name ${dir}`);',
          errors: [{ messageId: 'sortDirectionInterpolation' }],
        },
        {
          name: 'quoted table name — looks escaped, is not',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM "${table}"`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'JOIN target',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM a JOIN ${other} ON a.id = b.id`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'INSERT INTO target',
          code:
            DRIVER +
            'await db.execute(sql`INSERT INTO ${table} (a) VALUES (${v})`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'UPDATE target',
          code: DRIVER + 'await db.execute(sql`UPDATE ${table} SET a = ${v}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'select list',
          code: DRIVER + 'await db.execute(sql`SELECT ${columns} FROM users`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'GROUP BY column',
          code:
            DRIVER +
            'await db.execute(sql`SELECT count(*) FROM t GROUP BY ${column}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // The value hole is fine; only the identifier one is reported. A rule
          // that reported both would be indistinguishable from no-unsafe-query.
          name: 'a safe value hole and an unsafe identifier hole in one query',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM ${table} WHERE id = ${id}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // Regression: clause detection has to survive an earlier hole, which
          // means joining every preceding quasi rather than reading just one.
          name: 'ORDER BY after an earlier value interpolation',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM t WHERE a = ${a} ORDER BY ${col}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'require() form opens the same gate',
          code: "const { sql } = require('drizzle-orm');\nawait db.execute(sql`SELECT * FROM ${table}`);",
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // sql.raw is the one member of the sql.* family that splices, so it
          // is deliberately not in identifierHelpers.
          name: 'sql.raw is not a composition helper',
          code:
            DRIVER + 'await db.execute(sql`SELECT * FROM ${sql.raw(table)}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'two identifier holes report twice',
          code: DRIVER + 'await db.execute(sql`SELECT ${cols} FROM ${table}`);',
          errors: [
            { messageId: 'identifierInterpolation' },
            { messageId: 'identifierInterpolation' },
          ],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-drizzle-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-raw-identifier-interpolation — fp/fn review 2026-10', () => {
  const D =
    "import { drizzle } from 'drizzle-orm/node-postgres';\nimport { sql } from 'drizzle-orm';\nimport { pgTable, serial, text } from 'drizzle-orm/pg-core';\nconst foo = drizzle(process.env.DATABASE_URL);\nconst bar = pgTable('t', { id: serial('id'), name: text('name') });\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-ri-'));
  fs.writeFileSync(
    path.join(dir, 'schema.ts'),
    "import { pgTable, serial, text } from 'drizzle-orm/pg-core';\nexport const users = pgTable('users', { id: serial('id'), name: text('name') });\n",
  );
  const ROUTE = path.join(dir, 'route.ts');

  ruleTester.run('fp-fn review 2026-10', noRawIdentifierInterpolation, {
    valid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (table objects)
        name: 'FP: a table and its columns, built in this file',
        code:
          D +
          'foo.execute(sql`select ${bar.id}, ${bar.name} from ${bar} order by ${bar.name} desc`);',
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (schema module)
        name: 'FP: a table imported from the schema module',
        filename: ROUTE,
        code: "import { sql } from 'drizzle-orm';\nimport { users as baz } from './schema';\nexport const q = sql`select * from ${baz}`;",
      },
      {
        // @found payloadcms/payload:packages/drizzle/src/createGlobalVersion.ts:61
        name: 'FP: a table read from a registry and used with columns',
        code:
          D +
          'export function h(this: { tables: Record<string, any> }, baz: string, qux: number) { const quux = this.tables[baz]; return sql`UPDATE ${quux} SET latest = false WHERE ${quux.id} != ${qux}`; }',
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (direction fragments)
        name: 'FP: a direction chosen between two sql fragments',
        code:
          D +
          'export const h = (baz) => sql`select * from t order by name ${baz.query.desc ? sql`desc` : sql`asc`}`;',
      },
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (subquery)
        name: 'FP: a named subquery',
        code:
          D +
          "const baz = foo.select().from(bar).as('sq');\nexport const q = sql`select * from ${baz}`;",
      },
    ],
    invalid: [
      {
        // @found drizzle-security FP/FN review 2026-10-12, synthetic probe (renamed sql import)
        name: 'FN: the sql tag imported under another name',
        code: "import { sql as qux } from 'drizzle-orm';\nexport const h = (baz) => qux`select * from users order by ${baz.query.col}`;",
        errors: [{ messageId: 'identifierInterpolation' }],
      },
      {
        name: 'a query result is not a table',
        code:
          D +
          'export async function h() { const [baz] = await foo.select().from(bar); return sql`select * from ${baz.name}`; }',
        errors: [{ messageId: 'identifierInterpolation' }],
      },
    ],
  });
});
