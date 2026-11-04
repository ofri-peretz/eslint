const { tag } = require('../../lib.cjs');
const { withConnTestFiles } = require('../../mongodb.cjs');

// Conn -> argument list
const CONNS = {
  PlainLiteral: "'mongodb://db.example.com:27017/app'",
  OptsTlsFalse: 'uri, { tls: false }',
  OptsSslFalse: 'uri, { ssl: false }',
  UriTlsFalse: "'mongodb://db.example.com/app?tls=false'",
  SrvUriTlsFalse: "'mongodb+srv://cluster0.example.mongodb.net/app?tls=false'",
  SrvOptsTlsFalse:
    "'mongodb+srv://cluster0.example.mongodb.net/app', { tls: false }",
  OptsTlsTrue: 'uri, { tls: true }',
  OptsSslTrue: 'uri, { ssl: true }',
  SrvLiteral: "'mongodb+srv://cluster0.example.mongodb.net/app'",
  UriTlsTrue: "'mongodb://db.example.com/app?tls=true'",
  UriSslTrue: "'mongodb://db.example.com/app?retryWrites=true&ssl=true'",
  PlainWithOptsTlsTrue: "'mongodb://db.example.com/app', { tls: true }",
};

// Site -> (args) -> code
const SITES = {
  MongooseConnect: (a) =>
    `import mongoose from 'mongoose';\nexport const ready = mongoose.connect(${a});`,
  RequireConnect: (a) =>
    `const mongoose = require('mongoose');\nexport const ready = mongoose.connect(${a});`,
  CreateConnection: (a) =>
    `import mongoose from 'mongoose';\nexport const conn = mongoose.createConnection(${a});`,
  NamedConnect: (a) =>
    `import { connect } from 'mongoose';\nexport const ready = connect(${a});`,
  MongoNamed: (a) =>
    `import mongoose from 'mongoose';\nimport { getDriver } from './driver';\nconst mongoDriver = getDriver();\nexport const ready = mongoDriver.connect(${a});`,
  RedisClient: (a) =>
    `import mongoose from 'mongoose';\nimport { createClient } from 'redis';\nexport const conn = mongoose.connection;\nconst client = createClient({ url: process.env.REDIS_URL });\nexport const ready = client.connect(${a});`,
  QueryRunner: (a) =>
    `import mongoose from 'mongoose';\nexport const conn = mongoose.connection;\nexport class Svc {\n  constructor(private readonly repository: any) {}\n  run() {\n    const queryRunner = this.repository.manager.connection.createQueryRunner();\n    return queryRunner.connect(${a});\n  }\n}`,
  Unbound: (a) => `export const ready = mongoose.connect(${a});`,
  NoImport: (a) => `export const ready = client.connect(${a});`,
};

module.exports = withConnTestFiles({
  rule: 'require-tls-connection',
  domain: 108, // 9 sites x 12 connections
  traces: 720,
  key: (s) => `${tag(s.site)}|${tag(s.conn)}`,
  code: (s) =>
    `const uri = process.env.MONGODB_URI as string;\n${SITES[tag(s.site)](CONNS[tag(s.conn)])}\n`,
});
