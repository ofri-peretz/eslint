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

/**
 * Resolve a name to its variable through the scope chain, or null.
 *
 * Exported because `detect-non-literal-regexp` asks the same question in two
 * other places. Two copies of a scope walk is how the two regex rules came to
 * disagree about which spellings reach the intrinsic in the first place.
 */
export function resolveVariable(
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
export function isEnvironmentGlobal(name: string, scope: TSESLint.Scope.Scope | null): boolean {
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

  // `class My extends RegExp {}` — every `new My(p)` runs the intrinsic's
  // constructor on p. Found by an adversarial wave on 2026-08-19; both regex
  // rules were silent on it, and neither corpus contained the shape.
  if (definition.type === 'ClassName') {
    const superClass = definition.node.superClass;
    return superClass != null && isRegExpConstructor(superClass, sourceCode, depth + 1);
  }

  if (definition.type !== 'Variable' || definition.parent.kind !== 'const') {
    return false;
  }

  // `const { RegExp: R } = globalThis` — the binding holds the intrinsic just as
  // surely as `const R = RegExp`, but the initialiser is the NAMESPACE, so
  // recursing straight into it asks "is globalThis the RegExp constructor" and
  // correctly answers no. The property key is where the answer lives.
  //
  // Same wave, same day. This is the bundler-safe spelling's destructured form,
  // and it is real idiom in code that captures intrinsics before a sandbox can
  // replace them.
  if (definition.node.id.type === 'ObjectPattern') {
    const namespace = definition.node.init;
    if (namespace === null || namespace.type !== 'Identifier') {
      return false;
    }
    if (!GLOBAL_NAMESPACES.has(namespace.name) || !isEnvironmentGlobal(namespace.name, sourceCode.getScope(namespace))) {
      return false;
    }
    return definition.node.id.properties.some(
      (property) =>
        property.type === 'Property' &&
        !property.computed &&
        property.key.type === 'Identifier' &&
        property.key.name === 'RegExp' &&
        property.value.type === 'Identifier' &&
        property.value.name === node.name,
    );
  }

  const init = definition.node.init;
  return init !== null && isRegExpConstructor(init, sourceCode, depth + 1);
}

/**
 * `Reflect.construct(RegExp, [pattern, flags])` — the same construction, spelled
 * so that neither rule's `node.callee` check can see it.
 *
 * Both regex rules ask whether the CALLEE resolves to the intrinsic. Here the
 * callee is `Reflect.construct` and the intrinsic is an ARGUMENT, so both were
 * silent. Found by an adversarial wave on 2026-08-19; it is the spelling a
 * proxy or polyfill reaches for, and it compiles a pattern like any other.
 *
 * Returns a node that presents the construction in the shape the rules already
 * understand: same `loc` and `range`, so the finding still lands on the whole
 * `Reflect.construct(...)` call, with `callee` set to the intrinsic and
 * `arguments` to the array's elements. A spread rather than a fresh object, so
 * `parent` and everything else the rules read survives.
 *
 * Returns null when the node is anything else, including
 * `Reflect.construct(Other, [...])` and a call whose argument list is built at
 * runtime — `Reflect.construct(RegExp, args)` has no visible elements, and
 * inventing some would be guessing.
 */
export function asDirectConstruction<T extends TSESTree.CallExpression | TSESTree.NewExpression>(
  node: T,
  sourceCode: TSESLint.SourceCode,
): T {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier' ||
    node.callee.property.name !== 'construct' ||
    node.callee.object.type !== 'Identifier' ||
    node.callee.object.name !== 'Reflect' ||
    !isEnvironmentGlobal(node.callee.object.name, sourceCode.getScope(node.callee.object))
  ) {
    return node;
  }

  const [target, argsArray] = node.arguments;
  if (target === undefined || !isRegExpConstructor(target, sourceCode)) {
    return node;
  }
  if (argsArray === undefined || argsArray.type !== 'ArrayExpression') {
    return node;
  }

  return {
    ...node,
    callee: target,
    arguments: argsArray.elements.filter((element) => element !== null),
  } as unknown as T;
}
