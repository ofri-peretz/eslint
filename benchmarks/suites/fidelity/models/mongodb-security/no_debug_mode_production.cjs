const { tag, withTestFile } = require('../../lib.cjs');

// Receiver -> [file head, callee of `set`]
const RECEIVERS = {
  Default: ["import mongoose from 'mongoose';", 'mongoose.set'],
  Namespace: ["import * as mongoose from 'mongoose';", 'mongoose.set'],
  Require: ["const mongoose = require('mongoose');", 'mongoose.set'],
  Renamed: ["import odm from 'mongoose';", 'odm.set'],
  NamedSet: ["import { set } from 'mongoose';", 'set'],
  Untraced: [
    "import mongoose from 'mongoose';\nexport const conn = mongoose.connection;",
    'app.set',
  ],
  ExpressApp: [
    "import mongoose from 'mongoose';\nimport express from 'express';\nexport const conn = mongoose.connection;\nconst app = express();",
    'app.set',
  ],
  ExpressRouter: [
    "import mongoose from 'mongoose';\nimport express from 'express';\nexport const conn = mongoose.connection;\nconst router = express.Router();",
    'router.set',
  ],
  NoImport: ['', 'mongoose.set'],
};

// Value -> argument list
const VALUES = {
  True: "'debug', true",
  Callback:
    "'debug', (collectionName: string, method: string, query: unknown) => {\n  console.log(collectionName, method, query);\n}",
  ObjectTrue: '{ debug: true, strictQuery: true }',
  False: "'debug', false",
  EnvGated: "'debug', process.env.NODE_ENV !== 'production'",
  EnvGatedLogger:
    "'debug', process.env.NODE_ENV !== 'production' && ((coll: string, method: string) => console.log(coll, method))",
  ObjectFalse: '{ debug: false, strictQuery: true }',
  ObjectEnvGated: "{ debug: process.env.NODE_ENV === 'development' }",
  OtherSetting: "'strictQuery', true",
};

const base = {
  rule: 'no-debug-mode-production',
  domain: 81, // 9 receivers x 9 values
  traces: 560,
  key: (s) => `${tag(s.receiver)}|${tag(s.value)}`,
  code: (s) => {
    const [head, set] = RECEIVERS[tag(s.receiver)];
    return [head, `${set}(${VALUES[tag(s.value)]});`]
      .filter(Boolean)
      .join('\n');
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
