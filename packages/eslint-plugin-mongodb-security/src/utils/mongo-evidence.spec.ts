/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the file-level Mongo evidence gate.
 *
 * Every rule in this plugin registers no visitors when `fileUsesMongo` is
 * false, so this predicate is a single point of failure in both directions: too
 * narrow and a security rule silently stops reporting, too wide and 47% of the
 * plugin's findings land in files with no Mongo in them (the measurement that
 * motivated the gate in the first place).
 *
 * The native-driver arm is the one under test here. It is the only arm that
 * matches a *shape* rather than a name or a specifier, which makes it the only
 * one that can collide with another vendor — Firestore spells its collection
 * handle exactly the same way.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';

import { fileUsesMongo, isNativeCollectionHandle } from './mongo-evidence';

function usesMongo(code: string): boolean {
  return fileUsesMongo(parse(code) as unknown as TSESTree.Program);
}

/** The receiver of the OUTERMOST member-call in `code`. */
function receiverOfOutermostCall(code: string): TSESTree.Node {
  const ast = parse(code) as unknown as TSESTree.Program;
  let receiver: TSESTree.Node | undefined;
  const walk = (node: TSESTree.Node): void => {
    if (
      receiver === undefined &&
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression'
    ) {
      receiver = node.callee.object;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && 'type' in child) {
            walk(child as TSESTree.Node);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        walk(value as TSESTree.Node);
      }
    }
  };
  walk(ast);
  if (!receiver) throw new Error(`no member CallExpression in: ${code}`);
  return receiver;
}

describe('fileUsesMongo — native driver collection handle', () => {
  it.each([
    // benchmarks/corpus/CWE-943/vulnerable/user-input-in-find.js
    [
      'the corpus findOne fixture',
      `async function login(req, res) {
         const user = await db.collection('users').findOne({
           username: req.body.username,
           password: req.body.password,
         });
         return user;
       }`,
    ],
    // benchmarks/corpus/CWE-943/vulnerable/where-string.js — caught through
    // `.toArray()`, since bare `find` is deliberately not in the method set.
    [
      'the corpus $where fixture, through the cursor terminal',
      `async function searchByName(req) {
         return db.collection('items').find({
           $where: \`this.name == '\${req.query.name}'\`,
         }).toArray();
       }`,
    ],
    ['a write', `db.collection('users').insertOne(doc);`],
    ['a bulk write', `db.collection('users').bulkWrite(ops);`],
    ['a count', `db.collection('users').countDocuments({});`],
    [
      'a handle reached through a longer chain',
      `client.db('app').collection('users').deleteMany({});`,
    ],
    [
      'an optional-chained handle',
      `db?.collection('users')?.updateOne(filter, patch);`,
    ],
    [
      'a handle stored on a member, then queried',
      `state.mongo.collection('users').findOneAndUpdate(f, u);`,
    ],
    // `db['collection']('users')` names the same collection the dotted form
    // does. This sat in the REJECTS table as "a computed `collection` access",
    // which read as a deliberate limit; it was a blind spot. The genuinely
    // unresolvable spellings — `db.collection(name)`, `db.collection(0)` —
    // stay rejected, and that is where the line belongs.
    [
      'a collection reached by a string subscript',
      `db['collection']('users').findOne({});`,
    ],
  ])('accepts %s', (_label, code) => {
    expect(usesMongo(code)).toBe(true);
  });

  it.each([
    // The reason `.collection('x')` alone is not evidence.
    [
      'a Firestore document read',
      `const snap = await db.collection('users').doc(id).get();`,
    ],
    [
      'a Firestore query',
      `db.collection('users').where('name', '==', name).limit(10).get();`,
    ],
    ['a Firestore write', `db.collection('users').add({ name });`],
    // Both rejected from the method set on purpose.
    [
      'a bare find — Array.prototype.find owns that name',
      `db.collection('users').find({ role: 'admin' });`,
    ],
    [
      'aggregate — Firestore Query.aggregate() exists',
      `db.collection('users').aggregate(pipeline);`,
    ],
    // The handle itself has to be there.
    ['a query on a plain identifier', `users.findOne({ _id: id });`],
    ['a bare call with no receiver', `findOne({ _id: id });`],
    ['a computed method name', `db.collection('users')['findOne']({});`],
    ['a free `collection()` function', `collection('users').findOne({});`],
    ['a different method on the object', `db.table('users').findOne({});`],
    ['a collection named by a variable', `db.collection(name).findOne({});`],
    ['a collection named by a number', `db.collection(0).findOne({});`],
    ['a collection with no name at all', `db.collection().findOne({});`],
  ])('rejects %s', (_label, code) => {
    expect(usesMongo(code)).toBe(false);
  });
});

/**
 * The handle test on its own is deliberately **vendor-agnostic** — it answers
 * "is this chain rooted at `.collection('name')`?" and nothing more. The
 * discrimination against Firestore lives entirely in
 * `NATIVE_COLLECTION_METHODS`, exercised through `fileUsesMongo` above.
 *
 * That is the right split for its second consumer, `require-lean-queries`:
 * `.lean()` is a Mongoose query modifier, so it applies to *nothing* reached
 * through a `.collection('name')` handle, whichever vendor's handle it is.
 */
describe('isNativeCollectionHandle', () => {
  it.each([
    ['the handle itself', `db.collection('users').findOne({});`],
    ['a cursor derived from it', `db.collection('items').find({}).toArray();`],
    ['a longer chain', `client.db('app').collection('u').findOne({});`],
    ['a Firestore document reference', `db.collection('u').doc(id).get();`],
  ])('accepts %s as a collection-rooted receiver', (_label, code) => {
    expect(isNativeCollectionHandle(receiverOfOutermostCall(code))).toBe(true);
  });

  it.each([
    ['a Mongoose model', `User.find({ active: true });`],
    ['a `this` receiver', `this.userModel.find({});`],
    ['a non-literal collection name', `db.collection(name).findOne({});`],
  ])('rejects %s', (_label, code) => {
    expect(isNativeCollectionHandle(receiverOfOutermostCall(code))).toBe(false);
  });
});
