/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared request-shape helpers.
 *
 * Used by the access-control rules (`require-route-authentication`,
 * `no-idor-resource-access`) which both need to answer two questions about a
 * handler body: does it resolve an authenticated principal, and does a value
 * come straight off the request?
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';

/** Request properties that only exist once a principal has been resolved. */
const PRINCIPAL_PROPERTIES = new Set([
  'user',
  'auth',
  'session',
  'currentUser',
  'principal',
  'identity',
  'userId',
  'authInfo',
]);

/** Receivers whose principal properties count (req.user, res.locals.user, …). */
const PRINCIPAL_RECEIVER = /^(req|request|res|response|ctx|locals)$/i;

/** Request containers a client fully controls. */
const CLIENT_CONTAINERS = new Set(['body', 'query', 'params']);

/** Receivers that are an Express request. */
const REQUEST_RECEIVER = /^(req|request)$/i;

/**
 * Walk an AST subtree, visiting every node. `parent` links are skipped so the
 * traversal terminates.
 */
export function walk(
  node: TSESTree.Node,
  visit: (n: TSESTree.Node) => void,
): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) {
          walk(item as TSESTree.Node, visit);
        }
      }
      continue;
    }
    if (value && typeof value === 'object' && 'type' in value) {
      walk(value as TSESTree.Node, visit);
    }
  }
}

/** Does this subtree read an authenticated principal off the request? */
export function readsPrincipal(node: TSESTree.Node): boolean {
  let found = false;
  walk(node, (child) => {
    if (found) return;
    if (child.type !== AST_NODE_TYPES.MemberExpression) return;
    // `req['user']` reads the same principal `req.user` reads.
    const principal = propertyName(child);
    if (principal === null || !PRINCIPAL_PROPERTIES.has(principal)) return;

    const { object } = child;
    if (object.type === AST_NODE_TYPES.Identifier) {
      found = PRINCIPAL_RECEIVER.test(object.name);
      return;
    }
    if (object.type === AST_NODE_TYPES.MemberExpression) {
      found = PRINCIPAL_RECEIVER.test(propertyName(object) as string);
    }
  });
  return found;
}

/**
 * Is this expression a read off `req.params` / `req.query` / `req.body`
 * (`req.params.id`, `request.query.userId`, `ctx.req.body.id`)?
 */
export function isClientRequestMember(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;

  const { object } = node;
  if (object.type !== AST_NODE_TYPES.MemberExpression) return false;
  // `req['query'].id` reads the same client container `req.query.id` reads.
  const container = propertyName(object);
  if (container === null || !CLIENT_CONTAINERS.has(container)) return false;

  const root = object.object;
  if (root.type === AST_NODE_TYPES.Identifier) {
    return REQUEST_RECEIVER.test(root.name);
  }
  if (
    root.type === AST_NODE_TYPES.MemberExpression &&
    root.property.type === AST_NODE_TYPES.Identifier
  ) {
    return REQUEST_RECEIVER.test(root.property.name);
  }
  return false;
}
