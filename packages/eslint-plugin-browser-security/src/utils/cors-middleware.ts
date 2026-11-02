/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The `cors` package and the request Origin header, identified the same way
 * by both CORS rules in this package.
 *
 * Both rules matched the callee's SPELLING — `node.callee.name === 'cors'` —
 * so `import corsMiddleware from 'cors'` configured the same wildcard
 * middleware unseen, while a local `function cors()` from some other module
 * was read as the package. The import is the evidence; the spelling only
 * decides when there is no binding at all (a global, a snippet).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  isModuleBinding,
  propertyName,
} from '@interlace/eslint-devkit';
import { resolveInitializer } from './resolve-binding';

/** Does `name` resolve to no declaration in this file? */
function isUnbound(
  node: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): boolean {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current !== null;
    current = current.upper
  ) {
    const variable = current.variables.find((v) => v.name === node.name);
    if (variable !== undefined) return variable.defs.length === 0;
  }
  return true;
}

/** Is this call the `cors` package's middleware factory, however it was imported? */
export function isCorsPackageCall(
  call: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const scope = sourceCode.getScope(call);
  if (isModuleBinding(call.callee, scope, 'cors', [])) return true;
  return (
    call.callee.type === AST_NODE_TYPES.Identifier &&
    call.callee.name === 'cors' &&
    isUnbound(call.callee, scope)
  );
}

/**
 * Does this expression read the REQUEST's Origin header directly?
 *
 * Reflecting the request origin is strictly worse than `'*'`, not milder: a
 * browser refuses to send credentials to a literal wildcard and sends them
 * happily to an origin the server echoed back. So `res.setHeader('Access-
 * Control-Allow-Origin', req.headers.origin)` disables the same-origin policy
 * for every attacker page at once.
 *
 * Only a DIRECT read counts. A conditional — `ALLOWED.has(o) ? o : 'null'` —
 * is an allowlist, and a rule that cannot tell the two apart reports the fix.
 */
export function readsRequestOrigin(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (propertyName(node)?.toLowerCase() !== 'origin') return false;

  // `<something>.headers.origin` — the receiver must be a `headers` bag.
  const receiver = node.object;
  return (
    receiver.type === AST_NODE_TYPES.MemberExpression &&
    // `req['headers'].origin` is the same bag as `req.headers.origin`.
    propertyName(receiver) === 'headers'
  );
}

/** `req.headers.origin`, or a `const` bound to it. */
export function holdsRequestOrigin(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (readsRequestOrigin(node)) return true;
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  const init = resolveInitializer(node, sourceCode);
  return init !== undefined && readsRequestOrigin(init);
}
