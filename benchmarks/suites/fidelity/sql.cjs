/**
 * Shared spellings for the mysql-security and sqlite-security models
 * (`models/mysql-security/`, `models/sqlite-security/`).
 *
 * Every rule in both plugins is gated on the file importing the driver, so
 * each model samples how real code reaches it. A MySQL driver is
 * `{ head, make(cfg) }`: `head` is the import, `make(cfg)` the expression that
 * opens a connection / pool from `cfg`. A SQLite driver is `{ head, decl }`:
 * `decl` declares the `db` handle.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/** mysql2 / mysql spellings, each opening a pool or connection from `cfg`. */
const MYSQL_DRIVERS = {
  Default: {
    head: "import mysql from 'mysql2';",
    make: (cfg) => `mysql.createConnection(${cfg})`,
  },
  Promise: {
    head: "import mysql from 'mysql2/promise';",
    make: (cfg) => `mysql.createPool(${cfg})`,
  },
  Named: {
    head: "import { createPool } from 'mysql2/promise';",
    make: (cfg) => `createPool(${cfg})`,
  },
  Namespace: {
    head: "import * as mysql from 'mysql2';",
    make: (cfg) => `mysql.createPool(${cfg})`,
  },
  // The original `mysql` driver, through CommonJS.
  RequireMysql: {
    head: "const mysql = require('mysql');",
    make: (cfg) => `mysql.createConnection(${cfg})`,
  },
  RequireDestructured: {
    head: "const { createPool } = require('mysql2');",
    make: (cfg) => `createPool(${cfg})`,
  },
  RequireMember: {
    head: "const mysql = require('mysql2');",
    make: (cfg) => `mysql['createPool'](${cfg})`,
  },
  // The same call with no driver import in the file: always silent.
  NoImport: {
    head: "import { mysql } from './db-driver';",
    make: (cfg) => `mysql.createPool(${cfg})`,
  },
};

/** SQLite drivers: how the file opens `db`. */
const SQLITE_DRIVERS = {
  BetterSqlite: {
    head: "import Database from 'better-sqlite3';",
    decl: "const db = new Database('app.db');",
  },
  BetterRequire: {
    head: "const Database = require('better-sqlite3');",
    decl: "const db = new Database('app.db');",
  },
  Sqlite3: {
    head: "import sqlite3 from 'sqlite3';",
    decl: "const db = new sqlite3.Database('app.db');",
  },
  NodeSqlite: {
    head: "import { DatabaseSync } from 'node:sqlite';",
    decl: "const db = new DatabaseSync('app.db');",
  },
  BunSqlite: {
    head: "import { Database } from 'bun:sqlite';",
    decl: "const db = new Database('app.db');",
  },
  // The `sqlite` promise wrapper over sqlite3.
  SqliteWrapper: {
    head: "import sqlite3 from 'sqlite3';\nimport { open } from 'sqlite';",
    decl: "const db = await open({ filename: 'app.db', driver: sqlite3.Database });",
  },
  Libsql: {
    head: "import { createClient } from '@libsql/client';",
    decl: "const db = createClient({ url: 'file:app.db' });",
  },
  NoImport: {
    head: "import { db } from './db';",
    decl: '',
  },
};

const HANDLER_PARAMS =
  'req: any, res: any, id: string, sort: string, ids: number[]';

/**
 * A whole file: `head`, extra `imports`, module `pre`, then `body` inside an
 * async request handler `(req, res, id, sort, ids)`.
 */
function handlerFile(head, body, { imports = '', pre = '' } = {}) {
  const indented = body
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  return (
    [
      head,
      imports,
      pre,
      `export async function handle(${HANDLER_PARAMS}) {\n${indented}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = { MYSQL_DRIVERS, SQLITE_DRIVERS, handlerFile };
