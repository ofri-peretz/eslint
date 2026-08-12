/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Evidence about *how a file composes an Express application*, as opposed to
 * `express-evidence.ts` which only answers "is there Express in this file".
 *
 * The whole-app rules (`require-helmet`, `require-rate-limiting`) and the
 * per-request rules (`require-csrf-protection`) all report the *absence* of a
 * control, and an absence claim is only sound when the file is the place the
 * control would have been written. These helpers are the preconditions that
 * make that true.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { walk } from './index';

/**
 * Does this node hand `binding` to a caller, an importer, or a parent scope?
 *
 * `require-helmet` already abstained on `setAppConfigurations(app)` — once the
 * app leaves the file its middleware stack is assembled out of view, so "no
 * helmet here" says nothing about the application. The same is true of the
 * three other ways an app or router leaves a module, and they are far more
 * common than the call form:
 *
 * ```js
 * module.exports = app;      // AssignmentExpression
 * export default router;     // ExportDefaultDeclaration
 * return router;             // ReturnStatement, the router-factory shape
 * ```
 *
 * Measured on the 8-repo corpus: two of the six `require-helmet` findings were
 * `const app = express(); module.exports = app;` — files whose entire purpose
 * is to be configured by their importer.
 */
export function nodeReleasesBinding(
  node: TSESTree.Node,
  binding: string,
): boolean {
  const isBinding = (n: TSESTree.Node | null | undefined): boolean =>
    n?.type === AST_NODE_TYPES.Identifier && n.name === binding;

  switch (node.type) {
    case AST_NODE_TYPES.CallExpression:
      return node.arguments.some(isBinding);
    case AST_NODE_TYPES.AssignmentExpression:
      return isBinding(node.right);
    case AST_NODE_TYPES.ExportDefaultDeclaration:
      return isBinding(node.declaration);
    default:
      return isBinding((node as TSESTree.ReturnStatement).argument);
  }
}

/** The selector the escape check is registered on, kept in one place. */
export const RELEASE_SELECTOR =
  'AssignmentExpression, ExportDefaultDeclaration, ReturnStatement' as const;

/**
 * Packages whose presence means the browser is carrying a credential to this
 * server on its own — the precondition for CSRF to exist at all.
 */
const CREDENTIAL_PACKAGES: ReadonlySet<string> = new Set([
  'cookie-parser',
  'express-session',
  'cookie-session',
  'client-sessions',
  'csurf',
  'csrf',
  'lusca',
  'passport',
]);

/** Request/response properties that only exist because a cookie was sent. */
const CREDENTIAL_MEMBERS: ReadonlySet<string> = new Set([
  'session',
  'cookies',
  'signedCookies',
  'cookie',
  'clearCookie',
]);

/** Receivers whose credential properties count. */
const CREDENTIAL_RECEIVER = /^(req|request|res|response)$/i;

function specifierRoot(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isCredentialModuleLoad(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.ImportDeclaration &&
    typeof node.source.value === 'string'
  ) {
    return CREDENTIAL_PACKAGES.has(specifierRoot(node.source.value));
  }
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'require'
  ) {
    const [arg] = node.arguments;
    return (
      arg?.type === AST_NODE_TYPES.Literal &&
      typeof arg.value === 'string' &&
      CREDENTIAL_PACKAGES.has(specifierRoot(arg.value))
    );
  }
  return false;
}

function isCredentialMember(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  // `req[config.session.name]` is a computed lookup on a *config* object, not
  // a session read. auth0/express-openid-connect writes exactly that, and a
  // property-name match that ignored `computed` read it as cookie evidence.
  if (node.computed || node.property.type !== AST_NODE_TYPES.Identifier) {
    return false;
  }
  if (!CREDENTIAL_MEMBERS.has(node.property.name)) return false;
  return (
    node.object.type === AST_NODE_TYPES.Identifier &&
    CREDENTIAL_RECEIVER.test(node.object.name)
  );
}

/**
 * Is there ambient credential material in this file?
 *
 * CSRF is not "a POST without a token". It is *the browser attaching a
 * credential the attacker cannot read but can cause to be sent*. With no
 * cookie and no session anywhere — a bearer-token API, an OAuth callback, a
 * form-post demo — a cross-site request carries no authority and the control
 * has nothing to protect. Over the 8-repo corpus, **36 of 38**
 * `require-csrf-protection` findings were in files with no cookie or session
 * in them at all.
 */
export function fileHasAmbientCredentials(ast: TSESTree.Program): boolean {
  let found = false;
  walk(ast, (node) => {
    if (found) return;
    if (isCredentialModuleLoad(node) || isCredentialMember(node)) found = true;
  });
  return found;
}

/** Responders that put a *document* in front of a browser. */
const DOCUMENT_RESPONDERS: ReadonlySet<string> = new Set([
  'render',
  'sendFile',
]);

/**
 * Does this app return HTML documents to a browser?
 *
 * Helmet's distinctive headers — CSP, `X-Frame-Options`, referrer policy,
 * `X-XSS-Protection` — are instructions to a *renderer*. They are inert on a
 * response nothing renders. The two headers that do apply to a machine client,
 * HSTS and `X-Content-Type-Options`, are owned by
 * `require-strict-transport-security` and `no-disabled-helmet-protections`, so
 * gating this rule on document evidence removes a duplicate finding rather
 * than a unique one.
 *
 * Evidence is `res.render(…)` / `res.sendFile(…)`, or a configured view engine
 * (`app.set('view engine', …)` / `app.engine(…)`).
 *
 * `res.send(…)` is deliberately **not** evidence: it is the generic responder
 * for JSON, text and buffers, and telling a document from a payload would mean
 * reading the argument's contents — shape, not meaning.
 */
export function servesBrowserDocuments(ast: TSESTree.Program): boolean {
  let found = false;
  walk(ast, (node) => {
    if (found) return;
    if (node.type !== AST_NODE_TYPES.CallExpression) return;
    const callee = node.callee;
    if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
    if (callee.property.type !== AST_NODE_TYPES.Identifier) return;
    const name = callee.property.name;
    if (DOCUMENT_RESPONDERS.has(name) || name === 'engine') {
      found = true;
      return;
    }
    if (name !== 'set') return;
    const [key] = node.arguments;
    found =
      key?.type === AST_NODE_TYPES.Literal &&
      typeof key.value === 'string' &&
      key.value.toLowerCase().startsWith('view ');
  });
  return found;
}
