/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Structural helpers shared by every rule in this plugin.
 *
 * Each one answers a question from the AST shape alone — which function a call
 * targets, which keys an options object declares, whether a value is read out
 * of the request body — so that renaming every variable to `foo`/`bar` changes
 * none of the answers.
 */

import {
  AST_NODE_TYPES,
  identifierWords,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/** The four text/object generators that take a prompt and an options object. */
export const AI_SDK_CALLS: readonly string[] = [
  'generateText',
  'streamText',
  'generateObject',
  'streamObject',
];

/**
 * The exact name a call targets: `f()` → `f`, `ai.f()` / `ai['f']()` → `f`.
 *
 * Exact, never a substring. `callee.includes('generateText')` made every rule
 * treat `generateTextureAtlas({...})` as an SDK call.
 */
export function calleeName(callee: TSESTree.Node): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type === AST_NODE_TYPES.MemberExpression)
    return propertyName(callee);
  return null;
}

/** The SDK function `node` calls, if it calls one of `names` by exact name. */
export function sdkCallName(
  node: TSESTree.CallExpression,
  names: readonly string[] = AI_SDK_CALLS,
): string | null {
  const name = calleeName(node.callee);
  return name !== null && names.includes(name) ? name : null;
}

/**
 * Does this options object declare one of `keys`?
 *
 * A spread (`{ ...LIMITS, prompt }`) contributes keys this rule cannot see, so
 * it answers `true`: a `require-*` rule that cannot prove a setting is absent
 * stays silent rather than demanding something the spread may already supply.
 */
export function declaresOption(
  options: TSESTree.ObjectExpression,
  keys: readonly string[],
): boolean {
  return options.properties.some((prop) =>
    prop.type === AST_NODE_TYPES.SpreadElement
      ? true
      : keys.includes(objectKeyName(prop) as string),
  );
}

/** The value of the first property named `key`, or `undefined`. */
export function optionValue(
  options: TSESTree.ObjectExpression,
  key: string,
): TSESTree.Node | undefined {
  for (const prop of options.properties) {
    if (prop.type === AST_NODE_TYPES.Property && objectKeyName(prop) === key) {
      return prop.value;
    }
  }
  return undefined;
}

/** Strip `await`, `x as T`, `x!` and `x satisfies T` — none of them change the value. */
export function unwrap(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.AwaitExpression ||
    current.type === AST_NODE_TYPES.TSAsExpression ||
    current.type === AST_NODE_TYPES.TSNonNullExpression ||
    current.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    current =
      current.type === AST_NODE_TYPES.AwaitExpression
        ? current.argument
        : current.expression;
  }
  return current;
}

/** Find the variable `name` resolves to from `scope`. */
export function lookupVariable(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable) return variable;
  }
  return undefined;
}

/** Is `node` an identifier naming a parameter of an enclosing function? */
function isParameter(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  return lookupVariable(node.name, scope)?.defs[0]?.type === 'Parameter';
}

/**
 * The request body itself: `await req.json()`, `await req.formData()`,
 * `await req.text()`, or `req.body` — where `req` is a parameter of the
 * enclosing function, i.e. the route handler's request — or a query-string
 * read, `searchParams.get(...)`.
 */
function isRequestBody(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const target = unwrap(node);
  if (target.type === AST_NODE_TYPES.CallExpression) {
    const callee = target.callee;
    if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
    const method = propertyName(callee) as string;
    // `url.searchParams.get('q')` / `req.nextUrl.searchParams.get('q')` — the
    // query string is the caller's, whatever URL object it hangs off.
    if (
      (method === 'get' || method === 'getAll') &&
      callee.object.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(callee.object) === 'searchParams'
    ) {
      return true;
    }
    return (
      ['json', 'formData', 'text'].includes(method) &&
      isParameter(callee.object, scope)
    );
  }
  return (
    target.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(target) === 'body' &&
    isParameter(target.object, scope)
  );
}

/**
 * Is this value read straight out of the request body?
 *
 * Structural, one declaration deep, same function:
 *   - `req.body.system`, `(await req.json()).system`
 *   - `const { system } = await req.json(); … system`
 *   - `const body = await req.json(); … body.system`
 *   - a template, `+` concatenation or `??` / `||` fallback containing any of the above
 *
 * It does not follow a value through a second assignment
 * (`const persona = body.persona`) — that is data flow, not shape.
 */
export function isRequestDerived(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const target = unwrap(node);
  if (target.type === AST_NODE_TYPES.TemplateLiteral) {
    return target.expressions.some((expr) => isRequestDerived(expr, scope));
  }
  if (
    target.type === AST_NODE_TYPES.BinaryExpression ||
    target.type === AST_NODE_TYPES.LogicalExpression
  ) {
    return (
      isRequestDerived(target.left, scope) ||
      isRequestDerived(target.right, scope)
    );
  }
  if (target.type === AST_NODE_TYPES.MemberExpression) {
    return (
      isRequestBody(target, scope) || isRequestDerived(target.object, scope)
    );
  }
  if (target.type !== AST_NODE_TYPES.Identifier)
    return isRequestBody(target, scope);
  const def = lookupVariable(target.name, scope)?.defs[0];
  if (def?.type !== 'Variable' || def.node.init === null) return false;
  // One declaration deep: the initialiser must read the request itself
  // (`?? ''` / `|| ''` defaults allowed), not another variable.
  const init = unwrap(def.node.init);
  return init.type === AST_NODE_TYPES.LogicalExpression
    ? isRequestBody(init.left, scope)
    : isRequestBody(init, scope);
}

/** `new Date(...)`, `Date.now()`, or a method called on either (`new Date().toISOString()`). */
function isDateValue(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.NewExpression) {
    return (
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'Date'
    );
  }
  if (
    node.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.MemberExpression
  ) {
    return false;
  }
  const receiver = node.callee.object;
  return (
    (receiver.type === AST_NODE_TYPES.Identifier && receiver.name === 'Date') ||
    isDateValue(receiver)
  );
}

/**
 * Text fixed by the source code itself: literals, templates and `+` chains of
 * literals, `const` bindings whose initialiser is one of those, and the
 * current date. Nothing here can carry a caller's input.
 */
export function isStaticText(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  resolving: Set<TSESLint.Scope.Variable> = new Set(),
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return true;
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.every((expr) =>
        isStaticText(expr, scope, resolving),
      );
    case AST_NODE_TYPES.BinaryExpression:
      return (
        node.operator === '+' &&
        isStaticText(node.left, scope, resolving) &&
        isStaticText(node.right, scope, resolving)
      );
    case AST_NODE_TYPES.Identifier: {
      const variable = lookupVariable(node.name, scope);
      const def = variable?.defs[0];
      // `resolving` holds the bindings on the current path only, so a
      // self-referential initialiser terminates without blocking a constant
      // that is legitimately read twice.
      if (
        def?.type !== 'Variable' ||
        def.parent.kind !== 'const' ||
        def.node.init === null ||
        resolving.has(variable as TSESLint.Scope.Variable)
      ) {
        return false;
      }
      resolving.add(variable as TSESLint.Scope.Variable);
      const result = isStaticText(def.node.init, scope, resolving);
      resolving.delete(variable as TSESLint.Scope.Variable);
      return result;
    }
    default:
      return isDateValue(node);
  }
}

export { isDateValue };

/**
 * Does `name` END with the whole words of `term`? English camelCase puts the
 * head noun last: `userInput` and `searchQuery` are an input and a query;
 * `inputTokens` and `queryTimeout` are tokens and a timeout.
 */
export function nameEndsWithWords(name: string, term: string): boolean {
  const words = identifierWords(name);
  const tail = identifierWords(term);
  const offset = words.length - tail.length;
  return offset >= 0 && tail.every((word, i) => words[offset + i] === word);
}

/**
 * The names along a call chain, root first:
 * `supabase.from('t').select` → `supabase.from.select`,
 * `(await store.search(q)).filter` → `store.search.filter`.
 * Unnameable links (`o[k]`) contribute an empty segment; a non-identifier
 * root (`this`, `new X()`) contributes nothing.
 */
export function calleeChain(callee: TSESTree.Node): string {
  const parts: string[] = [];
  let current = unwrap(callee);
  while (
    current.type === AST_NODE_TYPES.MemberExpression ||
    current.type === AST_NODE_TYPES.CallExpression
  ) {
    if (current.type === AST_NODE_TYPES.MemberExpression) {
      parts.unshift(propertyName(current) ?? '');
      current = unwrap(current.object);
    } else {
      current = unwrap(current.callee);
    }
  }
  if (current.type === AST_NODE_TYPES.Identifier) parts.unshift(current.name);
  return parts.join('.');
}
