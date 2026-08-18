/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Does a callee evaluate to the intrinsic `RegExp` constructor?
 *
 * Extracted from `detect-non-literal-regexp` on 2026-08-18 because the
 * adversarial wave for `no-redos-vulnerable-regex` found the two rules
 * disagreeing about the same expression. One automaton — `/(x+x+)+y/`, measured
 * exponential — reached by fifteen spellings; `no-redos-vulnerable-regex`
 * matched thirteen and went quiet on exactly the two that this resolver was
 * written for:
 *
 *   const R = RegExp; new R('(x+x+)+y')      // native-constructor capture
 *   new globalThis.RegExp('(x+x+)+y')        // the bundler-safe spelling
 *
 * Both are real library idiom — capturing the native constructor survives a
 * patched global, and `globalThis.` survives a bundler that shadows the bare
 * name — and both compile the identical pattern. A sibling rule already knowing
 * this while the other does not is the failure that a shared resolver removes:
 * a new spelling is now learned once, by both.
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

/**
 * Global namespace objects that hold the intrinsic `RegExp`.
 *
 * @protocol-constant Exact membership against a closed set of language-defined
 * names — not a substring test on a spelling. Renaming every identifier in a
 * file changes nothing about which of these is the global object.
 */
const GLOBAL_NAMESPACES: ReadonlySet<string> = new Set(['globalThis', 'global', 'window', 'self']);

/** Resolve a name to its variable through the scope chain, or null. */
function resolveVariable(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | null {
  for (let current = scope; current !== null; current = current.upper) {
    const variable = current.set.get(name) ?? null;
    if (variable !== null) {
      return variable;
    }
  }
  return null;
}

/**
 * Is this name the environment's binding rather than one this file declares?
 *
 * `function render(RegExp) { new RegExp(p) }` calls a parameter, not the
 * intrinsic; treating it as the constructor would report code that never
 * compiles a pattern. A global-scope entry carrying no definition belongs to the
 * environment, so it counts.
 */
function isEnvironmentGlobal(name: string, scope: TSESLint.Scope.Scope | null): boolean {
  const variable = resolveVariable(name, scope);
  return variable === null || variable.defs.length === 0;
}

/**
 * Resolved through the scope chain, so the answer depends on what the binding
 * IS, never on what it is called.
 */
export function isRegExpConstructor(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): boolean {
  // A chain of aliases longer than this is not real code; refusing it keeps a
  // cyclic `const a = b; const b = a` from recursing.
  if (depth > 4) {
    return false;
  }

  if (node.type === 'MemberExpression') {
    return (
      !node.computed &&
      node.property.type === 'Identifier' &&
      node.property.name === 'RegExp' &&
      node.object.type === 'Identifier' &&
      GLOBAL_NAMESPACES.has(node.object.name) &&
      isEnvironmentGlobal(node.object.name, sourceCode.getScope(node.object))
    );
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  if (node.name === 'RegExp' && isEnvironmentGlobal(node.name, sourceCode.getScope(node))) {
    return true;
  }

  // `const NativeRegExp = RegExp` — one declaration, never rewritten, so the
  // binding provably holds the intrinsic.
  const variable = resolveVariable(node.name, sourceCode.getScope(node));
  if (variable === null || variable.defs.length !== 1) {
    return false;
  }
  const definition = variable.defs[0]!;
  if (definition.type !== 'Variable' || definition.parent.kind !== 'const') {
    return false;
  }
  const init = definition.node.init;
  return init !== null && isRegExpConstructor(init, sourceCode, depth + 1);
}
