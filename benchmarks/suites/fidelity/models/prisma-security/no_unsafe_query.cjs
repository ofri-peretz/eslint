const { tag } = require('../../lib.cjs');
const { PRISMA, handlerFile } = require('../../orm.cjs');

const Q = 'SELECT id, name FROM users WHERE';

/** shape -> { pre?: statements before the sink, args: the SQL text argument(s) }. */
const SHAPES = {
  TemplateReq: { args: `\`${Q} id = \${req.query.id}\`` },
  TemplateParam: { args: `\`${Q} id = \${id}\`` },
  ConcatReq: { args: `'${Q} email = ' + req.body.email` },
  PlusAssign: {
    pre: `let q = '${Q} 1=1';\nq += \` AND name = '\${req.query.name}'\`;`,
    args: 'q',
  },
  WholeReq: { args: 'req.body.sql' },
  OrderByReq: {
    args: '`SELECT id, name FROM users ORDER BY ${req.query.sort}`',
  },
  Positional: { args: `'${Q} id = $1', req.query.id` },
  Literal: { args: `'${Q} active = true'` },
  ConstTemplate: {
    pre: "const TABLE = 'users';",
    args: '`SELECT id, name FROM ${TABLE} WHERE active = true`',
  },
  NumberTemplate: {
    args: `\`${Q} active = true LIMIT \${Number(req.query.limit)}\``,
  },
  AllowlistOrder: {
    pre: "const SORT = { name: 'name', created: 'created_at' } as const;",
    args: '`SELECT id, name FROM users ORDER BY ${SORT[req.query.sort as keyof typeof SORT]}`',
  },
  OrderByParam: { args: '`SELECT id, name FROM users ORDER BY ${id}`' },
};

/** The `$transaction` callback parameter, per spelling. */
const TX = {
  Tx: 'tx',
  TxTyped: 'tx: Prisma.TransactionClient',
  TxAny: 'tx: any',
};

/** The interpolated value for the tagged-template sinks. */
const HOLE = { TemplateReq: 'req.query.id', TemplateParam: 'id' };

function code(s) {
  const c = tag(s.client);
  const k = tag(s.sink);
  const shape = tag(s.shape);
  const base = ['Bracket', 'Tx', 'TxTyped', 'TxAny'].includes(c) ? 'Named' : c;
  const { head, pre: setup } = PRISMA[base];
  const lines = [head, setup];
  if (k === 'QueryRawTagged')
    return handlerFile(
      lines,
      `return prisma.$queryRaw\`${Q} id = \${${HOLE[shape]}}\`;`,
    );
  if (k === 'SqlTagged')
    return handlerFile(
      lines,
      `return prisma.$queryRaw(Prisma.sql\`${Q} id = \${${HOLE[shape]}}\`);`,
    );
  const { pre = '', args } = SHAPES[shape];
  let call;
  if (k === 'PrismaRaw') call = `prisma.$queryRaw(Prisma.raw(${args}))`;
  else {
    const m = k === 'QueryRawUnsafe' ? '$queryRawUnsafe' : '$executeRawUnsafe';
    if (c === 'Bracket') call = `prisma['${m}'](${args})`;
    else if (TX[c])
      call = `prisma.$transaction(async (${TX[c]}) => tx.${m}(${args}))`;
    else call = `prisma.${m}(${args})`;
  }
  return handlerFile(
    lines,
    [pre, `return ${call};`].filter(Boolean).join('\n'),
  );
}

module.exports = {
  rule: 'no-unsafe-query',
  // 9 clients x 2 *Unsafe sinks x 12 shapes + 5 clients x Prisma.raw x 11
  // + 5 clients x 2 tagged sinks x 2
  domain: 9 * 2 * 12 + 5 * 11 + 5 * 2 * 2,
  traces: 1800,
  key: (s) => `${tag(s.client)}|${tag(s.sink)}|${tag(s.shape)}`,
  code,
};
