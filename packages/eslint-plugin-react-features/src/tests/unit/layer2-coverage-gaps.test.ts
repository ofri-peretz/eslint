/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-2 unit tests (second wave): rules exercised through
 * `createWithMockContext` (from @interlace/eslint-devkit) with synthetic AST
 * objects for branches a real parser can never produce — null options
 * entries, mutating node getters, duplicated node references, absent parents,
 * and impossible node shapes.
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

import { noArbitraryTokenClass } from '../../rules/component-api/no-arbitrary-token-class';
import { noIsPrefixProp } from '../../rules/component-api/no-is-prefix-prop';
import { noKindPropDiscriminator } from '../../rules/component-api/no-kind-prop-discriminator';
import { jsxHandlerNames } from '../../rules/react/jsx-handler-names';
import { hooksExhaustiveDeps } from '../../rules/react/hooks-exhaustive-deps';
import { jsxNoBind } from '../../rules/react/jsx-no-bind';
import { jsxNoDuplicateProps } from '../../rules/react/jsx-no-duplicate-props';
import { jsxKey } from '../../rules/react/jsx-key';
import { displayName } from '../../rules/react/display-name';
import { noAccessStateInSetState } from '../../rules/react/no-access-state-in-setstate';
import { noMultiComp } from '../../rules/react/no-multi-comp';
import { noUnsafe } from '../../rules/react/no-unsafe';
import { propTypes } from '../../rules/react/prop-types';
import { reactInJsxScope } from '../../rules/react/react-in-jsx-scope';
import { requiredAttributes } from '../../rules/react/required-attributes';
import { sortComp } from '../../rules/react/sort-comp';
import { requireOptimization } from '../../rules/react/require-optimization';
import { reactRenderOptimization } from '../../rules/performance/react-render-optimization';
import { reactNoInlineFunctions } from '../../rules/performance/react-no-inline-functions';
import { preferStatelessFunction } from '../../rules/react/prefer-stateless-function';

/* oxlint-disable no-explicit-any */
type AnyNode = any;
type Listener = (node?: AnyNode) => void;

function listener(listeners: Record<string, unknown>, name: string): Listener {
  const fn = listeners[name];
  expect(typeof fn, `listener ${name}`).toBe('function');
  return fn as Listener;
}

function makeRecordingFixer(): {
  fixer: TSESLint.RuleFixer;
  calls: { method: string; args: unknown[] }[];
} {
  const calls: { method: string; args: unknown[] }[] = [];
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

/** Chain `parent` pointers downward from the given root. */
function link(node: AnyNode, parent: AnyNode | null): AnyNode {
  node.parent = parent;
  return node;
}

describe('component-api rules (layer 2)', () => {
  it('no-arbitrary-token-class ignores non-string className literals', () => {
    const { listeners, reports } = createWithMockContext(noArbitraryTokenClass);
    listener(listeners, 'JSXAttribute[name.name="className"] > Literal')({
      type: 'Literal',
      value: 42,
    });
    expect(reports).toHaveLength(0);
  });

  it('no-is-prefix-prop skips non-identifier keys', () => {
    const { listeners, reports } = createWithMockContext(noIsPrefixProp);
    listener(listeners, 'TSPropertySignature')({
      type: 'TSPropertySignature',
      key: { type: 'MemberExpression' },
    });
    expect(reports).toHaveLength(0);
  });

  it('no-kind-prop-discriminator skips non-identifier keys', () => {
    const { listeners, reports } = createWithMockContext(noKindPropDiscriminator);
    listener(listeners, 'TSPropertySignature')({
      type: 'TSPropertySignature',
      key: { type: 'Literal', value: 'kind' },
    });
    expect(reports).toHaveLength(0);
  });
});

describe('jsx-handler-names (layer 2)', () => {
  it('skips namespaced attribute names', () => {
    const { listeners, reports } = createWithMockContext(jsxHandlerNames);
    listener(listeners, 'JSXAttribute')({
      type: 'JSXAttribute',
      name: { type: 'JSXNamespacedName' },
    });
    expect(reports).toHaveLength(0);
  });
});

describe('jsx-no-bind (layer 2)', () => {
  it('skips empty JSX expressions', () => {
    const { listeners, reports } = createWithMockContext(jsxNoBind);
    listener(listeners, 'JSXAttribute')({
      type: 'JSXAttribute',
      value: {
        type: 'JSXExpressionContainer',
        expression: { type: 'JSXEmptyExpression' },
      },
    });
    expect(reports).toHaveLength(0);
  });
});

describe('jsx-no-duplicate-props (layer 2)', () => {
  it('null options entry falls back to defaults and still detects duplicates', () => {
    const { listeners, reports } = createWithMockContext(jsxNoDuplicateProps, {
      options: [null],
    });
    const attr = (name: string) => ({
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', name },
    });
    listener(listeners, 'JSXOpeningElement')({
      type: 'JSXOpeningElement',
      attributes: [attr('id'), attr('id')],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'duplicateProp' });
  });
});

describe('no-unsafe (layer 2)', () => {
  it('null options entry falls back to defaults and still reports UNSAFE methods', () => {
    const { listeners, reports } = createWithMockContext(noUnsafe, { options: [null] });
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      superClass: { type: 'Identifier', name: 'Component' },
    });
    listener(listeners, 'MethodDefinition')({
      type: 'MethodDefinition',
      key: { type: 'Identifier', name: 'UNSAFE_componentWillMount' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'noUnsafe' });
  });
});

describe('display-name (layer 2)', () => {
  it('null arrow body is not a component', () => {
    const { listeners, reports } = createWithMockContext(displayName);
    listener(listeners, 'VariableDeclarator, FunctionDeclaration')({
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'Foo' },
      init: { type: 'ArrowFunctionExpression', body: null },
    });
    expect(reports).toHaveLength(0);
  });

  it('duplicated node references short-circuit JSX search', () => {
    const { listeners, reports } = createWithMockContext(displayName);
    const shared = { type: 'Identifier', name: 'x' };
    listener(listeners, 'VariableDeclarator, FunctionDeclaration')({
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'Foo' },
      body: { type: 'BlockStatement', body: [shared, shared] },
    });
    expect(reports).toHaveLength(0);
  });

  it('reports on the declarator itself when id is missing', () => {
    const { listeners, reports } = createWithMockContext(displayName);
    const decl = {
      type: 'VariableDeclarator',
      id: null,
      init: {
        type: 'ArrowFunctionExpression',
        body: { type: 'JSXElement', openingElement: { attributes: [] }, children: [] },
      },
    };
    listener(listeners, 'VariableDeclarator, FunctionDeclaration')(decl);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'displayName', node: decl });
  });
});

describe('no-access-state-in-setstate (layer 2)', () => {
  it('duplicated node references are visited once', () => {
    const { listeners, reports } = createWithMockContext(noAccessStateInSetState);
    const shared = { type: 'Identifier', name: 'a' };
    listener(listeners, 'CallExpression')({
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'setState' },
      },
      arguments: [{ type: 'ObjectExpression', properties: [shared, shared] }],
    });
    expect(reports).toHaveLength(0);
  });
});

describe('no-multi-comp (layer 2)', () => {
  it('null arrow body is not a component', () => {
    const { listeners, reports } = createWithMockContext(noMultiComp);
    listener(listeners, 'VariableDeclarator, FunctionDeclaration')({
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'Foo' },
      init: { type: 'ArrowFunctionExpression', body: null },
    });
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(0);
  });

  it('duplicated node references short-circuit JSX search', () => {
    const { listeners, reports } = createWithMockContext(noMultiComp);
    const shared = { type: 'Identifier', name: 'x' };
    listener(listeners, 'VariableDeclarator, FunctionDeclaration')({
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'Foo' },
      body: { type: 'BlockStatement', body: [shared, shared] },
    });
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(0);
  });

  it('falls back to the node when the declaration shape mutates before naming', () => {
    const { listeners, reports } = createWithMockContext(noMultiComp);
    const jsxBody = { type: 'JSXElement', openingElement: { attributes: [] }, children: [] };
    const first = {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: 'First' },
      body: jsxBody,
    };
    const idlessDeclarator = {
      type: 'VariableDeclarator',
      id: null,
      init: { type: 'ArrowFunctionExpression', body: { ...jsxBody } },
    };
    let typeReads = 0;
    const shapeShifter = {
      get type() {
        typeReads += 1;
        return typeReads <= 2 ? 'FunctionDeclaration' : 'Mutated';
      },
      id: { type: 'Identifier', name: 'Third' },
      body: { ...jsxBody },
    };
    const declListener = listener(listeners, 'VariableDeclarator, FunctionDeclaration');
    declListener(first);
    declListener(idlessDeclarator);
    declListener(shapeShifter);
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(2);
    // id-less declarator reports on the declarator node itself (L190 fallback)
    expect(reports[0]).toMatchObject({ messageId: 'noMultiComp', node: idlessDeclarator });
    // shape-shifted node falls through every branch to `return node` (L192)
    expect(reports[1]).toMatchObject({ messageId: 'noMultiComp', node: shapeShifter });
  });
});

describe('prop-types (layer 2)', () => {
  it('propTypes definitions outside a class body are ignored', () => {
    const { listeners, reports } = createWithMockContext(propTypes);
    listener(listeners, 'PropertyDefinition[key.name="propTypes"]')({
      type: 'PropertyDefinition',
      parent: { type: 'ObjectExpression' },
    });
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(0);
  });

  it('falls back to the component node when the id vanishes before reporting', () => {
    const { listeners, reports } = createWithMockContext(propTypes);
    let idReads = 0;
    const component = {
      type: 'ClassDeclaration',
      superClass: { type: 'Identifier', name: 'Component' },
      get id() {
        idReads += 1;
        return idReads <= 2 ? { type: 'Identifier', name: 'Zed' } : null;
      },
      body: { type: 'ClassBody', body: [] },
    };
    listener(listeners, 'ClassDeclaration')(component);
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'propTypes', node: component });
  });

  it('duplicated nodes inside method bodies are visited once (skipUndeclared)', () => {
    const { listeners, reports } = createWithMockContext(propTypes, {
      options: [{ skipUndeclared: true }],
    });
    const shared = { type: 'Identifier', name: 'v' };
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      superClass: { type: 'Identifier', name: 'Component' },
      id: { type: 'Identifier', name: 'Quiet' },
      body: {
        type: 'ClassBody',
        body: [
          {
            type: 'MethodDefinition',
            key: { type: 'Identifier', name: 'm' },
            value: { body: { type: 'BlockStatement', body: [shared, shared] } },
          },
        ],
      },
    });
    listener(listeners, 'Program:exit')();
    expect(reports).toHaveLength(0);
  });
});

describe('react-in-jsx-scope (layer 2)', () => {
  it('reports JSX returned from a top-level return statement', () => {
    const { listeners, reports } = createWithMockContext(reactInJsxScope);
    listener(listeners, 'JSXElement')();
    const jsxName = { type: 'JSXIdentifier', name: 'div' };
    listener(listeners, 'Program:exit')({
      type: 'Program',
      body: [
        { type: 'ReturnStatement', argument: null },
        { type: 'ReturnStatement', argument: { type: 'Identifier', name: 'x' } },
        {
          type: 'ReturnStatement',
          argument: { type: 'JSXElement', openingElement: { name: jsxName } },
        },
      ],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'reactInJsxScope', node: jsxName });
  });
});

describe('required-attributes (layer 2)', () => {
  it('null options entry falls back to empty rule set', () => {
    const { listeners, reports } = createWithMockContext(requiredAttributes, {
      options: [null],
    });
    listener(listeners, 'JSXOpeningElement')({
      type: 'JSXOpeningElement',
      name: { type: 'JSXIdentifier', name: 'input' },
      attributes: [],
    });
    expect(reports).toHaveLength(0);
  });

  it('degenerate member-expression names resolve to empty and bail', () => {
    const { listeners, reports } = createWithMockContext(requiredAttributes, {
      options: [{ attributes: [{ attribute: 'data-testid' }] }],
    });
    listener(listeners, 'JSXOpeningElement')({
      type: 'JSXOpeningElement',
      name: {
        type: 'JSXMemberExpression',
        property: { type: 'JSXText' },
        object: { type: 'JSXNamespacedName' },
      },
      attributes: [],
    });
    // Namespaced element names return null outright (L134)
    listener(listeners, 'JSXOpeningElement')({
      type: 'JSXOpeningElement',
      name: { type: 'JSXNamespacedName' },
      attributes: [],
    });
    expect(reports).toHaveLength(0);
  });

  it('non-attribute and namespaced attributes do not satisfy hasAttribute', () => {
    const { listeners, reports } = createWithMockContext(requiredAttributes, {
      options: [{ attributes: [{ attribute: 'data-testid' }] }],
    });
    listener(listeners, 'JSXOpeningElement')({
      type: 'JSXOpeningElement',
      name: { type: 'JSXIdentifier', name: 'Widget' },
      attributes: [
        { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'rest' } },
        { type: 'JSXAttribute', name: { type: 'JSXNamespacedName' } },
      ],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'missingAttribute' });
  });
});

describe('sort-comp (layer 2)', () => {
  it('falls back to the member node when the key shape mutates before reporting', () => {
    const { listeners, reports } = createWithMockContext(sortComp);
    let keyTypeReads = 0;
    const trickMember = {
      type: 'MethodDefinition',
      static: false,
      key: {
        get type() {
          keyTypeReads += 1;
          return keyTypeReads <= 1 ? 'Identifier' : 'Mutated';
        },
        name: 'zzz',
      },
    };
    const renderMember = {
      type: 'MethodDefinition',
      static: false,
      key: { type: 'Identifier', name: 'render' },
    };
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      superClass: { type: 'Identifier', name: 'Component' },
      body: { type: 'ClassBody', body: [renderMember, trickMember] },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'sortComp', node: trickMember });
  });
});

describe('hooks-exhaustive-deps (layer 2, impossible declarator ids)', () => {
  it('unknown declarator id shapes declare nothing', () => {
    const { listeners, reports } = createWithMockContext(hooksExhaustiveDeps);
    listener(listeners, 'CallExpression')({
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'useEffect' },
      arguments: [
        {
          type: 'ArrowFunctionExpression',
          params: [],
          body: {
            type: 'BlockStatement',
            body: [
              {
                type: 'VariableDeclaration',
                declarations: [{ type: 'VariableDeclarator', id: { type: 'WeirdPattern' } }],
              },
            ],
          },
        },
        { type: 'ArrayExpression', elements: [] },
      ],
    });
    expect(reports).toHaveLength(0);
  });
});

describe('prefer-stateless-function (layer 2)', () => {
  it('isPureComponent falls through when the superclass shape mutates', () => {
    let typeReads = 0;
    const node = {
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'Shifty' },
      superClass: {
        get type() {
          typeReads += 1;
          // Read 1 (isReactComponent) sees Identifier; isPureComponent's two
          // checks (L97, L101) see a mutated shape and fall to L110.
          return typeReads <= 1 ? 'Identifier' : 'Mutated';
        },
        name: 'PureComponent',
      },
      body: { type: 'ClassBody', body: [] },
    };
    const { listeners, reports } = createWithMockContext(preferStatelessFunction, {
      options: [{ ignorePureComponents: true }],
    });
    listener(listeners, 'ClassDeclaration')(node);
    // isPureComponent returned false (L110), so the class is still reported.
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'preferStatelessFunction' });
  });

  it('isPureComponent guards against a vanished superClass', () => {
    let superClassReads = 0;
    const superClass = { type: 'Identifier', name: 'PureComponent' };
    const node = {
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'Ghost' },
      get superClass() {
        superClassReads += 1;
        // isReactComponent performs 4 reads (guard, type check, and both name
        // comparisons); the 5th read — isPureComponent's guard — sees null.
        return superClassReads <= 4 ? superClass : null;
      },
      body: { type: 'ClassBody', body: [] },
    };
    const { listeners, reports } = createWithMockContext(preferStatelessFunction, {
      options: [{ ignorePureComponents: true }],
    });
    listener(listeners, 'ClassDeclaration')(node);
    // isPureComponent returned false (L95), so the class is still reported.
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'preferStatelessFunction' });
  });
});

describe('jsx-key (layer 2, synthetic parent chains)', () => {
  function jsxEl(extra: Record<string, unknown> = {}): AnyNode {
    return {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'li' },
        attributes: [],
      },
      children: [],
      ...extra,
    };
  }

  function iteratorCall(callback: AnyNode): AnyNode {
    const call = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'items' },
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [callback],
    };
    link(callback, call);
    return call;
  }

  it('breaks when the return-owning function is not an iterator callback', () => {
    // L309 false → L312 break, then the outer walk exhausts to `false`.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const ret = { type: 'ReturnStatement', argument: node };
    const block = { type: 'BlockStatement', body: [ret] };
    const fn = { type: 'FunctionExpression', params: [] };
    const plainCall = { type: 'CallExpression', callee: { type: 'Identifier', name: 'run' } };
    link(node, ret);
    link(ret, block);
    link(block, fn);
    link(fn, plainCall);
    link(plainCall, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(0);
  });

  it('expression container whose grandparent is not JSX keeps walking', () => {
    // L325 false arm, then CallExpression break (L344).
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const container = { type: 'JSXExpressionContainer' };
    const call = { type: 'CallExpression', callee: { type: 'Identifier', name: 'wrap' } };
    link(node, container);
    link(container, call);
    link(call, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(0);
  });

  it('Array.from map function: nested JSX is not a direct return', () => {
    // isInsideArrayFromMapFn → isDirectReturnFromFunction L363-364.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const parentJsx = jsxEl();
    const arrow = { type: 'ArrowFunctionExpression', params: [], body: parentJsx };
    const arrayFrom = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Array' },
        property: { type: 'Identifier', name: 'from' },
      },
      arguments: [{ type: 'Identifier', name: 'src' }, arrow],
    };
    link(node, parentJsx);
    link(parentJsx, arrow);
    link(arrow, arrayFrom);
    link(arrayFrom, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(0);
  });

  it('Array.from map function: conditional and logical wrappers are unwrapped', () => {
    // L384-390 continue path for ConditionalExpression and LogicalExpression.
    for (const wrapperType of ['ConditionalExpression', 'LogicalExpression']) {
      const { listeners, reports } = createWithMockContext(jsxKey);
      const node = jsxEl();
      const wrapper = { type: wrapperType };
      const arrow: AnyNode = { type: 'ArrowFunctionExpression', params: [], body: wrapper };
      const arrayFrom = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'Array' },
          property: { type: 'Identifier', name: 'from' },
        },
        arguments: [{ type: 'Identifier', name: 'src' }, arrow],
      };
      link(node, wrapper);
      link(wrapper, arrow);
      link(arrow, arrayFrom);
      link(arrayFrom, null);
      listener(listeners, 'JSXElement')(node);
      expect(reports, wrapperType).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'missingKey' });
    }
  });

  it('Array.from map function: unrelated wrappers walk up and return false', () => {
    // L392 fallback + L395 return false.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const arrayWrapper = { type: 'ArrayExpression' };
    const arrow = {
      type: 'ArrowFunctionExpression',
      params: [],
      body: { type: 'Identifier', name: 'other' },
    };
    const arrayFrom = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Array' },
        property: { type: 'Identifier', name: 'from' },
      },
      arguments: [{ type: 'Identifier', name: 'src' }, arrow],
    };
    link(node, arrayWrapper);
    link(arrayWrapper, arrow);
    link(arrow, arrayFrom);
    link(arrayFrom, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(0);
  });

  it('Children.map: return statement with a different argument keeps walking', () => {
    // L376 false arm; the arrow-body check above it later returns true.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const ret: AnyNode = { type: 'ReturnStatement', argument: { type: 'Identifier', name: 'z' } };
    const arrow: AnyNode = { type: 'ArrowFunctionExpression', params: [], body: ret };
    const childrenMap = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Children' },
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [{ type: 'Identifier', name: 'kids' }, arrow],
    };
    link(node, ret);
    link(ret, arrow);
    link(arrow, childrenMap);
    link(childrenMap, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'missingKey' });
  });

  it('callback param name found on a function expression parent during the walk', () => {
    // RS-branch break at L455 (funcParent is an IfStatement), then the
    // FunctionExpression branch (L426-433) resolves the param name.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const ret: AnyNode = { type: 'ReturnStatement', argument: node };
    const ifStmt: AnyNode = { type: 'IfStatement' };
    const fn: AnyNode = {
      type: 'FunctionExpression',
      params: [{ type: 'Identifier', name: 'kid' }],
    };
    const childrenMap = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Children' },
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [{ type: 'Identifier', name: 'kids' }, fn],
    };
    link(node, ret);
    link(ret, ifStmt);
    link(ifStmt, fn);
    link(fn, childrenMap);
    link(childrenMap, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(1);
    const report: AnyNode = reports[0];
    expect(report.messageId).toBe('missingKey');
    const { fixer, calls } = makeRecordingFixer();
    report.suggest[0].fix(fixer);
    expect(calls[0]).toMatchObject({ method: 'insertTextAfter' });
    expect(calls[0].args[1]).toBe(' key={kid.id}');
  });

  it('callback param name walk breaks on non-iterator function then falls back to item', () => {
    // RS-branch break at L449 (owner exists but is not an iterator callback),
    // FunctionExpression-branch operand walk, and the `'item'` fallback.
    const { listeners, reports } = createWithMockContext(jsxKey);
    const node = jsxEl();
    const ret: AnyNode = { type: 'ReturnStatement', argument: node };
    const fnX: AnyNode = {
      type: 'FunctionExpression',
      params: [{ type: 'Identifier', name: 'nope' }],
    };
    const plainCall: AnyNode = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'through' },
    };
    const fnY: AnyNode = { type: 'FunctionExpression', params: [] };
    const childrenMap = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Children' },
        property: { type: 'Identifier', name: 'map' },
      },
      arguments: [{ type: 'Identifier', name: 'kids' }, fnY],
    };
    link(node, ret);
    link(ret, fnX);
    link(fnX, plainCall);
    link(plainCall, fnY);
    link(fnY, childrenMap);
    link(childrenMap, null);
    listener(listeners, 'JSXElement')(node);
    expect(reports).toHaveLength(1);
    const report: AnyNode = reports[0];
    const { fixer, calls } = makeRecordingFixer();
    report.suggest[0].fix(fixer);
    expect(calls[0].args[1]).toBe(' key={item.id}');
  });

  it('iterator context resets the key tracker without reporting', () => {
    const { listeners, reports } = createWithMockContext(jsxKey);
    listener(listeners, 'CallExpression')(iteratorCall({ type: 'ArrowFunctionExpression', params: [] }));
    expect(reports).toHaveLength(0);
  });
});

describe('require-optimization (layer 2, synthetic AST)', () => {
  function fnDecl(extra: Record<string, unknown>): AnyNode {
    return {
      type: 'FunctionDeclaration',
      loc: null,
      params: [],
      body: { type: 'BlockStatement', body: [] },
      ...extra,
    };
  }

  it('bails when the declaration name vanishes between listener and analysis', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    let nameReads = 0;
    const node = fnDecl({
      id: {
        type: 'Identifier',
        get name() {
          nameReads += 1;
          return nameReads <= 2 ? 'Comp' : undefined;
        },
      },
    });
    listener(listeners, 'FunctionDeclaration')(node);
    expect(reports).toHaveLength(0);
  });

  it('array-pattern params yield zero props', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    listener(listeners, 'FunctionDeclaration')(
      fnDecl({ id: { type: 'Identifier', name: 'Comp' }, params: [{ type: 'ArrayPattern' }] }),
    );
    expect(reports).toHaveLength(0);
  });

  it('depth limit and duplicate references stop function-body analysis', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    let deep: AnyNode = { type: 'BlockStatement', body: [] };
    for (let i = 0; i < 12; i++) {
      deep = { type: 'BlockStatement', body: [deep] };
    }
    const shared = { type: 'BlockStatement', body: [] };
    deep.body.push(shared, shared);
    listener(listeners, 'FunctionDeclaration')(
      fnDecl({ id: { type: 'Identifier', name: 'Deep' }, body: deep }),
    );
    expect(reports).toHaveLength(0);
  });

  it('analyzes JSX oddities and IIFE-style handlers in function bodies', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    const iifeHandler = {
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', name: 'onClick' },
      value: {
        type: 'JSXExpressionContainer',
        expression: {
          type: 'CallExpression',
          callee: { type: 'ArrowFunctionExpression' },
        },
      },
    };
    const jsx = {
      type: 'JSXElement',
      openingElement: {
        attributes: [
          { type: 'JSXSpreadAttribute' },
          iifeHandler,
        ],
      },
      children: [
        { type: 'JSXElement', openingElement: null, children: null },
        { type: 'JSXText', value: 'x' },
      ],
    };
    const body = {
      type: 'BlockStatement',
      body: [
        { type: 'ReturnStatement', argument: jsx },
        {
          type: 'VariableDeclaration',
          declarations: [
            { type: 'VariableDeclarator', init: null },
            {
              type: 'VariableDeclarator',
              init: {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  property: { type: 'Identifier', name: 'map' },
                },
                arguments: [
                  { type: 'SpreadElement' },
                  { type: 'Identifier', name: 'cb' },
                ],
              },
            },
          ],
        },
      ],
    };
    listener(listeners, 'FunctionDeclaration')(
      fnDecl({ id: { type: 'Identifier', name: 'Busy' }, body }),
    );
    const ids = reports.map((r: AnyNode) => r.messageId).sort();
    // IIFE handler → useCallback; `.map` call → useMemo
    expect(ids).toEqual(['considerUseCallback', 'considerUseMemo']);
  });

  it('arrow components without a body are recorded but not reported', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    const arrow: AnyNode = {
      type: 'ArrowFunctionExpression',
      loc: null,
      params: [],
      body: null,
    };
    arrow.parent = {
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'Empty' },
    };
    listener(listeners, 'ArrowFunctionExpression')(arrow);
    expect(reports).toHaveLength(0);
  });

  it('skips anonymous classes and non-component superclasses', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    const cls = listener(listeners, 'ClassDeclaration');
    cls({ type: 'ClassDeclaration', id: null });
    cls({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'A' },
      superClass: { type: 'CallExpression' },
    });
    cls({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'B' },
      superClass: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'React' },
        property: { type: 'Identifier', name: 'Fragment' },
      },
    });
    expect(reports).toHaveLength(0);
  });

  it('analyzes class render bodies including synthetic attribute children', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    let deep: AnyNode = { type: 'BlockStatement', body: [] };
    for (let i = 0; i < 12; i++) {
      deep = { type: 'BlockStatement', body: [deep] };
    }
    const renderBody = {
      type: 'BlockStatement',
      loc: null,
      body: [
        deep,
        {
          type: 'VariableDeclaration',
          declarations: [
            { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'a' }, init: null },
            {
              type: 'VariableDeclarator',
              id: { type: 'ObjectPattern', properties: [{}, {}, {}] },
              init: { type: 'Identifier', name: 'other' },
            },
            {
              type: 'VariableDeclarator',
              id: { type: 'ObjectPattern', properties: [{}, {}, {}] },
              init: {
                type: 'MemberExpression',
                object: { type: 'ThisExpression' },
                property: { type: 'Identifier', name: 'props' },
              },
            },
          ],
        },
        {
          type: 'ReturnStatement',
          argument: {
            type: 'JSXElement',
            children: [
              {
                type: 'JSXAttribute',
                name: { type: 'JSXIdentifier', name: 'onScroll' },
              },
              { type: 'JSXElement', children: null },
            ],
          },
        },
      ],
    };
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'Classy' },
      superClass: { type: 'Identifier', name: 'Component' },
      body: {
        type: 'ClassBody',
        body: [
          { type: 'PropertyDefinition', key: { type: 'Identifier', name: 'state' } },
          {
            type: 'MethodDefinition',
            key: { type: 'Identifier', name: 'render' },
            value: { body: renderBody },
          },
        ],
      },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'considerPureComponent' });
  });

  it('duplicated node references stop render-body analysis', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    const shared = { type: 'BlockStatement', body: [] };
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'Twice' },
      superClass: { type: 'Identifier', name: 'Component' },
      body: {
        type: 'ClassBody',
        body: [
          {
            type: 'MethodDefinition',
            key: { type: 'Identifier', name: 'render' },
            value: {
              body: {
                type: 'BlockStatement',
                loc: null,
                body: [shared, shared],
              },
            },
          },
        ],
      },
    });
    expect(reports).toHaveLength(0);
  });

  it('this.props usage in render counts as a single prop', () => {
    const { listeners, reports } = createWithMockContext(requireOptimization);
    const renderBody = {
      type: 'BlockStatement',
      loc: { start: { line: 1 }, end: { line: 2 } },
      body: [
        {
          type: 'VariableDeclaration',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: { type: 'Identifier', name: 'p' },
              init: {
                type: 'MemberExpression',
                object: { type: 'ThisExpression' },
                property: { type: 'Identifier', name: 'props' },
              },
            },
          ],
        },
      ],
    };
    listener(listeners, 'ClassDeclaration')({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'OneProp' },
      superClass: { type: 'Identifier', name: 'Component' },
      body: {
        type: 'ClassBody',
        body: [
          {
            type: 'MethodDefinition',
            key: { type: 'Identifier', name: 'render' },
            value: { body: renderBody },
          },
        ],
      },
    });
    // 1 prop < threshold and no expensive computations → no report
    expect(reports).toHaveLength(0);
  });
});

describe('react-render-optimization (layer 2, synthetic AST)', () => {
  function run(options?: unknown[]) {
    return createWithMockContext(reactRenderOptimization, options ? { options } : {});
  }

  function attr(value: AnyNode): AnyNode {
    return { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'x' }, value };
  }

  it('null options entry falls back to defaults', () => {
    const { listeners, reports } = run([null]);
    listener(listeners, 'JSXAttribute')(attr(null));
    listener(listeners, 'JSXAttribute')(attr({ type: 'Literal', value: 'ok' }));
    listener(listeners, 'JSXAttribute')(attr({ type: 'JSXElement' }));
    expect(reports).toHaveLength(0);
  });

  it('reports expensive loop computations and the suggestion fix is inert', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({
        type: 'JSXExpressionContainer',
        expression: { type: 'ForStatement', parent: null },
      }),
    );
    expect(reports).toHaveLength(1);
    const report: AnyNode = reports[0];
    expect(report.messageId).toBe('expensiveComputation');
    expect(report.data).toMatchObject({ complexity: '3' });
    const { fixer } = makeRecordingFixer();
    expect(report.suggest[0].fix(fixer)).toBeNull();
  });

  it('binary expressions are cheap by definition', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({ type: 'JSXExpressionContainer', expression: { type: 'BinaryExpression' } }),
    );
    expect(reports).toHaveLength(0);
  });

  it('finds complexity in array-shaped bodies', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({
        type: 'JSXExpressionContainer',
        expression: {
          type: 'LabeledStatement',
          parent: null,
          body: [{ type: 'Identifier' }, { type: 'ForOfStatement' }],
        },
      }),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'expensiveComputation' });
  });

  it('accumulates complexity while walking parents', () => {
    const { listeners, reports } = run();
    const whileLoop = { type: 'WhileStatement', parent: null };
    const call = { type: 'CallExpression', parent: whileLoop };
    const ifStmt = { type: 'IfStatement', parent: call };
    const cond = { type: 'ConditionalExpression', parent: ifStmt };
    listener(listeners, 'JSXAttribute')(
      attr({ type: 'JSXExpressionContainer', expression: cond }),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'expensiveComputation' });
  });

  it('null body and missing parents end the walk quietly', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({
        type: 'JSXExpressionContainer',
        expression: { type: 'TaggedTemplateExpression', body: null, parent: null },
      }),
    );
    expect(reports).toHaveLength(0);
  });

  it('non-array bodies are not scanned for complexity', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({
        type: 'JSXExpressionContainer',
        expression: { type: 'LabeledStatement', parent: null, body: { type: 'EmptyStatement' } },
      }),
    );
    expect(reports).toHaveLength(0);
  });

  it('a throwing attribute value is swallowed by the catch guard', () => {
    const { listeners, reports } = run();
    listener(listeners, 'JSXAttribute')(
      attr({
        type: 'JSXExpressionContainer',
        get expression(): AnyNode {
          throw new Error('synthetic accessor failure');
        },
      }),
    );
    // The catch arm returns without reporting instead of crashing the rule.
    expect(reports).toHaveLength(0);
  });
});

describe('react-no-inline-functions (layer 2, synthetic AST)', () => {
  function arrow(parent: AnyNode | null): AnyNode {
    return link({ type: 'ArrowFunctionExpression', params: [] }, parent);
  }

  it('null options entry falls back to defaults; nodes outside JSX bail', () => {
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions, {
      options: [null],
    });
    const call = link({ type: 'CallExpression', callee: { type: 'Identifier' } }, null);
    listener(
      listeners,
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression',
    )(arrow(call));
    expect(reports).toHaveLength(0);
  });

  it('direct JSXAttribute parent counts as JSX and reports a prop function', () => {
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions);
    const attrParent = link(
      {
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'render' },
        parent: null,
      },
      null,
    );
    listener(
      listeners,
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression',
    )(arrow(attrParent));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'inlineFunction',
      data: { location: 'JSX prop' },
    });
  });

  it('allowInEventHandlers skips on-handlers but keeps other attributes', () => {
    const jsxListenerName =
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression';
    const onAttr = { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'onClick' }, parent: null };
    const onContainer = link({ type: 'JSXExpressionContainer' }, onAttr);
    const allowed = createWithMockContext(reactNoInlineFunctions, {
      options: [{ allowInEventHandlers: true }],
    });
    listener(allowed.listeners, jsxListenerName)(arrow(onContainer));
    expect(allowed.reports).toHaveLength(0);

    const fooAttr = { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'foo' }, parent: null };
    const fooContainer = link({ type: 'JSXExpressionContainer' }, fooAttr);
    const kept = createWithMockContext(reactNoInlineFunctions, {
      options: [{ allowInEventHandlers: true }],
    });
    listener(kept.listeners, jsxListenerName)(arrow(fooContainer));
    expect(kept.reports).toHaveLength(1);
  });

  it('non-member and non-array callees are not array methods', () => {
    const jsxListenerName =
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression';
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions);
    const container = link({ type: 'JSXExpressionContainer' }, null);
    const thenCall = link(
      {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: 'then' },
        },
      },
      container,
    );
    listener(listeners, jsxListenerName)(arrow(thenCall));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ data: { location: 'JSX prop' } });
  });

  it('large configured arrays raise impact to high inside map calls', () => {
    const jsxListenerName =
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression';
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions, {
      options: [{ minArraySize: 100 }],
    });
    const container = link({ type: 'JSXExpressionContainer' }, null);
    const mapCall = link(
      {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: 'map' },
        },
      },
      container,
    );
    listener(listeners, jsxListenerName)(arrow(mapCall));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      data: { impact: 'high', location: 'map() call' },
    });
  });

  it('identifier callees inside JSX are not array methods', () => {
    const jsxListenerName =
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression';
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions);
    const container = link({ type: 'JSXExpressionContainer' }, null);
    const idCall = link(
      { type: 'CallExpression', callee: { type: 'Identifier', name: 'run' } },
      container,
    );
    listener(listeners, jsxListenerName)(arrow(idCall));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ data: { location: 'JSX prop' } });
  });

  it('call-expression listener: attribute in chain without allow flag still reports', () => {
    const callListenerName =
      'CallExpression > ArrowFunctionExpression, CallExpression > FunctionExpression';
    const { listeners, reports } = createWithMockContext(reactNoInlineFunctions);
    const container = link({ type: 'JSXExpressionContainer' }, null);
    const attrNode = link(
      { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'onClick' } },
      container,
    );
    listener(listeners, callListenerName)(arrow(attrNode));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ data: { location: 'JSX prop' } });
  });
});
