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
 *      (`dispose(url)` ... `function dispose(u) { URL.revokeObjectURL(u) }`);
 *   4. an alias of a property path (`const u = ref.current; revoke(u)`).
 *
 * Everything here resolves bindings through scope; none of it reads a name for
 * meaning. A route that cannot be proven leaves the creation reported.
 *
 * @source tldraw useLocalStore.ts (cache, route 1), bearstudio/start-ui-web
 *         (state, route 2), triliumnext/trilium print_preview.tsx (alias, 4).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

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

/** The variable an identifier names, searching outward through scope. */
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
    if (found !== undefined) return found;
  }
  return null;
}

/**
 * The collection a loop or callback ranges over, peeled of the wrappers that
 * still enumerate its members: `.values()`, `Object.values(x)`, `[...x]`.
 */
export function enumeratedCollection(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  for (;;) {
    if (
      current.type === AST_NODE_TYPES.CallExpression &&
      current.callee.type === AST_NODE_TYPES.MemberExpression
    ) {
      // A computed method names nothing (`null`), which no list contains.
      const method = propertyName(current.callee) as string;
      const receiver = current.callee.object;
      const isStatic =
        receiver.type === AST_NODE_TYPES.Identifier &&
        (receiver.name === 'Object' || receiver.name === 'Array');
      // `Object.values(x)`, `Object.entries(x)`, `Array.from(x)` enumerate `x`.
      if (isStatic && ENUMERATING_STATICS.has(method) && current.arguments[0]) {
        current = current.arguments[0];
        continue;
      }
      // `x.values()`, `x.entries()`, `x.keys()` enumerate `x`.
      if (!isStatic && ENUMERATING_METHODS.has(method)) {
        current = receiver;
        continue;
      }
    }
    if (
      current.type === AST_NODE_TYPES.ArrayExpression &&
      current.elements.length === 1 &&
      current.elements[0]?.type === AST_NODE_TYPES.SpreadElement
    ) {
      current = current.elements[0].argument;
      continue;
    }
    return current;
  }
}

/**
 * What this variable ranges over, when it is a loop variable or the parameter
 * of a callback handed to `forEach` and friends.
 */
export function rangesOver(
  variable: TSESLint.Scope.Variable,
): TSESTree.Node | null {
  // A variable the environment declares has no definition in this file.
  const def = variable.defs[0] as TSESLint.Scope.Definition | undefined;
  if (def?.type === 'Variable') {
    const declaration = def.node.parent;
    const loop = declaration.parent;
    return loop?.type === AST_NODE_TYPES.ForOfStatement &&
      loop.left === declaration
      ? loop.right
      : null;
  }
  if (def?.type !== 'Parameter') return null;
  const fn = def.node as FunctionNode;
  const call = fn.parent;
  if (
    call?.type !== AST_NODE_TYPES.CallExpression ||
    call.callee.type !== AST_NODE_TYPES.MemberExpression ||
    !MEMBER_VISITORS.has(propertyName(call.callee) as string) ||
    !(call.arguments as TSESTree.Node[]).includes(fn)
  ) {
    return null;
  }
  return call.callee.object;
}

/** The position of the parameter this variable is, if it is a plain one. */
export function parameterIndex(
  variable: TSESLint.Scope.Variable,
): { fn: FunctionNode; index: number } | null {
  const def = variable.defs[0] as TSESLint.Scope.Definition | undefined;
  if (def?.type !== 'Parameter') return null;
  const fn = def.node as FunctionNode;
  const index = fn.params.findIndex(
    (param) =>
      param === def.name ||
      (param.type === AST_NODE_TYPES.AssignmentPattern &&
        param.left === def.name),
  );
  return index === -1 ? null : { fn, index };
}

/** The function a call reaches, when this file defines it. */
export function calledFunction(
  call: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): FunctionNode | null {
  const callee = call.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    const variable = variableOf(callee, sourceCode);
    // A name the environment declares has no definition in this file.
    const def = variable?.defs[0] as TSESLint.Scope.Definition | undefined;
    if (variable?.defs.length !== 1) return null;
    if (def?.type === 'FunctionName') return def.node as FunctionNode;
    const init = def?.type === 'Variable' ? def.node.init : null;
    return init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      init?.type === AST_NODE_TYPES.FunctionExpression
      ? init
      : null;
  }
  // `this.dispose(url)`: a member of the class this call is written in.
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.object.type !== AST_NODE_TYPES.ThisExpression
  ) {
    return null;
  }
  const name = propertyName(callee);
  let owner: TSESTree.Node | null | undefined = call.parent;
  while (owner != null && owner.type !== AST_NODE_TYPES.ClassBody) {
    owner = owner.parent;
  }
  if (owner == null) return null;
  for (const member of (owner as TSESTree.ClassBody).body) {
    if (
      (member.type === AST_NODE_TYPES.MethodDefinition ||
        member.type === AST_NODE_TYPES.PropertyDefinition) &&
      objectKeyName(member) === name &&
      (member.value?.type === AST_NODE_TYPES.FunctionExpression ||
        member.value?.type === AST_NODE_TYPES.ArrowFunctionExpression)
    ) {
      return member.value;
    }
  }
  return null;
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
  const def = setter.defs[0] as TSESLint.Scope.Definition | undefined;
  if (def === undefined || def.type !== 'Variable') return null;
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
  if (
    namespace === null &&
    !(
      imported.node.type === AST_NODE_TYPES.ImportSpecifier &&
      sourceCode.getText(imported.node.imported) === 'useState'
    )
  ) {
    return null;
  }
  return variableOf(id.elements[0], sourceCode);
}
