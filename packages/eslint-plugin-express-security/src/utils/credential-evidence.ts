/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What a route registration says about *which credential* authorises it.
 *
 * CSRF needs a credential the browser attaches by itself (a cookie). Two shapes
 * of registration say the opposite, and one says there is nothing to protect:
 *
 * - a **bearer** route: the token travels in an `Authorization` header that a
 *   cross-site request cannot set;
 * - a **guard-only** registration: `app.post('/x', security.denyAll())` mounts a
 *   guard and handles nothing, so no state-changing handler is on this line.
 *
 * Every test here reads the registration's own syntax. None of them follows an
 * import: a guard's name says what it does, and a token source is whatever the
 * registration itself configures.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { walk } from './index';
import { isPackageCallee, type PackageBindings } from './import-bindings';

/**
 * A middleware name that *asserts or shapes access* instead of handling a
 * request. The verb has to end at a word boundary (`isAuthorized`, `denyAll`,
 * `requireAuth`, `ensureLoggedIn`), so `isolate`, `allowance` and `verifyEmail`
 * are not guards. `verify` is deliberately absent: `verifyEmail` and
 * `verifyCaptcha` are handlers.
 */
const GUARD_NAME =
  /^(?:is|has|can|ensure|require|deny|allow|authori[sz]e|authenticate|protect|restrict|permit|guard|append|attach)(?![a-z])/;

/** The name a middleware argument is called by: `security.denyAll()` → `denyAll`. */
function middlewareName(arg: TSESTree.Node): string | null {
  switch (arg.type) {
    case AST_NODE_TYPES.Identifier:
      return arg.name;
    case AST_NODE_TYPES.MemberExpression:
      return propertyName(arg);
    case AST_NODE_TYPES.CallExpression:
      return middlewareName(arg.callee);
    default:
      return null;
  }
}

/**
 * Is every argument after the path a guard, with no handler among them?
 *
 * Juice Shop registers `app.post('/api/Products', security.isAuthorized())` so a
 * REST resource generator mounted later is protected; the generator, not this
 * line, handles the request.
 */
export function isGuardOnlyRegistration(
  args: readonly TSESTree.Node[],
): boolean {
  return (
    args.length > 0 &&
    args.every((arg) => {
      const name = middlewareName(arg);
      return name !== null && GUARD_NAME.test(name);
    })
  );
}

const BEARER_STRATEGIES: ReadonlySet<string> = new Set([
  'bearer',
  'http-bearer',
  'oauth-bearer',
]);

function readsMember(node: TSESTree.Node, names: ReadonlySet<string>): boolean {
  let found = false;
  walk(node, (n) => {
    if (found || n.type !== AST_NODE_TYPES.MemberExpression) return;
    const name = propertyName(n);
    if (name === null || !names.has(name)) return;
    found =
      n.object.type === AST_NODE_TYPES.Identifier &&
      /^(req|request)$/i.test(n.object.name);
  });
  return found;
}

const COOKIE_CREDENTIALS: ReadonlySet<string> = new Set([
  'cookies',
  'signedCookies',
  'session',
]);

/** Does this subtree read a cookie or session credential off the request? */
function readsCookieCredential(node: TSESTree.Node): boolean {
  return readsMember(node, COOKIE_CREDENTIALS);
}

/** `req.headers.authorization`, `req.headers['authorization']`, `req.get('Authorization')`. */
function readsAuthorizationHeader(node: TSESTree.Node): boolean {
  let found = false;
  walk(node, (n) => {
    if (found) return;
    if (n.type === AST_NODE_TYPES.MemberExpression) {
      found =
        propertyName(n)?.toLowerCase() === 'authorization' &&
        n.object.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(n.object) === 'headers';
      return;
    }
    if (
      n.type === AST_NODE_TYPES.CallExpression &&
      n.callee.type === AST_NODE_TYPES.MemberExpression &&
      // @vocabulary Express request API
      ['get', 'header'].includes(propertyName(n.callee) ?? '') &&
      n.callee.object.type === AST_NODE_TYPES.Identifier &&
      /^(req|request)$/i.test(n.callee.object.name)
    ) {
      const [first] = n.arguments;
      found =
        first !== undefined &&
        staticString(first)?.toLowerCase() === 'authorization';
    }
  });
  return found;
}

function hasOption(arg: TSESTree.Node | undefined, key: string): boolean {
  return (
    arg?.type === AST_NODE_TYPES.ObjectExpression &&
    arg.properties.some(
      (p) => p.type === AST_NODE_TYPES.Property && objectKeyName(p) === key,
    )
  );
}

function optionIsFalse(arg: TSESTree.Node | undefined, key: string): boolean {
  if (arg?.type !== AST_NODE_TYPES.ObjectExpression) return false;
  return arg.properties.some(
    (p) =>
      p.type === AST_NODE_TYPES.Property &&
      objectKeyName(p) === key &&
      p.value.type === AST_NODE_TYPES.Literal &&
      p.value.value === false,
  );
}

/**
 * A middleware call that authenticates from the `Authorization` header and
 * nowhere else.
 *
 * - `express-jwt`'s default token source is the header; passing `getToken`
 *   replaces it with something this file has to be read for, so it is not
 *   evidence here.
 * - `passport.authenticate('bearer')` reads the header by definition;
 *   `'jwt'` does so by default, but only counts when `{ session: false }`
 *   says the strategy keeps no session cookie behind it.
 */
function isBearerGuard(
  arg: TSESTree.Node,
  jwtBindings: PackageBindings,
): boolean {
  if (arg.type !== AST_NODE_TYPES.CallExpression) return false;
  const [first, second] = arg.arguments;
  if (
    isPackageCallee(arg.callee, jwtBindings) ||
    isPackageCallee(arg.callee, jwtBindings, 'expressjwt')
  ) {
    return !hasOption(first, 'getToken');
  }
  if (
    arg.callee.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(arg.callee) === 'authenticate' &&
    first !== undefined
  ) {
    const strategy = staticString(first)?.toLowerCase();
    if (strategy == null) return false;
    if (BEARER_STRATEGIES.has(strategy)) return true;
    return strategy === 'jwt' && optionIsFalse(second, 'session');
  }
  return false;
}

/**
 * Is this route authenticated by a bearer token and by no cookie?
 *
 * The browser attaches cookies to a cross-site request on its own; it does not
 * attach an `Authorization` header. A route that shows a bearer credential and
 * reads no cookie or session anywhere in its chain has no ambient authority to
 * forge. One that shows both is not exempted: the cookie may be the one that
 * counts.
 */
export function routeUsesBearerCredentialOnly(
  chain: readonly TSESTree.Node[],
  handler: TSESTree.Node | undefined,
  jwtBindings: PackageBindings,
): boolean {
  const parts = handler === undefined ? chain : [...chain, handler];
  if (parts.some(readsCookieCredential)) return false;
  return parts.some(
    (part) =>
      isBearerGuard(part, jwtBindings) || readsAuthorizationHeader(part),
  );
}
