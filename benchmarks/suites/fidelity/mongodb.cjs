/**
 * Shared spellings for the mongodb-security models (`models/mongodb-security/`).
 *
 * Every rule in eslint-plugin-mongodb-security is gated on the file holding
 * MongoDB evidence (a `mongodb`/`mongoose` import), and the query rules also
 * require the receiver to be a plausible model, collection or database handle.
 * So each query model samples how real code reaches a query method:
 *
 *   - `Model`        `import mongoose from 'mongoose'` + `mongoose.model(...)`
 *   - `RequireModel` the same through `require('mongoose')`
 *   - `NamedModel`   `import { model } from 'mongoose'`, a renamed model
 *   - `Bracket`      `User['find'](...)`, a computed member
 *   - `Nest`         an `@InjectModel()` `this.userModel` in a NestJS service
 *   - `Native`       the `mongodb` driver, `db.collection('users').find(...)`
 *   - `NoImport`     the same call with no Mongo in the file: always silent
 *   - `Repo`         a Mongo file, but the receiver is an injected generic
 *                    repository (`this.birdRepository`): always silent
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const NEST_HEAD = [
  "import { Injectable } from '@nestjs/common';",
  "import { InjectModel } from '@nestjs/mongoose';",
  "import { Model } from 'mongoose';",
].join('\n');

/** Receiver tag -> { head, pre, callee(method), cls?: class wrapper }. */
const RECEIVERS = {
  Model: {
    head: "import mongoose from 'mongoose';",
    pre: "const User = mongoose.model('User');",
    callee: (m) => `User.${m}`,
  },
  RequireModel: {
    head: "const mongoose = require('mongoose');",
    pre: "const User = mongoose.model('User');",
    callee: (m) => `User.${m}`,
  },
  NamedModel: {
    head: "import { model } from 'mongoose';",
    pre: "const Account = model('Account');",
    callee: (m) => `Account.${m}`,
  },
  Bracket: {
    head: "import mongoose from 'mongoose';",
    pre: "const User = mongoose.model('User');",
    callee: (m) => `User['${m}']`,
  },
  Nest: {
    head: NEST_HEAD,
    pre: '',
    cls: "@Injectable()\nexport class UserService {\n  constructor(@InjectModel('User') private readonly userModel: Model<any>) {}\n",
    callee: (m) => `this.userModel.${m}`,
  },
  Native: {
    head: "import { MongoClient } from 'mongodb';",
    pre: 'const client = new MongoClient(process.env.MONGO_URL as string);\nconst db = client.db();',
    callee: (m) => `db.collection('users').${m}`,
  },
  NoImport: {
    head: '',
    pre: "const User = getModel('User');",
    callee: (m) => `User.${m}`,
  },
  Repo: {
    head: "import mongoose from 'mongoose';",
    pre: 'export const conn = mongoose.connection;',
    cls: 'export class BirdService {\n  constructor(private readonly birdRepository: any) {}\n',
    callee: (m) => `this.birdRepository.${m}`,
  },
};

/** Whether the receiver is one the query rules must judge at all. */
const isMongoReceiver = (r) => r !== 'NoImport' && r !== 'Repo';

/**
 * A whole file: the receiver's imports, any extra imports, its preamble, and
 * `body` inside a request handler `(req, res)` (a method for `Nest`/`Repo`).
 */
function program(receiver, body, { imports = '', pre = '' } = {}) {
  const r = RECEIVERS[receiver];
  const indented = body
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
  const fn = r.cls
    ? `${r.cls}  async handle(req: any, res: any, id: string) {\n${indented}\n  }\n}`
    : `export async function handle(req: any, res: any, id: string) {\n${indented}\n}`;
  return [r.head, imports, r.pre, pre, fn].filter(Boolean).join('\n') + '\n';
}

const callee = (receiver, method) => RECEIVERS[receiver].callee(method);

/**
 * Test-file contexts for the connection rules, whose `allowInTests` (default
 * true) documents that it also covers test/fixture directories, not just
 * `*.test.*` / `*.spec.*` names. `.qnt` side:
 *   type TestCtx = Prod | TestDefault | TestFlip | TestDirDefault | FixturesDefault | TestDirFlip
 */
const CONN_TEST_FILES = {
  Prod: ['src/db.ts', undefined],
  TestDefault: ['src/db.test.ts', undefined],
  TestFlip: ['src/db.test.ts', false],
  TestDirDefault: ['test/helpers/db.ts', undefined],
  FixturesDefault: ['src/fixtures/mongo.ts', undefined],
  TestDirFlip: ['test/helpers/db.ts', false],
};

function withConnTestFiles(cfg) {
  const { tag } = require('./lib.cjs');
  const ctxs = Object.keys(CONN_TEST_FILES).length;
  return {
    ...cfg,
    domain: cfg.domain * ctxs,
    traces: Math.ceil((cfg.traces ?? 300) * ctxs * 1.2),
    key: (s) => `${cfg.key(s)}|test=${tag(s.testCtx)}`,
    filename: (s) => CONN_TEST_FILES[tag(s.testCtx)][0],
    config: (s) => {
      const flip = CONN_TEST_FILES[tag(s.testCtx)][1];
      const base = cfg.config?.(s);
      return flip === undefined
        ? base
        : { ...(base ?? {}), allowInTests: flip };
    },
  };
}

module.exports = {
  RECEIVERS,
  isMongoReceiver,
  program,
  callee,
  withConnTestFiles,
};
