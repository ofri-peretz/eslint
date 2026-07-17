/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-2 unit tests: rules are exercised through `createWithMockContext`
 * (from @interlace/eslint-devkit) with synthetic AST objects for branches a
 * real parser can never produce (missing parents, null callees, duplicated
 * node references, mutated node shapes).
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';
import { hooksExhaustiveDeps } from '../../rules/react/hooks-exhaustive-deps';
import { noUnnecessaryRerenders } from '../../rules/performance/no-unnecessary-rerenders';
import { noKindPropDiscriminator } from '../../rules/component-api/no-kind-prop-discriminator';
import { jsxNoTargetBlank } from '../../rules/react/jsx-no-target-blank';

/* oxlint-disable no-explicit-any */
type AnyNode = any;

type Listener = (node: AnyNode) => void;

interface RecordedFix {
  method: string;
  args: unknown[];
}

function makeRecordingFixer(): { fixer: TSESLint.RuleFixer; calls: RecordedFix[] } {
  const calls: RecordedFix[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return { range: [0, 0] as [number, number], text: '' };
    };
  const fixer = {
    insertTextAfter: record('insertTextAfter'),
    insertTextAfterRange: record('insertTextAfterRange'),
    insertTextBefore: record('insertTextBefore'),
    insertTextBeforeRange: record('insertTextBeforeRange'),
    remove: record('remove'),
    removeRange: record('removeRange'),
    replaceText: record('replaceText'),
    replaceTextRange: record('replaceTextRange'),
  } as unknown as TSESLint.RuleFixer;
  return { fixer, calls };
}

describe('hooks-exhaustive-deps (layer 2, synthetic AST)', () => {
  it('returns "unknown" hook name when the callee property mutates between reads', () => {
    const { listeners, reports } = createWithMockContext(hooksExhaustiveDeps);
    let typeReads = 0;
    const property = {
      name: 'useEffect',
      get type() {
        typeReads++;
        return typeReads <= 1 ? 'Identifier' : 'Mutated';
      },
    };
    const node: AnyNode = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'React' },
        property,
      },
      arguments: [],
    };
    (listeners['CallExpression'] as Listener)(node);
    // Hook detected (first read), name resolution fell through to 'unknown'
    // (second read), then the zero-argument guard exited without diagnostics.
    expect(typeReads).toBeGreaterThanOrEqual(2);
    expect(reports).toEqual([]);
  });

  it('traverses duplicated references, non-node children, and null callees without duplicating deps', () => {
    const { listeners, reports } = createWithMockContext(hooksExhaustiveDeps);
    const sharedIdent: AnyNode = { type: 'Identifier', name: 'sharedDep' };
    const body: AnyNode = {
      type: 'SynthBlockA',
      list: [{ noType: true }, sharedIdent, sharedIdent],
      bag: { plain: true },
      call: { type: 'CallExpression', callee: null, arguments: null },
      member: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'objRoot' },
        computed: true,
        property: null,
      },
      fn: { type: 'FunctionDeclaration', id: null, params: [], body: null },
    };
    const deps: AnyNode = { type: 'ArrayExpression', elements: [], range: [100, 102] };
    const node: AnyNode = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'useEffect' },
      arguments: [{ type: 'ArrowFunctionExpression', body }, deps],
    };
    (listeners['CallExpression'] as Listener)(node);
    expect(reports).toHaveLength(1);
    const report = reports[0] as AnyNode;
    expect(report.messageId).toBe('missingDep');
    // The duplicated Identifier reference is only counted once.
    expect(report.data.deps).toBe('sharedDep, objRoot');
  });

  it('remove-dep suggestion fix returns null when the dep vanished from the array', () => {
    const { listeners, reports } = createWithMockContext(hooksExhaustiveDeps);
    const deps: AnyNode = {
      type: 'ArrayExpression',
      elements: [{ type: 'Identifier', name: 'ghostDep', range: [5, 10] }],
      range: [4, 11],
    };
    const node: AnyNode = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'useEffect' },
      arguments: [{ type: 'ArrowFunctionExpression', body: { type: 'SynthEmptyBlock' } }, deps],
    };
    (listeners['CallExpression'] as Listener)(node);
    expect(reports).toHaveLength(1);
    const report = reports[0] as AnyNode;
    expect(report.messageId).toBe('extraDep');
    // Simulate the deps array changing before the suggestion fix runs.
    deps.elements = [];
    const { fixer, calls } = makeRecordingFixer();
    const result = report.suggest[0].fix(fixer);
    expect(result).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('no-unnecessary-rerenders (layer 2, synthetic AST)', () => {
  const bigProperties = [{}, {}, {}, {}, {}];

  function attrWithExpression(expression: AnyNode): AnyNode {
    return {
      type: 'JSXAttribute',
      value: { type: 'JSXExpressionContainer', expression },
    };
  }

  it('handles null options and reports for an expression directly under a JSXElement', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders, {
      options: [null],
    });
    const expr: AnyNode = {
      type: 'ObjectExpression',
      properties: bigProperties,
      parent: { type: 'JSXElement' },
    };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toHaveLength(1);
    const report = reports[0] as AnyNode;
    expect(report.messageId).toBe('unnecessaryRerender');
    expect(report.suggest.map((s: AnyNode) => s.messageId)).toEqual([
      'useMemo',
      'extractToVariable',
    ]);
  });

  it('does not report when the expression has no parent chain', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toEqual([]);
  });

  it('reports useCallback for a function under a PascalCase function declaration', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const expr: AnyNode = {
      type: 'ArrowFunctionExpression',
      parent: { type: 'FunctionDeclaration', id: { name: 'App' } },
    };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toHaveLength(1);
    expect((reports[0] as AnyNode).suggest[0].messageId).toBe('useCallback');
  });

  it('detects a JSX return inside a lowercase function declaration body', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const fd: AnyNode = {
      type: 'FunctionDeclaration',
      id: { name: 'app' },
      body: {
        type: 'BlockStatement',
        body: [
          { type: 'ExpressionStatement' },
          { type: 'ReturnStatement', argument: null },
          { type: 'ReturnStatement', argument: { type: 'Literal' } },
          { type: 'ReturnStatement', argument: { type: 'JSXFragment' } },
        ],
      },
    };
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties, parent: fd };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toHaveLength(1);
    expect((reports[0] as AnyNode).messageId).toBe('unnecessaryRerender');
  });

  it('detects a JSXElement return inside an id-less function declaration', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const fd: AnyNode = {
      type: 'FunctionDeclaration',
      id: null,
      body: {
        type: 'BlockStatement',
        body: [{ type: 'ReturnStatement', argument: { type: 'JSXElement' } }],
      },
    };
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties, parent: fd };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toHaveLength(1);
  });

  it('does not report for a function expression body without JSX', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const fe: AnyNode = {
      type: 'FunctionExpression',
      body: { type: 'BlockStatement', body: [] },
    };
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties, parent: fe };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toEqual([]);
  });

  it('does not report for an arrow function with a non-block body', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const arrow: AnyNode = { type: 'ArrowFunctionExpression', body: { type: 'Identifier' } };
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties, parent: arrow };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toEqual([]);
  });

  it('does not report for a function expression with a null body', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const fe: AnyNode = { type: 'FunctionExpression', body: null };
    const expr: AnyNode = { type: 'ObjectExpression', properties: bigProperties, parent: fe };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toEqual([]);
  });

  it('stops walking after the max ancestor depth', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    let chain: AnyNode = { type: 'ExpressionStatement' };
    for (let i = 0; i < 20; i++) {
      chain = { type: 'ExpressionStatement', parent: chain };
    }
    // JSX ancestor exists but is beyond the depth cap, so it is never seen.
    const expr: AnyNode = {
      type: 'ObjectExpression',
      properties: bigProperties,
      parent: chain,
    };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toEqual([]);
  });

  it('falls back to a generic label when sourceCode.getText throws', () => {
    const { listeners, reports, context } = createWithMockContext(noUnnecessaryRerenders);
    (context.sourceCode as AnyNode).getText = () => {
      throw new Error('boom');
    };
    const expr: AnyNode = {
      type: 'ObjectExpression',
      properties: bigProperties,
      parent: { type: 'JSXElement' },
    };
    (listeners['JSXAttribute'] as Listener)(attrWithExpression(expr));
    expect(reports).toHaveLength(1);
    expect((reports[0] as AnyNode).data.expression).toBe('expression');
  });

  it('swallows attribute processing errors and produces no diagnostics', () => {
    const { listeners, reports } = createWithMockContext(noUnnecessaryRerenders);
    const attr: AnyNode = {
      type: 'JSXAttribute',
      get value(): AnyNode {
        throw new Error('exploding attribute');
      },
    };
    (listeners['JSXAttribute'] as Listener)(attr);
    expect(reports).toEqual([]);
  });
});

describe('no-kind-prop-discriminator (layer 2, synthetic AST)', () => {
  it('ignores a union type with fewer than two members', () => {
    const { listeners, reports } = createWithMockContext(noKindPropDiscriminator);
    const node: AnyNode = {
      type: 'TSPropertySignature',
      key: { type: 'Identifier', name: 'kind' },
      typeAnnotation: {
        typeAnnotation: {
          type: 'TSUnionType',
          types: [{ type: 'TSLiteralType', literal: { type: 'Literal', value: 'a' } }],
        },
      },
    };
    (listeners['TSPropertySignature'] as Listener)(node);
    expect(reports).toEqual([]);
  });
});

describe('jsx-no-target-blank (layer 2, synthetic AST)', () => {
  it('handles null options object', () => {
    const { listeners } = createWithMockContext(jsxNoTargetBlank, { options: [null] });
    expect(typeof listeners['JSXOpeningElement']).toBe('function');
  });

  it('fix inserts rel after the element name when attributes vanish before fixing', () => {
    const { listeners, reports } = createWithMockContext(jsxNoTargetBlank);
    const name: AnyNode = { type: 'JSXIdentifier', name: 'a' };
    const node: AnyNode = {
      type: 'JSXOpeningElement',
      name,
      attributes: [
        {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'target' },
          value: { type: 'Literal', value: '_blank' },
        },
        {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'href' },
          value: { type: 'Literal', value: 'https://external.example' },
        },
      ],
    };
    (listeners['JSXOpeningElement'] as Listener)(node);
    expect(reports).toHaveLength(1);
    const report = reports[0] as AnyNode;
    expect(report.messageId).toBe('noTargetBlank');
    // Attributes disappear before the fix executes: the fixer falls back to
    // inserting after the element name.
    node.attributes = [];
    const { fixer, calls } = makeRecordingFixer();
    report.fix(fixer);
    expect(calls).toEqual([
      { method: 'insertTextAfter', args: [name, ' rel="noopener noreferrer"'] },
    ]);
  });
});
