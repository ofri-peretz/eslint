const { tag } = require('../../lib.cjs');
const { PRISMA, handlerFile } = require('../../orm.cjs');

/** payload -> { pre?: statements before the write, expr: the payload }. */
const PAYLOADS = {
  ReqBody: { expr: 'req.body' },
  ReqQuery: { expr: 'req.query' },
  SpreadBody: { expr: '{ ...req.body }' },
  SpreadPlus: { expr: '{ ...req.body, updatedAt: new Date() }' },
  LocalAlias: { pre: 'const input = req.body;', expr: 'input' },
  RestOf: { pre: 'const { id: _ignored, ...rest } = req.body;', expr: 'rest' },
  FetchJson: { pre: 'const payload = await req.json();', expr: 'payload' },
  NamedFields: { expr: '{ name: req.body.name, email: req.body.email }' },
  Validated: { pre: 'const input = UserInput.parse(req.body);', expr: 'input' },
  FormBody: { pre: 'const form = buildForm();', expr: 'form.body' },
  Literal: { expr: "{ name: 'guest', role: 'viewer' }" },
};

/** method -> (payload) => [prisma method, its argument]. */
const METHODS = {
  Create: (p) => ['create', `{ data: ${p} }`],
  Update: (p) => ['update', `{ where: { id }, data: ${p} }`],
  UpsertCreate: (p) => [
    'upsert',
    `{ where: { id }, create: ${p}, update: {} }`,
  ],
  UpsertUpdate: (p) => [
    'upsert',
    `{ where: { id }, create: { id }, update: ${p} }`,
  ],
  CreateMany: (p) => ['createMany', `{ data: ${p} }`],
  UpdateMany: (p) => ['updateMany', `{ where: { id }, data: ${p} }`],
};

const DECLS = [
  'declare const UserInput: { parse(v: unknown): { name: string } };',
  'declare function buildForm(): { body: { name: string } };',
];

function code(s) {
  const c = tag(s.client);
  const { pre = '', expr } = PAYLOADS[tag(s.payload)];
  const [m, arg] = METHODS[tag(s.method)](expr);
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
  return handlerFile(
    [head, setup, ...DECLS],
    [pre, `return ${call};`].filter(Boolean).join('\n'),
  );
}

module.exports = {
  rule: 'no-mass-assignment',
  // 9 clients x 6 methods x 11 payloads
  domain: 9 * 6 * 11,
  traces: 2800,
  key: (s) => `${tag(s.client)}|${tag(s.method)}|${tag(s.payload)}`,
  code,
};
