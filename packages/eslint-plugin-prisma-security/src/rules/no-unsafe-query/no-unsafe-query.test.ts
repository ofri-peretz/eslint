/**
 * Tests for prisma-security/no-unsafe-query
 * CWE-89 — SQL injection through Prisma's raw-SQL escapes.
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
          code: 'import PrismaClient from "@prisma/client";\nawait prisma.$queryRaw`SELECT * FROM User WHERE email = ${email}`;',
        },
        {
          name: 'static SQL, no interpolation',
          code: "import PrismaClient from '@prisma/client';\nprisma.$queryRawUnsafe('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import PrismaClient from "@prisma/client";\nprisma.$queryRawUnsafe();',
        },
        {
          name: 'unrelated code',
          code: 'import PrismaClient from "@prisma/client";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import PrismaClient from '@prisma/client';\nconst sql = 'SELECT * FROM users'; prisma.$queryRawUnsafe(sql);",
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
          code: 'import PrismaClient from "@prisma/client";\nprisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import PrismaClient from '@prisma/client';\nprisma.$queryRawUnsafe('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import PrismaClient from '@prisma/client';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'prisma.$queryRawUnsafe(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: '$executeRawUnsafe() sink',
          code: 'import PrismaClient from "@prisma/client";\nprisma.$executeRawUnsafe(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-prisma-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const P =
    "import { PrismaClient, Prisma } from '@prisma/client';\nconst foo = new PrismaClient();\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-uq-'));
  fs.writeFileSync(
    path.join(dir, 'prisma.ts'),
    "import { PrismaClient } from '@prisma/client';\nconst g = globalThis as unknown as { prisma?: PrismaClient };\nexport const prisma = g.prisma ?? new PrismaClient();\nexport default prisma;\n",
  );
  const ROUTE = path.join(dir, 'route.ts');

  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        name: 'Prisma.raw over fixed text',
        code:
          P +
          'const bar = \'DESC\';\nfoo.$queryRaw`SELECT * FROM "User" ORDER BY name ${Prisma.raw(bar)}`;',
      },
      {
        name: '$queryRawUnsafe with positional parameters',
        code:
          P +
          'export const h = (bar) => foo.$queryRawUnsafe(\'SELECT * FROM "User" WHERE name = $1\', bar.query.n);',
      },
    ],
    invalid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (Prisma.raw)
        name: 'FN: Prisma.raw over interpolated text',
        code:
          P +
          'export const h = (bar) => foo.$queryRaw(Prisma.raw(`SELECT * FROM "User" WHERE id = ${bar.params.id}`));',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (Prisma.raw of request data)
        name: 'FN: Prisma.raw over a request value',
        code:
          P +
          'export const h = (bar) => foo.$queryRaw`SELECT * FROM ${Prisma.raw(String(bar.query.table))}`;',
        errors: [{ messageId: 'noUnsafeQuery' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (client from lib/prisma)
        name: 'FN: the client from a relative lib/prisma module, in a file that never imports Prisma',
        filename: ROUTE,
        code: "import foo from './prisma';\nexport async function POST(bar: Request) { const baz = await bar.json(); return foo.$queryRawUnsafe(`SELECT * FROM \"User\" WHERE email = '${baz.email}'`); }",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (request text as the statement)
        name: 'FN: request data handed over as the whole statement',
        code:
          P + 'export const h = (bar) => foo.$executeRawUnsafe(bar.body.sql);',
        errors: [{ messageId: 'noUnsafeQuery' }],
      },
    ],
  });
});
