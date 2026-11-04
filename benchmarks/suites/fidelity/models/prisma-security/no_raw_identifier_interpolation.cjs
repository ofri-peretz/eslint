const { tag } = require('../../lib.cjs');
const { PRISMA } = require('../../orm.cjs');

/** hole -> { pre?: statements before the query, sql: the template body }. */
const HOLES = {
  TableParam: { sql: 'SELECT id FROM ${table} WHERE active = true' },
  OrderByReq: { sql: 'SELECT id FROM users ORDER BY ${req.query.sort}' },
  DirParam: { sql: 'SELECT id FROM users ORDER BY name ${dir}' },
  QuotedTable: { sql: 'SELECT id FROM "${table}" WHERE active = true' },
  RawParam: { sql: 'SELECT id FROM ${Prisma.raw(table)} WHERE active = true' },
  ResultTable: {
    pre: 'const setting: any = await prisma.setting.findFirst();',
    sql: 'SELECT id FROM ${setting.tableName} WHERE active = true',
  },
  ValueReq: { sql: 'SELECT id FROM users WHERE id = ${req.query.id}' },
  LimitParam: { sql: 'SELECT id FROM users WHERE active = true LIMIT ${n}' },
  LiteralHole: { sql: "SELECT id FROM ${'users'} WHERE active = true" },
  ConstTable: {
    pre: "const TABLE = 'users';",
    sql: 'SELECT id FROM ${TABLE} WHERE active = true',
  },
  DirTernary: {
    pre: "const direction = dir === 'desc' ? 'DESC' : 'ASC';",
    sql: 'SELECT id FROM users ORDER BY name ${direction}',
  },
  RawConst: {
    sql: "SELECT id FROM ${Prisma.raw('users')} WHERE active = true",
  },
  NestedSql: {
    pre: 'const where = Prisma.sql`WHERE id = ${req.query.id}`;',
    sql: 'SELECT id FROM users ${where}',
  },
  JoinIds: { sql: 'SELECT id FROM users WHERE id IN (${Prisma.join(ids)})' },
};

const HEADS = {
  Alias: {
    head: "import { prisma } from '@/lib/db';\nimport { Prisma } from '@prisma/client';",
    pre: '',
  },
  Relative: { head: "import { prisma } from './db';", pre: '' },
  AnyTyped: { head: '', pre: 'declare const prisma: any;' },
};

function code(s) {
  const c = tag(s.client);
  const t = tag(s.tagSpelling);
  const { pre = '', sql } = HOLES[tag(s.hole)];
  const { head, pre: setup } = HEADS[c] ?? PRISMA[c];
  const tpl = `\`${sql}\``;
  const query = {
    QueryRaw: `prisma.$queryRaw${tpl}`,
    ExecuteRaw: `prisma.$executeRaw${tpl}`,
    SqlTag: `prisma.$queryRaw(Prisma.sql${tpl})`,
    BracketTag: `prisma['$queryRaw']${tpl}`,
  }[t];
  const body = [pre, `return ${query};`]
    .filter(Boolean)
    .map((l) => `  ${l}`)
    .join('\n');
  return (
    [
      head,
      setup,
      `export async function list(req: any, table: string, dir: string, n: number, ids: number[]) {\n${body}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = {
  rule: 'no-raw-identifier-interpolation',
  // 4 clients with the namespace x 4 tags x 14 holes
  // + 2 without it x 3 tags x 10 holes
  domain: 4 * 4 * 14 + 2 * 3 * 10,
  traces: 1600,
  key: (s) => `${tag(s.client)}|${tag(s.tagSpelling)}|${tag(s.hole)}`,
  code,
};
