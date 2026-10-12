/**
 * Tests for sqlite-security/no-unsafe-query
 * CWE-89 — SQL injection through SQLite's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noUnsafeQuery } from './index';

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

describe('no-unsafe-query', () => {
  describe('Valid — parameterized and static SQL', () => {
    ruleTester.run('valid', noUnsafeQuery, {
      valid: [
        {
          name: 'safe idiom',
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users WHERE id = ?').get(userId);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import Database from "better-sqlite3";\ndb.prepare();',
        },
        {
          name: 'unrelated code',
          code: 'import Database from "better-sqlite3";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import Database from 'better-sqlite3';\nconst sql = 'SELECT * FROM users'; db.prepare(sql);",
        },
        {
          name: 'non-SQL text into the same sink is not a SQL finding',
          code: 'import Database from "better-sqlite3";\ntask.run(`step ${i}`);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — interpolated raw SQL', () => {
    ruleTester.run('invalid', noUnsafeQuery, {
      valid: [],
      invalid: [
        {
          name: 'template interpolation',
          code: 'import Database from "better-sqlite3";\ndb.prepare(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import Database from 'better-sqlite3';\ndb.prepare('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import Database from 'better-sqlite3';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'db.prepare(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'exec() sink',
          code: 'import Database from "better-sqlite3";\ndb.exec(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'run() sink',
          code: 'import Database from "better-sqlite3";\ndb.run(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'all() sink',
          code: 'import Database from "better-sqlite3";\ndb.all(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'get() sink',
          code: 'import Database from "better-sqlite3";\ndb.get(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-sqlite-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const B =
    "import Database from 'better-sqlite3';\nconst foo = new Database(':memory:');\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-fpfn-'));
  fs.writeFileSync(
    path.join(dir, 'db.js'),
    "const Database = require('better-sqlite3');\nmodule.exports = new Database('app.db');\n",
  );
  const ROUTE = path.join(dir, 'routes.js');

  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (constant table name)
        name: 'FP: a constant table name and a ? placeholder list',
        code:
          B +
          "const bar = 'users';\nconst baz = [1, 2];\n" +
          'foo.prepare(`SELECT * FROM ${bar} WHERE id = ?`).get(1);\n' +
          "foo.prepare(`SELECT * FROM t WHERE id IN (${baz.map(() => '?').join(',')})`).all(...baz);\n" +
          "foo.prepare(`SELECT * FROM t WHERE id IN (${'?,'.repeat(baz.length).slice(0, -1)})`).all(...baz);",
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (numeric limit)
        name: 'FP: a limit forced to a number',
        code:
          B +
          'export const h = (bar) => foo.prepare(`SELECT * FROM t LIMIT ${Math.min(100, Number(bar.query.n))}`).all();',
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (Map.get with a select- key)
        name: 'FP: a cache key that starts with a SQL word is not a statement',
        code:
          B +
          'const bar = new Map();\nexport const h = (baz) => bar.get(`select-${baz.query.k}`);',
      },
      {
        // @found louislam/uptime-kuma:server/database.js:1056
        name: "FP: another library's exec() in a file that loads sqlite3",
        code:
          "const sqlite3 = require('sqlite3');\nconst { R } = require('redbean-node');\n" +
          'async function foo(bar) { await R.exec(`DELETE FROM heartbeat WHERE monitor_id = ? AND time < ${bar}`, [1]); }\n' +
          'module.exports = { foo, sqlite3 };',
      },
      {
        // Shape from WiseLibs/better-sqlite3:benchmark/drivers.js:24 — silent before
        // and after; pinned because PRAGMA is now a recognised statement.
        name: 'PRAGMA operands take no bind parameter, and a caller-supplied one is composition',
        code:
          B +
          'export function h(bar) { for (const baz of bar) foo.exec(`PRAGMA ${baz}`); }',
      },
      {
        name: "a prepared statement's get() takes bound values, not SQL",
        code:
          B +
          "export const h = (bar) => { const baz = foo.prepare('SELECT * FROM t WHERE a = ?'); return baz.get(bar.query.a); };",
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (allowlist map)
        name: 'FP: a lookup through a fixed map is an allowlist',
        code:
          B +
          "const bar = { users: 'users', posts: 'posts' } as const;\n" +
          'export const h = (baz) => foo.prepare(`SELECT * FROM ${bar[baz.query.t as keyof typeof bar]}`).all();',
      },
    ],
    invalid: [
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)
        name: 'FN: the database handle comes from a relative module',
        filename: ROUTE,
        code: "const foo = require('./db');\nmodule.exports = (bar) => foo.prepare(`SELECT * FROM users WHERE id = ${bar.params.id}`).get();",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (better-sqlite3 pragma)
        name: 'FN: better-sqlite3 pragma() with an interpolated operand',
        code:
          B +
          'export const h = (bar) => foo.pragma(`table_info(${bar.query.table})`);',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (sqlite3 each)
        name: 'FN: sqlite3 Database#each()',
        code: "const sqlite3 = require('sqlite3');\nconst foo = new sqlite3.Database(':memory:');\nexports.h = (bar) => foo.each(`SELECT * FROM t WHERE b = '${bar.query.b}'`, () => {});",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (bun:sqlite query)
        name: 'FN: bun:sqlite Database#query()',
        code: "import { Database } from 'bun:sqlite';\nconst foo = new Database('x');\nexport const h = (bar: { v: string }) => foo.query(`SELECT * FROM t WHERE v = '${bar.v}'`).all();",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (sqlite promise wrapper)
        name: "FN: the `sqlite` promise wrapper's get()",
        code: "import { open } from 'sqlite';\nexport async function h(bar) { const foo = await open({ filename: 'x' }); return foo.get(`SELECT * FROM t WHERE a = '${bar.query.a}'`); }",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found sqlite-security FP/FN review 2026-10-12, synthetic probe (libsql execute)
        name: 'FN: @libsql/client execute() with the { sql } options form',
        code: "import { createClient } from '@libsql/client';\nconst foo = createClient({ url: 'file:x' });\nexport const h = (bar) => foo.execute({ sql: `SELECT * FROM t WHERE a = '${bar.query.a}'`, args: [] });",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        name: 'node:sqlite DatabaseSync exec()',
        code: "import { DatabaseSync } from 'node:sqlite';\nconst foo = new DatabaseSync(':memory:');\nexport const h = (bar) => foo.exec(`INSERT INTO t VALUES ('${bar.v}')`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        name: 'a table name taken from the request is reported in an identifier position',
        code:
          B +
          'export const h = (bar) => foo.prepare(`SELECT * FROM ${bar.query.t}`).all();',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
