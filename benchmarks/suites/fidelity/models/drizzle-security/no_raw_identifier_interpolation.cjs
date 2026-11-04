const { tag } = require('../../lib.cjs');
const { DRIZZLE, handlerFile } = require('../../orm.cjs');

/** hole -> (S: the sql tag) => { pre?: statements, sql: the template body }. */
const HOLES = {
  TableParam: () => ({ sql: 'SELECT id FROM ${table} WHERE active = true' }),
  OrderByReq: () => ({
    sql: 'SELECT id FROM users ORDER BY ${req.query.sort}',
  }),
  DirParam: () => ({ sql: 'SELECT id FROM users ORDER BY name ${dir}' }),
  QuotedTable: () => ({ sql: 'SELECT id FROM "${table}" WHERE active = true' }),
  RawParam: (S) => ({
    sql: `SELECT id FROM \${${S}.raw(table)} WHERE active = true`,
  }),
  ResultTable: (S) => ({
    pre: `const rows = await db.execute(${S}\`SELECT table_name FROM settings LIMIT 1\`);`,
    sql: 'SELECT id FROM ${rows[0].table_name} WHERE active = true',
  }),
  ValueReq: () => ({ sql: 'SELECT id FROM users WHERE id = ${req.query.id}' }),
  LimitParam: () => ({
    sql: 'SELECT id FROM users WHERE active = true LIMIT ${n}',
  }),
  LiteralHole: () => ({ sql: "SELECT id FROM ${'users'} WHERE active = true" }),
  ConstTable: () => ({
    pre: "const TABLE = 'users';",
    sql: 'SELECT id FROM ${TABLE} WHERE active = true',
  }),
  DirTernary: () => ({
    pre: "const direction = dir === 'desc' ? 'desc' : 'asc';",
    sql: 'SELECT id FROM users ORDER BY name ${direction}',
  }),
  Identifier: (S) => ({
    sql: `SELECT id FROM \${${S}.identifier(table)} WHERE active = true`,
  }),
  AllowlistIdentifier: (S) => ({
    pre: "const column = ({ name: 'name', created: 'created_at' } as Record<string, string>)[req.query.sort] ?? 'id';",
    sql: `SELECT id FROM users ORDER BY \${${S}.identifier(column)}`,
  }),
  Join: (S) => ({
    sql: `SELECT id FROM users WHERE id IN (\${${S}.join(ids.map((i) => ${S}\`\${i}\`), ${S}\`, \`)})`,
  }),
  Placeholder: (S) => ({
    sql: `SELECT id FROM users WHERE id = \${${S}.placeholder('id')}`,
  }),
  Nested: (S) => ({
    pre: `const where = ${S}\`WHERE id = \${req.query.id}\`;`,
    sql: 'SELECT id FROM users ${where}',
  }),
  SchemaTable: () => ({ sql: 'SELECT id FROM ${users} WHERE active = true' }),
  SchemaColumn: () => ({ sql: 'SELECT id FROM users ORDER BY ${users.name}' }),
  Subquery: () => ({
    pre: "const sq = db.select().from(users).as('sq');",
    sql: 'SELECT id FROM ${sq}',
  }),
};

/** The schema table, built with drizzle's helpers (or declared, without drizzle). */
const TABLE = {
  imported: [
    "import { pgTable, serial, text } from 'drizzle-orm/pg-core';",
    "const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name') });",
  ],
  required: [
    "const { pgTable, serial, text } = require('drizzle-orm/pg-core');",
    "const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name') });",
  ],
  none: ['declare const users;'],
};

function code(s) {
  const c = tag(s.client);
  const d = DRIZZLE[c];
  const { pre = '', sql } = HOLES[tag(s.hole)](d.sql);
  const table =
    TABLE[
      c === 'NoImport' ? 'none' : c === 'Require' ? 'required' : 'imported'
    ];
  const body = [pre, `return db.execute(${d.sql}\`${sql}\`);`]
    .filter(Boolean)
    .join('\n');
  // `handle(req, res, id)` plus the identifier/direction/limit inputs.
  return handlerFile([d.head, d.pre, ...table], body).replace(
    'handle(req: any, res: any, id: string)',
    'list(req: any, table: string, dir: string, n: number, ids: number[])',
  );
}

module.exports = {
  rule: 'no-raw-identifier-interpolation',
  // 5 clients x 19 holes
  domain: 5 * 19,
  traces: 600,
  key: (s) => `${tag(s.client)}|${tag(s.hole)}`,
  code,
};
