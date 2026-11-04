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
};

const base = {
  rule: 'no-hardcoded-credentials',
  domain: 72, // 6 sites x 12 option shapes
  traces: 560,
  key: (s) => `${tag(s.site)}|${tag(s.opts)}`,
  code: (s) =>
    `import { config } from './config';\nconst uri = process.env.MONGODB_URI as string;\n${SITES[tag(s.site)](OPTS[tag(s.opts)])}\n`,
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
