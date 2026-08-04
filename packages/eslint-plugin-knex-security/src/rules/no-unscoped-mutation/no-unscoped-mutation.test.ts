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

/** Opens the rule's import gate; see `modules` on the factory config. */
const DRIVER = "import Knex from 'knex';\n";

describe('no-unscoped-mutation', () => {
  describe('Valid — a where clause is chained', () => {
    ruleTester.run('valid', noUnscopedMutation, {
      valid: [
        { name: 'del after where', code: DRIVER + "await knex('users').where({ id }).del();" },
        { name: 'del before where', code: DRIVER + "await knex('users').del().where({ id });" },
        { name: 'whereIn variant', code: DRIVER + "await knex('users').whereIn('id', ids).del();" },
        { name: 'whereRaw variant', code: DRIVER + "await knex('users').whereRaw('id = ?', [id]).del();" },
        { name: 'whereNull variant', code: DRIVER + "await knex('users').whereNull('deleted_at').del();" },
        {
          name: 'update with values and a filter',
          code: DRIVER + "await knex('users').where({ id }).update({ active: false });",
        },
        {
          name: 'andWhere chained after an initial clause',
          code: DRIVER + "await knex('users').where({ id }).andWhere({ tenant }).del();",
        },
        { name: 'reads are untouched', code: DRIVER + "await knex('users').select('*');" },
        { name: 'orWhereIn variant', code: DRIVER + "await knex('users').del().orWhereIn('id', ids);" },
        { name: 'orWhereNull variant', code: DRIVER + "await knex('users').del().orWhereNull('deleted_at');" },
        { name: 'orWhereRaw variant', code: DRIVER + "await knex('users').del().orWhereRaw('id = ?', [id]);" },
        { name: 'whereWrapped variant', code: DRIVER + "await knex('users').whereWrapped(fn).del();" },
        { name: 'whereILike variant', code: DRIVER + "await knex('users').whereILike('name', p).del();" },
        { name: 'Map.delete is not a query', code: DRIVER + 'cache.delete(key);' },
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
          code: DRIVER + "await knex('users').del();",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'update with values but no clause rewrites every row',
          code: DRIVER + "await knex('users').update({ role: 'admin' });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'returning does not scope the mutation',
          code: DRIVER + "await knex('users').del().returning('id');",
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });
});
