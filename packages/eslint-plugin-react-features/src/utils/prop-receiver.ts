/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Who receives a JSX prop, and does it compare props by identity?
 *
 * A prop value created during render (`{{ a }}`, `{[a]}`, `{() => a}`) has a
 * new identity every render. That costs a re-render only when the receiver
 * skips re-rendering on equal props: a component wrapped in React's `memo`, or
 * a `PureComponent` class. Anything else re-renders with its parent anyway:
 *
 *   - `dom`     an intrinsic element (`<div>`, `<my-widget>`): React sets the
 *               new value on the DOM node; there is no render to save.
 *   - `memo`    a component this file defines with `memo(...)` (by binding) or
 *               as a class extending React's `PureComponent`.
 *   - `plain`   a component this file defines without either: a function, an
 *               arrow, `forwardRef(...)`, or a `Component` class with no
 *               `shouldComponentUpdate`.
 *   - `unknown` anything the file cannot see: an import, a parameter, a member
 *               (`<Ctx.Provider>`, `<Ui.Row>`), a reassigned binding, a class
 *               with its own `shouldComponentUpdate`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, objectKeyName } from '@interlace/eslint-devkit';
import { extendsReactComponent, isReactApi } from './react-api';

export type PropReceiver = 'dom' | 'memo' | 'plain' | 'unknown';

type Scope = TSESLint.Scope.Scope;

function lookup(
  name: string,
  scope: Scope,
): TSESLint.Scope.Variable | undefined {
  for (let s: Scope | null = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return undefined;
}

function classKind(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
  scope: Scope,
): PropReceiver {
  if (!extendsReactComponent(node, scope)) return 'unknown';
  // `PureComponent` is the one base class that compares props shallowly.
  if (
    isReactApi(node.superClass as TSESTree.Expression, scope, 'PureComponent')
  ) {
    return 'memo';
  }
  // A class with its own `shouldComponentUpdate` decides for itself.
  const decides = node.body.body.some(
    (m) =>
      (m.type === AST_NODE_TYPES.MethodDefinition ||
        m.type === AST_NODE_TYPES.PropertyDefinition) &&
      objectKeyName(m) === 'shouldComponentUpdate',
  );
  return decides ? 'unknown' : 'plain';
}

/** What a component definition (the right-hand side of `const X = ...`) is. */
function definitionKind(init: TSESTree.Expression, scope: Scope): PropReceiver {
  if (
    init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    init.type === AST_NODE_TYPES.FunctionExpression
  ) {
    return 'plain';
  }
  if (init.type === AST_NODE_TYPES.ClassExpression) {
    return classKind(init, scope);
  }
  if (init.type === AST_NODE_TYPES.CallExpression) {
    if (isReactApi(init.callee, scope, 'memo')) return 'memo';
    if (isReactApi(init.callee, scope, 'forwardRef')) return 'plain';
  }
  return 'unknown';
}

/** The receiver of the props written on `element`. */
export function propReceiver(
  element: TSESTree.JSXOpeningElement,
  scope: Scope,
): PropReceiver {
  const name = element.name;
  if (name.type === AST_NODE_TYPES.JSXNamespacedName) return 'dom';
  if (name.type !== AST_NODE_TYPES.JSXIdentifier) return 'unknown';
  // JSX's own definition: a lowercase first letter, or a hyphen (a custom
  // element), names a host element rather than a value in scope.
  if (/^[a-z]/.test(name.name) || name.name.includes('-')) return 'dom';

  const variable = lookup(name.name, scope);
  const def = variable?.defs[0];
  if (!variable || !def || variable.defs.length !== 1) return 'unknown';
  // A binding written after its declaration may hold anything by now.
  if (variable.references.some((r) => r.isWrite() && !r.init)) {
    return 'unknown';
  }
  if (def.type === 'FunctionName') return 'plain';
  if (def.type === 'ClassName') {
    return classKind(def.node as TSESTree.ClassDeclaration, scope);
  }
  if (
    def.type === 'Variable' &&
    def.node.id.type === AST_NODE_TYPES.Identifier &&
    def.node.init
  ) {
    return definitionKind(def.node.init, scope);
  }
  return 'unknown';
}

/** A value created anew on every evaluation, by kind. */
export type FreshValue =
  | { kind: 'object'; size: number }
  | { kind: 'array'; size: number }
  | { kind: 'function' };

/**
 * The fresh value `node` evaluates to, or `null` when it is not provably one
 * (an identifier, a call, a literal). Sees through TypeScript's `as`,
 * `satisfies` and `!`, and reads a conditional whose two branches are both
 * fresh values of the same kind as that kind (the smaller size of the two).
 */
export function freshValue(node: TSESTree.Node): FreshValue | null {
  switch (node.type) {
    case AST_NODE_TYPES.ObjectExpression:
      return { kind: 'object', size: node.properties.length };
    case AST_NODE_TYPES.ArrayExpression:
      return {
        kind: 'array',
        size: node.elements.filter((e) => e !== null).length,
      };
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      return { kind: 'function' };
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
      return freshValue(node.expression);
    case AST_NODE_TYPES.ConditionalExpression: {
      const a = freshValue(node.consequent);
      const b = freshValue(node.alternate);
      if (!a || !b || a.kind !== b.kind) return null;
      if (a.kind === 'function') return a;
      const size = Math.min(
        (a as { size: number }).size,
        (b as { size: number }).size,
      );
      return { kind: a.kind, size };
    }
    default:
      return null;
  }
}
