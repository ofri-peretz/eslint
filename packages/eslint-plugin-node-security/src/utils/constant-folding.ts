/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Constant folding — "whatever branch runs, is this value written in the file?"
 *
 * The sibling module `provenance.ts` answers the *taint* question: can an
 * attacker steer this value. This one answers the complementary question that
 * several rules were skipping entirely: is the value a compile-time constant
 * even though it is not spelled as a literal at the use site.
 *
 * Two corpus findings motivated it, both from `Shopify/cli`, both high-severity
 * reports on code where exactly one value is possible:
 *
 * ```js
 * // bin/get-graphql-schemas.js:207 — no-shell-injection
 * const localDir = schema.repo === 'world' ? '//' : schema.repo
 * execSync(`/opt/dev/bin/dev cd --no-chdir ${localDir}`)
 * ```
 *
 * Every entry of the module-level `schemas` table hardcodes `repo: 'world'`, so
 * both arms of that ternary are the same two characters of literal text. The
 * rule saw a `TemplateLiteral` with an expression in it and stopped.
 *
 * ```js
 * // packages/eslint-plugin-cli/rules/no-inline-graphql.js:44 — no-dynamic-algorithm-selection
 * function hashFileSync(filePath, algorithm = 'sha256') {
 *   const hash = crypto.createHash(algorithm)
 * ```
 *
 * The only call site in the file passes one argument, so `algorithm` is the
 * literal `'sha256'` on every execution. The rule saw an `Identifier` and
 * reported a downgrade attack on a value nobody can supply.
 *
 * ## What this is NOT
 *
 * It is not an evaluator: it returns a boolean, never a value. "Which literal"
 * is a question no caller here needs — `no-weak-hash-algorithm` already owns
 * "is this literal a bad one" — and computing it would mean a cartesian product
 * over every conditional arm with a cap nobody could justify.
 *
 * It is also deliberately incomplete. Anything it cannot see through is
 * `false`, i.e. *unresolved*, and unresolved keeps the existing report. A fold
 * that guessed would trade a false positive for a false negative, which is the
 * one trade these rules may not make.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

import { findVariable } from './provenance';

type SourceCode = TSESLint.SourceCode;

/** Hops before the fold gives up. `const a = b; const b = a;` needs a stop. */
const MAX_DEPTH = 8;

/**
 * The single `const` initializer this identifier is bound to.
 *
 * Stricter than `provenance.bindingInit`: `const` only, one definition only,
 * and the declarator must bind a plain identifier. A `let` can be reassigned
 * between the declaration and the use, so its initializer proves nothing about
 * the value that actually reaches the sink — and "proves nothing" is exactly
 * what this module must not treat as "constant".
 */
function constInitOf(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): TSESTree.Node | undefined {
  const variable = findVariable(sourceCode, node);
  if (!variable || variable.defs.length !== 1) return undefined;
  const def = variable.defs[0];
  if (def.type !== 'Variable' || def.parent.kind !== 'const') return undefined;
  if (def.node.id.type !== AST_NODE_TYPES.Identifier) return undefined;
  return def.node.init ?? undefined;
}

/**
 * `for (const x of <array literal>)` — the elements `x` ranges over.
 *
 * A loop variable has no initializer, so `constInitOf` returns nothing for it
 * and the fold would stop at the first property read off a table row. The
 * iterable is followed one hop: a literal array, or a `const` bound to one.
 */
function loopElementsOf(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): readonly TSESTree.Node[] | null {
  const variable = findVariable(sourceCode, node);
  if (!variable || variable.defs.length !== 1) return null;
  const def = variable.defs[0];
  if (def.type !== 'Variable' || def.parent.kind !== 'const') return null;
  const statement = def.parent.parent;
  if (statement?.type !== AST_NODE_TYPES.ForOfStatement) return null;
  return arrayElementsOf(sourceCode, statement.right, 0);
}

/** An array literal, or a chain of `const` identifiers bound to one. */
function arrayElementsOf(
  sourceCode: SourceCode,
  node: TSESTree.Node,
  depth: number,
): readonly TSESTree.Node[] | null {
  if (depth > MAX_DEPTH) return null;
  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    // A hole (`[a, , b]`) is `null` and yields `undefined`, which is not a
    // string constant — refuse the whole array rather than skip the hole.
    return node.elements.every((element) => element !== null)
      ? (node.elements as readonly TSESTree.Node[])
      : null;
  }
  if (node.type !== AST_NODE_TYPES.Identifier) return null;
  const init = constInitOf(sourceCode, node);
  if (init === undefined) return null;
  return arrayElementsOf(sourceCode, init, depth + 1);
}

/**
 * The value of `<object literal>.<name>`, when the object states it plainly.
 *
 * A spread, a getter, a computed key or a shorthand method means the property
 * this expression reads is not decided by this object literal alone, so the
 * whole object is refused rather than searched harder.
 */
function propertyValueOf(
  object: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Node | null {
  for (const property of object.properties) {
    if (property.type !== AST_NODE_TYPES.Property) return null;
    if (property.computed || property.key.type !== AST_NODE_TYPES.Identifier) continue;
    if (property.key.name === name) return property.value;
  }
  return null;
}

/**
 * Build a "is every value this expression can take written in this file?" test.
 *
 * Handles the four shapes that hide a constant behind something that is not a
 * literal at the use site — a name, a ternary, a concatenation, and a table row
 * read inside a `for…of` — and returns `false` for everything else.
 */
export function makeIsLiteralConstant(
  sourceCode: SourceCode,
): (node: TSESTree.Node) => boolean {
  const objectSourcesOf = (
    node: TSESTree.Node,
    depth: number,
  ): readonly TSESTree.ObjectExpression[] | null => {
    if (depth > MAX_DEPTH) return null;
    if (node.type === AST_NODE_TYPES.ObjectExpression) return [node];
    if (node.type !== AST_NODE_TYPES.Identifier) return null;
    const init = constInitOf(sourceCode, node);
    if (init !== undefined) return objectSourcesOf(init, depth + 1);
    const elements = loopElementsOf(sourceCode, node);
    if (elements === null) return null;
    const objects: TSESTree.ObjectExpression[] = [];
    for (const element of elements) {
      if (element.type !== AST_NODE_TYPES.ObjectExpression) return null;
      objects.push(element);
    }
    return objects;
  };

  const fold = (node: TSESTree.Node, depth: number): boolean => {
    if (depth > MAX_DEPTH) return false;
    switch (node.type) {
      case AST_NODE_TYPES.Literal:
        // A `RegExp` or `null` literal is not a value any of these sinks take
        // as a constant string, so only the two scalar kinds count.
        return typeof node.value === 'string' || typeof node.value === 'number';
      case AST_NODE_TYPES.TemplateLiteral:
        return node.expressions.every((expression) => fold(expression, depth + 1));
      // The test does not matter: if BOTH arms are constant, so is the result,
      // whichever way the branch goes at runtime.
      case AST_NODE_TYPES.ConditionalExpression:
        return fold(node.consequent, depth + 1) && fold(node.alternate, depth + 1);
      case AST_NODE_TYPES.BinaryExpression:
        return (
          node.operator === '+' &&
          fold(node.left as TSESTree.Node, depth + 1) &&
          fold(node.right, depth + 1)
        );
      case AST_NODE_TYPES.Identifier: {
        const init = constInitOf(sourceCode, node);
        return init !== undefined && fold(init, depth + 1);
      }
      case AST_NODE_TYPES.MemberExpression: {
        if (node.computed || node.property.type !== AST_NODE_TYPES.Identifier) return false;
        const objects = objectSourcesOf(node.object, depth + 1);
        if (objects === null || objects.length === 0) return false;
        const name = node.property.name;
        return objects.every((object) => {
          const value = propertyValueOf(object, name);
          return value !== null && fold(value, depth + 1);
        });
      }
      default:
        return false;
    }
  };

  return (node: TSESTree.Node) => fold(node, 0);
}

/**
 * Is this parameter's default the only value it can ever hold?
 *
 * True when the parameter has a constant default AND every reference to the
 * function in this file is a direct call that stops short of that position. A
 * function whose name escapes — exported, passed as a value, assigned to
 * `module.exports` — fails the test, because the argument list at the call site
 * is then someone else's decision.
 *
 * This is the same one-hop, same-file standard `no-unsafe-buffer-alloc` uses to
 * decide that a decoder parameter carries wire data. It answers "is there
 * visible evidence", never "is this provably true across the program".
 */
export function parameterIsAlwaysDefault(
  sourceCode: SourceCode,
  identifier: TSESTree.Identifier,
  isLiteralConstant: (node: TSESTree.Node) => boolean,
): boolean {
  const variable = findVariable(sourceCode, identifier);
  if (!variable || variable.defs.length !== 1) return false;
  const def = variable.defs[0];
  if (def.type !== 'Parameter') return false;

  // A named `function` declaration only. An arrow, a method or a function
  // expression has no single binding whose references enumerate its call
  // sites, and enumerating call sites is the entire test.
  const fn = def.node;
  if (fn.type !== AST_NODE_TYPES.FunctionDeclaration || fn.id === null) return false;
  if (
    fn.parent.type === AST_NODE_TYPES.ExportNamedDeclaration ||
    fn.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration
  ) {
    return false;
  }

  const index = fn.params.findIndex(
    (param) =>
      param.type === AST_NODE_TYPES.AssignmentPattern && param.left === def.name,
  );
  if (index === -1) return false;
  const param = fn.params[index] as TSESTree.AssignmentPattern;
  if (!isLiteralConstant(param.right)) return false;

  return everyCallStopsBefore(sourceCode, fn.id, index);
}

/**
 * Every reference to this function name is a call passing fewer than
 * `index + 1` arguments.
 *
 * `false` when any reference is something other than the callee of such a call
 * — passed as a value, re-exported, stored on an object. Those are all "a
 * caller we cannot see decides", which is unresolved, not safe.
 */
function everyCallStopsBefore(
  sourceCode: SourceCode,
  name: TSESTree.Identifier,
  index: number,
): boolean {
  // `name` is a function DECLARATION's own id, so its binding is in the
  // enclosing scope by construction and the lookup cannot miss. Casting rather
  // than branching keeps the impossible case out of the coverage numbers,
  // where an unreachable guard reads as an untested one.
  const variable = findVariable(sourceCode, name) as TSESLint.Scope.Variable;
  return variable.references.every((reference) => {
    const parent = reference.identifier.parent;
    return (
      parent.type === AST_NODE_TYPES.CallExpression &&
      parent.callee === reference.identifier &&
      parent.arguments.length <= index
    );
  });
}
