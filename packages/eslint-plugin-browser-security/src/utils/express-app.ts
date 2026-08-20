/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this receiver provably an Express application or router?
 *
 * The question three rules in this package skipped. `no-missing-csrf-protection`
 * asked only "is the method called `post`, `put`, `delete` or `patch`, with at
 * least two arguments?" — so it reported, at CVSS 8.8:
 *
 * ```js
 * axios.post('/api/orders', cart);   // an HTTP CLIENT call
 * queue.delete('job-1', opts);       // a job queue
 * cache.delete(key, { force: true }) // a cache
 * ```
 *
 * None of those is a route registration, and none of them can have CSRF
 * middleware attached. The method name was the entire verdict.
 *
 * What actually makes something a route registration is the identity of the
 * receiver, and that is knowable: an Express app comes from calling the
 * `express` module, and a router from its `Router` export. `resolveModuleBinding`
 * follows the binding back through imports, `require`, renames and
 * destructuring, so every spelling below resolves to the same evidence:
 *
 * ```js
 * import express from 'express';        const app = express();
 * const express = require('express');   const app = express();
 * const { Router } = require('express');const r = Router();
 * import express from 'express';        const r = express.Router();
 * ```
 *
 * A router received as a PARAMETER — `export default (app) => app.post(…)` —
 * deliberately does not resolve. Nothing in the file proves what was passed in,
 * and inventing that proof from the parameter's spelling is the defect this
 * helper exists to remove.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { isModuleBinding } from '@interlace/eslint-devkit';

/** Methods on an Express app/router that return a chainable router-like value. */
const ROUTER_RETURNING_METHODS: ReadonlySet<string> = new Set(['route', 'use']);

/**
 * Does `node` evaluate to an Express app or router?
 *
 * @param node - the receiver expression (`app` in `app.post(…)`)
 * @param scope - the scope the expression appears in
 */
export function isExpressAppOrRouter(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  seen: Set<TSESTree.Node> = new Set(),
): boolean {
  if (seen.has(node)) return false;
  seen.add(node);

  // `express()` — the app — or `express.Router()` / `Router()` — a router.
  if (node.type === 'CallExpression' || node.type === 'NewExpression') {
    const { callee } = node;
    if (isModuleBinding(callee, scope, 'express', [])) return true;
    if (isModuleBinding(callee, scope, 'express', ['Router'])) return true;

    // `app.route('/orders')` and `app.use(...)` both hand back something you
    // can keep registering routes on.
    if (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.property.type === 'Identifier' &&
      ROUTER_RETURNING_METHODS.has(callee.property.name)
    ) {
      return isExpressAppOrRouter(callee.object, scope, seen);
    }
    return false;
  }

  if (node.type !== 'Identifier') return false;

  // `const app = express()` — resolve the binding and ask again. Only a
  // single-write const/let says anything about what the name holds.
  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.variables.find((v) => v.name === node.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return false;
    const def = variable.defs[0];
    if (def.type !== 'Variable' || def.node.init === null) return false;
    if (variable.references.filter((ref) => ref.isWrite()).length > 1) return false;
    return isExpressAppOrRouter(def.node.init, scope, seen);
  }
  return false;
}

export interface ExpressRouteRegistration {
  /** The HTTP verb as written — `post`, `delete`, … */
  method: string;
  /**
   * The route-path argument, or `null` for the `app.route(path).post(handler)`
   * form where the path lives on the `.route(…)` call instead. Callers use it
   * to know where the handler list starts.
   */
  pathArg: TSESTree.CallExpressionArgument | null;
}

/**
 * Is this call an Express route registration — `app.<method>(path, …handlers)`
 * or `app.route(path).<method>(…handlers)`?
 *
 * Requires all three pieces of evidence at once: a proven Express receiver, a
 * method in `methods`, and a route path in the position Express puts it.
 * `axios.post('/api/orders', cart)` clears the last two and fails the first,
 * which is exactly the discrimination that was missing.
 */
export function asExpressRouteRegistration(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  methods: ReadonlySet<string>,
): ExpressRouteRegistration | null {
  const { callee } = node;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  const method = callee.property.name;
  if (!methods.has(method.toLowerCase())) return null;
  if (!isExpressAppOrRouter(callee.object, scope)) return null;

  // `app.route('/orders').post(handler)` — the path is already spent, so every
  // argument here is a handler.
  if (isRouteCall(callee.object)) {
    return node.arguments.length > 0 ? { method, pathArg: null } : null;
  }

  // The direct form is `(path, ...middleware, handler)`.
  if (node.arguments.length < 2) return null;
  if (!isRoutePath(node.arguments[0])) return null;
  return { method, pathArg: node.arguments[0] };
}

/** `<expressApp>.route(path)`. */
function isRouteCall(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'route'
  );
}

/**
 * `'/orders'`, `` `/orders/${id}` ``, `/^\/orders/`, `['/a', '/b']`.
 *
 * Express accepts all four. What it never accepts is a request body, which is
 * what sat in this position in every false positive: `axios.post(url, cart)`
 * has a variable path and an object payload.
 */
function isRoutePath(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'string' || node.value instanceof RegExp;
  }
  if (node.type === 'TemplateLiteral') return true;
  if (node.type === 'ArrayExpression') {
    return (
      node.elements.length > 0 &&
      node.elements.every((el) => el !== null && isRoutePath(el))
    );
  }
  return false;
}
