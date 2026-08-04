/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the shared CWE-284 detector.
 *
 * Three instances run side by side because the drivers configure it in
 * genuinely different shapes: options-object scope (Prisma), options-object
 * scope plus a truncate flag (Sequelize), and builder-chain scope with Knex's
 * `where*` family.
 *
 * The `describe('scope evidence is not swallowed')` block is the
 * self-suppression lock required by the quality contract: each case is an
 * `invalid` fixture that the corresponding guard would hide if it were
 * written loosely (source-text matching, nested-key matching, or inheriting
 * scope across expression boundaries).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  chainMethodNames,
  createUnscopedMutationRule,
  hasArgumentScope,
  hasTruthyKey,
  propertyKeyName,
} from './unscoped-mutation-rule';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

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

const docs = (name: string) => ({
  type: 'problem' as const,
  docs: {
    description: `test rule (${name})`,
    url: `https://example.test/${name}`,
    cwe: 'CWE-284',
    cvss: 7.5,
    confidence: 'high' as const,
  },
});

/** Options-object shape — the Prisma / TypeORM form. */
const optionsShape = createUnscopedMutationRule({
  meta: docs('options'),
  methods: ['deleteMany', 'updateMany'],
  fix: 'Pass a `where` filter.',
  documentationLink: 'https://example.test/docs',
});

/**
 * Options-object shape with a truncate flag and the instance-method guard —
 * the Sequelize form, where `instance.destroy()` and `Model.destroy({})` are
 * the same AST shape.
 */
const truncateShape = createUnscopedMutationRule({
  meta: docs('truncate'),
  methods: ['destroy', 'update'],
  requireOptionsObject: true,
  truncateKeys: ['truncate'],
  fix: 'Pass a `where` filter.',
  documentationLink: 'https://example.test/docs',
});

/** Builder-chain shape with Knex's where family — the argument is a table. */
const chainShape = createUnscopedMutationRule({
  meta: docs('chain'),
  methods: ['del', 'update'],
  argumentRole: 'table',
  scopeMethods: ['where', 'whereIn', 'whereRaw'],
  fix: 'Chain a `.where()` clause.',
  documentationLink: 'https://example.test/docs',
});

describe('createUnscopedMutationRule', () => {
  describe('options-object scope', () => {
    ruleTester.run('options', optionsShape, {
      valid: [
        { name: 'where filter present', code: 'prisma.user.deleteMany({ where: { id } });' },
        { name: 'string-literal where key', code: "prisma.user.deleteMany({ 'where': { id } });" },
        {
          name: 'updateMany with where alongside data',
          code: 'prisma.user.updateMany({ where: { id }, data: { name } });',
        },
        {
          name: 'options passed as an identifier — unreadable, deliberate FN',
          code: 'prisma.user.deleteMany(opts);',
        },
        { name: 'spread options may carry the filter', code: 'prisma.user.deleteMany({ ...f });' },
        { name: 'computed key may be the filter', code: 'prisma.user.deleteMany({ [k]: v });' },
        { name: 'non-sink method', code: 'prisma.user.findMany();' },
        { name: 'bare call, not a member expression', code: 'deleteMany();' },
        { name: 'computed sink name is not resolvable', code: "prisma.user['deleteMany']();" },
      ],
      invalid: [
        {
          name: 'no arguments at all',
          code: 'prisma.user.deleteMany();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'empty options object',
          code: 'prisma.user.deleteMany({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'updateMany with data but no where',
          code: 'prisma.user.updateMany({ data: { active: false } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  describe('truncate flag', () => {
    ruleTester.run('truncate', truncateShape, {
      valid: [
        { name: 'scoped destroy', code: 'User.destroy({ where: { id } });' },
        { name: 'truncate explicitly disabled', code: 'User.destroy({ where: {}, truncate: false });' },
        {
          name: 'update with options-object scope in the second argument',
          code: 'User.update({ active: false }, { where: { id } });',
        },
        {
          name: 'instance destroy takes no options and deletes one row',
          code: 'user.destroy();',
        },
        {
          name: 'instance destroy with only a transaction identifier',
          code: 'user.destroy(opts);',
        },
      ],
      invalid: [
        {
          name: 'truncate:true reported even though options are present',
          code: 'User.destroy({ truncate: true });',
          errors: [{ messageId: 'explicitTruncate' }],
        },
        {
          name: 'truncate:true wins over an accompanying where',
          code: 'User.destroy({ where: { id }, truncate: true });',
          errors: [{ messageId: 'explicitTruncate' }],
        },
        {
          name: 'update with values but no scope',
          code: 'User.update({ active: false }, {});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'static destroy with an empty options object',
          code: 'User.destroy({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  describe('builder-chain scope', () => {
    ruleTester.run('chain', chainShape, {
      valid: [
        { name: 'where after the sink', code: "knex('users').del().where({ id });" },
        { name: 'where before the sink', code: "knex('users').where({ id }).del();" },
        { name: 'whereIn variant', code: "knex('users').del().whereIn('id', ids);" },
        { name: 'whereRaw variant', code: "knex('users').del().whereRaw('id = ?', [id]);" },
        {
          name: 'drizzle table argument plus chained where',
          code: 'db.update(users).set({ active: false }).where(eq(users.id, id));',
        },
      ],
      invalid: [
        {
          name: 'del with no clause anywhere in the chain',
          code: "knex('users').del();",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'drizzle update with set but no where',
          code: 'db.update(users).set({ active: false });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'table argument alone is not scope',
          code: 'db.update(users);',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  /**
   * Self-suppression lock. Every case here is a REAL finding that a loosely
   * written guard would swallow. Reverting the corresponding guard in
   * unscoped-mutation-rule.ts must make these fail.
   */
  describe('scope evidence is not swallowed', () => {
    ruleTester.run('suppression-lock', optionsShape, {
      valid: [],
      invalid: [
        {
          // `{ data: { where: 1 } }` contains the text "where" but has no
          // top-level filter. A guard that searched the printed source, or
          // recursed into nested objects, would report nothing here.
          name: 'nested where is data, not a filter',
          code: 'prisma.user.updateMany({ data: { where: 1 } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // A guard matching source text would see "where" in the callback
          // and treat the whole call as scoped.
          name: 'the word where appearing elsewhere in the statement',
          code: 'prisma.user.deleteMany({ data: rows.filter((r) => r.where) });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });

    ruleTester.run('suppression-lock-chain', chainShape, {
      valid: [],
      invalid: [
        {
          // The sink is an ARGUMENT to another call that is itself scoped.
          // Ascending past an argument boundary would let the sink inherit a
          // `.where()` that never applied to it.
          name: 'scope on an enclosing call does not reach a sink passed as an argument',
          code: "run(knex('users').del()).where({ id });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // A sibling chain in the same statement is a different expression.
          name: 'scope on a sibling chain does not transfer',
          code: "await Promise.all([knex('a').where({ id }).del(), knex('b').del()]);",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // Computed member access yields no resolvable method name, so it
          // must not be counted as a `where`.
          name: 'computed chain member is not a scope method',
          code: "knex('users').del()[clause]({ id });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  /**
   * Layer 2 — the exported helpers called directly, covering branches the
   * parser cannot reach through a rule fixture.
   */
  describe('helpers', () => {
    it('propertyKeyName reads identifier and string-literal keys', () => {
      const ident = {
        type: AST_NODE_TYPES.Property,
        computed: false,
        key: { type: AST_NODE_TYPES.Identifier, name: 'where' },
      } as unknown as TSESTree.ObjectLiteralElement;
      expect(propertyKeyName(ident)).toBe('where');

      const str = {
        type: AST_NODE_TYPES.Property,
        computed: false,
        key: { type: AST_NODE_TYPES.Literal, value: 'where' },
      } as unknown as TSESTree.ObjectLiteralElement;
      expect(propertyKeyName(str)).toBe('where');
    });

    it('propertyKeyName refuses computed, non-Property and non-string keys', () => {
      const computed = {
        type: AST_NODE_TYPES.Property,
        computed: true,
        key: { type: AST_NODE_TYPES.Identifier, name: 'where' },
      } as unknown as TSESTree.ObjectLiteralElement;
      expect(propertyKeyName(computed)).toBeUndefined();

      const spread = {
        type: AST_NODE_TYPES.SpreadElement,
      } as unknown as TSESTree.ObjectLiteralElement;
      expect(propertyKeyName(spread)).toBeUndefined();

      const numeric = {
        type: AST_NODE_TYPES.Property,
        computed: false,
        key: { type: AST_NODE_TYPES.Literal, value: 3 },
      } as unknown as TSESTree.ObjectLiteralElement;
      expect(propertyKeyName(numeric)).toBeUndefined();
    });

    it('hasTruthyKey ignores spreads and false-valued flags', () => {
      const obj = {
        type: AST_NODE_TYPES.ObjectExpression,
        properties: [
          { type: AST_NODE_TYPES.SpreadElement },
          {
            type: AST_NODE_TYPES.Property,
            computed: false,
            key: { type: AST_NODE_TYPES.Identifier, name: 'truncate' },
            value: { type: AST_NODE_TYPES.Literal, value: false },
          },
        ],
      } as unknown as TSESTree.ObjectExpression;
      expect(hasTruthyKey(obj, ['truncate'])).toBe(false);
    });

    it('hasArgumentScope treats a bare literal argument as carrying no scope', () => {
      const literal = {
        type: AST_NODE_TYPES.Literal,
        value: 1,
      } as unknown as TSESTree.CallExpressionArgument;
      expect(hasArgumentScope([literal], ['where'])).toBe(false);
    });

    it('hasArgumentScope cannot rule out an unreadable argument', () => {
      const call = {
        type: AST_NODE_TYPES.CallExpression,
      } as unknown as TSESTree.CallExpressionArgument;
      expect(hasArgumentScope([call], ['where'])).toBe(true);
    });

    it('chainMethodNames stops at a parentless node', () => {
      const orphan = {
        type: AST_NODE_TYPES.CallExpression,
        callee: { type: AST_NODE_TYPES.Identifier, name: 'del' },
        parent: undefined,
      } as unknown as TSESTree.CallExpression;
      expect(chainMethodNames(orphan)).toEqual(new Set());
    });
  });
});
