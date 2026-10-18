/**
 * Tests for mcp-sdk-security/no-sql-injection-in-tool
 * CWE-89 — a tool argument in the text of a SQL query.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 4 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { join } from 'node:path';
import { noSqlInjectionInTool } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { Pool } from 'pg';\n" +
  'const pool = new Pool();\n';

/** A server file beside `fixtures/cross-file/db.ts`, which builds a pg Pool. */
const SERVER = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'cross-file',
  'server.ts',
);

const err = (arg: string, sink: string) => ({
  messageId: 'toolArgToSql' as const,
  data: { arg, sink },
});

describe('no-sql-injection-in-tool', () => {
  ruleTester.run('no-sql-injection-in-tool', noSqlInjectionInTool, {
    valid: [
      {
        name: 'a parameterised query: the argument is a bound value',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ name }) => pool.query("SELECT * FROM users WHERE name = $1", [name]));',
      },
      {
        name: 'a parameterised query config object',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ name }) => pool.query({ text: "SELECT * FROM users WHERE name = $1", values: [name] }));',
      },
      {
        name: 'a prepared statement with a placeholder',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport Database from 'better-sqlite3';\nconst db = new Database('app.db');\n" +
          'server.registerTool("get", cfg, async ({ id }) => db.prepare("SELECT * FROM t WHERE id = ?").get(id));',
      },
      {
        name: 'a tagged template is parameterised by the library',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport postgres from 'postgres';\nconst sql = postgres(process.env.DATABASE_URL);\n" +
          'server.registerTool("find", cfg, async ({ name }) => sql`SELECT * FROM users WHERE name = ${name}`);',
      },
      {
        name: 'an escaped value is not followed',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport mysql from 'mysql2';\nconst conn = mysql.createConnection({});\n" +
          'server.registerTool("find", cfg, async ({ name }) => conn.query("SELECT * FROM users WHERE name = " + mysql.escape(name)));',
      },
      {
        name: 'a query whose text is not a tool argument',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ name }) => pool.query(STATIC_SQL));',
      },
      {
        name: 'a query outside any tool handler',
        code: SDK + 'async function run(sql) { return pool.query(sql); }',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code: "import { Pool } from 'pg';\nconst pool = new Pool();\nserver.registerTool('find', cfg, async ({ q }) => pool.query(q));",
      },
      {
        name: 'a query() on something that is not a database driver',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ q }) => { search.query(q); $(q).query(); "literal".query(q); x.a().b().c().d().e().f().g().h().i().j().query(q); });',
      },
      {
        name: 'a receiver built by a driver export that is not a connection',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport { types } from 'pg';\nconst parser = types.getTypeParser(20);\n" +
          'server.registerTool("find", cfg, async ({ q }) => parser.query(q));',
      },
      {
        name: 'a driver method that does not take SQL text',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ q }) => { pool.end(q); pool.on(q, cb); });',
      },
      {
        name: 'a driver export that is not a query function',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport * as mysql from 'mysql2';\n" +
          'server.registerTool("find", cfg, async ({ q }) => mysql.format(q));',
      },
      {
        name: 'a query with no arguments, or a config with a computed key',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ q }) => { pool.query(); pool.query({ [key]: q }); });',
      },
      {
        name: 'a dynamic method on a pool',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ q }) => pool[method](q));',
      },
      {
        name: 'a pool whose construction is not visible (a parameter)',
        code:
          SDK +
          'function make(db) { server.registerTool("find", cfg, async ({ q }) => db.query(q)); }',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 4 (SQL injection from tool arguments)
        name: 'FN: a pg pool query with the argument interpolated',
        code:
          SDK +
          'server.registerTool("find", cfg, async ({ name }) => pool.query(`SELECT * FROM users WHERE name = \'${name}\'`));',
        errors: [err('name', 'pg.query')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 3 (db.exec(sql) — SQL injection, owned here)
        name: 'FN: db.exec(sql) on better-sqlite3 with the argument as the SQL',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport Database from 'better-sqlite3';\nconst db = new Database('app.db');\n" +
          'server.registerTool("run_sql", cfg, async ({ sql }) => { db.exec(sql); return db.prepare(sql).all(); });',
        errors: [
          err('sql', 'better-sqlite3.exec'),
          err('sql', 'better-sqlite3.prepare'),
        ],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 4 (SQL injection from tool arguments)
        name: 'FN: a client from pool.connect() and a concatenated ORDER BY',
        code:
          SDK +
          'server.registerTool("list", cfg, async ({ sort }) => {\n' +
          '  const client = await pool.connect();\n' +
          '  try { return await client.query("SELECT * FROM t ORDER BY " + sort); } finally { client.release(); }\n' +
          '});',
        errors: [err('sort', 'pg.query')],
      },
      {
        name: 'a pool imported from a relative module',
        filename: SERVER,
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport { pool as db } from './db';\n" +
          'server.registerTool("find", cfg, async ({ q }) => db.query(q));',
        errors: [err('q', 'pg.query')],
      },
      {
        name: 'mysql2 promise pool, query and execute, and a config object',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport mysql from 'mysql2/promise';\nconst db = mysql.createPool({});\n" +
          'server.registerTool("find", cfg, async ({ a, b, c }) => { await db.query(`SELECT ${a}`); await db.execute(b); await db.query({ sql: c }); });',
        errors: [
          err('a', 'mysql2/promise.query'),
          err('b', 'mysql2/promise.execute'),
          err('c', 'mysql2/promise.query'),
        ],
      },
      {
        name: 'mysql and a pool cluster',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nconst mysql = require('mysql');\nconst cluster = mysql.createPoolCluster();\n" +
          'server.registerTool("find", cfg, async ({ q }) => cluster.query(q));',
        errors: [err('q', 'mysql.query')],
      },
      {
        name: 'sqlite3, node:sqlite, the sqlite package and duckdb',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          "import sqlite3 from 'sqlite3';\nimport { DatabaseSync } from 'node:sqlite';\nimport { open } from 'sqlite';\nimport duckdb from 'duckdb';\n" +
          'const a = new sqlite3.Database(":memory:");\nconst b = new DatabaseSync(":memory:");\nconst d = new duckdb.Database(":memory:");\n' +
          'server.registerTool("q", cfg, async ({ q }) => {\n' +
          '  const c = await open({ filename: "x.db" });\n' +
          '  a.run(q); a.get(q); a.all(q); a.each(q); b.exec(q); b.prepare(q); await c.all(q); d.all(q);\n' +
          '});',
        errors: [
          err('q', 'sqlite3.run'),
          err('q', 'sqlite3.get'),
          err('q', 'sqlite3.all'),
          err('q', 'sqlite3.each'),
          err('q', 'sqlite.exec'),
          err('q', 'sqlite.prepare'),
          err('q', 'sqlite.all'),
          err('q', 'duckdb.all'),
        ],
      },
      {
        name: 'postgres sql.unsafe, neon, @vercel/postgres, mssql and libsql',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          "import postgres from 'postgres';\nimport { neon, Pool as NeonPool } from '@neondatabase/serverless';\nimport { sql as vsql, db as vdb, createPool } from '@vercel/postgres';\n" +
          "import mssql from 'mssql';\nimport { createClient } from '@libsql/client';\n" +
          'const sql = postgres(url);\nconst n = neon(url);\nconst np = new NeonPool();\nconst vp = createPool();\nconst ms = new mssql.ConnectionPool(cfg);\nconst lib = createClient({ url });\n' +
          'server.registerTool("q", cfg, async ({ q }) => {\n' +
          '  await sql.unsafe(q); await n.query(q); await np.query(q); await vsql.query(q); await vdb.query(q); await vp.query(q);\n' +
          '  await ms.request().query(q); await ms.request().batch(q); await mssql.query(q); await lib.execute(q); await lib.executeMultiple(q);\n' +
          '});',
        errors: [
          err('q', 'postgres.unsafe'),
          err('q', '@neondatabase/serverless.query'),
          err('q', '@neondatabase/serverless.query'),
          err('q', '@vercel/postgres.query'),
          err('q', '@vercel/postgres.query'),
          err('q', '@vercel/postgres.query'),
          err('q', 'mssql.query'),
          err('q', 'mssql.batch'),
          err('q', 'mssql.query'),
          err('q', '@libsql/client.execute'),
          err('q', '@libsql/client.executeMultiple'),
        ],
      },
      {
        name: 'mssql.connect() and a pg Client',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport sql from 'mssql';\nimport { Client } from 'pg';\nconst c = new Client();\n" +
          'server.registerTool("q", cfg, async ({ q }) => { const p = await sql.connect(cfg); await p.query(q); await c.query(q); });',
        errors: [err('q', 'mssql.query'), err('q', 'pg.query')],
      },
      {
        name: 'low-level Server: request.params.arguments',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (req) => pool.query(String(req.params.arguments.sql)));',
        errors: [err('req.params.arguments.sql', 'pg.query')],
      },
    ],
  });
});

describe('1.0 independent review (2026-10-12)', () => {
  const ORM =
    "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
    "import { PrismaClient } from '@prisma/client';\n" +
    "import knex from 'knex';\n" +
    "import { Sequelize } from 'sequelize';\n" +
    'const prisma = new PrismaClient();\n' +
    "const db = knex({ client: 'pg' });\n" +
    "const sequelize = new Sequelize('postgres://localhost/app');\n";
  ruleTester.run('review', noSqlInjectionInTool, {
    valid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: the ORMs' parameterised forms
        name: 'precision lock: tagged $queryRaw, bound raw parameters and replacements',
        code:
          ORM +
          'server.registerTool("q", cfg, async ({ name }) => {\n' +
          '  await prisma.$queryRaw`SELECT * FROM users WHERE name = ${name}`;\n' +
          '  await prisma.$queryRawUnsafe("SELECT * FROM users WHERE name = $1", name);\n' +
          '  await db.raw("SELECT * FROM users WHERE name = ?", [name]);\n' +
          '  await sequelize.query("SELECT * FROM users WHERE name = :n", { replacements: { n: name } });\n' +
          '  await prisma.user.findMany({ where: { name } });\n});',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: ORM raw escape hatches were not sinks
        name: 'FN: Prisma $queryRawUnsafe / $executeRawUnsafe, knex raw and Sequelize query with the argument as SQL',
        code:
          ORM +
          'server.registerTool("q", cfg, async ({ sql, table }) => {\n' +
          '  await prisma.$queryRawUnsafe(sql);\n' +
          '  await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);\n' +
          '  await db.raw(sql);\n' +
          '  await sequelize.query(`SELECT * FROM ${table}`);\n});',
        errors: [
          err('sql', '@prisma/client.$queryRawUnsafe'),
          err('table', '@prisma/client.$executeRawUnsafe'),
          err('sql', 'knex.raw'),
          err('table', 'sequelize.query'),
        ],
      },
      {
        // @found modelcontextprotocol/servers-archived:src/postgres/index.ts:118
        name: 'real code: the archived Postgres server runs the tool argument inside a read-only transaction',
        code:
          "import { Server } from '@modelcontextprotocol/sdk/server/index.js';\n" +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          "import pg from 'pg';\n" +
          'const pool = new pg.Pool({ connectionString: url });\n' +
          'server.setRequestHandler(CallToolRequestSchema, async (request) => {\n' +
          '  const sql = request.params.arguments?.sql as string;\n' +
          '  const client = await pool.connect();\n' +
          '  await client.query("BEGIN TRANSACTION READ ONLY");\n' +
          '  const result = await client.query(sql);\n' +
          '  return { content: [{ type: "text", text: JSON.stringify(result.rows) }] };\n});',
        errors: [err('request.params.arguments.sql', 'pg.query')],
      },
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: the query lives in a helper the handler calls
        name: 'FN: the SQL built in a same-file helper the tool handler calls',
        code:
          SDK +
          "async function runQuery(foo) { return pool.query(`SELECT * FROM t WHERE name = '${foo}'`); }\n" +
          'server.registerTool("q", cfg, async ({ name }) => runQuery(name));',
        errors: [err('foo', 'pg.query')],
      },
    ],
  });
});
