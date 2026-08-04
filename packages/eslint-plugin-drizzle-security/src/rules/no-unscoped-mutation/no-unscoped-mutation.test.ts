/**
 * Tests for drizzle-security/no-unscoped-mutation
 * CWE-284 — bulk mutations that reach every row in the table.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Drizzle
 * *contract*: the table argument is never mistaken for a filter, and scope is
 * read from the chained `.where()`.
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
  describe('Valid — a where clause is chained', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        {
          name: 'delete with a chained where',
          code: 'await db.delete(users).where(eq(users.id, id));',
        },
        {
          name: 'update with set and where',
          code: 'await db.update(users).set({ active: false }).where(eq(users.id, id));',
        },
        {
          name: 'where before returning',
          code: 'await db.delete(users).where(eq(users.id, id)).returning();',
        },
        {
          name: 'reads are untouched',
          code: 'await db.select().from(users);',
        },
        {
          name: 'insert is not a bulk mutation',
          code: 'await db.insert(users).values({ name });',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — the table argument is not a filter', () => {
    ruleTester.run('invalid', noUnscopedMutation, {
      valid: [],
      invalid: [
        {
          name: 'delete with no where empties the table',
          code: 'await db.delete(users);',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'update with set but no where rewrites every row',
          code: 'await db.update(users).set({ role: "admin" });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'returning does not scope the mutation',
          code: 'await db.delete(users).returning();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});
