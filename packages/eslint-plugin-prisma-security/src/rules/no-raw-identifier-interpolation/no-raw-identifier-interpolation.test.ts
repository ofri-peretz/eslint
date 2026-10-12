/**
 * Tests for prisma-security/no-raw-identifier-interpolation
 * CWE-89 — identifiers spliced into a template that only parameterizes values.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Prisma *contract*:
 * the member-tag form is matched on the property name alone (the client is
 * routinely re-exported from a local module), and `$queryRawUnsafe` stays with
 * `no-unsafe-query` so no line is reported by two rules of this plugin.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
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

describe('no-raw-identifier-interpolation', () => {
  describe('Valid — value positions, which the template does parameterize', () => {
    ruleTester.run('valid', noRawIdentifierInterpolation, {
      valid: [
        {
          name: 'the documented safe shape',
          code: 'await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;',
        },
        {
          name: '$executeRaw with a value',
          code: 'await prisma.$executeRaw`UPDATE users SET name = ${name} WHERE id = ${id}`;',
        },
        {
          name: 'LIMIT takes a bind parameter',
          code: 'await prisma.$queryRaw`SELECT * FROM users LIMIT ${n}`;',
        },
        {
          name: 'INSERT values',
          code: 'await prisma.$queryRaw`INSERT INTO users (name) VALUES (${name})`;',
        },
        {
          name: 'a literal identifier is developer-written',
          code: "await prisma.$queryRaw`SELECT * FROM ${'users'}`;",
        },
        {
          // Taxonomy: the Unsafe spelling is no-unsafe-query's. Reporting it
          // here too would put two findings of one plugin on one line.
          name: '$queryRawUnsafe belongs to no-unsafe-query',
          code: 'await prisma.$queryRawUnsafe(`SELECT * FROM ${table}`);',
        },
        {
          name: 'an unrelated tagged template',
          code: 'const s = html`<p>${name}</p>`;',
        },
        {
          name: 'no interpolation',
          code: 'await prisma.$queryRaw`SELECT * FROM users`;',
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
          name: 'table name after FROM',
          code: 'await prisma.$queryRaw`SELECT * FROM ${table}`;',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: '$executeRaw carries the same hole',
          code: 'await prisma.$executeRaw`UPDATE ${table} SET a = ${v}`;',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'column after ORDER BY',
          code: 'await prisma.$queryRaw`SELECT * FROM users ORDER BY ${column}`;',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'sort direction inside the ORDER BY clause',
          code: 'await prisma.$queryRaw`SELECT * FROM users ORDER BY name ${dir}`;',
          errors: [{ messageId: 'sortDirectionInterpolation' }],
        },
        {
          // The client is very often re-exported, so the base identifier
          // carries no information — the $-prefixed property is the gate.
          name: 'a locally re-exported client still reports',
          code: "import { db } from '@/lib/db';\nawait db.$queryRaw`SELECT * FROM ${table}`;",
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'quoted table name',
          code: 'await prisma.$queryRaw`SELECT * FROM "${table}"`;',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'only the identifier hole reports, not the value beside it',
          code: 'await prisma.$queryRaw`SELECT * FROM ${table} WHERE id = ${id}`;',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-prisma-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-raw-identifier-interpolation — fp/fn review 2026-10', () => {
  const P =
    "import { PrismaClient, Prisma } from '@prisma/client';\nconst foo = new PrismaClient();\n";
  ruleTester.run('fp-fn review 2026-10', noRawIdentifierInterpolation, {
    valid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (direction as a fragment)
        name: 'FP: a sort direction chosen between two Prisma.sql fragments',
        code:
          P +
          'export const h = (bar) => { const baz = bar.query.desc ? Prisma.sql`DESC` : Prisma.sql`ASC`; return foo.$queryRaw`SELECT * FROM "User" ORDER BY "name" ${baz}`; };',
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (Prisma.raw of a literal union)
        name: 'FP: Prisma.raw over a value typed as a closed set',
        code:
          P +
          "export const h = (bar: 'asc' | 'desc') => foo.$queryRaw`SELECT * FROM \"User\" ORDER BY name ${Prisma.raw(bar)}`;",
      },
      {
        name: 'Prisma.join and Prisma.empty are parameterised',
        code:
          P +
          'export const h = (bar: number[], baz) => foo.$queryRaw`SELECT * FROM "User" WHERE id IN (${Prisma.join(bar)}) ${baz ? Prisma.sql`AND a = ${baz}` : Prisma.empty}`;',
      },
      {
        name: "a member tag on another library's object",
        code:
          P +
          "import { createBuilder } from 'some-builder';\nconst bar = createBuilder();\nexport const h = (baz) => bar.sql`SELECT * FROM ${baz}`;",
      },
    ],
    invalid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (Prisma.sql fragment)
        name: 'FN: a Prisma.sql fragment with an identifier hole',
        code:
          P +
          'export const h = (bar) => Prisma.sql`SELECT * FROM ${bar.query.t}`;',
        errors: [{ messageId: 'identifierInterpolation' }],
      },
      {
        name: 'the client is recognised however it is named',
        code:
          P +
          'export const h = (bar) => foo.$queryRaw`SELECT * FROM "User" ORDER BY ${bar.query.col}`;',
        errors: [{ messageId: 'identifierInterpolation' }],
      },
    ],
  });
});
