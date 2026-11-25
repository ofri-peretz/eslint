/**
 * no-bypass-middleware is about Mongoose middleware, so it reports only where
 * Mongoose is in play. Found linting open-source Node apps: an app that wraps
 * the native `mongodb` driver produced 301 reports on
 * `db.collection('x').updateOne(...)`, a call that has no `pre('updateOne')`
 * hook to bypass. These fixtures are reduced from that code; every exemption
 * has an invalid lookalike that must keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noBypassMiddleware } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

const NATIVE = `const { MongoClient, ObjectId } = require('mongodb');\n`;
const MONGOOSE = `import mongoose from 'mongoose';\n`;

ruleTester.run(
  'no-bypass-middleware (native driver is silent)',
  noBypassMiddleware,
  {
    valid: [
      {
        name: 'a native collection chain in a file that only uses mongodb',
        code:
          NATIVE +
          `countlyDb.collection('apps').updateOne({ _id: countlyDb.ObjectID(req.body.id) }, { $set: { has_image: true } }, function () {});`,
      },
      {
        name: 'a native bulk removal with a callback, driver imported by ESM',
        code: `import { MongoClient } from 'mongodb';\ndb.collection('jobs').deleteMany(query, (err, result) => {});`,
      },
      {
        name: 'an awaited native findOneAndUpdate',
        code:
          NATIVE +
          `async function f() { return db.collection('plugins').findOneAndUpdate({ _id: 'x' }, { $set: { a: 1 } }); }`,
      },
      {
        name: 'a native handle held in a variable named collection',
        code:
          NATIVE +
          `const collection = db.collection('docs');\nasync function f(buffer) { return collection.insertMany(buffer); }`,
      },
      {
        name: 'a PascalCase wrapper that takes the database as an argument',
        code:
          NATIVE +
          `async function cancel(ids) { return Job.updateMany(this.db(), { _id: { $in: ids } }, { $set: { status: 1 } }); }`,
      },
      {
        name: 'a native collection handle in a file that also imports mongoose',
        code:
          MONGOOSE +
          `mongoose.connection.collection('events').updateMany({}, { $set: { seen: true } });`,
      },
      {
        name: 'a computed method on a collection taken from a mongoose connection',
        code:
          MONGOOSE +
          `async function f() { return mongoose.connection.collection('audit')['updateOne']({}, {}); }`,
      },
      {
        name: 'a bson-only file',
        code: `import { ObjectId } from 'bson';\nconst id = new ObjectId(raw);\nUser.updateOne({ _id: id }, {});`,
      },
    ],
    invalid: [
      {
        name: 'the same call on a Mongoose model still reports',
        code:
          MONGOOSE + `User.updateOne({ _id: id }, { password: req.body.p });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'importing mongodb as well does not exempt a Mongoose model',
        code:
          `import { MongoClient } from 'mongodb';\n` +
          MONGOOSE +
          `User.updateMany({ role: 'user' }, { verified: true });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'a mongoose plugin import is Mongoose evidence',
        code: `import paginate from 'mongoose-paginate-v2';\nUser.findOneAndUpdate({ _id: id }, { x: 1 });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'a nest binding is Mongoose evidence',
        code: `import { InjectModel } from '@nestjs/mongoose';\nUser.findByIdAndUpdate(id, { x: 1 });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'typegoose is Mongoose evidence',
        code: `import { getModelForClass } from '@typegoose/typegoose';\nUser.deleteMany({ banned: true });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'new Schema is Mongoose evidence without any import',
        code: `const schema = new Schema({ name: String });\nUser.findByIdAndDelete(id);`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        name: 'a native handle in the same file does not hide a model call',
        code:
          MONGOOSE +
          `mongoose.connection.collection('events').updateMany({}, {});\nUser.updateMany({ role: 'user' }, { verified: true });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
    ],
  },
);
