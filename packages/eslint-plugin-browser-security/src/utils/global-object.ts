/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which browser global does this expression name?
 *
 * `localStorage` and `window.localStorage` are the same object. Four rules in
 * this package only matched the bare identifier, so a codebase that spells the
 * global out — which is what every lint rule about implicit globals asks you to
 * do, and what TypeScript's `lib.dom` examples use — was invisible to them:
 *
 * ```js
 * localStorage.setItem('access_token', jwt);         // reported
 * window.localStorage.setItem('access_token', jwt);  // silent
 * globalThis.localStorage.setItem('access_token', jwt); // silent
 * self.sessionStorage.setItem('password', pw);       // silent
 * ```
 *
 * The three aliases are the ones that actually denote the global object in a
 * browser or worker: `window` (document context), `self` (both, and the only
 * one available inside a Worker) and `globalThis` (the standard spelling).
 * `top` and `parent` are deliberately absent — they name a DIFFERENT window,
 * and reading storage off them is a cross-origin access, not the same sink.
 *
 * Exact membership against a closed set of global names, never a substring
 * test: `myLocalStorageWrapper` is not `localStorage`.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { namesOneOf, propertyName } from '@interlace/eslint-devkit';

const GLOBAL_ALIASES: ReadonlySet<string> = new Set([
  'window',
  'self',
  'globalThis',
]);

/**
 * The global's name if `node` denotes one of `names`, otherwise `null`.
 *
 * Accepts the bare identifier and one level of qualification. A second level
 * (`window.self.localStorage`) is not accepted — it is not a spelling anybody
 * writes, and accepting it would be unreachable code dressed up as generality.
 *
 * @param node - the expression to identify (`window.localStorage`)
 * @param names - the closed set of global names to accept
 */
export function resolveGlobalObject(
  node: TSESTree.Node,
  names: ReadonlySet<string>,
): string | null {
  if (node.type === 'Identifier') {
    return names.has(node.name) ? node.name : null;
  }
  if (
    node.type === 'MemberExpression' &&
    namesOneOf(propertyName(node), names) &&
    node.object.type === 'Identifier' &&
    GLOBAL_ALIASES.has(node.object.name)
  ) {
    // The membership test above resolved this name; returning the same
    // call keeps `string | null` — which is exactly this function's
    // contract — instead of casting the absent case out of sight.
    return propertyName(node);
  }
  return null;
}

/** Convenience predicate for callers that do not need the matched name. */
export function isGlobalObject(
  node: TSESTree.Node,
  names: ReadonlySet<string>,
): boolean {
  return resolveGlobalObject(node, names) !== null;
}
