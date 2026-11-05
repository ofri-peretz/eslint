/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this function a React function component? Decided the way React defines
 * one: a function whose name starts with a capital letter (what JSX renders as
 * a component rather than a DOM tag) and that returns JSX, or any function
 * passed to React's `memo` / `forwardRef` (by binding).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { isReactApi } from './react-api';

export type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression
  | TSESTree.FunctionDeclaration;

/**
 * Is this a function component, as React defines one? A function passed to
 * React's `memo` / `forwardRef`, or a function that returns JSX and is named
 * in PascalCase (React's rule for what JSX renders as a component) — or is
 * the anonymous `export default function`.
 */
export function isFunctionComponent(
  fn: FunctionNode,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  // An explicit TS `this` parameter names the function's own receiver.
  const [first] = fn.params;
  if (first?.type === AST_NODE_TYPES.Identifier && first.name === 'this')
    return false;
  const parent = fn.parent;
  if (
    parent.type === AST_NODE_TYPES.CallExpression &&
    parent.arguments[0] === fn
  ) {
    const scope = sourceCode.getScope(parent);
    return (
      isReactApi(parent.callee, scope, 'memo') ||
      isReactApi(parent.callee, scope, 'forwardRef')
    );
  }
  const name =
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression && fn.id
      ? fn.id.name
      : parent.type === AST_NODE_TYPES.VariableDeclarator &&
          parent.id.type === AST_NODE_TYPES.Identifier
        ? parent.id.name
        : parent.type === AST_NODE_TYPES.ExportDefaultDeclaration
          ? 'Default'
          : null;
  return name !== null && /^[A-Z]/.test(name) && returnsJsx(fn);
}

const isJsx = (node: TSESTree.Node | null | undefined): boolean =>
  node?.type === AST_NODE_TYPES.JSXElement ||
  node?.type === AST_NODE_TYPES.JSXFragment ||
  (node?.type === AST_NODE_TYPES.ConditionalExpression &&
    (isJsx(node.consequent) || isJsx(node.alternate))) ||
  (node?.type === AST_NODE_TYPES.LogicalExpression && isJsx(node.right));

/** Does `fn` return JSX from its own body (not from a nested function)? */
export function returnsJsx(fn: FunctionNode): boolean {
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return isJsx(fn.body);
  const visit = (node: TSESTree.Node): boolean => {
    if (node.type === AST_NODE_TYPES.ReturnStatement)
      return isJsx(node.argument);
    if (
      node.type === AST_NODE_TYPES.FunctionDeclaration ||
      node.type === AST_NODE_TYPES.FunctionExpression ||
      node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      node.type === AST_NODE_TYPES.ClassDeclaration ||
      node.type === AST_NODE_TYPES.ClassExpression
    )
      return false;
    return Object.entries(node).some(
      ([key, value]) =>
        key !== 'parent' &&
        (Array.isArray(value)
          ? value.some((v) => isNode(v) && visit(v))
          : isNode(value) && visit(value)),
    );
  };
  return visit(fn.body);
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}
