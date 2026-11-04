const { tag } = require('../../lib.cjs');
const { PRISMA, handlerFile } = require('../../orm.cjs');

const DATA = "data: { role: 'admin' }";

/** args -> (isUpdate) => the call's argument text. */
const ARGS = {
  NoArgs: () => '',
  EmptyObj: () => '{}',
  DataOnly: () => `{ ${DATA} }`,
  WhereEmpty: (u) => (u ? `{ where: {}, ${DATA} }` : '{ where: {} }'),
  Where: (u) =>
    u ? `{ where: { authorId: id }, ${DATA} }` : '{ where: { active: false } }',
  WhereVar: (u) => (u ? `{ where: filter, ${DATA} }` : '{ where: filter }'),
  Built: () => 'buildArgs(req.query)',
};

const METHODS = {
  DeleteMany: 'deleteMany',
  UpdateMany: 'updateMany',
  UpdateManyAndReturn: 'updateManyAndReturn',
};

const DECLS = [
  'declare const filter: { active: boolean };',
  'declare function buildArgs(q: unknown): any;',
];

function code(s) {
  const c = tag(s.client);
  const m = METHODS[tag(s.method)];
  const arg = ARGS[tag(s.args)](m !== 'deleteMany');
  let head;
  let setup;
  let call;
  if (c === 'Untraced') {
    head =
      "import { Prisma } from '@prisma/client';\nimport { db } from '@/lib/db';";
    setup = '';
    call = `db.user.${m}(${arg})`;
  } else {
    ({ head, pre: setup } =
      PRISMA[['Bracket', 'ModelBracket', 'Tx'].includes(c) ? 'Named' : c]);
    if (c === 'Bracket') call = `prisma.user['${m}'](${arg})`;
    else if (c === 'ModelBracket') call = `prisma['user'].${m}(${arg})`;
    else if (c === 'Tx')
      call = `prisma.$transaction(async (tx) => tx.user.${m}(${arg}))`;
    else call = `prisma.user.${m}(${arg})`;
  }
  return handlerFile([head, setup, ...DECLS], `return ${call};`);
}

module.exports = {
  rule: 'no-unscoped-mutation',
  // 9 clients x (deleteMany x 6 + 2 update methods x 7)
  domain: 9 * (6 + 2 * 7),
  traces: 900,
  key: (s) => `${tag(s.client)}|${tag(s.method)}|${tag(s.args)}`,
  code,
};
