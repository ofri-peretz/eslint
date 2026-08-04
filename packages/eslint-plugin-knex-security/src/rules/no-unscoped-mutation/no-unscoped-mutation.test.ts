/**
 * Tests for knex-security/no-unscoped-mutation
 * CWE-284 — bulk mutations that reach every row in the table.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Knex *contract*:
 * `update()`'s argument is the values object rather than a filter, and every
 * spelling of the `where` family counts as scope.
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
        { name: 'del after where', code: "await knex('users').where({ id }).del();" },
        { name: 'del before where', code: "await knex('users').del().where({ id });" },
        { name: 'whereIn variant', code: "await knex('users').whereIn('id', ids).del();" },
        { name: 'whereRaw variant', code: "await knex('users').whereRaw('id = ?', [id]).del();" },
        { name: 'whereNull variant', code: "await knex('users').whereNull('deleted_at').del();" },
        {
          name: 'update with values and a filter',
          code: "await knex('users').where({ id }).update({ active: false });",
        },
        {
          name: 'andWhere chained after an initial clause',
          code: "await knex('users').where({ id }).andWhere({ tenant }).del();",
        },
        { name: 'reads are untouched', code: "await knex('users').select('*');" },
      ],
      invalid: [],
    });
  });

  describe('Invalid — the values object is not a filter', () => {
    ruleTester.run('invalid', noUnscopedMutation, {
      valid: [],
      invalid: [
        {
          name: 'del with no clause empties the table',
          code: "await knex('users').del();",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'update with values but no clause rewrites every row',
          code: "await knex('users').update({ role: 'admin' });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'returning does not scope the mutation',
          code: "await knex('users').del().returning('id');",
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});
