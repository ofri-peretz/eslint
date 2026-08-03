/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the shared receiver analysis. Every rule that keys off a
 * method name delegates its "is this actually MongoDB?" question here, so this
 * is the one place the discrimination is pinned down directly.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';

import { analyzeMongoScope, hasPredicateArgument } from './receiver';

/** Parse `code` and hand back the scope plus its last CallExpression. */
function analyze(code: string): {
  isModel: boolean;
  isConnection: boolean;
  bindings: ReadonlySet<string>;
} {
  const ast = parse(code, { range: true, loc: true }) as unknown as TSESTree.Program;
  const scope = analyzeMongoScope(ast);

  let target: TSESTree.CallExpression | undefined;
  const walk = (node: TSESTree.Node): void => {
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      target = node;
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
  walk(ast);
  if (!target) throw new Error(`no member CallExpression in: ${code}`);

  return {
    isModel: scope.isModelReceiver(target),
    isConnection: scope.isConnectionReceiver(target),
    bindings: scope.bindings,
  };
}

describe('analyzeMongoScope — model receivers', () => {
  it.each([
    ['PascalCase model identifier', `User.find({});`],
    ['`this.model` property name', `this.model.find(filter);`],
    ['`db.collection(...)` chain', `db.collection('users').find({});`],
    ['a `db.<name>` chain', `db.users.find({});`],
    ['a mongoose import binding', `import mongoose from 'mongoose';\nmongoose.find({});`],
    ['a TS `as` cast around the receiver', `(model as Model<T>).find(filter);`],
    ['a non-null assertion', `db!.users.find({});`],
    ['optional chaining', `db?.users?.find({});`],
    // The idiomatic NestJS injection: @InjectModel(User.name) private userModel
    ['a `*Model` suffixed property', `this.userModel.find(filter);`],
    ['a `*Model` suffixed identifier', `catModel.find(filter);`],
    ['a `*Collection` suffixed property', `this.usersCollection.find(filter);`],
  ])('accepts %s', (_label, code) => {
    expect(analyze(code).isModel).toBe(true);
  });

  it.each([
    ['an array literal', `[a, b].find(Boolean);`],
    ['an arrow predicate', `permissions.find((p) => p.name === name);`],
    ['a function-expression predicate', `list.find(function (x) { return x; });`],
    ['the `find(Boolean)` idiom', `candidates.find(Boolean);`],
    ['a camelCase collection-shaped name', `sortList.find(0);`],
    ['a bare `this` receiver', `this.findById(id);`],
    ['a generic repository wrapper', `this.repository.find({ where: filter });`],
    ['a repository named after a domain entity', `birdRepository.findById(id);`],
    ['a computed member receiver', `wrappers[key].find(0);`],
    ['a non-Mongo call chain', `getContext().find(0);`],
    ['SCREAMING_CASE (a constant, not a model)', `ROLES.find(0);`],
    // PascalCase means "Mongoose model" for a module-level identifier, not for
    // an instance property — injected services are reached through `this`.
    ['a PascalCase DI property on `this`', `this.UserRepository.findOne({ id });`],
    ['a PascalCase DI service on `this`', `this.UserService.findOne({ id });`],
  ])('rejects %s', (_label, code) => {
    expect(analyze(code).isModel).toBe(false);
  });
});

describe('analyzeMongoScope — connection receivers', () => {
  it.each([
    ['a mongoose default import', `import mongoose from 'mongoose';\nmongoose.connect(url);`],
    [
      'a named mongodb import',
      `import { MongoClient } from 'mongodb';\nMongoClient.connect(url);`,
    ],
    [
      'a namespace mongodb import',
      `import * as mongo from 'mongodb';\nmongo.connect(url);`,
    ],
    ['an inline `new MongoClient(...)`', `new MongoClient(uri).connect();`],
    [
      'a variable holding a MongoClient',
      `import { MongoClient } from 'mongodb';\nconst client = new MongoClient(uri);\nclient.connect();`,
    ],
    [
      'a CommonJS require',
      `const mongoose = require('mongoose');\nmongoose.connect(url);`,
    ],
    [
      'a destructured require',
      `const { MongoClient } = require('mongodb');\nconst c = new MongoClient(u);\nc.connect();`,
    ],
    [
      'a value derived from an awaited Mongo call',
      `import mongoose from 'mongoose';\nconst conn = await mongoose.createConnection(url);\nconn.connect();`,
    ],
    ['a `mongo`-prefixed name', `mongoClient.connect();`],
  ])('accepts %s', (_label, code) => {
    expect(analyze(code).isConnection).toBe(true);
  });

  it.each([
    ['a Redis client', `const client = createClient({ url });\nclient.connect();`],
    ['a TypeORM query runner', `const queryRunner = mgr.createQueryRunner();\nqueryRunner.connect();`],
    ['a pino logger', `logger.connect(level);`],
    ['a non-Mongo constructor', `new Redis(url).connect();`],
    ['a require of an unrelated package', `const redis = require('redis');\nredis.connect();`],
    // A model handle is not automatically a connection handle: `client` and
    // `connection` are just as likely Redis or Postgres.
    ['a PascalCase identifier', `Database.connect(url);`],
  ])('rejects %s', (_label, code) => {
    expect(analyze(code).isConnection).toBe(false);
  });

  it.each([
    ['a declarator with no initialiser', `let client;\nclient.connect();`],
    ['an array destructure of a require', `const [c] = require('mongodb');\nc.connect();`],
    ['a rest element in a destructured require', `const { ...rest } = require('mongodb');\nrest.connect();`],
    ['a require with a non-literal argument', `const m = require(name);\nm.connect();`],
  ])('binds nothing from %s', (_label, code) => {
    expect(analyze(code).isConnection).toBe(false);
  });

  it('ignores non-Mongo imports when collecting bindings', () => {
    const { bindings } = analyze(`import { Repository } from 'typeorm';\nrepo.find(0);`);
    expect(bindings.has('Repository')).toBe(false);
  });
});

describe('analyzeMongoScope — a call with no receiver at all', () => {
  it('is neither a model nor a connection', () => {
    const ast = parse(`find({}); connect(url);`) as unknown as TSESTree.Program;
    const scope = analyzeMongoScope(ast);
    for (const stmt of ast.body) {
      const call = (stmt as TSESTree.ExpressionStatement).expression as TSESTree.CallExpression;
      expect(scope.isModelReceiver(call)).toBe(false);
      expect(scope.isConnectionReceiver(call)).toBe(false);
    }
  });
});

describe('analyzeMongoScope — caching', () => {
  it('returns the same scope for a Program it has already seen', () => {
    const ast = parse(`import mongoose from 'mongoose';`) as unknown as TSESTree.Program;
    expect(analyzeMongoScope(ast)).toBe(analyzeMongoScope(ast));
  });
});

describe('hasPredicateArgument', () => {
  it('is false for a call with no arguments', () => {
    const ast = parse(`User.find();`) as unknown as TSESTree.Program;
    const stmt = ast.body[0] as TSESTree.ExpressionStatement;
    expect(hasPredicateArgument(stmt.expression as TSESTree.CallExpression)).toBe(false);
  });

  it('is false for a filter object', () => {
    const ast = parse(`User.find({ a: 1 });`) as unknown as TSESTree.Program;
    const stmt = ast.body[0] as TSESTree.ExpressionStatement;
    expect(hasPredicateArgument(stmt.expression as TSESTree.CallExpression)).toBe(false);
  });
});
