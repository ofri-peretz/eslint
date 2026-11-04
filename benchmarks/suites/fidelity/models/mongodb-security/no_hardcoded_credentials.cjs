const { tag, withTestFile } = require('../../lib.cjs');

const OPTS = {
  UserPassLiteral: "{ user: 'admin', pass: 'secretPassword123' }",
  PassOnly: "{ pass: 'secretPassword123' }",
  UserOnly: "{ user: 'admin', dbName: 'app' }",
  PasswordKey:
    "{ username: process.env.MONGO_USER, password: 'hunter2hunter2' }",
  AuthSourceOnly: "{ authSource: 'admin' }",
  AuthNested: "{ auth: { username: 'admin', password: 'hardcodedSecret' } }",
  TemplatePass: '{ user: process.env.MONGO_USER, pass: `secretPassword123` }',
  EnvUserLiteralPass:
    "{ user: process.env.MONGO_USER, pass: 'secretPassword123' }",
  FromEnv: '{ user: process.env.MONGO_USER, pass: process.env.MONGO_PASS }',
  FromConfig: '{ user: config.db.user, pass: config.db.pass }',
  AuthNestedEnv:
    '{ auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS } }',
  NoCredentials: "{ authMechanism: 'SCRAM-SHA-256', maxPoolSize: 10 }",
};

// Site -> (opts) -> code
const SITES = {
  MongooseConnect: (o) =>
    `import mongoose from 'mongoose';\nmongoose.connect(uri, ${o});`,
  RequireConnect: (o) =>
    `const mongoose = require('mongoose');\nmongoose.connect(uri, ${o});`,
  CreateConnection: (o) =>
    `import mongoose from 'mongoose';\nexport const conn = mongoose.createConnection(uri, ${o});`,
  NewMongoClient: (o) =>
    `import { MongoClient } from 'mongodb';\nexport const client = new MongoClient(uri, ${o});`,
  StaticClientConnect: (o) =>
    `import { MongoClient } from 'mongodb';\nexport const client = MongoClient.connect(uri, ${o});`,
  NoImport: (o) => `export const client = new MongoClient(uri, ${o});`,
  // The same objects as query filters / update documents / pipeline stages.
  ModelFindOne: (o) =>
    `import mongoose from 'mongoose';\nconst User = mongoose.model('User');\nexport const found = User.findOne(${o});`,
  CollectionUpdate: (o) =>
    `import { MongoClient } from 'mongodb';\nconst db = new MongoClient(uri).db('app');\nexport const res = db.collection('users').updateMany(${o}, { $set: ${o} });`,
  AggregateMatch: (o) =>
    `import mongoose from 'mongoose';\nconst User = mongoose.model('User');\nexport const rows = User.aggregate([{ $match: ${o} }]);`,
  BoundFilter: (o) =>
    `import mongoose from 'mongoose';\nconst User = mongoose.model('User');\nconst filter = ${o};\nexport const n = User.countDocuments(filter);`,
};

const base = {
  rule: 'no-hardcoded-credentials',
  domain: 120, // 10 sites x 12 option shapes
  traces: 1000,
  key: (s) => `${tag(s.site)}|${tag(s.opts)}`,
  code: (s) =>
    `import { config } from './config';\nconst uri = process.env.MONGODB_URI as string;\n${SITES[tag(s.site)](OPTS[tag(s.opts)])}\n`,
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
