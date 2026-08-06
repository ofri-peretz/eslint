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
          code:
            "import { db } from '@/lib/db';\nawait db.$queryRaw`SELECT * FROM ${table}`;",
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
