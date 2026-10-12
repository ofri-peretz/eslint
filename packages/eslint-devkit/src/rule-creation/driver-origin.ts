/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a receiver comes from, decided from structure — never from its name.
 *
 * The driver plugins used to decide "is `x.update(...)` a database write?" by
 * matching the receiver's NAME against a pattern (`/^(knex|db|…)$|[Dd]b$/`).
 * Renaming `db` to `store` silenced every finding, and naming a `Map` `db`
 * produced one. This module replaces that with a bounded walk to where the
 * receiver is written:
 *
 *   - an `import` / `require` of one of the plugin's modules is `'ours'`;
 *   - an import of any other package, a literal, a local class that does not
 *     extend the driver's, or a JavaScript / TypeScript lib global (`Map`,
 *     `URLSearchParams`) is `'foreign'`;
 *   - a RELATIVE import is read from disk and judged where it is exported;
 *   - a parameter is judged by its type annotation, or as the callback
 *     parameter of a call on a driver receiver (`db.transaction(async (trx) => …)`);
 *   - `this.x` is judged by the class member, constructor parameter property
 *     or constructor assignment that declares it;
 *   - anything else — an undeclared name, an untyped parameter, a path alias
 *     the linter cannot read — is `'unknown'`, and the caller decides how much
 *     the call's own shape has to prove before it reports.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { propertyName } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { createModuleEvidence } from './module-evidence';
import {
  type Value,
  MAX_FOLLOW_DEPTH,
  exportedValue,
  follow,
  importOrigin,
  importSpecifierOf,
  isRelativeSpecifier,
  lookup,
  returnedValue,
  valueAt,
} from './value-follow';

/** Where a value comes from, relative to one plugin's driver modules. */
export type Origin = 'ours' | 'foreign' | 'unknown';

/**
 * Runtime globals every JavaScript host defines. Under espree these resolve to
 * no binding at all, so they are named here; under the TypeScript parser they
 * resolve to implicit lib variables and never reach this list.
 *
 * @protocol-constant ECMAScript / WHATWG / Node global names, not a vocabulary
 * about databases.
 */
const PLATFORM_GLOBALS: ReadonlySet<string> = new Set([
  'Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Object',
  'JSON',
  'Math',
  'Promise',
  'Reflect',
  'URL',
  'URLSearchParams',
  'Headers',
  'FormData',
  'Date',
  'globalThis',
  'window',
  'document',
  'console',
  'process',
  'Buffer',
]);

/** `@/lib/db`, `~/db`, `#db` — a path alias the linter cannot read from disk. */
export function isPathAlias(specifier: string): boolean {
  return /^(?:[@~]\/|~|#)/.test(specifier);
}

/** Does `source` name one of `modules` (by package root)? */
export function sourceMatches(
  source: string,
  modules: readonly string[],
): boolean {
  return modules.some((m) => source === m || source.startsWith(`${m}/`));
}

/** Combine the origins of two values either of which may be the result. */
export function eitherOrigin(a: Origin, b: Origin): Origin {
  if (a === 'ours' || b === 'ours') return 'ours';
  return a === 'foreign' && b === 'foreign' ? 'foreign' : 'unknown';
}

/** Is this node a function of any form? */
export function isFunctionNode(
  node: TSESTree.Node,
): node is TSESTree.FunctionLike {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** The type annotation written on a parameter or declarator id. */
export function writtenAnnotation(
  identifier: TSESTree.Node,
): TSESTree.TypeNode | undefined {
  const holder = identifier as { typeAnnotation?: TSESTree.TSTypeAnnotation };
  return holder.typeAnnotation?.typeAnnotation;
}

/** The class a node sits in, or `undefined`. */
function enclosingClass(
  node: TSESTree.Node,
): TSESTree.ClassDeclaration | TSESTree.ClassExpression | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (
      n.type === AST_NODE_TYPES.ClassDeclaration ||
      n.type === AST_NODE_TYPES.ClassExpression
    ) {
      return n;
    }
  }
  return undefined;
}

/** The root identifier a type reference is named by: `Knex` in `Knex.Transaction`. */
function typeRoot(name: TSESTree.EntityName): TSESTree.Identifier | null {
  let cursor: TSESTree.EntityName = name;
  while (cursor.type === AST_NODE_TYPES.TSQualifiedName) cursor = cursor.left;
  return cursor.type === AST_NODE_TYPES.Identifier ? cursor : null;
}

/**
 * Build the origin classifier for one plugin's modules.
 *
 * Returns a function that classifies any expression; it is pure, and safe to
 * call repeatedly within one lint run.
 */
export type OriginClassifier = ((value: Value) => Origin) & {
  /** Where a written TYPE annotation comes from: `Knex.Raw`, `Prisma.Sql`. */
  readonly ofType: (value: Value) => Origin;
};

export function createOriginClassifier(
  modules: readonly string[],
): OriginClassifier {
  type Seen = Set<TSESTree.Node>;
  const loadsDriver = createModuleEvidence({ packages: modules });

  /** A class: ours when it (transitively) extends a driver class. */
  const classOrigin = (
    cls: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    value: Value,
    depth: number,
    seen: Seen,
  ): Origin =>
    cls.superClass === null
      ? 'foreign'
      : classify(valueAt(cls.superClass, value.env), depth + 1, seen);

  /** A type alias, interface or class declaration read as a type. */
  const declarationOrigin = (
    value: Value,
    depth: number,
    seen: Seen,
  ): Origin => {
    const node = value.node;
    if (node.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
      return typeOrigin(
        valueAt(node.typeAnnotation, value.env),
        depth + 1,
        seen,
      );
    }
    if (node.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
      return node.extends
        .map((base) =>
          classify(valueAt(base.expression, value.env), depth + 1, seen),
        )
        .includes('ours')
        ? 'ours'
        : 'foreign';
    }
    return classify(value, depth + 1, seen);
  };

  /** Where a written TYPE comes from. */
  const typeOrigin = (value: Value, depth: number, seen: Seen): Origin => {
    const node = value.node as TSESTree.TypeNode;
    if (
      node.type === AST_NODE_TYPES.TSUnionType ||
      node.type === AST_NODE_TYPES.TSIntersectionType
    ) {
      return node.types
        .map((t) => typeOrigin(valueAt(t, value.env), depth + 1, seen))
        .reduce(eitherOrigin);
    }
    if (node.type === AST_NODE_TYPES.TSTypeQuery) {
      const root =
        node.exprName.type === AST_NODE_TYPES.TSImportType
          ? null
          : typeRoot(node.exprName);
      return root === null
        ? 'unknown'
        : classify(valueAt(root, value.env), depth + 1, seen);
    }
    if (node.type !== AST_NODE_TYPES.TSTypeReference) return 'foreign';
    // A type reference is always rooted at a name (`this` types are
    // `TSThisType`, never a reference).
    const root = typeRoot(node.typeName) as TSESTree.Identifier;
    const variable = lookup(root.name, value.env.scopeOf(root));
    if (variable === null) return 'unknown';
    if (variable.defs.length === 0) return 'foreign';
    const specifier = importSpecifierOf(variable);
    if (specifier !== null) {
      if (sourceMatches(specifier.source, modules)) return 'ours';
      if (!isRelativeSpecifier(specifier.source))
        return isPathAlias(specifier.source) ? 'unknown' : 'foreign';
      const origin = importOrigin(variable, value.env);
      const exported =
        origin === null || origin.name === '*'
          ? null
          : exportedValue(origin.module, origin.name, value.env.parser);
      return exported === null
        ? 'unknown'
        : declarationOrigin(exported, depth + 1, seen);
    }
    return declarationOrigin(
      valueAt(variable.defs[0].node, value.env),
      depth,
      seen,
    );
  };

  /**
   * A member of `this` — or `this` itself when `key` is `null` — read from
   * the enclosing class: a field, a constructor parameter property or a
   * constructor assignment declares it; an undeclared member is inherited.
   */
  const thisOrigin = (
    at: TSESTree.Node,
    key: string | null,
    value: Value,
    depth: number,
    seen: Seen,
  ): Origin => {
    const cls = enclosingClass(at);
    if (cls === undefined) return 'unknown';
    for (const element of key === null ? [] : cls.body.body) {
      if (
        element.type === AST_NODE_TYPES.PropertyDefinition &&
        !element.computed &&
        element.key.type === AST_NODE_TYPES.Identifier &&
        element.key.name === key
      ) {
        if (element.typeAnnotation) {
          return typeOrigin(
            valueAt(element.typeAnnotation.typeAnnotation, value.env),
            depth + 1,
            seen,
          );
        }
        return element.value === null
          ? 'unknown'
          : classify(valueAt(element.value, value.env), depth + 1, seen);
      }
      if (
        element.type !== AST_NODE_TYPES.MethodDefinition ||
        element.kind !== 'constructor'
      ) {
        continue;
      }
      for (const param of element.value.params) {
        if (param.type !== AST_NODE_TYPES.TSParameterProperty) continue;
        const inner =
          param.parameter.type === AST_NODE_TYPES.AssignmentPattern
            ? param.parameter.left
            : param.parameter;
        if (inner.type !== AST_NODE_TYPES.Identifier || inner.name !== key)
          continue;
        const annotation = writtenAnnotation(inner);
        return annotation === undefined
          ? 'unknown'
          : typeOrigin(valueAt(annotation, value.env), depth + 1, seen);
      }
      for (const statement of element.value.body?.body ?? []) {
        if (
          statement.type === AST_NODE_TYPES.ExpressionStatement &&
          statement.expression.type === AST_NODE_TYPES.AssignmentExpression &&
          statement.expression.left.type === AST_NODE_TYPES.MemberExpression &&
          statement.expression.left.object.type ===
            AST_NODE_TYPES.ThisExpression &&
          propertyName(statement.expression.left) === key
        ) {
          return classify(
            valueAt(statement.expression.right, value.env),
            depth + 1,
            seen,
          );
        }
      }
    }
    // An inherited member: `class PrismaService extends PrismaClient` has
    // every client member, so `this.user` / `this.$queryRawUnsafe` are ours.
    return classOrigin(cls, value, depth, seen) === 'ours' ? 'ours' : 'unknown';
  };

  /** A parameter: its annotation, or the driver call it is a callback of. */
  const parameterOrigin = (
    identifier: TSESTree.Node,
    fn: TSESTree.Node,
    value: Value,
    depth: number,
    seen: Seen,
  ): Origin => {
    const annotation = writtenAnnotation(identifier);
    if (annotation !== undefined) {
      return typeOrigin(valueAt(annotation, value.env), depth + 1, seen);
    }
    // `db.transaction(async (trx) => …)`: the driver hands the callback a
    // handle of its own.
    const call = fn.parent;
    if (
      call?.type === AST_NODE_TYPES.CallExpression &&
      call.callee.type === AST_NODE_TYPES.MemberExpression &&
      call.arguments.some((argument) => argument === fn) &&
      classify(valueAt(call.callee.object, value.env), depth + 1, seen) ===
        'ours'
    ) {
      return 'ours';
    }
    return 'unknown';
  };

  const identifierOrigin = (
    node: TSESTree.Identifier,
    value: Value,
    depth: number,
    seen: Seen,
  ): Origin => {
    const variable = lookup(node.name, value.scope);
    if (variable === null)
      return PLATFORM_GLOBALS.has(node.name) ? 'foreign' : 'unknown';
    // An implicit lib variable — `Map`, `Promise` — under the TS parser.
    if (variable.defs.length === 0) return 'foreign';
    const specifier = importSpecifierOf(variable);
    if (specifier !== null) {
      if (sourceMatches(specifier.source, modules)) return 'ours';
      if (!isRelativeSpecifier(specifier.source))
        return isPathAlias(specifier.source) ? 'unknown' : 'foreign';
      // A relative import: judged where the other module writes it.
      const followed = follow(value);
      const judged =
        followed.node === value.node ||
        followed.node.type === AST_NODE_TYPES.Program
          ? 'unknown'
          : classify(followed, depth + 1, seen);
      if (judged !== 'unknown') return judged;
      // Exported in a shape the walk cannot read — sequelize-cli's
      // `db[model.name] = model` loop — from a module that loads the driver
      // itself: the project's own database module.
      const origin = importOrigin(variable, value.env);
      return origin !== null && loadsDriver(origin.module.ast)
        ? 'ours'
        : judged;
    }
    const def = variable.defs[0];
    if (def.type === 'Parameter') {
      return parameterOrigin(
        variable.identifiers[0],
        def.node,
        value,
        depth,
        seen,
      );
    }
    if (def.type === 'ClassName') {
      return classOrigin(
        def.node as TSESTree.ClassDeclaration,
        value,
        depth,
        seen,
      );
    }
    if (def.type !== 'Variable') return 'foreign';
    const annotation = writtenAnnotation(def.node.id);
    if (annotation !== undefined) {
      const typed = typeOrigin(valueAt(annotation, value.env), depth + 1, seen);
      if (typed !== 'unknown') return typed;
    }
    const followed = follow(value);
    if (followed.node !== value.node)
      return classify(followed, depth + 1, seen);
    // Written more than once: ours when any write is.
    const writes = variable.references
      .filter((r) => r.isWrite() && r.writeExpr)
      .map((r) =>
        classify(
          valueAt(r.writeExpr as TSESTree.Node, value.env),
          depth + 1,
          seen,
        ),
      );
    return writes.length === 0 ? 'unknown' : writes.reduce(eitherOrigin);
  };

  function classify(value: Value, depth = 0, seen: Seen = new Set()): Origin {
    if (depth > MAX_FOLLOW_DEPTH || seen.has(value.node)) return 'unknown';
    seen.add(value.node);
    const node = unwrapTypeSyntax(value.node);
    const inner = (target: TSESTree.Node): Origin =>
      classify(valueAt(target, value.env), depth + 1, seen);

    switch (node.type) {
      case AST_NODE_TYPES.AwaitExpression:
        return inner(node.argument);
      case AST_NODE_TYPES.ChainExpression:
        return inner(node.expression);
      case AST_NODE_TYPES.Identifier:
        return identifierOrigin(node, valueAt(node, value.env), depth, seen);
      case AST_NODE_TYPES.ThisExpression:
        return thisOrigin(node, null, value, depth, seen);
      case AST_NODE_TYPES.MemberExpression: {
        if (node.object.type === AST_NODE_TYPES.ThisExpression)
          return thisOrigin(node, propertyName(node), value, depth, seen);
        // `import * as db from './db'; db.pool` — the named export.
        const followed = follow(valueAt(node, value.env));
        if (followed.node !== node) return classify(followed, depth + 1, seen);
        return inner(node.object);
      }
      case AST_NODE_TYPES.CallExpression: {
        const callee = follow(valueAt(node.callee, value.env));
        if (isFunctionNode(callee.node)) {
          const returned = returnedValue(callee.node);
          return returned === null
            ? 'unknown'
            : classify(valueAt(returned, callee.env), depth + 1, seen);
        }
        return inner(node.callee);
      }
      case AST_NODE_TYPES.NewExpression:
        return inner(node.callee);
      case AST_NODE_TYPES.ClassDeclaration:
      case AST_NODE_TYPES.ClassExpression:
        return classOrigin(node, value, depth, seen);
      case AST_NODE_TYPES.LogicalExpression:
        return eitherOrigin(inner(node.left), inner(node.right));
      case AST_NODE_TYPES.ConditionalExpression:
        return eitherOrigin(inner(node.consequent), inner(node.alternate));
      case AST_NODE_TYPES.Literal:
      case AST_NODE_TYPES.TemplateLiteral:
      case AST_NODE_TYPES.ObjectExpression:
      case AST_NODE_TYPES.ArrayExpression:
      case AST_NODE_TYPES.FunctionExpression:
      case AST_NODE_TYPES.ArrowFunctionExpression:
      case AST_NODE_TYPES.FunctionDeclaration:
        return 'foreign';
      default:
        return 'unknown';
    }
  }

  return Object.assign((value: Value) => classify(value), {
    ofType: (value: Value) => typeOrigin(value, 0, new Set()),
  });
}
