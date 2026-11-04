const { tag } = require('../../lib.cjs');
const { KNEX, PAYLOADS, writeFile } = require('../../orm.cjs');

const CFG = "{ client: 'pg', connection: process.env.DATABASE_URL }";
const via = (spelling, write) => ({
  head: KNEX[spelling].head,
  pre: `const db = ${KNEX[spelling].make(CFG)};`,
  write,
});
const insert = (p) => `await db('users').insert(${p});`;

const RECEIVERS = {
  Insert: via('Default', insert),
  Update: via(
    'Default',
    (p) => `await db('users').where({ id }).update(${p});`,
  ),
  Merge: via(
    'Default',
    (p) => `await db('users').insert({ id }).onConflict('id').merge(${p});`,
  ),
  Into: via('Default', (p) => `await db.insert(${p}).into('users');`),
  From: via(
    'Default',
    (p) => `await db.from('users').where({ id }).update(${p});`,
  ),
  Trx: via(
    'Default',
    (p) =>
      `await db.transaction(async (trx) => {\n  await trx('users').insert(${p});\n});`,
  ),
  Bracket: via('Default', (p) => `await db('users')['insert'](${p});`),
  NamedImport: via('Named', insert),
  RequireImport: via('Require', insert),
  RequireCall: via('RequireCall', insert),
  UntracedTable: {
    // a path alias is not resolved, so the handle is untraceable
    head: `${KNEX.Default.head}\nimport { db as conn } from '@/lib/db';`,
    write: (p) => `await conn('users').insert(${p});`,
  },
  UntracedPlain: {
    head: `${KNEX.Default.head}\nimport { cache } from '@/lib/cache';`,
    write: (p) => `await cache.insert(${p});`,
  },
  NoImport: { head: 'declare const db: any;', write: insert },
  InTest: via('Default', insert),
};

module.exports = {
  rule: 'no-mass-assignment',
  domain: 14 * 18,
  traces: 2200,
  key: (s) => `${tag(s.receiver)}|${tag(s.payload)}`,
  filename: (s) =>
    tag(s.receiver) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code: (s) => writeFile(RECEIVERS[tag(s.receiver)], PAYLOADS[tag(s.payload)]),
};
