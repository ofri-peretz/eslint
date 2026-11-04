/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * The Lambda callback, by the names the runtime's examples give it. `callback(null, res)`
 * is how a callback-style handler responds.
 */
const CALLBACK_NAMES: ReadonlySet<string> = new Set(['callback', 'cb', 'done']);

/**
 * Whether an object literal sits where a Lambda proxy response is produced:
 * returned (explicitly or as an arrow's body), built in a variable or an
 * assignment first, or handed to the Lambda `callback`.
 *
 * Shape alone is not enough — `fetch(url, { body, headers })` and
 * `console.error({ body: error.stack })` carry the same keys and go nowhere
 * near the caller.
 */
export function inResponsePosition(node: TSESTree.ObjectExpression): boolean {
  const parent = node.parent;
  switch (parent.type) {
    case AST_NODE_TYPES.ReturnStatement:
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.VariableDeclarator:
    case AST_NODE_TYPES.AssignmentExpression:
      return true;
    case AST_NODE_TYPES.CallExpression:
      return (
        parent.callee.type === AST_NODE_TYPES.Identifier &&
        CALLBACK_NAMES.has(parent.callee.name)
      );
    default:
      return false;
  }
}
