const { tag, withTestFile } = require('../../lib.cjs');

// Uri -> [preamble, expression]
const URIS = {
  WithCreds: ['', "'mongodb://admin:secret123@localhost:27017/mydb'"],
  NoCreds: ['', "'mongodb://localhost:27017/mydb'"],
  SrvWithCreds: [
    '',
    "'mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/db'",
  ],
  SrvNoCreds: ['', "'mongodb+srv://cluster0.example.mongodb.net/db'"],
  TemplateWithCreds: ['', '`mongodb://admin:secret123@db.internal:27017/app`'],
  FromEnv: ['', 'process.env.MONGODB_URI as string'],
  FromConfig: ["import { config } from './config';", 'config.database.uri'],
  OtherScheme: ['', "'postgres://admin:secret123@localhost:5432/mydb'"],
  InComment: [
    '// Connect using: mongodb://user:pass@host/db',
    'process.env.MONGODB_URI as string',
  ],
};

// Site -> (pre, expr) -> code
const SITES = {
  MongooseConnect: (p, u) =>
    `import mongoose from 'mongoose';\n${p}\nmongoose.connect(${u});`,
  RequireConnect: (p, u) =>
    `const mongoose = require('mongoose');\n${p}\nmongoose.connect(${u});`,
  CreateConnection: (p, u) =>
    `import { createConnection } from 'mongoose';\n${p}\nexport const conn = createConnection(${u});`,
  NewMongoClient: (p, u) =>
    `import { MongoClient } from 'mongodb';\n${p}\nexport const client = new MongoClient(${u});`,
  ConstThenConnect: (p, u) =>
    `import mongoose from 'mongoose';\n${p}\nconst uri = ${u};\nmongoose.connect(uri);`,
  ExportedConst: (p, u) => `${p}\nexport const MONGO_URI = ${u};`,
};

const base = {
  rule: 'no-hardcoded-connection-string',
  domain: 54, // 6 sites x 9 URIs
  traces: 380,
  key: (s) => `${tag(s.site)}|${tag(s.uri)}`,
  code: (s) => {
    const [p, u] = URIS[tag(s.uri)];
    return SITES[tag(s.site)](p, u);
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
