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

describe('no-unscoped-mutation', () => {
  describe('Valid — filtered, or not a bulk mutation', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'deleteMany with a where filter',
          code: 'await prisma.user.deleteMany({ where: { active: false } });',
        },
        {
          name: 'updateMany with where alongside data',
          code: 'await prisma.post.updateMany({ where: { authorId }, data: { published: false } });',
        },
        {
          name: 'single-record delete is inherently scoped',
          code: 'await prisma.user.delete({ where: { id } });',
        },
        {
          name: 'reads are untouched',
          code: 'await prisma.user.findMany();',
        },
        {
          name: 'a filter built elsewhere cannot be read — deliberate false negative',
          code: 'await prisma.user.deleteMany(buildFilter(req.query));',
        },
        {
          name: 'nested transaction call with a filter',
          code: 'await prisma.$transaction([prisma.user.deleteMany({ where: { id } })]);',
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
          code: 'await prisma.user.deleteMany();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'deleteMany with an empty options object',
          code: 'await prisma.user.deleteMany({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'updateMany with data but no filter rewrites every row',
          code: 'await prisma.user.updateMany({ data: { role: "admin" } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'unscoped deleteMany inside a transaction',
          code: 'await prisma.$transaction([prisma.session.deleteMany()]);',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});
