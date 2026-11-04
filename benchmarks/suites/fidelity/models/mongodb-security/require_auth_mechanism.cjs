const { tag } = require('../../lib.cjs');
const { withConnTestFiles } = require('../../mongodb.cjs');

// Conn -> argument list
const CONNS = {
  UriCredsNoMech: "'mongodb://user:pass@db.example.com/app'",
  UriCredsWithMech:
    "'mongodb://user:pass@db.example.com/app?authMechanism=SCRAM-SHA-256'",
  OptsCredsNoMech:
    'uri, { user: process.env.MONGO_USER, pass: process.env.MONGO_PASS }',
  OptsAuthNestedNoMech:
    'uri, { auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS } }',
  OptsMechScram: "uri, { authMechanism: 'SCRAM-SHA-256' }",
  OptsMechX509:
    "uri, { authMechanism: 'MONGODB-X509', tlsCertificateKeyFile: '/etc/ssl/client.pem' }",
  OptsMechAws: "uri, { authMechanism: 'MONGODB-AWS' }",
  OptsCredsAndMech:
    "uri, { user: process.env.MONGO_USER, pass: process.env.MONGO_PASS, authMechanism: 'SCRAM-SHA-256' }",
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
  rule: 'require-auth-mechanism',
  domain: 72, // 9 sites x 8 connections
  traces: 480,
  key: (s) => `${tag(s.site)}|${tag(s.conn)}`,
  code: (s) =>
    `const uri = process.env.MONGODB_URI as string;\n${SITES[tag(s.site)](CONNS[tag(s.conn)])}\n`,
});
