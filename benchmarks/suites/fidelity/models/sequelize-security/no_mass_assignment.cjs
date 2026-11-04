const { tag } = require('../../lib.cjs');
const { SEQUELIZE, PAYLOADS, writeFile } = require('../../orm.cjs');

const DEFINE =
  "const sequelize = new Sequelize(process.env.DATABASE_URL as string);\nconst User = sequelize.define('User', {});";
const defined = (write, head = SEQUELIZE.Named.head) => ({
  head,
  pre: DEFINE,
  write,
});

const RECEIVERS = {
  Define: defined((p) => `await User.create(${p});`),
  ClassModel: {
    head: "import { Model } from 'sequelize';",
    pre: 'class User extends Model {}',
    write: (p) => `await User.create(${p});`,
  },
  StaticUpdate: defined((p) => `await User.update(${p}, { where: { id } });`),
  InstanceUpdate: defined(
    (p) => `const user = await User.findByPk(id);\nawait user!.update(${p});`,
  ),
  InstanceSet: defined(
    (p) =>
      `const user = await User.findByPk(id);\nuser!.set(${p});\nawait user!.save();`,
  ),
  Upsert: defined((p) => `await User.upsert(${p});`),
  Build: defined((p) => `await User.build(${p}).save();`),
  BulkCreate: defined((p) => `await User.bulkCreate(${p});`),
  Bracket: defined((p) => `await User['create'](${p});`),
  RequireDefine: defined(
    (p) => `await User.create(${p});`,
    SEQUELIZE.Require.head,
  ),
  Typescript: {
    head: "import { Model, Table } from 'sequelize-typescript';",
    pre: '@Table\nclass User extends Model {}',
    write: (p) => `await User.create(${p});`,
  },
  Allowlist: defined(
    (p) => `await User.create(${p}, { fields: ['name', 'email'] });`,
  ),
  NoImport: {
    head: 'declare const User: any;',
    write: (p) => `await User.create(${p});`,
  },
  Untraced: {
    // a path alias is not resolved, so the receiver is untraceable
    head: `${SEQUELIZE.Named.head}\nimport { cache } from '@/lib/cache';`,
    write: (p) => `await cache.create(${p});`,
  },
  MapSet: {
    head: SEQUELIZE.Named.head,
    pre: 'const sessions = new Map<string, any>();',
    write: (p) => `sessions.set(id, ${p});`,
  },
  InTest: defined((p) => `await User.create(${p});`),
};

module.exports = {
  rule: 'no-mass-assignment',
  domain: 16 * 18,
  traces: 2400,
  key: (s) => `${tag(s.receiver)}|${tag(s.payload)}`,
  filename: (s) =>
    tag(s.receiver) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code: (s) => writeFile(RECEIVERS[tag(s.receiver)], PAYLOADS[tag(s.payload)]),
};
