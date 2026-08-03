/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Receiver analysis shared by the query/connection rules.
 *
 * Method names alone are hopeless discriminators: `find` is also
 * `Array.prototype.find`, `connect` is also a Redis client and a TypeORM
 * query runner, and `findOne`/`updateOne` are the standard vocabulary of every
 * generic repository wrapper ever written. Naming another database's
 * connection "MongoDB" is worse than staying silent, so every rule that keys
 * off a method name asks here whether the *receiver* is plausibly MongoDB.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/** Packages whose exports are MongoDB/Mongoose handles. */
const MONGO_MODULES = new Set(['mongodb', 'mongoose', 'mongodb-client-encryption']);

/** Identifiers that read as a Mongo model/collection/database handle. */
const MONGO_HANDLE_NAME = /^(db|database|model|models|collection|collections|schema|document|documents)$/i;

/** Identifiers that read as a Mongo *connection* handle. */
const MONGO_CONNECTION_NAME = /^mongo/i;

/** Constructors that produce a Mongo connection. */
const MONGO_CONSTRUCTORS = new Set(['MongoClient', 'Mongoose']);

/**
 * A Mongoose model is PascalCase by universal convention (`User.find(...)`).
 * `SCREAMING_CASE` is excluded — those are constants, not models.
 */
function isModelStyleName(name: string): boolean {
  return /^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name);
}

/** Strip the wrappers that TypeScript syntax adds around an expression. */
function unwrap(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  for (;;) {
    if (
      current.type === AST_NODE_TYPES.TSAsExpression ||
      current.type === AST_NODE_TYPES.TSNonNullExpression ||
      current.type === AST_NODE_TYPES.TSSatisfiesExpression ||
      current.type === AST_NODE_TYPES.TSInstantiationExpression
    ) {
      current = current.expression;
      continue;
    }
    if (current.type === AST_NODE_TYPES.ChainExpression) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/** Every identifier name along a member chain: `db.users` -> ['db', 'users']. */
function chainNames(node: TSESTree.Node): string[] {
  const names: string[] = [];
  let current = unwrap(node);
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    if (!current.computed && current.property.type === AST_NODE_TYPES.Identifier) {
      names.unshift(current.property.name);
    }
    current = unwrap(current.object);
  }
  if (current.type === AST_NODE_TYPES.Identifier) {
    names.unshift(current.name);
  }
  return names;
}

export interface MongoScope {
  /** Local names bound to a mongodb/mongoose import or a MongoClient value. */
  readonly bindings: ReadonlySet<string>;
  /** Is `node`'s receiver plausibly a Mongo model or collection? */
  isModelReceiver(node: TSESTree.CallExpression): boolean;
  /** Is `node`'s receiver plausibly a Mongo client/connection? */
  isConnectionReceiver(node: TSESTree.CallExpression): boolean;
}

/**
 * `Array.prototype.find` takes a predicate; a Mongo `find()` takes a filter
 * object. A function argument — or the `find(Boolean)` idiom — is therefore a
 * decisive "this is an array" signal on its own.
 */
export function hasPredicateArgument(node: TSESTree.CallExpression): boolean {
  const first = node.arguments[0];
  if (!first) return false;
  if (
    first.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    first.type === AST_NODE_TYPES.FunctionExpression
  ) return true;
  return first.type === AST_NODE_TYPES.Identifier && first.name === 'Boolean';
}

function collectBindings(program: TSESTree.Program): Set<string> {
  const bindings = new Set<string>();

  const addPattern = (pattern: TSESTree.Node): void => {
    if (pattern.type === AST_NODE_TYPES.Identifier) bindings.add(pattern.name);
    else if (pattern.type === AST_NODE_TYPES.ObjectPattern) {
      for (const prop of pattern.properties) {
        if (prop.type === AST_NODE_TYPES.Property) addPattern(prop.value);
      }
    }
  };

  const isMongoSource = (node: TSESTree.Node | null | undefined): boolean => {
    if (!node) return false;
    const expr = unwrap(node);
    // require('mongodb') / require('mongoose')
    if (
      expr.type === AST_NODE_TYPES.CallExpression &&
      expr.callee.type === AST_NODE_TYPES.Identifier &&
      expr.callee.name === 'require' &&
      expr.arguments[0]?.type === AST_NODE_TYPES.Literal &&
      typeof expr.arguments[0].value === 'string'
    ) return MONGO_MODULES.has(expr.arguments[0].value);
    // new MongoClient(uri)
    if (
      expr.type === AST_NODE_TYPES.NewExpression &&
      expr.callee.type === AST_NODE_TYPES.Identifier
    ) return MONGO_CONSTRUCTORS.has(expr.callee.name);
    // mongoose.createConnection(...) / client.db(...) — anything rooted in a
    // name we already know to be Mongo.
    if (expr.type === AST_NODE_TYPES.CallExpression) {
      const names = chainNames(expr.callee);
      return names.length > 0 && bindings.has(names[0]);
    }
    if (expr.type === AST_NODE_TYPES.AwaitExpression) return isMongoSource(expr.argument);
    return false;
  };

  const walk = (node: TSESTree.Node): void => {
    if (node.type === AST_NODE_TYPES.ImportDeclaration) {
      if (typeof node.source.value === 'string' && MONGO_MODULES.has(node.source.value)) {
        for (const spec of node.specifiers) bindings.add(spec.local.name);
      }
      return;
    }
    if (node.type === AST_NODE_TYPES.VariableDeclarator && isMongoSource(node.init)) {
      addPattern(node.id);
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && 'type' in child) walk(child as TSESTree.Node);
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        walk(value as TSESTree.Node);
      }
    }
  };

  walk(program);
  return bindings;
}

const cache = new WeakMap<TSESTree.Program, MongoScope>();

/**
 * Analyze a file once (cached per Program) so every rule in the plugin shares
 * one answer about what is and is not a MongoDB handle.
 */
export function analyzeMongoScope(program: TSESTree.Program): MongoScope {
  const cached = cache.get(program);
  if (cached) return cached;

  const bindings = collectBindings(program);

  const receiverOf = (node: TSESTree.CallExpression): TSESTree.Node | null =>
    node.callee.type === AST_NODE_TYPES.MemberExpression ? unwrap(node.callee.object) : null;

  const scope: MongoScope = {
    bindings,

    isModelReceiver(node) {
      const receiver = receiverOf(node);
      if (!receiver) return false;
      // `[a, b].find(...)` is an array, full stop.
      if (receiver.type === AST_NODE_TYPES.ArrayExpression) return false;
      // A bare `this.find(...)` is a repository wrapper calling itself.
      if (receiver.type === AST_NODE_TYPES.ThisExpression) return false;
      if (hasPredicateArgument(node)) return false;

      // `db.collection('users').find(...)` — the chain that produced the
      // receiver names a Mongo handle.
      if (receiver.type === AST_NODE_TYPES.CallExpression) {
        return chainNames(receiver.callee).some(
          (name) => bindings.has(name) || MONGO_HANDLE_NAME.test(name),
        );
      }

      const names = chainNames(receiver);
      if (names.length === 0) return false;
      return names.some(
        (name) => bindings.has(name) || MONGO_HANDLE_NAME.test(name) || isModelStyleName(name),
      );
    },

    isConnectionReceiver(node) {
      const receiver = receiverOf(node);
      if (!receiver) return false;
      if (receiver.type === AST_NODE_TYPES.NewExpression) {
        return (
          receiver.callee.type === AST_NODE_TYPES.Identifier &&
          MONGO_CONSTRUCTORS.has(receiver.callee.name)
        );
      }
      const names = chainNames(receiver);
      // Unlike models, a connection handle gets no name-shape benefit of the
      // doubt: `client`/`connection` are just as likely Redis or Postgres.
      return names.some((name) => bindings.has(name) || MONGO_CONNECTION_NAME.test(name));
    },
  };

  cache.set(program, scope);
  return scope;
}
