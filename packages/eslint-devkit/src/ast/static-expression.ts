/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Static-expression analysis — "can an attacker influence this value?"
 *
 * Security rules that flag a non-literal argument (`exec(cmd)`, `readFile(p)`,
 * `require(m)`) produce a false positive whenever the value is provably constant:
 *
 * ```js
 * const CMD = 'ls';
 * child_process.exec(CMD);   // not attacker-controlled — must not report
 * ```
 *
 * `eslint-plugin-security` solves this per-rule with its own `isStaticExpression`.
 * This lives in devkit instead, so every rule in the ecosystem inherits it, and it
 * exposes a `treatConstAsStatic` escape hatch for threat models where a `const` is
 * still attacker-influenced (a build-time inlined value, say) — theirs has no such option.
 *
 * Deliberately conservative: anything not proven static is reported as dynamic, so a
 * gap here costs a false positive, never a missed vulnerability.
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// The shim, not the package: `@typescript-eslint/utils` is an OPTIONAL peer,
// so a runtime import of it makes devkit unloadable wherever the consumer
// did not install it. Only the type import above may name the package.
import { AST_NODE_TYPES } from '../ast-node-types';

/** Node builtins whose path-construction helpers return a static value for static input. */
const PATH_MODULES = new Set(['path', 'node:path', 'path/posix', 'path/win32', 'node:path/posix', 'node:path/win32']);

/** `path.*` methods that are pure functions of their arguments. */
const PATH_METHODS = new Set([
  'basename',
  'dirname',
  'extname',
  'join',
  'normalize',
  'relative',
  'resolve',
  'format',
  'toNamespacedPath',
]);

/** `path.*` members that are constants of the platform, not of user input. */
const PATH_CONSTANTS = new Set(['sep', 'delimiter']);

/** `import.meta.*` properties fixed at module-resolution time. */
const IMPORT_META_STATIC = new Set(['url', 'dirname', 'filename']);

export interface StaticExpressionOptions {
  /**
   * Treat a `const` binding with a static initializer as static.
   *
   * Default `true`. Set `false` for threat models where a module-level constant may
   * itself be attacker-influenced — then only literals and literal-only compositions
   * count as static.
   */
  treatConstAsStatic?: boolean;
}

export interface StaticExpressionParams extends StaticExpressionOptions {
  node: TSESTree.Node;
  scope: TSESLint.Scope.Scope;
}

/** Per-run memo. Keyed by node, so it is safe across rules within a single lint pass. */
const cache = new WeakMap<TSESTree.Node, boolean>();

/**
 * Resolve an identifier to its single constant initializer, if it has one.
 *
 * Returns `undefined` unless the binding is a `const` (or an unwritten `let`) declared
 * exactly once and never reassigned — a variable written more than once can hold an
 * attacker-controlled value at the point of use.
 */
function resolveConstInit(
  name: string,
  scope: TSESLint.Scope.Scope,
): { init: TSESTree.Expression; scope: TSESLint.Scope.Scope } | undefined {
  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.variables.find((v) => v.name === name);
    if (!variable) continue;

    // Any write beyond the declaration means the value is not provably constant.
    const writes = variable.references.filter((ref) => ref.isWrite());
    if (writes.length !== 1) return undefined;

    const [def] = variable.defs;
    if (!def || def.type !== 'Variable') return undefined;
    if (!def.node.init) return undefined;
    // `var` is accepted on the same terms as `const`: the single-write check above already
    // proves the binding is never reassigned, and that is what "constant" means here.
    // Rejecting `var` outright cost a real false positive —
    // `var cp = require('child_process'); var FOO = 'ls'; cp.exec(FOO)` — on code that is
    // provably safe. Temporal-dead-zone differences do not affect whether the VALUE is
    // attacker-influenced.

    return { init: def.node.init, scope: current };
  }
  return undefined;
}

/** Is this a `path.<method>()` call, or a `path.sep`-style constant, on a real `path` import? */
function isPathModuleReference(object: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  if (object.type !== AST_NODE_TYPES.Identifier) return false;

  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.variables.find((v) => v.name === object.name);
    if (!variable) continue;
    const [def] = variable.defs;
    if (!def) return false;

    // import path from 'node:path' (but not `import path = require(...)`, which has no `source`)
    if (def.type === 'ImportBinding') {
      const declaration = def.parent;
      if (declaration?.type !== AST_NODE_TYPES.ImportDeclaration) return false;
      const source = declaration.source.value;
      return typeof source === 'string' && PATH_MODULES.has(source);
    }
    // const path = require('node:path')
    if (def.type === 'Variable' && def.node.init?.type === AST_NODE_TYPES.CallExpression) {
      const call = def.node.init;
      if (call.callee.type !== AST_NODE_TYPES.Identifier || call.callee.name !== 'require') return false;
      const [arg] = call.arguments;
      return arg?.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string' && PATH_MODULES.has(arg.value);
    }
    return false;
  }
  return false;
}

/**
 * Determine whether an expression evaluates to a value no attacker can influence.
 *
 * @example
 * ```ts
 * isStaticExpression({ node: argument, scope: context.sourceCode.getScope(node) });
 * ```
 */
export function isStaticExpression({
  node,
  scope,
  treatConstAsStatic = true,
}: StaticExpressionParams): boolean {
  // The cache must not merge results computed under different options.
  const cacheable = treatConstAsStatic;
  if (cacheable) {
    const hit = cache.get(node);
    if (hit !== undefined) return hit;
  }

  const result = evaluate(node, scope, treatConstAsStatic, new Set());
  if (cacheable) cache.set(node, result);
  return result;
}

function evaluate(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  treatConstAsStatic: boolean,
  seen: Set<TSESTree.Node>,
): boolean {
  // Cyclic initializers (`const a = b, b = a`) would otherwise recurse forever.
  if (seen.has(node)) return false;
  seen.add(node);
  try {
    return evaluateNode(node, scope, treatConstAsStatic, seen);
  } finally {
    // Only the ACTIVE chain may block a re-visit. `seen` is a cycle guard, not a
    // visited-set: leaving the node in it after the branch finishes makes the
    // SECOND reference to one constant answer "dynamic". `const A = 'a';
    // sink(A + A)` proved it — both operands resolve to the same initializer
    // node, so the right operand hit the guard and the whole `+` came back
    // dynamic. Same for `` `${N}-${N}` `` and `path.join(DIR, DIR)`, all three
    // false positives in every rule that consumes this (detect-child-process,
    // detect-non-literal-fs-filename). Locked by the repeated-constant cases in
    // static-expression.test.ts, which fail on the pre-fix implementation.
    seen.delete(node);
  }
}

function evaluateNode(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  treatConstAsStatic: boolean,
  seen: Set<TSESTree.Node>,
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return true;

    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.every((expression) => evaluate(expression, scope, treatConstAsStatic, seen));

    case AST_NODE_TYPES.BinaryExpression:
      // `a + b`, `a * b` — static iff both operands are. `in`/`instanceof` are not value math.
      // `in`/`instanceof` are excluded above, so `left` is always an Expression here.
      if (node.operator === 'in' || node.operator === 'instanceof') return false;
      return (
        evaluate(node.left, scope, treatConstAsStatic, seen) &&
        evaluate(node.right, scope, treatConstAsStatic, seen)
      );

    case AST_NODE_TYPES.UnaryExpression:
      return evaluate(node.argument, scope, treatConstAsStatic, seen);

    case AST_NODE_TYPES.ConditionalExpression:
      // Both branches static => the value is static whichever branch runs. The test is
      // deliberately NOT required to be static: it selects which constant is produced, it
      // cannot inject a value of its own. Requiring it would false-positive on the very
      // common `sink(isProd ? PROD_CMD : DEV_CMD)`.
      return (
        evaluate(node.consequent, scope, treatConstAsStatic, seen) &&
        evaluate(node.alternate, scope, treatConstAsStatic, seen)
      );

    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
      return evaluate(node.expression, scope, treatConstAsStatic, seen);

    case AST_NODE_TYPES.Identifier: {
      if (!treatConstAsStatic) return false;
      const resolved = resolveConstInit(node.name, scope);
      if (!resolved) return false;
      return evaluate(resolved.init, resolved.scope, treatConstAsStatic, seen);
    }

    case AST_NODE_TYPES.MemberExpression: {
      if (node.computed) return false;
      if (node.property.type !== AST_NODE_TYPES.Identifier) return false;

      // import.meta.url / .dirname / .filename
      if (
        node.object.type === AST_NODE_TYPES.MetaProperty &&
        node.object.meta.name === 'import' &&
        node.object.property.name === 'meta'
      ) {
        return IMPORT_META_STATIC.has(node.property.name);
      }

      // path.sep / path.delimiter
      return PATH_CONSTANTS.has(node.property.name) && isPathModuleReference(node.object, scope);
    }

    case AST_NODE_TYPES.CallExpression: {
      const { callee } = node;
      if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return false;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
      if (!PATH_METHODS.has(callee.property.name)) return false;
      if (!isPathModuleReference(callee.object, scope)) return false;
      return node.arguments.every(
        (argument) =>
          argument.type !== AST_NODE_TYPES.SpreadElement &&
          evaluate(argument, scope, treatConstAsStatic, seen),
      );
    }

    default:
      return false;
  }
}
