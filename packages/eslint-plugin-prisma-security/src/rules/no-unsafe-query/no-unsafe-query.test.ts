/**
 * Tests for prisma-security/no-unsafe-query
 * CWE-89 — SQL injection through Prisma's raw-SQL escapes.
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
