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
const DRIVER = "import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();\n";

describe('no-unscoped-mutation', () => {
  describe('Valid — filtered, or not a bulk mutation', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'deleteMany with a where filter',
          code: DRIVER + 'await prisma.user.deleteMany({ where: { active: false } });',
        },
        {
          name: 'updateMany with where alongside data',
          code: DRIVER + 'await prisma.post.updateMany({ where: { authorId }, data: { published: false } });',
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
          code: DRIVER + 'await prisma.user.deleteMany(buildFilter(req.query));',
        },
        {
          name: 'nested transaction call with a filter',
          code: DRIVER + 'await prisma.$transaction([prisma.user.deleteMany({ where: { id } })]);',
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
          code: DRIVER + 'await prisma.user.updateMany({ data: { role: "admin" } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'unscoped deleteMany inside a transaction',
          code: DRIVER + 'await prisma.$transaction([prisma.session.deleteMany()]);',
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
