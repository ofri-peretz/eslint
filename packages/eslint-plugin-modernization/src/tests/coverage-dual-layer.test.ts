/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — closes the remaining uncovered branches.
 *
 * Layer 1: RuleTester fixtures through the real parser.
 * Layer 2: raw unit tests via createWithMockContext (from @interlace/eslint-devkit),
 *          invoking rule listeners directly with synthetic AST nodes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noInstanceofArray } from '../rules/no-instanceof-array';
import { preferEventTarget } from '../rules/prefer-event-target';
import { preferTemplateLiteral } from '../rules/prefer-template-literal';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('coverage: no-instanceof-array `allow` option', () => {
  // Covers isInAllowedContext() loop body (lines 79-81): both the
  // source-text-matches arm (suppresses the report) and the no-match arm
  // (falls through and reports).
  ruleTester.run('allow option contexts', noInstanceofArray, {
    valid: [
      // allow entry matches the source text -> isInAllowedContext() true -> no report
      {
        code: 'if (value instanceof Array) { handle(value); }',
        options: [{ allow: ['instanceof Array'] }],
      },
    ],
    invalid: [
      // allow entry does NOT match the source text -> loop runs, includes() is
      // false, falls out to `return false` -> still reports
      {
        code: 'if (value instanceof Array) { handle(value); }',
        options: [{ allow: ['some-context-not-in-this-file'] }],
        errors: [{ messageId: 'noInstanceofArray' }],
      },
    ],
  });
});

describe('coverage: prefer-event-target remaining branches', () => {
  ruleTester.run('remaining branches', preferEventTarget, {
    valid: [
      // ClassDeclaration with NO superClass -> checkClassExtends else arm (line 69)
      { code: 'class Standalone { emit() {} }' },
      // CallExpression whose callee is not `require` -> else arm of the
      // require guard in the CallExpression listener (line 128)
      { code: 'load("events");' },
      // `const e = require("events")` — VariableDeclarator id is an Identifier,
      // not an ObjectPattern -> else arm at line 140
      { code: 'const e = require("events");' },
      // MemberExpression `.EventEmitter` on an unknown identifier — neither a
      // require() call nor an `events`/`nodeEvents` identifier -> falls through
      // both arms of the else-if chain (line 193) without reporting
      { code: 'const X = myLib.EventEmitter;' },
    ],
    invalid: [
      // `class Foo extends events.EventEmitter {}` — the MemberExpression
      // listener must early-return (line 169: parent is ClassDeclaration and
      // superClass === node), leaving exactly ONE report from checkClassExtends.
      {
        code: 'class Foo extends events.EventEmitter {}',
        errors: [{ messageId: 'preferEventTarget' }],
      },
    ],
  });
});

describe('coverage: prefer-template-literal remaining branches', () => {
  ruleTester.run('remaining branches', preferTemplateLiteral, {
    valid: [
      // Non-`+` binary expression -> early return at line 119
      { code: 'const r = a - b;' },
    ],
    invalid: [
      // TemplateLiteral operand in a + chain: covers isStringExpression's
      // TemplateLiteral arm (line 28), hasRuntimeOperand's TemplateLiteral arm
      // (line 43), and buildTemplateLiteral's inlining of an existing template
      // literal (lines 103-107 — outer backticks stripped, contents inlined).
      {
        code: 'const s = `Hello ${name}` + suffix;',
        output: 'const s = `Hello ${name}${suffix}`;',
        errors: [{ messageId: 'preferTemplateLiteral' }],
      },
    ],
  });
});

describe('layer 2: raw listener invocation with mock context', () => {
  it('no-instanceof-array reports on a synthetic instanceof-Array node with parent null', () => {
    const { listeners, reports } = createWithMockContext(noInstanceofArray, {
      options: [{ allow: ['never-present'] }],
      sourceText: 'value instanceof Array',
    });
    const node = {
      type: 'BinaryExpression',
      operator: 'instanceof',
      left: { type: 'Identifier', name: 'value' },
      right: { type: 'Identifier', name: 'Array' },
      parent: null,
      range: [0, 22],
    } as unknown as TSESTree.BinaryExpression;
    (listeners['BinaryExpression'] as (n: TSESTree.BinaryExpression) => void)(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'noInstanceofArray' });
  });

  it('no-instanceof-array suppresses the report when an allow entry matches the source text', () => {
    const { listeners, reports } = createWithMockContext(noInstanceofArray, {
      options: [{ allow: ['legacy-realm-check'] }],
      sourceText: '/* legacy-realm-check */ value instanceof Array',
    });
    const node = {
      type: 'BinaryExpression',
      operator: 'instanceof',
      left: { type: 'Identifier', name: 'value' },
      right: { type: 'Identifier', name: 'Array' },
      parent: null,
      range: [25, 47],
    } as unknown as TSESTree.BinaryExpression;
    (listeners['BinaryExpression'] as (n: TSESTree.BinaryExpression) => void)(node);
    expect(reports).toHaveLength(0);
  });

  it('prefer-event-target returns no listeners work when allowEventEmitter is true', () => {
    const { listeners, reports } = createWithMockContext(preferEventTarget, {
      options: [{ allowEventEmitter: true }],
    });
    expect(Object.keys(listeners)).toHaveLength(0);
    expect(reports).toHaveLength(0);
  });

  it('prefer-event-target MemberExpression listener early-returns when the node is a ClassDeclaration superClass', () => {
    const { listeners, reports } = createWithMockContext(preferEventTarget, {});
    const memberExpr = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'events' },
      property: { type: 'Identifier', name: 'EventEmitter' },
      computed: false,
    } as unknown as TSESTree.MemberExpression;
    const classDecl = {
      type: 'ClassDeclaration',
      superClass: memberExpr,
    } as unknown as TSESTree.ClassDeclaration;
    (memberExpr as unknown as { parent: TSESTree.Node }).parent = classDecl;
    (listeners['MemberExpression'] as (n: TSESTree.MemberExpression) => void)(memberExpr);
    // Early return: the class-extends handler owns this report, not this listener
    expect(reports).toHaveLength(0);
  });
});
