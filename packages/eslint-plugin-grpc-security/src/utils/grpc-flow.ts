/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview How this plugin recognises a gRPC server handler and follows a
 * value through one file.
 *
 * A handler is a method of the object passed to `.addService(service,
 * implementation)`. Servers often load `@grpc/grpc-js` through a wrapper
 * module, so the registration shape is the evidence, not the import. Every
 * follow is bounded and abstains on a binding written more than once.
 */

import { TSESTree, propertyName, variableOf } from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

export type SourceCode = Readonly<TSESLint.SourceCode>;
export type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/** How many links one question may follow before the rule gives up. */
export const MAX_HOPS = 12;

export function isFunction(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/** The single, never-reassigned definition of an identifier, if it has one. */
export function definitionOf(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): TSESLint.Scope.Definition | undefined {
  const variable = variableOf(id, sourceCode);
  if (variable === undefined || variable.defs.length !== 1) return undefined;
  const writes = variable.references.filter(
    (ref) => ref.isWrite() && !ref.init,
  );
  return writes.length === 0 ? variable.defs[0] : undefined;
}

/** The function an identifier is bound to: `function f` or `const f = () => …`. */
export function functionOf(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): FunctionNode | undefined {
  const def = definitionOf(id, sourceCode);
  if (def?.type === 'FunctionName') return def.node as FunctionNode;
  if (def?.type !== 'Variable') return undefined;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  return init !== null && isFunction(init) ? init : undefined;
}

/** References to the variable `binding` declares (no optional chains). */
export function referencesOf(
  binding: TSESTree.Node,
  declaration: TSESTree.Node,
  sourceCode: SourceCode,
): TSESLint.Scope.Reference[] {
  const refs: TSESLint.Scope.Reference[] = [];
  for (const variable of sourceCode.getDeclaredVariables(declaration)) {
    if (variable.identifiers.some((id) => id === binding))
      refs.push(...variable.references);
  }
  return refs;
}

/**
 * Call sites of `fn` in this file: `f(…)` for a named function or a const, and
 * the call itself for an IIFE.
 */
export function callSitesOf(
  fn: FunctionNode,
  sourceCode: SourceCode,
): TSESTree.CallExpression[] {
  const { parent } = fn;
  if (parent.type === 'CallExpression' && parent.callee === fn) return [parent];
  const [binding, declaration] =
    fn.type === 'FunctionDeclaration'
      ? [fn.id, fn]
      : parent.type === 'VariableDeclarator'
        ? [parent.id, parent]
        : [null, fn];
  if (binding === null) return [];
  return referencesOf(binding, declaration, sourceCode).flatMap(
    ({ identifier }) => {
      const call = identifier.parent;
      return call?.type === 'CallExpression' && call.callee === identifier
        ? [call]
        : [];
    },
  );
}

/** Every `return <expr>` of a function, not counting nested functions. */
export function returnsOf(fn: FunctionNode): TSESTree.Expression[] {
  if (fn.body.type !== 'BlockStatement') return [fn.body];
  const found: TSESTree.Expression[] = [];
  const visit = (node: TSESTree.Node): void => {
    if (node.type === 'ReturnStatement') {
      if (node.argument) found.push(node.argument);
      return;
    }
    if (isFunction(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && 'type' in child) {
          visit(child as TSESTree.Node);
        }
      }
    }
  };
  visit(fn.body);
  return found;
}

/** Is this object literal the implementation handed to `.addService(svc, impl)`? */
export function isServiceImplementation(
  object: TSESTree.ObjectExpression,
  sourceCode: SourceCode,
): boolean {
  const registers = (call: TSESTree.Node | undefined, arg: TSESTree.Node) =>
    call?.type === 'CallExpression' &&
    call.callee.type === 'MemberExpression' &&
    propertyName(call.callee) === 'addService' &&
    call.arguments[1] === arg;
  if (registers(object.parent, object)) return true;
  const declarator = object.parent;
  if (
    declarator.type !== 'VariableDeclarator' ||
    declarator.init !== object ||
    declarator.id.type !== 'Identifier'
  ) {
    return false;
  }
  return referencesOf(declarator.id, declarator, sourceCode).some(
    ({ identifier }) => registers(identifier.parent, identifier),
  );
}

/** Is `fn` a method of a gRPC service implementation? */
export function isHandler(fn: FunctionNode, sourceCode: SourceCode): boolean {
  const property = fn.parent;
  return (
    property.type === 'Property' &&
    property.value === fn &&
    property.parent.type === 'ObjectExpression' &&
    isServiceImplementation(property.parent, sourceCode)
  );
}

/**
 * Does this expression hold a handler's call metadata?
 *
 * `call.metadata` on a handler's first parameter, `{ metadata }` destructured
 * from it, a const holding either, or a helper's parameter at a position
 * where some call site passes one.
 */
export function isCallMetadata(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number,
): boolean {
  if (hops <= 0) return false;
  if (node.type === 'MemberExpression') {
    if (propertyName(node) !== 'metadata') return false;
    if (node.object.type !== 'Identifier') return false;
    const def = definitionOf(node.object, sourceCode);
    return (
      def?.type === 'Parameter' &&
      isFunction(def.node as TSESTree.Node) &&
      (def.node as FunctionNode).params[0] === def.name &&
      isHandler(def.node as FunctionNode, sourceCode)
    );
  }
  if (node.type !== 'Identifier') return false;
  const def = definitionOf(node, sourceCode);
  if (def?.type === 'Variable') {
    const init = (def.node as TSESTree.VariableDeclarator).init;
    return init !== null && isCallMetadata(init, sourceCode, hops - 1);
  }
  if (def?.type !== 'Parameter') return false;
  const fn = def.node as FunctionNode;
  const [first] = fn.params;
  // `Get({ metadata }, cb)`: the `metadata` key of a handler's first parameter.
  if (first?.type === 'ObjectPattern' && def.name.parent?.type === 'Property') {
    const property = def.name.parent;
    return (
      property.parent === first &&
      property.value === def.name &&
      propertyName({
        type: 'MemberExpression',
        computed: property.computed,
        property: property.key,
      } as TSESTree.MemberExpression) === 'metadata' &&
      isHandler(fn, sourceCode)
    );
  }
  const index = fn.params.indexOf(def.name as TSESTree.Parameter);
  return callSitesOf(fn, sourceCode).some((call) => {
    const arg = call.arguments[index];
    return arg !== undefined && isCallMetadata(arg, sourceCode, hops - 1);
  });
}
