/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Is this request authenticated?" — one implementation, two rules.
 *
 * `require-route-authentication` reports a route when the answer is **no**;
 * `require-csrf-protection` reports one only when the answer is **yes**. They
 * are exact complements, so they must not each carry their own idea of what
 * authentication looks like — that is how two rules end up reporting the same
 * line, which is the shape `no-missing-csrf-protection` was pulled out of
 * `recommended` for (see src/index.ts).
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { readsPrincipal } from './index';

/** Middleware whose name says "this request is authenticated". */
export const AUTH_MIDDLEWARE =
  /auth|jwt|passport|token|session|guard|protect|ensure|require|permit|acl|rbac|verify|login|identity|principal/i;

/**
 * The identifier names that make up a middleware *reference*.
 *
 * Deliberately the reference only — callee, receiver, property — and never the
 * arguments. Printing the node with `sourceCode.getText` and matching a regex
 * over it (what this used to do) matches the whole subtree: an inline handler
 * body mentioning `session` anywhere read as an auth middleware, and a config
 * object with `{ verify: false }` read as a verifier.
 */
function referenceNames(node: TSESTree.Node): string[] {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      return [node.name];
    case AST_NODE_TYPES.MemberExpression:
      return [
        ...referenceNames(node.object),
        ...(node.property.type === AST_NODE_TYPES.Identifier
          ? [node.property.name]
          : []),
      ];
    case AST_NODE_TYPES.CallExpression:
      return referenceNames(node.callee);
    default:
      return [];
  }
}

/**
 * Credential *plumbing*, not an authentication assertion.
 *
 * `app.use(session({ secret }))` installs the store a principal will later be
 * kept in; it asserts nothing about who is calling. `session` is in
 * AUTH_MIDDLEWARE for compound names — `requireSession`, `sessionGuard` — so
 * without this the bare store call read as a router-wide auth guard and
 * marked every route in a session app authenticated.
 */
const CREDENTIAL_STORES: ReadonlySet<string> = new Set([
  'session',
  'expresssession',
  'cookiesession',
  'clientsessions',
  'cookieparser',
]);

/**
 * Does this middleware argument assert an authenticated principal?
 *
 * `extra` are user-supplied names from the rule's `authMiddleware` option.
 */
export function isAuthMiddlewareArg(
  arg: TSESTree.Node,
  extra: ReadonlySet<string>,
): boolean {
  // `require` is in AUTH_MIDDLEWARE for names like `requireRole`, so in
  // CommonJS `app.use(require('body-parser'))` would otherwise read as a
  // global auth guard and switch the rule off file-wide.
  if (
    arg.type === AST_NODE_TYPES.CallExpression &&
    arg.callee.type === AST_NODE_TYPES.Identifier &&
    arg.callee.name === 'require'
  ) {
    return false;
  }
  const names = referenceNames(arg);
  if (names.length === 1 && CREDENTIAL_STORES.has(names[0].toLowerCase())) {
    return false;
  }
  if (names.some((name) => AUTH_MIDDLEWARE.test(name))) return true;
  return names.some((name) =>
    [...extra].some((wanted) => name.includes(wanted)),
  );
}

/**
 * Is this route's request authenticated, as far as the file can show?
 *
 * `chain` is the middleware between the path and the final handler; `handler`
 * is that final handler.
 */
export function routeIsAuthenticated(
  chain: readonly TSESTree.Node[],
  handler: TSESTree.Node | undefined,
  extra: ReadonlySet<string>,
): boolean {
  if (chain.some((arg) => isAuthMiddlewareArg(arg, extra))) return true;
  return handler !== undefined && readsPrincipal(handler);
}
