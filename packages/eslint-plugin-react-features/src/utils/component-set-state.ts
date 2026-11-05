/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a class component calls its own `setState` — decided by structure.
 *
 * A call is the component's `setState` only when its receiver is the
 * component's `this`: `this.setState(…)` / `this['setState'](…)` directly in a
 * method of a class that extends React's `Component` / `PureComponent` (by
 * binding), or inside a callback that keeps that `this` — an arrow function,
 * or a `function` bound with `.bind(this)`. Any other `function` has its own
 * `this`, and `store.setState(…)` is somebody else's state.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { extendsReactComponent } from './react-api';

export interface SetStateSite {
  /** The class member the call runs in (`componentDidMount`), or `null` when its key is computed at runtime. */
  method: string | null;
  /** Under an `if`, a `?:` branch, the right side of `&&` / `||` / `??`, or a `switch` case. */
  conditional: boolean;
  /** Inside a callback (arrow or bound function) the method creates. */
  inCallback: boolean;
}

/** `function () {}.bind(this)`: a function that keeps the caller's `this`. */
function isBoundToThis(fn: TSESTree.FunctionExpression): boolean {
  const member = fn.parent;
  if (
    member.type !== AST_NODE_TYPES.MemberExpression ||
    member.object !== fn ||
    propertyName(member) !== 'bind'
  )
    return false;
  const call = member.parent;
  return (
    call.type === AST_NODE_TYPES.CallExpression &&
    call.callee === member &&
    call.arguments[0]?.type === AST_NODE_TYPES.ThisExpression
  );
}

/** Is `child` a branch of `parent` that runs only under a condition? */
function isConditionalBranch(
  parent: TSESTree.Node,
  child: TSESTree.Node,
): boolean {
  switch (parent.type) {
    case AST_NODE_TYPES.IfStatement:
    case AST_NODE_TYPES.ConditionalExpression:
      return parent.test !== child;
    case AST_NODE_TYPES.LogicalExpression:
      return parent.right === child;
    case AST_NODE_TYPES.SwitchCase:
      return true;
    default:
      return false;
  }
}

/**
 * If `self` is a React class component's own `this`, where it is used: the
 * class member it runs in, and whether it is under a condition or inside a
 * callback that keeps `this`. Otherwise `null` (a plain function's own `this`,
 * a class that is not a React component, a static member, module-level).
 */
export function componentThis(
  self: TSESTree.ThisExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): SetStateSite | null {
  let conditional = false;
  let inCallback = false;
  let child: TSESTree.Node = self;
  let node: TSESTree.Node | undefined = self.parent;
  for (; node; child = node, node = node.parent as TSESTree.Node | undefined) {
    if (isConditionalBranch(node, child)) conditional = true;
    if (
      node.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      node.type !== AST_NODE_TYPES.FunctionExpression &&
      node.type !== AST_NODE_TYPES.FunctionDeclaration
    )
      continue;

    const member = node.parent;
    const isMember =
      (member?.type === AST_NODE_TYPES.MethodDefinition ||
        member?.type === AST_NODE_TYPES.PropertyDefinition) &&
      member.value === node;
    if (isMember) {
      const cls = member.parent.parent;
      if (
        member.static ||
        !extendsReactComponent(cls, sourceCode.getScope(cls))
      )
        return null;
      return { method: objectKeyName(member), conditional, inCallback };
    }
    // An arrow keeps the enclosing `this`; a bound function takes it.
    if (
      node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      (node.type === AST_NODE_TYPES.FunctionExpression && isBoundToThis(node))
    ) {
      inCallback = true;
      continue;
    }
    return null;
  }
  return null;
}

/**
 * If `call` is a React class component calling its own method `name`
 * (`this.setState(…)`, `this['isMounted']()`), where it runs; otherwise
 * `null`.
 */
export function componentSetState(
  call: TSESTree.CallExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
  name = 'setState',
): SetStateSite | null {
  const callee = call.callee;
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.object.type !== AST_NODE_TYPES.ThisExpression ||
    propertyName(callee) !== name
  )
    return null;
  return componentThis(callee.object, sourceCode);
}
