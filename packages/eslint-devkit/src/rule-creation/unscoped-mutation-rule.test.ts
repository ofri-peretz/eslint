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
  driverBindings,
  receiverBaseName,
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
  modules: ['test-orm'],
  receiverPattern: /^(prisma|db)$/,
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
  modules: ['test-orm'],
  receiverPattern: /^(User|user)$/,
  requireOptionsObject: true,
  truncateKeys: ['truncate'],
  fix: 'Pass a `where` filter.',
  documentationLink: 'https://example.test/docs',
});

/** Builder-chain shape with Knex's where family — the argument is a table. */
const chainShape = createUnscopedMutationRule({
  meta: docs('chain'),
  methods: ['del', 'update'],
  modules: ['test-orm'],
  receiverPattern: /^(knex|db)$/,
  argumentRole: 'table',
  scopeMethods: ['where', 'whereIn', 'whereRaw'],
  fix: 'Chain a `.where()` clause.',
  documentationLink: 'https://example.test/docs',
});

/** Opens the import gate for every fixture below. */
const D = "import x from 'test-orm';\n";

describe('createUnscopedMutationRule', () => {
  describe('options-object scope', () => {
    ruleTester.run('options', optionsShape, {
      valid: [
        {
          name: 'where filter present',
          code: D + 'prisma.user.deleteMany({ where: { id } });',
        },
        {
          name: 'string-literal where key',
          code: D + "prisma.user.deleteMany({ 'where': { id } });",
        },
        {
          name: 'updateMany with where alongside data',
          code:
            D + 'prisma.user.updateMany({ where: { id }, data: { name } });',
        },
        {
          name: 'options passed as an identifier — unreadable, deliberate FN',
          code: D + 'prisma.user.deleteMany(opts);',
        },
        {
          name: 'spread options may carry the filter',
          code: D + 'prisma.user.deleteMany({ ...f });',
        },
        {
          name: 'computed key may be the filter',
          code: D + 'prisma.user.deleteMany({ [k]: v });',
        },
        { name: 'non-sink method', code: D + 'prisma.user.findMany();' },
        {
          name: 'a file without the driver import is skipped wholesale',
          code: 'prisma.user.deleteMany();',
        },
        {
          name: 'a receiver with no resolvable base name is skipped',
          code: D + '(await handle()).deleteMany();',
        },
        {
          name: 'a receiver that is not a driver handle is skipped',
          code: D + 'queue.deleteMany();',
        },
        {
          name: 'bare call, not a member expression',
          code: D + 'deleteMany();',
        },
        {
          name: 'computed sink name is not resolvable',
          code: D + "prisma.user['deleteMany']();",
        },
      ],
      invalid: [
        {
          name: 'no arguments at all',
          code: D + 'prisma.user.deleteMany();',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'empty options object',
          code: D + 'prisma.user.deleteMany({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'updateMany with data but no where',
          code: D + 'prisma.user.updateMany({ data: { active: false } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'an empty where object matches every row',
          code: D + 'prisma.user.deleteMany({ where: {} });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  describe('truncate flag', () => {
    ruleTester.run('truncate', truncateShape, {
      valid: [
        {
          name: 'scoped destroy',
          code: D + 'User.destroy({ where: { id } });',
        },
        {
          name: 'truncate explicitly disabled',
          code: D + 'User.destroy({ where: { id }, truncate: false });',
        },
        {
          name: 'a falsy non-false truncate is still not a truncate',
          code: D + 'User.destroy({ where: { id }, truncate: null });',
        },
        {
          name: 'update with options-object scope in the second argument',
          code: D + 'User.update({ active: false }, { where: { id } });',
        },
        {
          name: 'instance destroy takes no options and deletes one row',
          code: D + 'user.destroy();',
        },
        {
          name: 'instance destroy with only a transaction identifier',
          code: D + 'user.destroy(opts);',
        },
      ],
      invalid: [
        {
          name: 'truncate:true reported even though options are present',
          code: D + 'User.destroy({ truncate: true });',
          errors: [{ messageId: 'explicitTruncate' }],
        },
        {
          name: 'truncate:true wins over an accompanying where',
          code: D + 'User.destroy({ where: { id }, truncate: true });',
          errors: [{ messageId: 'explicitTruncate' }],
        },
        {
          name: 'update with values but no scope',
          code: D + 'User.update({ active: false }, {});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'static destroy with an empty options object',
          code: D + 'User.destroy({});',
          errors: [{ messageId: 'unscopedMutation' }],
        },
      ],
    });
  });

  describe('builder-chain scope', () => {
    ruleTester.run('chain', chainShape, {
      valid: [
        {
          name: 'where after the sink',
          code: D + "knex('users').del().where({ id });",
        },
        {
          name: 'where before the sink',
          code: D + "knex('users').where({ id }).del();",
        },
        {
          name: 'whereIn variant',
          code: D + "knex('users').del().whereIn('id', ids);",
        },
        {
          name: 'whereRaw variant',
          code: D + "knex('users').del().whereRaw('id = ?', [id]);",
        },
        {
          name: 'drizzle table argument plus chained where',
          code:
            D +
            'db.update(users).set({ active: false }).where(eq(users.id, id));',
        },
      ],
      invalid: [
        {
          name: 'del with no clause anywhere in the chain',
          code: D + "knex('users').del();",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'drizzle update with set but no where',
          code: D + 'db.update(users).set({ active: false });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          name: 'table argument alone is not scope',
          code: D + 'db.update(users);',
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
          code: D + 'prisma.user.updateMany({ data: { where: 1 } });',
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // A guard matching source text would see "where" in the callback
          // and treat the whole call as scoped.
          name: 'the word where appearing elsewhere in the statement',
          code:
            D +
            'prisma.user.deleteMany({ data: rows.filter((r) => r.where) });',
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
          code: D + "run(knex('users').del()).where({ id });",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // A sibling chain in the same statement is a different expression.
          name: 'scope on a sibling chain does not transfer',
          code:
            D +
            "await Promise.all([knex('a').where({ id }).del(), knex('b').del()]);",
          errors: [{ messageId: 'unscopedMutation' }],
        },
        {
          // Computed member access yields no resolvable method name, so it
          // must not be counted as a `where`.
          name: 'computed chain member is not a scope method',
          code: D + "knex('users').del()[clause]({ id });",
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

    it('driverBindings collects CommonJS require forms and subpaths', () => {
      const src = [
        "const knex = require('test-orm');",
        "const { drizzle } = require('test-orm/node-postgres');",
        "const other = require('unrelated');",
        'const notACall = 1;',
        "const notRequire = compute('test-orm');",
        "const { ...rest } = require('test-orm');",
        "const { nested: { deep } } = require('test-orm');",
      ].join('\n');
      const program = parser.parse(src, {
        sourceType: 'module',
      }) as TSESTree.Program;
      expect(driverBindings(program, ['test-orm'])).toEqual(
        new Set(['knex', 'drizzle']),
      );
    });

    it('driverBindings collects namespace and default imports, and ignores others', () => {
      const src = [
        "import * as orm from 'test-orm';",
        "import def, { named } from 'test-orm/sub';",
        "import nope from 'other-pkg';",
      ].join('\n');
      const program = parser.parse(src, {
        sourceType: 'module',
      }) as TSESTree.Program;
      expect(driverBindings(program, ['test-orm'])).toEqual(
        new Set(['orm', 'def', 'named']),
      );
    });

    it('driverBindings returns empty for a file that never imports the driver', () => {
      const program = parser.parse('const a = 1;', {
        sourceType: 'module',
      }) as TSESTree.Program;
      expect(driverBindings(program, ['test-orm'])).toEqual(new Set());
    });

    it('receiverBaseName walks member, call and this chains', () => {
      const base = (expr: string): string | undefined => {
        const program = parser.parse(expr, {
          sourceType: 'module',
        }) as TSESTree.Program;
        const stmt = program.body[0] as TSESTree.ExpressionStatement;
        const call = stmt.expression as TSESTree.CallExpression;
        return receiverBaseName(call.callee as TSESTree.MemberExpression);
      };
      expect(base('db.delete(t);')).toBe('db');
      expect(base('prisma.user.deleteMany();')).toBe('prisma');
      expect(base('this.db.delete(t);')).toBe('db');
      expect(base("knex('users').del();")).toBe('knex');
      expect(base('(await get()).del();')).toBeUndefined();
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
