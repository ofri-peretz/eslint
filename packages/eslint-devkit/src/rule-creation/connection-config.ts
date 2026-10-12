/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared evidence for the two connection-config detectors (TLS, credentials).
 *
 * Both scan object literals shaped like a database connection. Three things
 * decide whether one is the driver's, and none of them is a name:
 *
 *   - the FILE loads the driver, or holds the driver's own config-file shape
 *     with no import at all — a knexfile (`{ client: 'pg', connection }`), a
 *     sequelize-cli `config.js` (`{ dialect: 'mysql', username }`), a TypeORM
 *     `ormconfig.js` (`{ type: 'mysql', entities }`). The key and its value
 *     set are the library's documented contract;
 *   - the object is not handed to ANOTHER library: `new https.Agent({ host,
 *     rejectUnauthorized: false })` in a file that also imports mysql2 is an
 *     HTTPS client, and another plugin's finding;
 *   - a value is followed to where it is written, so `ssl: sslOptions` and
 *     `password: process.env.DB_PASSWORD || 'root'` are read, not skipped.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { objectKeyName } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { type Origin } from './driver-origin';
import { type ExtraEvidence } from './module-evidence';
import { type Env, type Value, follow, valueAt } from './value-follow';

/**
 * A driver's config-file contract: an object whose `key` holds one of
 * `values`, beside at least one of `with`.
 */
export interface ConfigShape {
  readonly key: string;
  readonly values: readonly string[];
  readonly with: readonly string[];
}

/** Evidence that a file holds one of the driver's config-file shapes. */
export function configShapeEvidence(
  shapes: readonly ConfigShape[],
): ExtraEvidence | undefined {
  if (shapes.length === 0) return undefined;
  return (node) => {
    if (node.type !== AST_NODE_TYPES.ObjectExpression) return false;
    const keys = new Map<string, TSESTree.Node>();
    for (const property of node.properties) {
      if (property.type !== AST_NODE_TYPES.Property) continue;
      const key = objectKeyName(property);
      if (key !== null) keys.set(key, property.value);
    }
    return shapes.some((shape) => {
      const value = keys.get(shape.key);
      return (
        value?.type === AST_NODE_TYPES.Literal &&
        typeof value.value === 'string' &&
        shape.values.includes(value.value) &&
        shape.with.some((key) => keys.has(key))
      );
    });
  };
}

/**
 * Is this object literal an argument to a call or `new` whose callee is
 * provably another library's — `new https.Agent({…})`, `axios.create({…})`?
 */
export function passedToForeign(
  object: TSESTree.ObjectExpression,
  originOf: (value: Value) => Origin,
  env: Env,
): boolean {
  const parent = object.parent;
  return (
    (parent?.type === AST_NODE_TYPES.CallExpression ||
      parent?.type === AST_NODE_TYPES.NewExpression) &&
    parent.arguments.some((argument) => argument === object) &&
    originOf(valueAt(parent.callee, env)) === 'foreign'
  );
}

/**
 * The values a configuration property can take: the value itself, both arms
 * of a ternary, both sides of `||` / `??`, each followed to where it is
 * written. Each comes back with the environment it must be read in — a value
 * defined in another module cannot be reported there.
 */
export function possibleValues(value: Value, depth = 0): Value[] {
  if (depth > 8) return [value];
  const node = unwrapTypeSyntax(value.node);
  if (node.type === AST_NODE_TYPES.ConditionalExpression) {
    return [
      ...possibleValues(valueAt(node.consequent, value.env), depth + 1),
      ...possibleValues(valueAt(node.alternate, value.env), depth + 1),
    ];
  }
  if (node.type === AST_NODE_TYPES.LogicalExpression) {
    return [
      ...possibleValues(valueAt(node.left, value.env), depth + 1),
      ...possibleValues(valueAt(node.right, value.env), depth + 1),
    ];
  }
  if (
    node.type === AST_NODE_TYPES.Identifier ||
    node.type === AST_NODE_TYPES.MemberExpression
  ) {
    const followed = follow(value);
    if (followed.node !== value.node)
      return possibleValues(followed, depth + 1);
  }
  return [valueAt(node, value.env)];
}
