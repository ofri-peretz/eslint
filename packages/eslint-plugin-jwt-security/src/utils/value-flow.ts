/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Intra-file value following.
 *
 * Answers "what expression does this value come from?" by following the
 * structure of ONE file: a `const` / `let` / `var` that is never reassigned, a
 * destructure of such a binding, a member read off an object literal, an
 * `await`, a TypeScript cast, and the single `return` of a same-file
 * function. Every walk is bounded by depth and guarded against cycles, and it
 * stops — returning the expression it reached — the moment a value comes from
 * outside the file (a parameter, an import, a global, a call it cannot read).
 *
 * It never looks at a NAME to decide anything. The answer is always an AST
 * node; what that node means is the caller's business.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  staticString,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';

/** The slice of `SourceCode` these helpers use. */
export type SourceCodeLike = Pick<TSESLint.SourceCode, 'getScope'>;

/** Bounds every walk; value following is a lookup, not a solver. */
export const MAX_FLOW_DEPTH = 8;

/** The nearest variable named like `node`, searching outward from its scope. */
export function findVariable(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): TSESLint.Scope.Variable | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.set.get(node.name);
    if (variable !== undefined) return variable;
  }
  return null;
}

/** The single definition of a binding that is written exactly once, or null. */
function soleVariableDef(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): TSESLint.Scope.Definition | null {
  const variable = findVariable(sourceCode, node);
  const def = variable?.defs[0];
  if (def === undefined) return null;
  if (def.type === 'FunctionName') return def;
  if (def.type !== 'Variable' || def.node.init === null) return null;
  // A `let` / `var` that is assigned again holds whichever write ran last,
  // which is not something one file's structure can say. The initialiser is
  // the only write the binding may have.
  // (A destructuring default writes the declared name a second time, at the
  // same identifier — that is still the declaration, not a reassignment.)
  const reassigned = variable!.references.some(
    (reference) => reference.isWrite() && reference.identifier !== def.name,
  );
  return reassigned ? null : def;
}

/**
 * The key path from a destructuring pattern down to one bound identifier.
 *
 * `const { jwt: { secret } } = config` -> `['jwt', 'secret']` for `secret`.
 * A rest element, an array pattern or a computed key names no static path.
 */
function patternPath(
  pattern: TSESTree.Node,
  target: TSESTree.Identifier,
): string[] | null {
  if (pattern === target) return [];
  if (pattern.type === AST_NODE_TYPES.AssignmentPattern) {
    return patternPath(pattern.left, target);
  }
  if (pattern.type !== AST_NODE_TYPES.ObjectPattern) return null;
  for (const prop of pattern.properties) {
    if (prop.type !== AST_NODE_TYPES.Property) continue;
    const key = objectKeyName(prop);
    const rest = patternPath(prop.value, target);
    if (rest !== null) return key === null ? null : [key, ...rest];
  }
  return null;
}

/**
 * The value a static key holds in an object literal, read last-wins.
 *
 * A spread that resolves to another literal is searched too. A spread that
 * does not could define the key, so the answer is then "unknown" (null).
 */
function pickProperty(
  object: TSESTree.ObjectExpression,
  key: string,
  sourceCode: SourceCodeLike,
  depth: number,
  seen: Set<TSESTree.Node>,
): TSESTree.Node | null {
  for (let i = object.properties.length - 1; i >= 0; i--) {
    const element = object.properties[i]!;
    if (element.type === AST_NODE_TYPES.Property) {
      if (objectKeyName(element) === key) return element.value;
      continue;
    }
    const spread = resolveTerminal(
      element.argument,
      sourceCode,
      depth + 1,
      seen,
    );
    if (spread.type !== AST_NODE_TYPES.ObjectExpression) return null;
    const found = pickProperty(spread, key, sourceCode, depth + 1, seen);
    if (found !== null) return found;
  }
  return null;
}

/** The single value a function returns, when its body has exactly one return. */
export function soleReturn(fn: TSESTree.Node): TSESTree.Node | null {
  if (
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    fn.type !== AST_NODE_TYPES.FunctionExpression &&
    fn.type !== AST_NODE_TYPES.FunctionDeclaration
  ) {
    return null;
  }
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return fn.body;
  const returns: TSESTree.ReturnStatement[] = [];
  collectReturns(fn.body, returns);
  return returns.length === 1 ? returns[0]!.argument : null;
}

/** Every `return` of one function body, not descending into nested functions. */
function collectReturns(
  node: TSESTree.Node,
  out: TSESTree.ReturnStatement[],
): void {
  if (node.type === AST_NODE_TYPES.ReturnStatement) {
    out.push(node);
    return;
  }
  for (const child of childNodes(node)) {
    if (
      child.type !== AST_NODE_TYPES.FunctionDeclaration &&
      child.type !== AST_NODE_TYPES.FunctionExpression &&
      child.type !== AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      collectReturns(child, out);
    }
  }
}

/** Keys that hold structure rather than children. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set([
  'parent',
  'loc',
  'range',
  'tokens',
  'comments',
]);

/** The direct child nodes of a node, in source order. */
export function childNodes(node: TSESTree.Node): TSESTree.Node[] {
  const children: TSESTree.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (NON_CHILD_KEYS.has(key)) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (
        item !== null &&
        typeof item === 'object' &&
        typeof (item as { type?: unknown }).type === 'string'
      ) {
        children.push(item as TSESTree.Node);
      }
    }
  }
  return children;
}

/**
 * Follow a value to the expression it comes from, within this file.
 *
 * Returns the node the walk ended on. That is an object literal, a string, a
 * function, a call, a parameter … — whatever was reached when nothing more
 * could be read. A caller that wanted an object literal and got anything else
 * knows the value is not visible.
 */
export function resolveTerminal(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
  depth = 0,
  seen: Set<TSESTree.Node> = new Set(),
): TSESTree.Node {
  const value = unwrapTypeSyntax(node);
  if (depth > MAX_FLOW_DEPTH || seen.has(value)) return value;
  seen.add(value);
  switch (value.type) {
    case AST_NODE_TYPES.AwaitExpression:
      return resolveTerminal(value.argument, sourceCode, depth + 1, seen);
    case AST_NODE_TYPES.Identifier: {
      const def = soleVariableDef(sourceCode, value);
      if (def === null) return value;
      if (def.type === 'FunctionName') return def.node;
      const declarator = def.node as TSESTree.VariableDeclarator;
      const init = declarator.init!;
      if (declarator.id.type === AST_NODE_TYPES.Identifier) {
        return resolveTerminal(init, sourceCode, depth + 1, seen);
      }
      const path = patternPath(declarator.id, def.name as TSESTree.Identifier);
      let current: TSESTree.Node | null = resolveTerminal(
        init,
        sourceCode,
        depth + 1,
        seen,
      );
      for (const key of path ?? [null]) {
        if (key === null || current?.type !== AST_NODE_TYPES.ObjectExpression) {
          return value;
        }
        const picked = pickProperty(current, key, sourceCode, depth + 1, seen);
        current =
          picked === null
            ? null
            : resolveTerminal(picked, sourceCode, depth + 1, seen);
      }
      return current ?? value;
    }
    case AST_NODE_TYPES.MemberExpression: {
      const key = propertyName(value);
      const object = resolveTerminal(value.object, sourceCode, depth + 1, seen);
      if (key === null || object.type !== AST_NODE_TYPES.ObjectExpression) {
        return value;
      }
      const picked = pickProperty(object, key, sourceCode, depth + 1, seen);
      return picked === null
        ? value
        : resolveTerminal(picked, sourceCode, depth + 1, seen);
    }
    case AST_NODE_TYPES.CallExpression: {
      const callee = resolveTerminal(value.callee, sourceCode, depth + 1, seen);
      const returned = soleReturn(callee);
      return returned === null
        ? value
        : resolveTerminal(returned, sourceCode, depth + 1, seen);
    }
    default:
      return value;
  }
}

/**
 * The module an identifier is bound from: `import x from 'm'`,
 * `import { x } from 'm'`, `import * as x from 'm'`, `const x = require('m')`
 * and `const { x } = require('m')`.
 */
export function importSourceOf(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): string | null {
  const def = findVariable(sourceCode, node)?.defs[0];
  if (def === undefined) return null;
  if (def.type === 'ImportBinding') {
    // An ImportSpecifier / default / namespace binding hangs off its
    // ImportDeclaration; `import x = require('m')` is its own declaration.
    const declaration = def.parent as
      TSESTree.ImportDeclaration | TSESTree.TSImportEqualsDeclaration;
    return declaration.type === AST_NODE_TYPES.ImportDeclaration
      ? String(declaration.source.value)
      : importEqualsSpecifier(declaration);
  }
  if (def.type !== 'Variable' || def.node.init === null) return null;
  return requireSpecifier(def.node.init);
}

/**
 * `require('x')` -> `'x'`, including when member-accessed.
 *
 * `const { sign } = require('jose').default` and
 * `const jwt = require('jsonwebtoken')` are the same load; anything that is not
 * a call to `require` with a string literal is not one at all.
 */
export function requireSpecifier(
  node: TSESTree.Node | null | undefined,
): string | null {
  if (node == null) return null;
  // `require('jose').jwtVerify` — the call is the receiver.
  const call =
    node.type === AST_NODE_TYPES.MemberExpression ? node.object : node;
  if (
    call.type !== AST_NODE_TYPES.CallExpression ||
    call.callee.type !== AST_NODE_TYPES.Identifier ||
    call.callee.name !== 'require'
  ) {
    return null;
  }
  // `require('m')` and `` require(`m`) `` load the same module.
  return staticString(call.arguments[0]);
}

/**
 * `import argon = require('argon2')` -> `'argon2'`.
 *
 * TypeScript's grammar only admits a string literal in an external module
 * reference, so the value is read straight through. A namespace alias
 * (`import A = B.C`) loads nothing and yields `null`.
 */
export function importEqualsSpecifier(
  stmt: TSESTree.TSImportEqualsDeclaration,
): string | null {
  const ref = stmt.moduleReference;
  if (ref.type !== AST_NODE_TYPES.TSExternalModuleReference) return null;
  return String((ref.expression as TSESTree.Literal).value);
}

/**
 * The module a value was produced by.
 *
 * Follows the value to where it was made — a call, a construction, a member
 * read — and then to the binding at the root of that callee chain:
 * `(await client.getSigningKey(kid)).getPublicKey()` -> `client` ->
 * `jwksClient({…})` -> `'jwks-rsa'`.
 */
export function originModule(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
  depth = 0,
): string | null {
  if (depth > MAX_FLOW_DEPTH) return null;
  const value = resolveTerminal(node, sourceCode);
  switch (value.type) {
    case AST_NODE_TYPES.Identifier:
      return importSourceOf(sourceCode, value);
    case AST_NODE_TYPES.CallExpression:
    case AST_NODE_TYPES.NewExpression:
      return (
        requireSpecifier(value) ??
        originModule(value.callee, sourceCode, depth + 1)
      );
    case AST_NODE_TYPES.MemberExpression:
      return originModule(value.object, sourceCode, depth + 1);
    default:
      return null;
  }
}

/** The export a callee names: `importSPKI` for `importSPKI()` and `jose.importSPKI()`. */
export function calleeExportName(
  callee: TSESTree.Node,
  sourceCode: SourceCodeLike,
): string | null {
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    return propertyName(callee);
  }
  if (callee.type !== AST_NODE_TYPES.Identifier) return null;
  // Callers reach this only for a callee whose module resolved, so the
  // identifier is always bound.
  const def = findVariable(sourceCode, callee)!.defs[0]!;
  if (def.node.type !== AST_NODE_TYPES.ImportSpecifier) return callee.name;
  const { imported } = def.node;
  return imported.type === AST_NODE_TYPES.Identifier
    ? imported.name
    : String(imported.value);
}

/**
 * A number the expression always evaluates to, or null.
 *
 * Literals, a same-file binding that holds one, and `+ - * /` over such
 * values — `60 * 60 * 24 * 365` is a year whether or not anyone wrote 31536000.
 */
export function staticNumber(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
  depth = 0,
): number | null {
  if (depth > MAX_FLOW_DEPTH) return null;
  const value = resolveTerminal(node, sourceCode);
  if (value.type === AST_NODE_TYPES.Literal) {
    return typeof value.value === 'number' ? value.value : null;
  }
  if (value.type !== AST_NODE_TYPES.BinaryExpression) return null;
  const left = staticNumber(value.left, sourceCode, depth + 1);
  const right = staticNumber(value.right, sourceCode, depth + 1);
  if (left === null || right === null) return null;
  switch (value.operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    default:
      return null;
  }
}
