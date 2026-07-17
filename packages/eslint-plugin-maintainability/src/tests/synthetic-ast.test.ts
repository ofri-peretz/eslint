/**
 * Layer-2 unit tests: raw `rule.create(mockContext)` + synthetic AST objects.
 *
 * These cover branches a real parser can never produce (missing bodies,
 * missing locations, malformed child nodes) plus module entry points that
 * RuleTester fixtures never import (oxlint shim, type barrel).
 *
 * Uses `createWithMockContext` from @interlace/eslint-devkit.
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';

import indexDefault, { plugin as indexPlugin } from '../index';
import oxlintPlugin from '../oxlint';
import * as typeBarrel from '../types/index';

import { errorMessage } from '../rules/error-handling/error-message';
import { noSilentErrors } from '../rules/error-handling/no-silent-errors';
import { noMissingErrorContext } from '../rules/error-handling/no-missing-error-context';
import {
  noUnhandledPromise,
  isPromiseExpression,
  isInsidePromiseCallback,
  isPromiseHandled,
} from '../rules/error-handling/no-unhandled-promise';
import { cognitiveComplexity } from '../rules/maintainability/cognitive-complexity';
import { consistentFunctionScoping } from '../rules/maintainability/consistent-function-scoping';
import {
  identicalFunctions,
  buildGenericName,
} from '../rules/maintainability/identical-functions';
import { maxParameters } from '../rules/maintainability/max-parameters';
import { nestedComplexityHotspots } from '../rules/maintainability/nested-complexity-hotspots';
import { noLonelyIf } from '../rules/maintainability/no-lonely-if';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyNode = any;

/** Invoke a visitor listener with a synthetic node. */
function invoke(listeners: Record<string, unknown>, key: string, node: AnyNode) {
  const listener = listeners[key] as (n: AnyNode) => void;
  expect(typeof listener, `listener "${key}" should be a function`).toBe('function');
  listener(node);
}

function reportData(report: unknown): Record<string, string> {
  return (report as { data: Record<string, string> }).data;
}

function reportMessageId(report: unknown): string {
  return (report as { messageId: string }).messageId;
}

describe('module entry points', () => {
  it('oxlint shim re-exports the exact plugin object from the index barrel', () => {
    expect(oxlintPlugin).toBe(indexPlugin);
    expect(oxlintPlugin).toBe(indexDefault);
    expect(Object.keys(oxlintPlugin.rules ?? {})).toContain('cognitive-complexity');
  });

  it('type barrel is type-only: importing it yields no runtime exports', () => {
    expect(Object.keys(typeBarrel)).toEqual([]);
  });
});

describe('no-silent-errors — parser-unreachable catch shapes', () => {
  const emptyBlockBody = () => ({ type: 'BlockStatement', body: [] });

  it('reports when the catch clause body is missing entirely', () => {
    const { listeners, reports } = createWithMockContext(noSilentErrors);
    invoke(listeners, 'CatchClause', { type: 'CatchClause', body: null });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('silentError');
  });

  it('reports when the catch clause body is not a BlockStatement', () => {
    const { listeners, reports } = createWithMockContext(noSilentErrors);
    invoke(listeners, 'CatchClause', {
      type: 'CatchClause',
      body: { type: 'ExpressionStatement' },
    });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('silentError');
  });

  it('falls back to defaults when the options entry is null and still reports', () => {
    const { listeners, reports } = createWithMockContext(noSilentErrors, {
      options: [null],
    });
    invoke(listeners, 'CatchClause', { type: 'CatchClause', body: emptyBlockBody() });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('silentError');
    expect((reports[0] as AnyNode).suggest).toHaveLength(3);
  });

  it('allowWithComment: a catch clause without a location cannot match comments and reports', () => {
    const { listeners, reports, context } = createWithMockContext(noSilentErrors, {
      options: [{ allowWithComment: true }],
    });
    // The devkit mock has no getAllComments; attach one with a would-match comment.
    Object.assign(context.sourceCode as unknown as Record<string, unknown>, {
      getAllComments: () => [
        { value: 'intentional noop', loc: { end: { line: 1 } } },
      ],
    });
    invoke(listeners, 'CatchClause', {
      type: 'CatchClause',
      body: emptyBlockBody(),
      loc: undefined,
    });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('silentError');
  });
});

describe('error-message — listener called with a non-constructor node', () => {
  it('ignores nodes that are neither NewExpression nor CallExpression', () => {
    const { listeners, reports } = createWithMockContext(errorMessage);
    invoke(listeners, 'NewExpression', { type: 'Identifier', name: 'Error' });
    expect(reports).toEqual([]);
  });
});

describe('consistent-function-scoping — degenerate scope stacks', () => {
  it('ignores variable declarations once every scope has been popped', () => {
    const { listeners, reports } = createWithMockContext(consistentFunctionScoping);
    // Pop the initial scope so the stack is empty.
    (listeners['Program:exit'] as () => void)();
    invoke(listeners, 'VariableDeclaration', {
      type: 'VariableDeclaration',
      declarations: [{ id: { type: 'Identifier', name: 'ghost' } }],
    });
    expect(reports).toEqual([]);
  });

  it('suppresses the report when the module scope already has the function name', () => {
    const { listeners, reports } = createWithMockContext(consistentFunctionScoping);
    // Without a Program node, declarations land in the root scope, which is
    // also the module scope consulted for name conflicts.
    invoke(listeners, 'VariableDeclaration', {
      type: 'VariableDeclaration',
      declarations: [{ id: { type: 'Identifier', name: 'taken' } }],
    });
    invoke(listeners, 'FunctionDeclaration', {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'taken' },
      params: [],
      parent: { type: 'BlockStatement' },
      body: { type: 'BlockStatement', body: [] },
    });
    expect(reports).toEqual([]);
  });
});

describe('no-missing-error-context — throw without an argument (invalid JS, defensive)', () => {
  it('reports a missing message for `throw` with no argument', () => {
    const { listeners, reports } = createWithMockContext(noMissingErrorContext);
    invoke(listeners, 'ThrowStatement', { type: 'ThrowStatement', argument: null });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('missingErrorContext');
    expect(reportData(reports[0]).missing).toBe('message');
  });

  it('reports a missing stack trace for `throw` with no argument when only requireStackTrace is on', () => {
    const { listeners, reports } = createWithMockContext(noMissingErrorContext, {
      options: [{ requireMessage: false, requireStackTrace: true }],
    });
    invoke(listeners, 'ThrowStatement', { type: 'ThrowStatement', argument: null });
    expect(reports).toHaveLength(1);
    expect(reportData(reports[0]).missing).toBe('stack trace');
  });

  it('null options entry falls back to defaults: template literal throws stay clean', () => {
    const { listeners, reports } = createWithMockContext(noMissingErrorContext, {
      options: [null],
    });
    invoke(listeners, 'ThrowStatement', {
      type: 'ThrowStatement',
      argument: { type: 'TemplateLiteral', expressions: [], quasis: [] },
    });
    expect(reports).toEqual([]);
  });
});

describe('no-unhandled-promise — helper functions with synthetic AST', () => {
  describe('isPromiseExpression', () => {
    it('is true for CallExpression, false for AwaitExpression and anything else', () => {
      expect(isPromiseExpression({ type: 'CallExpression' } as AnyNode)).toBe(true);
      expect(isPromiseExpression({ type: 'AwaitExpression' } as AnyNode)).toBe(false);
      expect(isPromiseExpression({ type: 'Identifier' } as AnyNode)).toBe(false);
    });
  });

  describe('isInsidePromiseCallback', () => {
    function arrowInMethodCall(methodName: string, propertyType = 'Identifier') {
      const node: AnyNode = { type: 'CallExpression' };
      const arrow: AnyNode = { type: 'ArrowFunctionExpression' };
      const memberCall: AnyNode = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          property: { type: propertyType, name: methodName },
        },
      };
      node.parent = arrow;
      arrow.parent = memberCall;
      return node;
    }

    it('detects callbacks of .then/.catch/.finally', () => {
      expect(isInsidePromiseCallback(arrowInMethodCall('then'))).toBe(true);
      expect(isInsidePromiseCallback(arrowInMethodCall('catch'))).toBe(true);
      expect(isInsidePromiseCallback(arrowInMethodCall('finally'))).toBe(true);
    });

    it('rejects non-promise host methods and computed properties', () => {
      expect(isInsidePromiseCallback(arrowInMethodCall('map'))).toBe(false);
      expect(isInsidePromiseCallback(arrowInMethodCall('then', 'Literal'))).toBe(false);
    });

    it('rejects a function whose parent is not a member call', () => {
      const node: AnyNode = { type: 'CallExpression' };
      const fn: AnyNode = { type: 'FunctionExpression' };
      const plainCall: AnyNode = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'run' },
      };
      node.parent = fn;
      fn.parent = plainCall;
      expect(isInsidePromiseCallback(node)).toBe(false);
    });

    it('returns false when there is no parent at all', () => {
      expect(isInsidePromiseCallback({ type: 'CallExpression' } as AnyNode)).toBe(false);
    });

    it('gives up past the max traversal depth', () => {
      // Build a 15-deep parent chain of plain statements.
      const leaf: AnyNode = { type: 'CallExpression' };
      let current: AnyNode = leaf;
      for (let i = 0; i < 15; i++) {
        const parent: AnyNode = { type: 'ExpressionStatement' };
        current.parent = parent;
        current = parent;
      }
      expect(isInsidePromiseCallback(leaf)).toBe(false);
    });
  });

  describe('isPromiseHandled — Identifier chains', () => {
    function identifierHandledBy(methodName: string) {
      const ident: AnyNode = { type: 'Identifier', name: 'p' };
      const member: AnyNode = {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: methodName },
      };
      member.object = ident;
      ident.parent = member;
      const call: AnyNode = { type: 'CallExpression' };
      call.callee = member;
      member.parent = call;
      return ident;
    }

    it('treats p.then() / p.catch() / p.finally() identifiers as handled', () => {
      expect(isPromiseHandled(identifierHandledBy('then'))).toBe(true);
      expect(isPromiseHandled(identifierHandledBy('catch'))).toBe(true);
      expect(isPromiseHandled(identifierHandledBy('finally'))).toBe(true);
    });

    it('treats a non-promise method on an identifier as unhandled', () => {
      const ident = identifierHandledBy('toString');
      expect(isPromiseHandled(ident)).toBe(false);
    });

    it('treats a bare member access (never called) as unhandled', () => {
      const ident: AnyNode = { type: 'Identifier', name: 'p' };
      const member: AnyNode = {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'catch' },
      };
      member.object = ident;
      ident.parent = member;
      member.parent = { type: 'ExpressionStatement' };
      expect(isPromiseHandled(ident)).toBe(false);
    });

    it('treats an identifier used as a member *property* as unhandled', () => {
      const ident: AnyNode = { type: 'Identifier', name: 'p' };
      const member: AnyNode = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'other' },
        property: { type: 'Identifier', name: 'p' },
      };
      ident.parent = member;
      expect(isPromiseHandled(ident)).toBe(false);
    });

    it('treats a computed member access on an identifier as unhandled', () => {
      const ident: AnyNode = { type: 'Identifier', name: 'p' };
      const member: AnyNode = {
        type: 'MemberExpression',
        property: { type: 'Literal', value: 'catch' },
      };
      member.object = ident;
      ident.parent = member;
      expect(isPromiseHandled(ident)).toBe(false);
    });
  });

  describe('create() with synthetic nodes', () => {
    it('skips nodes that are not promise expressions (defensive listener guard)', () => {
      const { listeners, reports } = createWithMockContext(noUnhandledPromise, {
        filename: 'src/app.ts',
      });
      invoke(listeners, 'CallExpression', {
        type: 'AwaitExpression',
        callee: { type: 'Identifier', name: 'later' },
        arguments: [],
      });
      expect(reports).toEqual([]);
    });

    it('null options entry falls back to defaults and reports an unhandled call', () => {
      const { listeners, reports } = createWithMockContext(noUnhandledPromise, {
        options: [null],
        filename: 'src/app.ts',
      });
      invoke(listeners, 'CallExpression', {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'fire' },
        arguments: [],
      });
      expect(reports).toHaveLength(1);
      expect(reportMessageId(reports[0])).toBe('unhandledPromise');
      expect((reports[0] as AnyNode).suggest).toHaveLength(3);
    });
  });
});

describe('cognitive-complexity — synthetic bodies and missing locations', () => {
  it('handles malformed children, missing loc, and duplicate child references', () => {
    const { listeners, reports } = createWithMockContext(cognitiveComplexity, {
      options: [{ maxComplexity: 1 }],
    });

    const sharedIdentifier: AnyNode = { type: 'Identifier', name: 'dup' };
    const node: AnyNode = {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'synthetic' },
      params: [],
      loc: undefined,
      body: {
        type: 'BlockStatement',
        body: [
          // Counts +1 conditional.
          {
            type: 'IfStatement',
            test: { type: 'Identifier', name: 'a' },
            consequent: { type: 'BlockStatement', body: [] },
            alternate: null,
          },
          // LogicalExpression with a non-short-circuit operator: no increment.
          {
            type: 'LogicalExpression',
            operator: '&',
            left: { type: 'Identifier', name: 'l' },
            right: { type: 'Identifier', name: 'r' },
          },
          // A for-of missing left/right entirely (impossible from a parser).
          {
            type: 'ForOfStatement',
            body: { type: 'BlockStatement', body: [] },
          },
          // The same child object hanging off two child keys: the visited
          // set must dedupe it instead of double counting.
          {
            type: 'ExpressionStatement',
            expression: sharedIdentifier,
            argument: sharedIdentifier,
          },
        ],
      },
    };

    invoke(listeners, 'FunctionDeclaration', node);

    expect(reports).toHaveLength(1);
    const data = reportData(reports[0]);
    expect(data.functionName).toBe('function synthetic()');
    // if (1) + for-of loop (1) = 2, and nothing else was double counted.
    expect(data.complexity).toBe('2');
    expect(data.line).toBe('0'); // loc missing -> falls back to 0
    expect((reports[0] as AnyNode).suggest).toBeUndefined();
  });

  it('does not report a function with no body at all', () => {
    const { listeners, reports } = createWithMockContext(cognitiveComplexity);
    invoke(listeners, 'ArrowFunctionExpression', {
      type: 'ArrowFunctionExpression',
      params: [],
      body: null,
    });
    expect(reports).toEqual([]);
  });
});

describe('identical-functions — synthetic nodes', () => {
  it('buildGenericName strips known prefixes and falls back to Generic', () => {
    expect(buildGenericName('processOrder')).toBe('handleOrder');
    expect(buildGenericName('process')).toBe('handleGeneric');
    expect(buildGenericName('anonymous')).toBe('handleanonymous');
  });

  it('reports duplicates with line 0 when nodes carry no location', () => {
    const bodyText = '{\n  first();\n  second();\n  third();\n}';
    const { listeners, reports } = createWithMockContext(identicalFunctions, {
      sourceText: bodyText,
      filename: 'src/dup.ts',
    });

    const makeFn = (name: string): AnyNode => ({
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name },
      params: [],
      loc: undefined,
      body: { type: 'BlockStatement', body: [] },
    });

    invoke(listeners, 'FunctionDeclaration', makeFn('alpha'));
    invoke(listeners, 'FunctionDeclaration', makeFn('beta'));
    (listeners['Program:exit'] as () => void)();

    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('identicalFunctions');
    const data = reportData(reports[0]);
    expect(data.count).toBe('2');
    expect(data.line).toBe('0'); // loc missing -> falls back to 0
  });

  it('skips a declaration-only function with no body (never stored)', () => {
    const bodyText = '{\n  first();\n  second();\n  third();\n}';
    const { listeners, reports } = createWithMockContext(identicalFunctions, {
      sourceText: bodyText,
      filename: 'src/dup.ts',
    });
    invoke(listeners, 'FunctionDeclaration', {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'declared' },
      params: [],
      body: null,
    });
    (listeners['Program:exit'] as () => void)();
    expect(reports).toEqual([]);
  });
});

describe('max-parameters — null options entry', () => {
  it('falls back to max=4 and reports a 6-parameter function', () => {
    const { listeners, reports } = createWithMockContext(maxParameters, {
      options: [null],
    });
    const params = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => ({
      type: 'Identifier',
      name,
    }));
    invoke(listeners, 'FunctionDeclaration', {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'wide' },
      params,
    });
    expect(reports).toHaveLength(1);
    expect(reportMessageId(reports[0])).toBe('tooManyParameters');
    const data = reportData(reports[0]);
    expect(data.count).toBe('6');
    expect(data.max).toBe('4');
    expect(data.functionName).toBe('function wide(a, b, c, d, e, f)');
  });
});

describe('nested-complexity-hotspots — listener wiring by options', () => {
  it('disables every listener when both counters are off', () => {
    const { listeners } = createWithMockContext(nestedComplexityHotspots, {
      options: [{ countConditionals: false, countLoops: false }],
    });
    for (const key of [
      'IfStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'SwitchStatement',
    ]) {
      expect(listeners[key], `listener "${key}"`).toBeUndefined();
    }
  });

  it('null options entry falls back to defaults: listeners active, shallow node clean', () => {
    const { listeners, reports } = createWithMockContext(nestedComplexityHotspots, {
      options: [null],
    });
    invoke(listeners, 'IfStatement', { type: 'IfStatement' });
    expect(reports).toEqual([]);
  });
});

describe('no-lonely-if — suggestion fixer token paths', () => {
  function reportLonelyIf(tokenAfterElse: { value: string; range: [number, number] } | null) {
    const { listeners, reports, context } = createWithMockContext(noLonelyIf);
    const elseToken = { value: 'else', range: [0, 4] as [number, number] };
    Object.assign(context.sourceCode as unknown as Record<string, unknown>, {
      getTokensBefore: () => [elseToken],
      getTokenAfter: () => tokenAfterElse,
    });

    const outerIf: AnyNode = { type: 'IfStatement' };
    const elseBlock: AnyNode = { type: 'BlockStatement', parent: outerIf };
    outerIf.alternate = elseBlock;
    const lonely: AnyNode = { type: 'IfStatement', parent: elseBlock };

    invoke(listeners, 'IfStatement', lonely);
    expect(reports).toHaveLength(1);
    return reports[0] as AnyNode;
  }

  const fakeFixer = {
    removeRange: (range: [number, number]) => ({ range, text: '' }),
    insertTextBefore: (token: { range: [number, number] }, text: string) => ({
      range: [token.range[0], token.range[0]],
      text,
    }),
  };

  it('produces the else-if rewrite when the token after `else` is `if`', () => {
    const report = reportLonelyIf({ value: 'if', range: [10, 12] });
    const fixes = report.suggest[0].fix(fakeFixer);
    expect(fixes).toEqual([
      { range: [0, 12], text: '' },
      { range: [10, 10], text: 'else ' },
    ]);
  });

  it('bails out (null fix) when the token after `else` is a brace', () => {
    const report = reportLonelyIf({ value: '{', range: [5, 6] });
    expect(report.suggest[0].fix(fakeFixer)).toBeNull();
  });

  it('bails out (null fix) when no `else` token precedes the if', () => {
    const { listeners, reports, context } = createWithMockContext(noLonelyIf);
    Object.assign(context.sourceCode as unknown as Record<string, unknown>, {
      getTokensBefore: () => [{ value: '{', range: [0, 1] }],
      getTokenAfter: () => null,
    });
    const outerIf: AnyNode = { type: 'IfStatement' };
    const elseBlock: AnyNode = { type: 'BlockStatement', parent: outerIf };
    outerIf.alternate = elseBlock;
    invoke(listeners, 'IfStatement', { type: 'IfStatement', parent: elseBlock });
    expect(reports).toHaveLength(1);
    expect((reports[0] as AnyNode).suggest[0].fix(fakeFixer)).toBeNull();
  });
});
