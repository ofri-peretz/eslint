/**
 * Tests for prisma-security/no-unscoped-mutation
 * CWE-284 — bulk mutations that reach every row in the table.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Prisma
 * *contract*: the right sinks, on real Prisma call shapes.
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
const DRIVER =
  "import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();\n";

describe('no-unscoped-mutation', () => {
  describe('Valid — filtered, or not a bulk mutation', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'deleteMany with a where filter',
          code:
            DRIVER +
            'await prisma.user.deleteMany({ where: { active: false } });',
        },
        {
          name: 'updateMany with where alongside data',
          code:
            DRIVER +
            'await prisma.post.updateMany({ where: { authorId }, data: { published: false } });',
        },
        {
          name: 'single-record delete is inherently scoped',
          code: DRIVER + 'await prisma.user.delete({ where: { id } });',
        },
        {
          name: 'reads are untouched',
          code: DRIVER + 'await prisma.user.findMany();',
        },
        {
          name: 'a same-named method on a non-Prisma receiver is not a query',
          code: DRIVER + 'await repo.deleteMany();',
        },
        {
          name: 'a filter built elsewhere cannot be read — deliberate false negative',
          code:
            DRIVER + 'await prisma.user.deleteMany(buildFilter(req.query));',
        },
        {
          name: 'nested transaction call with a filter',
          code:
            DRIVER +
            'await prisma.$transaction([prisma.user.deleteMany({ where: { id } })]);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — reaches every row', () => {
    ruleTester.run('invalid', noUnscopedMutation, {
      valid: [],
      invalid: [
        {
          name: 'deleteMany with no arguments empties the table',
          code: DRIVER + 'await prisma.user.deleteMany();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'deleteMany with an empty options object',
          code: DRIVER + 'await prisma.user.deleteMany({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'updateMany with data but no filter rewrites every row',
          code:
            DRIVER +
            'await prisma.user.updateMany({ data: { role: "admin" } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'unscoped deleteMany inside a transaction',
          code:
            DRIVER +
            'await prisma.$transaction([prisma.session.deleteMany()]);',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'an empty where matches every row, so it is not a filter',
          code: DRIVER + 'await prisma.user.deleteMany({ where: {} });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-prisma-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unscoped-mutation — fp/fn review 2026-10', () => {
  const P =
    "import { PrismaClient, Prisma } from '@prisma/client';\nconst foo = new PrismaClient();\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-um-'));
  fs.writeFileSync(
    path.join(dir, 'prisma.ts'),
    "import { PrismaClient } from '@prisma/client';\nexport default new PrismaClient();\n",
  );
  const ROUTE = path.join(dir, 'route.ts');

  ruleTester.run('fp-fn review 2026-10', noUnscopedMutation, {
    valid: [
      {
        // @found prisma/prisma-examples:databases/mongodb/tests/prisma.test.ts:7
        name: "FP: a test's teardown",
        filename: '/repo/databases/mongodb/tests/prisma.test.ts',
        code: DRIVER + 'await prisma.post.deleteMany({});',
      },
    ],
    invalid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (renamed client)
        name: 'FN: a client named anything at all',
        code: P + 'export const h = () => foo.session.deleteMany();',
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (client from lib/prisma)
        name: 'FN: the client from a relative lib/prisma module',
        filename: ROUTE,
        code: "import foo from './prisma';\nexport const h = () => foo.user.updateMany({ data: { active: false } });",
        errors: [{ messageId: 'unscopedMutation' }],
      },
      {
        // @found prisma/prisma-examples:databases/sql-server/src/script.js:244
        name: 'a seed script that wipes a table',
        code: DRIVER + 'await prisma.tag.deleteMany({});',
        errors: [{ messageId: 'unscopedMutation' }],
      },
    ],
  });
});
