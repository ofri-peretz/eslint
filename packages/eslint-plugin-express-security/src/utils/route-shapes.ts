/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two route shapes Express documents that a `app.<verb>(path, …handlers)`
 * matcher misses.
 *
 * - `app.route(path).get(a).post(b)`: every `Route` verb returns the route,
 *   so the path is given once to `.route(…)` and each verb call's arguments
 *   are all handlers.
 * - `app.use([a, b])` / `app.post(path, [auth, csrf], handler)`: Express
 *   flattens arrays of middleware, so an array element sits in the chain as
 *   surely as a bare argument.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';

const ROUTE_VERBS: ReadonlySet<string> = new Set([
  'all',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
]);

/**
 * When `callee` is `<x>.route(path)[.<verb>(…)]*.<method>`, the `.route(…)`
 * call at the root of the chain; otherwise `null`.
 */
export function routeChainRoot(
  callee: TSESTree.Node,
): TSESTree.CallExpression | null {
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  let receiver: TSESTree.Node = callee.object;
  while (
    receiver.type === AST_NODE_TYPES.CallExpression &&
    receiver.callee.type === AST_NODE_TYPES.MemberExpression &&
    ROUTE_VERBS.has(propertyName(receiver.callee) ?? '')
  ) {
    receiver = receiver.callee.object;
  }
  return receiver.type === AST_NODE_TYPES.CallExpression &&
    receiver.callee.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(receiver.callee) === 'route'
    ? receiver
    : null;
}

/** Arguments with any array of middleware spread into its elements. */
export function flattenMiddleware(
  args: readonly TSESTree.CallExpressionArgument[],
): TSESTree.CallExpressionArgument[] {
  return args.flatMap((arg): TSESTree.CallExpressionArgument[] =>
    arg.type === AST_NODE_TYPES.ArrayExpression
      ? arg.elements.filter(
          (el): el is TSESTree.CallExpressionArgument => el !== null,
        )
      : [arg],
  );
}
