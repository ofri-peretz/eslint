/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP/FN review 2026-10-12: tags resolved through their import (renames
 * included), driver objects (tables, columns, fragments, subqueries) versus
 * query results, bindings used as objects, and driver-only tag names.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { createRawIdentifierRule } from './raw-identifier-rule';

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

const meta = {
  type: 'problem' as const,
  docs: {
    description: 'review',
    url: 'https://example.test/r',
    cwe: 'CWE-89',
    cvss: 9.8,
    confidence: 'high' as const,
  },
};
const drizzleLike = createRawIdentifierRule({
  meta,
  tags: ['sql'],
  modules: ['orm'],
  requireImport: true,
  identifierHelpers: ['sql.identifier'],
  fix: 'f',
  sortDirectionFix: 's',
  documentationLink: 'https://example.test/d',
});
const prismaLike = createRawIdentifierRule({
  meta,
  tags: ['$queryRaw'],
  driverTags: ['sql'],
  modules: ['orm'],
  requireImport: false,
  identifierHelpers: [],
  fix: 'f',
  sortDirectionFix: 's',
  documentationLink: 'https://example.test/d',
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-ri-review-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(
  path.join(dir, 'schema.ts'),
  "import { table } from 'orm/core';\nimport * as other from 'other';\nexport const users = table('users');\nexport const plain = 'users';\nexport const made = other.table('x');\nexport const viaThis = make();\nexport const iife = (c ? a : b)();\n",
);
const ROUTE = path.join(dir, 'route.ts');
const S =
  "import { sql, table, Name, drizzle } from 'orm';\nconst t = table('t');\nconst db = drizzle();\n";
const ID = 'identifierInterpolation' as const;

describe('createRawIdentifierRule — review 2026-10 (requireImport)', () => {
  ruleTester.run('drizzle-like', drizzleLike, {
    valid: [
      {
        name: 'test file',
        filename: '/r/tests/q.ts',
        code: S + 'sql`select * from ${x}`;',
      },
      {
        name: 'a local tag that is not the import',
        code: 'const sql = (s) => s;\nsql`select * from ${x}`;',
      },
      { name: 'a member tag', code: S + 'o.sql`select * from ${x}`;' },
      { name: 'a table built here', code: S + 'sql`select * from ${t}`;' },
      { name: 'a column of a table', code: S + 'sql`select ${t.id} from t`;' },
      {
        name: 'a nested fragment, conditional',
        code:
          S + 'sql`select * from t order by a ${c ? sql`desc` : sql`asc`}`;',
      },
      {
        name: 'a driver class instance',
        code: S + 'sql`select ${new Name(x)} from t`;',
      },
      {
        name: 'a subquery',
        code:
          S +
          "const q = db.select().from(t).as('q');\nsql`select * from ${q}`;",
      },
      {
        name: 'a table imported from the schema module',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { users } from './schema';\nsql`select * from ${users}`;",
      },
      {
        name: 'a fixed string from the schema module',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { plain } from './schema';\nsql`select * from ${plain}`;",
      },
      {
        name: 'raw over fixed text',
        code: S + "sql`select * from ${sql.raw('t')}`;",
      },
      {
        name: 'a binding used with columns',
        code:
          S +
          'function f(x) { const y = reg[x]; return sql`update ${y} set a = 1 where ${y.id} = 1`; }',
      },
      {
        name: 'a constant',
        code: S + "const name = 'users';\nsql`select * from ${name}`;",
      },
    ],
    invalid: [
      {
        name: 'renamed tag import',
        code: "import { sql as q } from 'orm';\nq`select * from ${x}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'raw over a value',
        code: S + 'sql`select * from ${sql.raw(x)}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'raw with no argument',
        code: S + 'sql`select * from ${sql.raw()}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a query result',
        code:
          S +
          'async function f() { const [r] = await db.select().from(t); return sql`select * from ${r.name}`; }',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a binding with no single write',
        code: S + 'let y = t;\ny = x;\nsql`select * from ${y}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a parameter',
        code: S + 'function f(y) { return sql`select * from ${y}`; }',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a subquery of another object',
        code: S + "const q = other.from(t).as('q');\nsql`select * from ${q}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'a call of a computed member',
        code: S + 'sql`select * from ${o[k]()}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'an import from another package',
        code: S + "import { t2 } from 'other';\nsql`select * from ${t2}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'an exported value that is not a driver call',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { made } from './schema';\nsql`select * from ${made}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'an exported value from a local call',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { viaThis } from './schema';\nsql`select * from ${viaThis}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'an exported immediately-invoked function',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { iife } from './schema';\nsql`select * from ${iife}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'an unresolvable relative import',
        filename: ROUTE,
        code: "import { sql } from 'orm';\nimport { gone } from './missing';\nsql`select * from ${gone}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'a binding used only with string members',
        code:
          S +
          'function f(y) { return sql`select * from ${y} where a = ${y.length}`; }',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a binding used with computed members',
        code: S + 'function f(y) { y[k]; return sql`select * from ${y}`; }',
        errors: [{ messageId: ID }],
      },
      {
        name: 'an expression that is no binding',
        code: S + 'sql`select * from ${a + b}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a deep alias chain',
        code:
          S +
          'const a1 = t;\nconst a2 = a1;\nconst a3 = a2;\nconst a4 = a3;\nconst a5 = a4;\nconst a6 = a5;\nconst a7 = a6;\nconst a8 = a7;\nconst a9 = a8;\nconst a10 = a9;\nsql`select * from ${a10}`;',
        errors: [{ messageId: ID }],
      },
    ],
  });
});

describe('createRawIdentifierRule — review 2026-10 (driver tags)', () => {
  ruleTester.run('prisma-like', prismaLike, {
    valid: [
      {
        name: 'a generic tag name on another object',
        code: "import { make } from 'other';\nconst b = make();\nb.sql`select * from ${x}`;",
      },
      {
        name: 'a generic tag name on an unknown object',
        code: 'b.sql`select * from ${x}`;',
      },
      { name: 'a computed member tag', code: 'b[k]`select * from ${x}`;' },
      {
        name: 'a stand-alone tag on a foreign object',
        code: "import { make } from 'other';\nmake().$queryRaw`select * from ${x}`;",
      },
    ],
    invalid: [
      {
        name: 'the driver namespace tag',
        code: "import { Prisma } from 'orm';\nPrisma.sql`select * from ${x}`;",
        errors: [{ messageId: ID }],
      },
      {
        name: 'a stand-alone tag on an unknown receiver',
        code: 'c.$queryRaw`select * from ${x}`;',
        errors: [{ messageId: ID }],
      },
      {
        name: 'a bare driver tag imported',
        code: "import { sql } from 'orm';\nsql`select * from ${x}`;",
        errors: [{ messageId: ID }],
      },
    ],
  });
});
