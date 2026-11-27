/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a revocation can hide that is not `URL.revokeObjectURL(thatVariable)`.
 *
 * The rule pairs a creation with a revoke of the same binding or the same
 * property path. Real code releases an object URL through four other routes,
 * each provable from the file, and each reported as a leak before:
 *
 *   1. a collection that holds the URL, with a loop or callback elsewhere that
 *      revokes every member (`cache.set(k, url)` ... `for (const u of cache)`);
 *   2. a React state setter whose state variable is the one revoked in the
 *      cleanup (`setPreview(url)` ... `URL.revokeObjectURL(preview)`);
 *   3. a function in this file that revokes the argument it is handed
 *      (`release(url)` ... `function release(u) { URL.revokeObjectURL(u) }`);
 *   4. an alias of a property path (`const u = ref.current; revoke(u)`).
 *
 * Everything here resolves bindings through scope; none of it reads a name for
 * meaning. A route that cannot be proven leaves the creation reported.
 *
 * @source tldraw useLocalStore.ts (cache, route 1), bearstudio/start-ui-web
 *         (state, route 2), triliumnext/trilium print_preview.tsx (alias, 4).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';

export type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression
  | TSESTree.FunctionDeclaration;

/**
 * @vocabulary The ECMAScript collection methods that take a member in, by
 * position or key: `Map.prototype.set`, `Set.prototype.add`,
 * `Array.prototype.push` and `unshift`.
 */
export const COLLECTION_ADDERS: ReadonlySet<string> = new Set([
  'set',
  'add',
  'push',
  'unshift',
]);

/**
 * @vocabulary The ECMAScript methods that enumerate the collection they are
 * called on: `Map`, `Set` and `Array` iterators.
 */
const ENUMERATING_METHODS: ReadonlySet<string> = new Set([
  'values',
  'entries',
  'keys',
]);

/**
 * @vocabulary The ECMAScript static enumerators that take the collection as
 * their argument: `Object.values`, `Object.entries` and `Array.from`.
 */
const ENUMERATING_STATICS: ReadonlySet<string> = new Set([
  'values',
  'entries',
  'from',
]);

/**
 * @vocabulary The `Array.prototype` methods that hand a callback each member
 * of the receiver.
 */
const MEMBER_VISITORS: ReadonlySet<string> = new Set([
  'forEach',
  'map',
  'filter',
  'some',
]);

/**
 * The variable an identifier names, searching outward through scope, when the
 * file defines it exactly once. A name the environment declares has no
 * definition here, and a name declared twice has no single meaning.
 */
export function variableOf(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESLint.Scope.Variable | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const found = scope.variables.find((v) => v.name === identifier.name);
    if (found !== undefined) return found.defs.length === 1 ? found : null;
  }
  return null;
}

/**
 * The collection a loop or callback ranges over, peeled of the wrappers that
 * still enumerate its members: `.values()`, `Object.values(x)`, `Array.from(x)`.
 */
export function enumeratedCollection(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.CallExpression &&
    current.callee.type === AST_NODE_TYPES.MemberExpression
  ) {
    // A computed method names nothing (`null`), which no set contains.
    const method = propertyName(current.callee) as string;
    const receiver = current.callee.object;
    // Only an identifier has a `name`; any other receiver reads `undefined`.
    const globalName = (receiver as TSESTree.Identifier).name;
    const isStatic = globalName === 'Object' || globalName === 'Array';
    const members = isStatic ? ENUMERATING_STATICS : ENUMERATING_METHODS;
    if (!members.has(method)) break;
    // `Object.values()` with no argument enumerates nothing.
    const next = isStatic ? current.arguments[0] : receiver;
    if (next === undefined) break;
    current = next;
  }
  return current;
}

/**
 * What this variable ranges over, when it is a loop variable or the parameter
 * of a callback handed to `forEach` and friends.
 */
export function rangesOver(
  variable: TSESLint.Scope.Variable,
): TSESTree.Node | null {
  const def = variable.defs[0];
  if (def.type === 'Variable') {
    // The declaration of `for (const u of x)` is the loop's own `left`.
    const loop = def.node.parent.parent;
    return loop.type === AST_NODE_TYPES.ForOfStatement ? loop.right : null;
  }
  if (def.type !== 'Parameter') return null;
  const call = def.node.parent;
  return call.type === AST_NODE_TYPES.CallExpression &&
    call.callee.type === AST_NODE_TYPES.MemberExpression &&
    MEMBER_VISITORS.has(propertyName(call.callee) as string)
    ? call.callee.object
    : null;
}

/**
 * The position of the parameter this variable is. A destructured parameter
 * has no position of its own: `-1` matches no argument.
 */
export function parameterIndex(
  variable: TSESLint.Scope.Variable,
): { fn: FunctionNode; index: number } | null {
  const def = variable.defs[0];
  if (def.type !== 'Parameter') return null;
  const fn = def.node as FunctionNode;
  const index = fn.params.findIndex(
    (param) =>
      param === def.name ||
      (param as TSESTree.AssignmentPattern).left === def.name,
  );
  return { fn, index };
}

/**
 * The expression a binding was initialised with, when it is written exactly
 * once: `const u = ref.current` aliases the path `ref.current`.
 */
export function aliasedExpression(
  variable: TSESLint.Scope.Variable,
): TSESTree.Expression | null {
  const def = variable.defs[0];
  return def.type === 'Variable' &&
    variable.references.filter((ref) => ref.isWrite()).length === 1
    ? def.node.init
    : null;
}

/** The function a call reaches by name, when this file defines it. */
export function calledFunction(
  call: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): FunctionNode | null {
  const variable = variableOf(call.callee as TSESTree.Identifier, sourceCode);
  if (variable === null) return null;
  const def = variable.defs[0];
  if (def.type === 'FunctionName') return def.node as FunctionNode;
  // Only a function is ever a key of the helper map, so an initialiser that is
  // anything else (or no initialiser at all) matches nothing.
  return (def.node as TSESTree.VariableDeclarator).init as FunctionNode | null;
}

/**
 * The state variable a `useState` setter writes, when `setter` is the second
 * element of `const [state, setter] = useState(...)` and `useState` is an
 * import. Resolved through the import binding, not by the hook's spelling.
 */
export function stateOfSetter(
  setter: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode,
): TSESLint.Scope.Variable | null {
  const def = setter.defs[0];
  if (def.type !== 'Variable') return null;
  const { id, init } = def.node;
  if (
    id.type !== AST_NODE_TYPES.ArrayPattern ||
    id.elements[1] !== def.name ||
    id.elements[0]?.type !== AST_NODE_TYPES.Identifier ||
    init?.type !== AST_NODE_TYPES.CallExpression
  ) {
    return null;
  }
  // `useState(...)` names the import itself; `React.useState(...)` reaches it
  // through the namespace.
  const hook = init.callee;
  const namespace =
    hook.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(hook) === 'useState'
      ? hook.object
      : null;
  const root = hook.type === AST_NODE_TYPES.Identifier ? hook : namespace;
  const imported =
    root?.type === AST_NODE_TYPES.Identifier
      ? variableOf(root, sourceCode)?.defs[0]
      : undefined;
  if (imported?.type !== 'ImportBinding') return null;
  // A default or namespace import has no `imported` name: its text is the
  // whole file, which is never `useState`.
  const importedName = sourceCode.getText(
    (imported.node as TSESTree.ImportSpecifier).imported,
  );
  if (namespace === null && importedName !== 'useState') return null;
  return variableOf(id.elements[0], sourceCode);
}
