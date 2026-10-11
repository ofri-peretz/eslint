/**
 * Cross-file behaviour, on real files written to a temp directory.
 *
 * FP/FN zero-deferral follow-up to the 2026-10 review
 * (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md). Every case here
 * lints a file that sits next to real modules on disk, so what is proven is
 * the resolution itself, not a stub of it.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './rules/no-unsafe-query';
import { noMissingClientRelease } from './rules/no-missing-client-release';
import { noTransactionOnPool } from './rules/no-transaction-on-pool';
import { noInsecureSsl } from './rules/no-insecure-ssl';
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-cross-file-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

/** Write `files` into a fresh project directory and return its path. */
function project(name: string, files: Record<string, string>): string {
  const dir = path.join(ROOT, name);
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return dir;
}

const PG_DB =
  "import { Pool } from 'pg';\nexport const pool = new Pool();\nexport const query = (text, params) => pool.query(text, params);\n";

const pgApp = project('pg-app', {
  'db.ts': PG_DB,
  'queries.ts': [
    'export function buildSearch(filters) {',
    "  let q = 'SELECT * FROM users WHERE 1=1';",
    "  if (filters.name) q += ` AND name = '${filters.name}'`;",
    '  return q;',
    '}',
    "export const byTag = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;",
    "export const safeList = () => 'SELECT id FROM users';",
    'export function bindsLater() { let q; q = getText(); return q; }',
    "export function appends(f) { let q = 'SELECT * FROM t WHERE 1=1'; q = q + ` AND a = '${f.a}'`; return q; }",
    "export function rebased(f) { let q = `SELECT * FROM t WHERE a = '${f.a}'`; const base = 'SELECT 1'; q = base + ' FROM dual'; return q; }",
    'export function undeclaredResult() { return undeclaredQ; }',
    'export const notAFunction = 1;',
  ].join('\n'),
});
const pgBarrel = project('pg-barrel', {
  'db/index.ts': "export { pool } from './pool';\n",
  'db/pool.ts': "import { Pool } from 'pg';\nexport const pool = new Pool();\n",
});
const mongoApp = project('mongo-app', {
  'db.ts':
    "import mongoose from 'mongoose';\nexport const db = mongoose.connection;\nexport const conn = mongoose;\n",
});
const redisApp = project('redis-app', {
  'db.ts':
    "import { createClient } from 'redis';\nexport const db = createClient();\n",
});
const handles = project('handles', {
  'pool.ts':
    "import { Pool } from 'pg';\nexport const pool = new Pool();\nexport default new Pool();\n",
  'client.ts':
    "import { Client } from 'pg';\nexport const client = new Client();\n",
  'typed.ts':
    "import type { Pool } from 'pg';\ndeclare function createPool(): Pool;\nexport const pool: Pool = createPool();\n",
  'cjs.js':
    "const { Pool } = require('pg');\nmodule.exports = { pool: new Pool() };\n",
});
const configs = project('configs', {
  'db.json':
    '{ "host": "db.example.com", "password": "Pr0dS3cret", "ssl": { "rejectUnauthorized": false } }',
  'safe.json':
    '{ "host": "db.example.com", "ssl": { "rejectUnauthorized": true } }',
  'config.ts':
    "export const dbConfig = { host: 'db.example.com', password: 'Pr0dS3cret', ssl: { rejectUnauthorized: false } };\nexport const safeConfig = { ssl: { rejectUnauthorized: true }, password: process.env.PGPASSWORD };\n",
  'config.cjs': 'module.exports = { ssl: { rejectUnauthorized: false } };\n',
  'pg.ts': "import { Pool } from 'pg';\nexport { Pool };\n",
});

const at = (dir: string, file: string): string => path.join(dir, file);

describe('cross-file: the SDK gate opens one relative hop away', () => {
  ruleTester.run(
    'UQ-7: a route file importing a local db module that imports pg',
    noUnsafeQuery,
    {
      valid: [
        {
          name: 'a db module that imports mongoose keeps the gate closed',
          filename: at(mongoApp, 'routes/users.ts'),
          code: "import { db } from '../db';\ndb.query(`SELECT * FROM users WHERE id = ${req.params.id}`);",
        },
        {
          name: 'a db module that imports redis keeps the gate closed',
          filename: at(redisApp, 'routes/users.ts'),
          code: "import { db } from '../db';\ndb.query(`SELECT * FROM users WHERE id = ${req.params.id}`);",
        },
        {
          name: 'a relative import with no file on disk keeps the gate closed',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { api } from './api';\napi.query('SELECT * FROM products WHERE name = ' + term);",
        },
        {
          name: 'a parameterised query through the pg wrapper is safe',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import * as db from '../db';\ndb.query('SELECT * FROM users WHERE id = $1', [req.params.id]);",
        },
        {
          name: 'an imported builder returning a constant statement is safe',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { safeList } from '../queries';\nimport * as db from '../db';\ndb.query(safeList());",
        },
        {
          name: 'an imported builder that re-bases q on another constant reads the last base',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { rebased } from '../queries';\nimport * as db from '../db';\ndb.query(rebased(req.query));",
        },
        {
          name: 'an imported builder returning an undeclared name has nothing to judge',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { undeclaredResult } from '../queries';\nimport * as db from '../db';\ndb.query(undeclaredResult());",
        },
        {
          name: 'an imported name the module does not export is not a builder',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { nothing } from '../queries';\nimport * as db from '../db';\ndb.query(nothing());",
        },
        {
          name: 'an imported value that is not a function is not a builder',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { notAFunction } from '../queries';\nimport * as db from '../db';\ndb.query(notAFunction());",
        },
        {
          name: 'an imported builder whose returned binding is not query text has nothing to judge',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { bindsLater } from '../queries';\nimport * as db from '../db';\ndb.query(bindsLater());",
        },
      ],
      invalid: [
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: the node-postgres suggested layout — a route imports ../db, which imports pg',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import * as db from '../db';\ndb.query(`SELECT * FROM users WHERE id = ${req.params.id}`);",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: a CommonJS require of the local db module',
          filename: at(pgApp, 'routes/users.ts'),
          code: "const db = require('../db');\ndb.query('SELECT * FROM users WHERE id = ' + req.params.id);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: a barrel db/index.ts that re-exports the pool from a module importing pg',
          filename: at(pgBarrel, 'routes/users.ts'),
          code: "import { pool } from '../db';\npool.query(`DELETE FROM s WHERE id = ${id}`);",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: an imported multi-statement builder that returns q',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { buildSearch } from '../queries';\nimport * as db from '../db';\ndb.query(buildSearch(req.query));",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: an imported builder that appends with q = q + …',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { appends } from '../queries';\nimport * as db from '../db';\ndb.query(appends(req.query));",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: an imported concise builder returning an interpolated template',
          filename: at(pgApp, 'routes/users.ts'),
          code: "import { byTag } from '../queries';\nimport * as db from '../db';\ndb.query(byTag(req.query.tag));",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    },
  );

  ruleTester.run(
    'REL-1: a pool imported from a local db module',
    noMissingClientRelease,
    {
      valid: [
        {
          name: 'a mongoose connection checkout keeps the gate closed',
          filename: at(mongoApp, 'routes/users.ts'),
          code: "import { conn } from '../db';\nexport async function f() { const c = await conn.connect(); await c.query('SELECT 1'); }",
        },
      ],
      invalid: [
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: a client checked out of the imported pool and never released',
          filename: at(pgApp, 'routes/transfer.ts'),
          code: "import { pool } from '../db';\nexport async function transfer() { const client = await pool.connect(); await client.query('BEGIN'); await client.query('COMMIT'); }",
          errors: [{ messageId: 'missingClientRelease' }],
        },
      ],
    },
  );

  ruleTester.run(
    'TX-1: the imported handle is resolved to Pool or Client',
    noTransactionOnPool,
    {
      valid: [
        {
          name: 'an imported single pg Client is where a transaction may run',
          filename: at(handles, 'routes/tx.ts'),
          code: "import { client } from '../client';\nexport async function f() { await client.query('BEGIN'); }",
        },
        {
          name: 'an imported name the module does not export is not judged',
          filename: at(handles, 'routes/tx.ts'),
          code: "import { missing } from '../pool';\nexport async function f() { await missing.query('BEGIN'); }",
        },
      ],
      invalid: [
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: BEGIN on a pool imported from a module that exports new Pool()',
          filename: at(handles, 'routes/tx.ts'),
          code: "import { pool } from '../pool';\nexport async function f() { await pool.query('BEGIN'); }",
          errors: [{ messageId: 'noTransactionOnPool' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: BEGIN on the default-exported pool',
          filename: at(handles, 'routes/tx.ts'),
          code: "import pool from '../pool';\nexport async function f() { await pool.query('BEGIN'); }",
          errors: [{ messageId: 'noTransactionOnPool' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: BEGIN on an imported handle declared with pg Pool type',
          filename: at(handles, 'routes/tx.ts'),
          code: "import { pool } from '../typed';\nexport async function f() { await pool.query('BEGIN'); }",
          errors: [{ messageId: 'noTransactionOnPool' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: BEGIN on a pool from a CommonJS module.exports object',
          filename: at(handles, 'routes/tx.ts'),
          code: "const { pool } = require('../cjs');\nexport async function f() { await pool.query('BEGIN'); }",
          errors: [{ messageId: 'noTransactionOnPool' }],
        },
      ],
    },
  );
});

describe('cross-file: imported and JSON connection configs', () => {
  ruleTester.run(
    'SSL-2: an imported config disables verification',
    noInsecureSsl,
    {
      valid: [
        {
          name: 'an imported JSON config that verifies is safe',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport config from '../safe.json';\nexport const pool = new Pool(config);",
        },
        {
          name: 'an imported TS config that verifies is safe',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport { safeConfig } from '../config';\nexport const pool = new Pool(safeConfig);",
        },
      ],
      invalid: [
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: a JSON config imported and passed to new Pool',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport config from '../db.json';\nexport const pool = new Pool(config);",
          errors: [{ messageId: 'noInsecureSsl' }],
        },
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: a named TS config imported from another module',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport { dbConfig } from '../config';\nexport const pool = new Pool(dbConfig);",
          errors: [{ messageId: 'noInsecureSsl' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: a CommonJS config required and passed to new Pool',
          filename: at(configs, 'src/db.js'),
          code: "const { Pool } = require('pg');\nconst config = require('../config.cjs');\nmodule.exports = new Pool(config);",
          errors: [{ messageId: 'noInsecureSsl' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: a namespace-imported config read by member',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport * as cfg from '../config';\nexport const pool = new Pool(cfg.dbConfig);",
          errors: [{ messageId: 'noInsecureSsl' }],
        },
      ],
    },
  );

  ruleTester.run(
    'CRED: an imported config carries a password',
    noHardcodedCredentials,
    {
      valid: [
        {
          name: 'an imported config reading the password from the environment is safe',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport { safeConfig } from '../config';\nexport const pool = new Pool(safeConfig);",
        },
        {
          name: 'an imported JSON config with no password is safe',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport config from '../safe.json';\nexport const pool = new Pool(config);",
        },
      ],
      invalid: [
        {
          // @found harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md)
          name: 'FN: a JSON config with a literal password',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport config from '../db.json';\nexport const pool = new Pool(config);",
          errors: [{ messageId: 'noHardcodedCredentials' }],
        },
        {
          // @found reasoned during the 2026-10-10 FP/FN audit, not seen in real code
          name: 'FN: a TS config module with a literal password',
          filename: at(configs, 'src/db.ts'),
          code: "import { Pool } from 'pg';\nimport { dbConfig } from '../config';\nexport const pool = new Pool(dbConfig);",
          errors: [{ messageId: 'noHardcodedCredentials' }],
        },
      ],
    },
  );
});
