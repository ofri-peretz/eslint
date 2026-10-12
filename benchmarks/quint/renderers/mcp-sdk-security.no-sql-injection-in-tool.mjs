// Renders one state of models/mcp-sdk-security.no-sql-injection-in-tool.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { bind, v1Tool } from './_mcp.mjs';

export const plugin = 'mcp-sdk-security';
export const rule = 'no-sql-injection-in-tool';
export const dimensions = [
  'source',
  'position',
  'transform',
  'sink',
  'binding',
];

const TRANSFORM = {
  NoTransform: (e) => e,
  Trim: (e) => `String(${e}).trim()`,
  NumberCast: (e) => `Number(${e})`,
};

/** [setup, (sqlText) => call, (fixedSql, value) => parameterised call] */
const SINK = {
  PgPool: [
    "import { Pool } from 'pg';\nconst pool = new Pool();",
    (q) => `await pool.query(${q});`,
    (v) => `await pool.query('SELECT * FROM users WHERE name = $1', [${v}]);`,
  ],
  PgClientFromConnect: [
    "import pg from 'pg';\nconst pool = new pg.Pool();",
    (q) => `const client = await pool.connect();\n  await client.query(${q});`,
    (v) =>
      `const client = await pool.connect();\n  await client.query('SELECT * FROM users WHERE name = $1', [${v}]);`,
  ],
  Mysql2Execute: [
    "import mysql from 'mysql2/promise';\nconst conn = await mysql.createConnection({});",
    (q) => `await conn.execute(${q});`,
    (v) => `await conn.execute('SELECT * FROM users WHERE name = ?', [${v}]);`,
  ],
  BetterSqlitePrepare: [
    "import Database from 'better-sqlite3';\nconst db = new Database('app.db');",
    (q) => `db.prepare(${q}).all();`,
    (v) => `db.prepare('SELECT * FROM users WHERE name = ?').all(${v});`,
  ],
  PostgresUnsafe: [
    "import postgres from 'postgres';\nconst sql = postgres();",
    (q) => `await sql.unsafe(${q});`,
    (v) => `await sql.unsafe('SELECT * FROM users WHERE name = $1', [${v}]);`,
  ],
  PrismaRawUnsafe: [
    "import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();",
    (q) => `await prisma.$queryRawUnsafe(${q});`,
    (v) =>
      `await prisma.$queryRawUnsafe('SELECT * FROM users WHERE name = $1', ${v});`,
  ],
  KnexRaw: [
    "import knex from 'knex';\nconst db = knex({ client: 'pg' });",
    (q) => `await db.raw(${q});`,
    (v) => `await db.raw('SELECT * FROM users WHERE name = ?', [${v}]);`,
  ],
  SequelizeQuery: [
    "import { Sequelize } from 'sequelize';\nconst sequelize = new Sequelize('postgres://localhost/app');",
    (q) => `await sequelize.query(${q});`,
    (v) =>
      `await sequelize.query('SELECT * FROM users WHERE name = :n', { replacements: { n: ${v} } });`,
  ],
  CacheLookalike: [
    'declare const cache: { query(key: string, ...rest: unknown[]): Promise<unknown> };',
    (q) => `await cache.query(${q});`,
    (v) => `await cache.query('users', ${v});`,
  ],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [setup, text, bound] = SINK[c.sink];
  const sink = (v) =>
    c.position === 'BoundParam'
      ? bound(v)
      : text(
          c.position === 'Whole'
            ? v
            : c.position === 'Interp'
              ? "`SELECT * FROM users WHERE name = '${" + v + "}'`"
              : `'SELECT * FROM users WHERE name = ' + ${v}`,
        );
  const raw = c.source === 'ToolArg' ? 'name' : 'DEFAULT_NAME';
  const { top, body } = bind(c.binding, TRANSFORM[c.transform](raw), sink);
  return [setup, "const DEFAULT_NAME = 'admin';", top, v1Tool('name', body), '']
    .filter(Boolean)
    .join('\n');
}
