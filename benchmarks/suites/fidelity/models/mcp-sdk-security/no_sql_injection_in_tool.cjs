const { tag } = require('../../lib.cjs');
const { toolProgram } = require('../../mcp-sdk.cjs');

/** Sink tag -> [imports, pre, statement(sqlText)]. */
const SINKS = {
  PgPool: [
    "import { Pool } from 'pg';",
    'const pool = new Pool();',
    (v) => `await pool.query(${v});`,
  ],
  PgClientDefault: [
    "import pg from 'pg';",
    'const client = new pg.Client();',
    (v) => `await client.query(${v});`,
  ],
  PgConfigText: [
    "import { Pool } from 'pg';",
    'const pool = new Pool();',
    (v) => `await pool.query({ text: ${v}, values: [] });`,
  ],
  PgConnected: [
    "import { Pool } from 'pg';",
    'const pool = new Pool();',
    (v) => `const conn = await pool.connect();\nawait conn.query(${v});`,
  ],
  Mysql2Pool: [
    "import mysql from 'mysql2/promise';",
    "const pool = mysql.createPool({ host: 'db' });",
    (v) => `await pool.execute(${v});`,
  ],
  BetterSqlitePrepare: [
    "import Database from 'better-sqlite3';",
    "const db = new Database('app.db');",
    (v) => `db.prepare(${v}).all();`,
  ],
  BetterSqliteExec: [
    "import Database from 'better-sqlite3';",
    "const db = new Database('app.db');",
    (v) => `db.exec(${v});`,
  ],
  NodeSqlite: [
    "import { DatabaseSync } from 'node:sqlite';",
    "const db = new DatabaseSync('app.db');",
    (v) => `db.prepare(${v}).all();`,
  ],
  Sqlite3All: [
    "import sqlite3 from 'sqlite3';",
    "const db = new sqlite3.Database('app.db');",
    (v) => `db.all(${v}, (err: unknown, rows: unknown) => rows);`,
  ],
  PostgresUnsafe: [
    "import postgres from 'postgres';",
    'const sql = postgres(process.env.DATABASE_URL as string);',
    (v) => `await sql.unsafe(${v});`,
  ],
  PrismaUnsafe: [
    "import { PrismaClient } from '@prisma/client';",
    'const prisma = new PrismaClient();',
    (v) => `await prisma.$queryRawUnsafe(${v});`,
  ],
  KnexRaw: [
    "import knex from 'knex';",
    "const db = knex({ client: 'pg' });",
    (v) => `await db.raw(${v});`,
  ],
  SequelizeQuery: [
    "import { Sequelize } from 'sequelize';",
    "const sequelize = new Sequelize('sqlite::memory:');",
    (v) => `await sequelize.query(${v});`,
  ],
  Libsql: [
    "import { createClient } from '@libsql/client';",
    "const db = createClient({ url: 'file:app.db' });",
    (v) => `await db.execute(${v});`,
  ],
  PgBound: [
    "import { Pool } from 'pg';",
    'const pool = new Pool();',
    (v) => `await pool.query('SELECT * FROM users WHERE name = $1', [${v}]);`,
  ],
  PostgresTagged: [
    "import postgres from 'postgres';",
    'const sql = postgres(process.env.DATABASE_URL as string);',
    (v) => `await sql\`SELECT * FROM users WHERE name = \${${v}}\`;`,
  ],
  UnknownReceiver: [
    "import { db } from './db';",
    '',
    (v) => `await db.query(${v});`,
  ],
};

const FLOWS = {
  Direct: (a) => ['', a],
  Template: (a) => ['', `\`SELECT * FROM users WHERE name = '\${${a}}'\``],
  Concat: (a) => ['', `'SELECT * FROM items ORDER BY ' + ${a}`],
  Derived: (a) => [`const q = ${a}.trim();`, 'q'],
  HelperReturn: (a) => [`const q = whereName(${a});`, 'q'],
  Escaped: (a) => [
    '',
    `'SELECT * FROM users WHERE name = ' + escapeLiteral(${a})`,
  ],
  Literal: () => ['', "'SELECT count(*) FROM users'"],
};

module.exports = {
  rule: 'no-sql-injection-in-tool',
  // Wiring: 54 gate/registration pairs x 2 sinks x 2 flows = 216.
  // Sinks: 17 sinks x 7 flows = 119.
  domain: 335,
  traces: 3200,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.flow)}`,
  code: (s) => {
    const [imports, pre, stmt] = SINKS[tag(s.sink)];
    const flow = FLOWS[tag(s.flow)];
    return toolProgram(
      tag(s.gate),
      tag(s.reg),
      (a) => {
        const [p, v] = flow(a);
        return [p, stmt(v)].filter(Boolean).join('\n');
      },
      {
        arg: 'name',
        imports: [
          imports,
          "import { escapeLiteral } from './sql-escape';",
        ].join('\n'),
        pre: [
          pre,
          "function whereName(n: string) {\n  return `SELECT * FROM users WHERE name = '${n}'`;\n}",
        ]
          .filter(Boolean)
          .join('\n'),
      },
    );
  },
};
