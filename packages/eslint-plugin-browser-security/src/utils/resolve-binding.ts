/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/**
 * The expression a variable was initialised with, resolved through **scope**.
 *
 * Two rules in this package used to answer this by scanning up to ten sibling
 * statements backwards and comparing `sourceCode.getText()` against a regex.
 * That is wrong twice over: it misses any declaration further away or in an
 * enclosing scope, and it happily matches a *different* variable of the same
 * name from an unrelated block.
 *
 * Returns `undefined` unless the name resolves to exactly one `const`/`let`
 * declaration with an initialiser AND is never written again. A parameter, an
 * import, a re-assigned binding or a shadowed name has no single knowable
 * value, and guessing one is how a rule ends up reporting something it cannot
 * justify — `let t = location.hash; t = '/safe';` reads as tainted right up
 * until you notice the second line.
 */
export function resolveInitializer(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Expression | undefined {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return undefined;
    const def = variable.defs[0];
    if (def.type !== 'Variable') return undefined;
    // The initialiser is itself a write; a second one means the binding no
    // longer holds what it was declared with.
    if (variable.references.filter((ref) => ref.isWrite()).length > 1) {
      return undefined;
    }
    // A name bound by a PATTERN holds one PIECE of the initialiser, not the
    // initialiser — so returning `init` here is imprecise, and it was reported as
    // the root cause of an `origin` false positive. Refusing to resolve patterns
    // was tried and is WRONG: it costs a real detection,
    // `const [params] = useSearchParams(); window.open(params.get('next'))`, where
    // element 0 genuinely carries the taint. Destructuring propagates taint; that
    // is the common case, and the general resolver must not break it.
    //
    // The `origin` case is not a resolution bug at all — it is rule semantics.
    // `new URL(x)` is a container: what is READ OUT of it decides steerability,
    // and `origin` is precisely the part that is not. That belongs in `url-taint`,
    // which is where it now lives, not in a helper that only knows about bindings.
    return def.node.init ?? undefined;
  }
  return undefined;
}

/**
 * The string a key expression is *actually* known to be.
 *
 * A bare identifier's spelling is the weakest possible evidence about the
 * value it holds — `STATE_HANDLE_SESSION_STORAGE_KEY` is named after the
 * storage API it is used with, not after anything sensitive it contains.
 * Resolve first; fall back to the spelling only when the binding is genuinely
 * unknowable.
 */
export function resolveStringKey(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type !== 'Identifier') {
    return null;
  }
  const init = resolveInitializer(node, sourceCode);
  if (
    init !== undefined &&
    init.type === 'Literal' &&
    typeof init.value === 'string'
  ) {
    return init.value;
  }
  return node.name;
}
