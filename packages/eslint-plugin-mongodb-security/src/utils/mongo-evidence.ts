/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Packages that put a MongoDB or Mongoose handle in a file.
 *
 * The plugin ecosystem is included by pattern, not just the four core packages.
 * Mongoose plugins are consumed as `mongoose-paginate`, `mongoose-delete`,
 * `mongoose-lean-virtuals`, `passport-local-mongoose` and so on, and a file
 * that imports one is unambiguously a Mongoose file even when it never imports
 * `mongoose` itself. Measured on the corpus this is not a hypothetical: of the
 * twelve files containing `new Schema(` that the four-package list placed
 * outside Mongo, **eleven were exactly these plugin consumers**.
 */
const MONGO_PACKAGES: ReadonlySet<string> = new Set([
  'mongodb',
  'mongoose',
  '@nestjs/mongoose',
  '@typegoose/typegoose',
  'mongodb-client-encryption',
  'bson',
  'connect-mongo',
]);

/** `mongoose-paginate`, `passport-local-mongoose`, `@types/mongoose`. */
const MONGO_PACKAGE_PATTERN = /(^|[-@/])mongoose($|[-/])|^mongodb-/;

function isMongoSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return MONGO_PACKAGES.has(root) || MONGO_PACKAGE_PATTERN.test(root);
}

/**
 * Whether a scope-introducing node binds the name `require`.
 *
 * Lexical, propagated down the walk — never a file-wide flag. See #483: a
 * file-wide flag reads `const m = require('mongoose'); function w(require) {}`
 * as fully shadowed and silences every rule in the plugin, which converts a
 * false positive into a false negative.
 */
function bindsRequire(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return node.params.some(
      (p) => p.type === AST_NODE_TYPES.Identifier && p.name === 'require',
    );
  }
  if (
    node.type === AST_NODE_TYPES.Program ||
    node.type === AST_NODE_TYPES.BlockStatement
  ) {
    return node.body.some(
      (stmt) =>
        stmt.type === AST_NODE_TYPES.VariableDeclaration &&
        stmt.declarations.some(
          (d) =>
            d.id.type === AST_NODE_TYPES.Identifier && d.id.name === 'require',
        ),
    );
  }
  return false;
}

/** A string literal whose value names a Mongo package. */
function isMongoLiteral(node: TSESTree.Node | undefined): boolean {
  return (
    node?.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string' &&
    isMongoSpecifier(node.value)
  );
}

/**
 * `require('mongoose')` and `await import('mongodb')`.
 *
 * Written as early returns rather than one nested ternary: each condition is
 * then a branch a single test can target, and the shadowed-`require` case is
 * visibly its own line rather than a short-circuit buried mid-expression.
 */
function isMongoDynamicLoad(
  node: TSESTree.Node,
  requireIsShadowed: boolean,
): boolean {
  if (node.type === AST_NODE_TYPES.ImportExpression) {
    return isMongoLiteral(node.source);
  }
  // A locally bound `require` is a parameter or variable, not module loading.
  if (requireIsShadowed) return false;
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  if (
    node.callee.type !== AST_NODE_TYPES.Identifier ||
    node.callee.name !== 'require'
  ) {
    return false;
  }
  return isMongoLiteral(node.arguments[0]);
}

/** `new Schema({...})` / `new mongoose.Schema({...})`. */
function isSchemaConstruction(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.NewExpression) return false;
  const { callee } = node;
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name === 'Schema';
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === 'Schema'
  );
}

/**
 * `Types.ObjectId` and `new ObjectId(...)`.
 *
 * The **qualified** and **constructed** forms only. A bare `ObjectId`
 * identifier is a type name in a dozen unrelated libraries; `Types.ObjectId` is
 * Mongoose's own namespace and `new ObjectId()` is the BSON constructor.
 */
function isObjectIdEvidence(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'Types' &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'ObjectId'
  ) {
    return true;
  }
  return (
    node.type === AST_NODE_TYPES.NewExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'ObjectId'
  );
}

/**
 * A binding literally named `mongoose` / `Mongoose`, whatever it was assigned
 * from.
 *
 * This arm exists to close the one false negative the previous gate shipped
 * with: `const mongoose = require('./config/mongoose')` — a **relative** import
 * of a local wrapper, which carries no package specifier for the import arm to
 * find. That layout is common enough that documenting it as an accepted FN was
 * the wrong call; a security rule that silently stops reporting is the failure
 * this ecosystem exists to prevent.
 *
 * The name is safe evidence in a way `db`, `collection` and `model` are not —
 * those are generic, `mongoose` is a product name. Measured over the corpus:
 * **58 files bind this identifier, 57 already import a Mongo package, and the
 * 58th is exactly the false negative.** The arm therefore opens the gate on one
 * additional file and introduces no new one.
 *
 * A *relative import that merely ends in `/mongoose`* is deliberately not
 * enough on its own — it is the binding name that is checked, so
 * `import x from './mongoose'` where the local name is `x` still does not
 * qualify.
 */
function bindsMongooseName(node: TSESTree.Node): boolean {
  const named = (name: string): boolean =>
    name === 'mongoose' || name === 'Mongoose';
  if (node.type === AST_NODE_TYPES.VariableDeclarator) {
    return node.id.type === AST_NODE_TYPES.Identifier && named(node.id.name);
  }
  if (node.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
      node.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
      node.type === AST_NODE_TYPES.ImportSpecifier) {
    return named(node.local.name);
  }
  return false;
}

/** `.lean()` — Mongoose's own query modifier, with no analogue elsewhere. */
function isLeanCall(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'lean' &&
    node.arguments.length === 0
  );
}

/**
 * A `mongodb://` or `mongodb+srv://` connection string, **anywhere in the
 * string** rather than only at its start.
 *
 * Anchoring to the start looked tidier and lost real files: env-file
 * generators write `'MONGODB_URL=mongodb://127.0.0.1/db'` and
 * `` `\nMONGODB_URL=mongodb://localhost:27017/dbname` ``, both of which name
 * the protocol just as plainly as a bare DSN. Two corpus files were silenced
 * by the anchor before the recall diff caught it.
 */
const MONGO_DSN = /mongodb(\+srv)?:\/\//;

function isConnectionString(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string' &&
    MONGO_DSN.test(node.value)
  ) {
    return true;
  }
  return (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.quasis.some((q) => MONGO_DSN.test(q.value.raw))
  );
}

/**
 * `import mongoose = require('mongoose')` — TypeScript's import-equals form.
 *
 * Not a `CallExpression`: the AST is a `TSImportEqualsDeclaration` whose
 * `moduleReference` is a `TSExternalModuleReference` wrapping the literal, so
 * the `require`-call arm never sees it. DefinitelyTyped writes almost every
 * CommonJS type test this way, and three corpus files were silenced by the
 * omission until the recall diff surfaced them.
 */
function isImportEquals(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
    node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference &&
    node.moduleReference.expression.type === AST_NODE_TYPES.Literal &&
    typeof node.moduleReference.expression.value === 'string' &&
    isMongoSpecifier(node.moduleReference.expression.value)
  );
}

const cache = new WeakMap<TSESTree.Program, boolean>();

/**
 * Whether this file has MongoDB or Mongoose in it.
 *
 * Measured over the corpus, **47% of everything this plugin reported (1,663 of
 * 3,542 findings) was in a file with no Mongo import**. The plugin already
 * discriminates by *receiver* (see `receiver.ts`), but that is a name
 * heuristic: `userModel.findOne()` matches it just as well in a TypeORM
 * repository as in a Mongoose one. The file-level question is the one it could
 * not ask.
 *
 * **This gate is a union, unlike vercel-ai's, and the corpus is why.** An
 * import-only probe was correct for the AI SDK because every no-import caller
 * turned out to be a different vendor. Here the opposite risk dominates: the
 * idiomatic Mongoose layout defines a model in one file and consumes it through
 * a **relative** import, so a service calling `User.findOne()` has no package
 * specifier to find. Silencing those is a false negative in a security plugin.
 *
 * The non-import arms were each chosen by measurement, and two obvious
 * candidates were **rejected**:
 *
 *   - `$set` / `$push` / `$inc` object keys look Mongo-specific and are not.
 *     `$push` is `react-addons-update`'s immutability helper, `$set` is jQuery
 *     UI, and `$addToSet` is Meteor's minimongo. All three appear in the corpus.
 *   - a bare `ObjectId` identifier is a type name in unrelated libraries, so
 *     only the qualified `Types.ObjectId` and constructed `new ObjectId()`
 *     forms count.
 *
 * Everything accepted is local to the file: nothing is read from
 * `package.json`, nothing is resolved across files, so there is no project
 * state to go stale and no dependency on lint order.
 */
export function fileUsesMongo(ast: TSESTree.Program): boolean {
  const cached = cache.get(ast);
  if (cached !== undefined) return cached;
  const result = computeUsesMongo(ast);
  cache.set(ast, result);
  return result;
}

function computeUsesMongo(ast: TSESTree.Program): boolean {
  let found = false;

  const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isMongoSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (
      isImportEquals(node) ||
      bindsMongooseName(node) ||
      isMongoDynamicLoad(node, requireIsShadowed) ||
      isSchemaConstruction(node) ||
      isObjectIdEvidence(node) ||
      isLeanCall(node) ||
      isConnectionString(node)
    ) {
      found = true;
      return;
    }
    const shadowedHere = requireIsShadowed || bindsRequire(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            visit(child as TSESTree.Node, shadowedHere);
            if (found) return;
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        typeof (value as TSESTree.Node).type === 'string'
      ) {
        visit(value as TSESTree.Node, shadowedHere);
        if (found) return;
      }
    }
  };

  visit(ast, false);
  return found;
}
