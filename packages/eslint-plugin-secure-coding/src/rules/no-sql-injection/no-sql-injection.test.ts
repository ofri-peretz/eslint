/**
 * Tests for no-sql-injection — CWE-89 in files that import no SQL driver.
 *
 * The labelled-corpus fixtures under `benchmarks/corpus/CWE-089/` are pinned
 * here by path. They are deliberately written WITHOUT a driver import: that is
 * the whole reason this rule exists, and prefixing one would make every case
 * below pass vacuously on the driver-scoped rules instead.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSqlInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-sql-injection', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      // ── Corpus: CWE-089/safe ─────────────────────────────────────────────
      {
        // benchmarks/corpus/CWE-089/safe/parameterized.js
        name: 'a parameterized query is not a finding',
        code: `async function findUser(userId) {
  return await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
}`,
      },
      {
        // benchmarks/corpus/CWE-089/safe/prepared-statement.js
        name: 'a prepared-statement object is not a built string',
        code: `async function findUserPrepared(userId) {
  const stmt = { name: 'get-user', text: 'SELECT id, name, email FROM users WHERE id = $1', values: [userId] };
  return await db.query(stmt);
}`,
      },
      {
        // benchmarks/corpus/CWE-089/safe/static-query.js
        name: 'a fully static statement is not a finding',
        code: `async function listActiveUsers() {
  return await db.query('SELECT id, name FROM users WHERE active = true');
}`,
      },

      // ── The partition: a driver file belongs to the driver's own rule ────
      {
        name: 'an ESM pg import hands the site to postgresql-security',
        code: `import { Pool } from 'pg';
const pool = new Pool();
const id = req.params.id;
pool.query('SELECT * FROM users WHERE id = ' + id);`,
      },
      {
        name: 'a CommonJS require hands the site over too',
        code: `const mysql = require('mysql2/promise');
const id = req.params.id;
conn.query('SELECT * FROM users WHERE id = ' + id);`,
      },
      {
        name: 'a dynamic import hands the site over too',
        code: `const id = req.params.id;
async function go() {
  const pg = await import('pg');
  db.query('SELECT * FROM users WHERE id = ' + id);
}`,
      },
      {
        name: 'TypeScript import-equals hands the site over too',
        code: `import pg = require('pg');
const id = req.params.id;
db.query('SELECT * FROM users WHERE id = ' + id);`,
      },
      {
        name: 'a scoped driver package is recognised',
        code: `import { sql } from '@vercel/postgres';
const id = req.params.id;
db.query('SELECT * FROM users WHERE id = ' + id);`,
      },
      {
        name: 'a non-driver package import does not silence the rule',
        code: `import express from 'express';
const clean = escapeIdentifier(req.params.id);
db.query('SELECT * FROM users WHERE id = ' + clean);`,
      },

      // ── Attribution: dynamic is not the same as attacker-controlled ──────
      {
        name: 'a function parameter is not attributable',
        code: `function findUser(userId) {
  return db.query('SELECT * FROM users WHERE id = ' + userId);
}`,
      },
      {
        name: 'a module constant is not attributable',
        code: `const TABLE = 'users';
db.query('SELECT * FROM ' + TABLE + ' WHERE active = true');`,
      },
      {
        name: 'an escaping call breaks attribution — it is the documented fix',
        code: `db.query('SELECT * FROM users ORDER BY ' + escapeIdentifier(req.query.sort));`,
      },
      {
        name: 'a request root with no caller-supplied property is not attributable',
        code: `db.query('SELECT * FROM users WHERE id = ' + req.locals.id);`,
      },
      {
        name: 'a non-request root is not attributable',
        code: `db.query('SELECT * FROM users WHERE id = ' + config.defaultId);`,
      },
      {
        name: 'a computed member on a non-identifier root is not attributable',
        code: `db.query('SELECT * FROM users WHERE id = ' + getReq().params.id);`,
      },
      {
        name: 'a reassigned builder variable is not followed',
        code: `let sql = 'SELECT * FROM users WHERE 1=1';
sql += ' AND name = ' + req.query.name;
db.query(sql);`,
      },
      {
        name: 'an unresolvable identifier is not followed',
        code: `db.query('SELECT * FROM users WHERE id = ' + unknownGlobal);`,
      },
      {
        name: 'a declared-but-uninitialised variable is not followed',
        code: `let sql;
db.query(sql);`,
      },
      {
        name: 'a variable bound to a literal is not a built string',
        code: `const sql = 'SELECT * FROM users';
db.query(sql);`,
      },

      // ── Shape gates ──────────────────────────────────────────────────────
      {
        name: 'a template with no interpolation is not a built string',
        code: 'db.query(`SELECT * FROM users`);',
      },
      {
        name: 'numeric addition is not a built string statement',
        code: `db.query(offset - req.query.page);`,
      },
      {
        name: 'a verb without its companion keyword is not a statement',
        code: `logger.query('update available for ' + req.query.pkg);`,
      },
      {
        name: 'a non-SQL string reaching a query method is not a statement',
        code: 'db.query(`/users/${req.params.id}`);',
      },
      {
        name: 'a method that is not a SQL sink is ignored',
        code: `db.send('SELECT * FROM users WHERE id = ' + req.params.id);`,
      },
      {
        name: 'a computed sink name is ignored',
        code: `db['query']('SELECT * FROM users WHERE id = ' + req.params.id);`,
      },
      {
        name: 'a bare call is not a sink',
        code: `query('SELECT * FROM users WHERE id = ' + req.params.id);`,
      },
      {
        name: 'a sink with no arguments is ignored',
        code: `db.query();`,
      },
      {
        name: 'a spread argument is ignored',
        code: `db.query(...args);`,
      },
      {
        name: 'require with a non-literal specifier is ignored',
        code: `const drv = require(name);
db.query('SELECT * FROM users WHERE id = ' + escape(req.params.id));`,
      },
      {
        name: 'a non-external import-equals is ignored',
        code: `namespace A { export const b = 1; }
import c = A.b;
db.query('SELECT * FROM users WHERE id = ' + escape(req.params.id));`,
      },
      {
        name: 'a dynamic import with a non-literal specifier is ignored',
        code: `async function go(name) { await import(name); }
db.query('SELECT * FROM users WHERE id = ' + escape(req.params.id));`,
      },
      {
        // A parameter is written once here, but a parameter has no
        // initialiser to follow — `singleAssignedInit` must not treat the
        // `Parameter` definition as a `Variable` one.
        name: 'a reassigned parameter is not followed',
        code: `function run(sql) {
  sql = 'SELECT * FROM users WHERE id = ' + req.query.id;
  db.query(sql);
}`,
      },
      {
        // Declared empty, assigned once: the `Variable` definition exists but
        // carries no initialiser, so there is nothing to follow from the
        // declaration. Documented limit — a two-step builder is not tracked.
        name: 'a variable declared without an initialiser is not followed',
        code: `let sql;
sql = 'SELECT * FROM users WHERE id = ' + req.query.id;
db.query(sql);`,
      },
      {
        name: 'an unresolvable identifier passed straight to the sink is not followed',
        code: `db.query(sqlBuiltElsewhere);`,
      },
      {
        // Reaches the end of the template arm: a SQL statement whose only
        // interpolation cannot be attributed to a request.
        name: 'a SQL template with no attributable interpolation is not reported',
        code: `function listByTenant(tenantId) {
  return db.query(\`SELECT * FROM users WHERE tenant = \${tenantId} AND active = true\`);
}`,
      },
      {
        name: 'a SQL template whose first interpolation is unattributable and second is a constant',
        code: `const LIMIT = 50;
function listByTenant(tenantId) {
  return db.query(\`SELECT * FROM users WHERE tenant = \${tenantId} LIMIT \${LIMIT}\`);
}`,
      },
      {
        name: 'deep binding chains stop at the depth limit',
        code: `const a = req.query.x;
const b = a; const c = b; const d = c; const e = d; const f = e;
db.query('SELECT * FROM users WHERE id = ' + f);`,
      },
    ],

    invalid: [
      // ── Corpus: CWE-089/vulnerable ───────────────────────────────────────
      {
        // benchmarks/corpus/CWE-089/vulnerable/string-concat.js
        name: 'concatenation through a written-once query variable',
        code: `const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ' + userId;
db.query(query);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        // benchmarks/corpus/CWE-089/vulnerable/template-literal.js
        name: 'template interpolation of a request field',
        code: `const name = req.body.name;
db.query(\`SELECT * FROM users WHERE name = '\${name}'\`);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        // benchmarks/corpus/CWE-089/vulnerable/dynamic-column.js
        name: 'an attacker-chosen ORDER BY column',
        code: `const sortColumn = req.query.sort;
db.query('SELECT * FROM users ORDER BY ' + sortColumn);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },

      // ── Direct attribution, other statement verbs, other sink ────────────
      {
        name: 'a request field concatenated directly at the sink',
        code: `db.query('SELECT * FROM users WHERE id = ' + req.params.id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'UPDATE … SET is a statement',
        code: `db.execute('UPDATE users SET name = ' + req.body.name + ' WHERE id = 1');`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'DELETE FROM is a statement',
        code: 'db.query(`DELETE FROM users WHERE id = ${req.params.id}`);',
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'INSERT INTO is a statement',
        code: `db.query('INSERT INTO audit (actor) VALUES (' + req.headers.authorization + ')');`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a computed request property still attributes',
        code: "db.query('SELECT * FROM logs WHERE ip = ' + req.headers['x-forwarded-for']);",
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a ctx-rooted request attributes',
        code: `db.query('SELECT * FROM users WHERE id = ' + ctx.params.id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'attribution found on the left operand',
        code: `db.query(req.query.prefix + ' SELECT id FROM users WHERE 1=1');`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        // A relative specifier is not a package. `./pg` must NOT silence this
        // rule: the driver-scoped rules reject relative specifiers too, so
        // treating it as evidence would leave the site owned by nobody.
        name: 'a relative specifier spelling a driver name does not silence the rule',
        code: `import db from './pg';
const id = req.params.id;
db.query('SELECT * FROM users WHERE name = ' + id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'an absolute specifier spelling a driver name does not silence the rule',
        code: `import db from '/opt/pg';
db.query('SELECT * FROM users WHERE name = ' + req.body.name);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a driver-shaped name that is not a driver package does not silence',
        code: `import { z } from 'pg-lite-not-real';
db.query('SELECT * FROM users WHERE id = ' + req.params.id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a require of a non-driver package does not silence',
        code: `const express = require('express');
db.query('SELECT * FROM users WHERE id = ' + req.params.id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
    ],
  });
});

/**
 * REGRESSION LOCK — TypeScript casts must not hide taint.
 *
 * `req.query.x` is typed `string | string[] | ParsedQs | undefined` by Express,
 * so a TypeScript handler CANNOT pass it where a string is expected without
 * `as string`. Every taint walker in this repo dispatched on `node.type` and
 * fell through to its null/false default for `TSAsExpression`, so this rule
 * reported NOTHING on TypeScript Express code while its suite stayed green —
 * there was not one cast anywhere in these tests.
 *
 * The cast is erased at compile time and changes no value, so unwrapping it is
 * always sound for provenance. Fixed by `unwrapTypeSyntax` in @interlace/eslint-devkit.
 *
 * This block FAILS on the pre-fix rule. Verify with:
 *   git stash && npx vitest run <this file>   # expect a failure
 */
ruleTester.run('no-sql-injection-ts-cast-taint', noSqlInjection, {
  valid: [
    "db.query(`SELECT * FROM reports WHERE owner = 'system'`);",
  ],
  invalid: [
    {
      code: "db.query(`SELECT * FROM reports WHERE owner = '${req.query.owner as string}'`);",
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});
