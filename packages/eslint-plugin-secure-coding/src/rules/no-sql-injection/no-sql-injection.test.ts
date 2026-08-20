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
        name: 'an unresolvable identifier passed straight to the sink is not followed',
        code: `db.query(sqlBuiltElsewhere);`,
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

      // ── Shapes that USED to be documented abstentions ────────────────────
      //
      // Every case below was a `valid` entry in this suite until an adversarial
      // corpus wave was written against the rule. Each one is a textbook
      // CWE-89, and each was quiet for a reason that read as principled and was
      // not: "a parameter has no provenance", "a computed name is not a sink",
      // "a two-step builder is not tracked". The corpus fixture that proved it
      // is named beside each.
      {
        // vulnerable/02-local-db-concat.js, vulnerable/06-service-class.js
        name: 'a function parameter is a caller-supplied inlet',
        code: `function findUser(userId) {
  return db.query('SELECT * FROM users WHERE id = ' + userId);
}`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a parameter interpolated into a template is an inlet too',
        code: `function listByTenant(tenantId) {
  return db.query(\`SELECT * FROM users WHERE tenant = \${tenantId} AND active = true\`);
}`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a constant alongside the parameter does not launder it',
        code: `const LIMIT = 50;
function listByTenant(tenantId) {
  return db.query(\`SELECT * FROM users WHERE tenant = \${tenantId} LIMIT \${LIMIT}\`);
}`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        // vulnerable/18-append-builder.js
        name: 'an appended clause is part of the statement',
        code: `let sql = 'SELECT * FROM users WHERE 1=1';
sql += ' AND name = ' + req.query.name;
db.query(sql);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        // vulnerable/09-computed-sink-name.js
        name: 'a computed sink name is still the sink',
        code: `db['query']('SELECT * FROM users WHERE id = ' + req.params.id);`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a reassigned parameter carries what was written into it',
        code: `function run(sql) {
  sql = 'SELECT * FROM users WHERE id = ' + req.query.id;
  db.query(sql);
}`,
        errors: [{ messageId: 'sqlInjection' as const }],
      },
      {
        name: 'a variable declared without an initialiser is followed to its write',
        code: `let sql;
sql = 'SELECT * FROM users WHERE id = ' + req.query.id;
db.query(sql);`,
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
  valid: ["db.query(`SELECT * FROM reports WHERE owner = 'system'`);"],
  invalid: [
    {
      code: "db.query(`SELECT * FROM reports WHERE owner = '${req.query.owner as string}'`);",
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * REGRESSION LOCK — the corpus cases.
 *
 * benchmarks/rule-corpus/secure-coding__no-sql-injection/ exists to answer one
 * product question: does this rule earn its place when the ecosystem ships nine
 * driver-specific SQL plugins?
 *
 * Measured answer: yes, and exclusively. Every vulnerable fixture gets its
 * handle from the application's own module (`../lib/db`), so no driver import
 * exists in the file and `postgresql-security/no-unsafe-query` reports ZERO on
 * all of them. sonarjs and eslint-plugin-security also report zero. This rule
 * is the only thing covering the shape most applications actually write.
 *
 * Measured on 43 fixtures across three waves (RESULTS.json):
 *
 *   Interlace secure-coding/no-sql-injection   23 TP  0 FP  0 FN   F1 100.0%
 *   sonarjs [sql-queries]                       0 TP  0 FP 23 FN   F1   0.0%
 *   eslint-plugin-security                      1 TP  0 FP 22 FN   F1   8.3%
 */
ruleTester.run('no-sql-injection-corpus-locks', noSqlInjection, {
  valid: [
    // The documented fix must never report, at EITHER setting. This is why the
    // strict mode excludes call results: an escaper and a builder look the same
    // from the call site.
    {
      code: "db.query('SELECT * FROM users ORDER BY ' + escapeIdentifier(req.query.sort));",
      options: [{ reportUnattributedInterpolation: true }],
    },
    // Server-set, not caller-supplied — the distinction the default preserves.
    {
      code: "db.query('SELECT * FROM users WHERE id = ' + req.locals.id);",
    },
    // Parameterised, and folded constants.
    "import { db } from '../lib/db'; db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);",
    "import { db } from '../lib/db'; const T = 'users'; db.query(`SELECT * FROM ${T} WHERE active = true`);",
  ],
  invalid: [
    {
      // Template-literal form of the strict mode — covers the TemplateLiteral
      // arm of hasRawUnattributedPart, which the concatenation cases never reach.
      code: 'function q(tag) { return db.query(`SELECT * FROM logs WHERE tag = ${tag}`); }',
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // NESTED concatenation inside a template — the recursive arm.
      code: 'function q(a, b) { return db.query(`SELECT * FROM t WHERE x = ${a + b}`); }',
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // The shape no SDK plugin can see: handle from the app's own module.
      code: "import { db } from '../lib/db'; db.query(`SELECT * FROM users WHERE email = '${req.query.email}'`);",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // A library function's parameter — silent by default, recovered by the
      // option. Kept as an explicit case so the trade is visible in the suite
      // rather than only in a benchmark file.
      code: "function findUser(userId) { return db.query('SELECT * FROM users WHERE id = ' + userId); }",
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * Edge paths of the local-builder resolution.
 *
 * `effectiveExpression` now substitutes a LOCAL builder's returned template so
 * `db.query(build(req.query.tag))` is seen as the query it is. These cover the
 * ways that resolution correctly gives up — each one must stay quiet, because
 * an unresolvable call is exactly the shape an imported escaper takes.
 */
ruleTester.run('no-sql-injection-builder-edges', noSqlInjection, {
  valid: [
    // Member callee: not a bare identifier, so nothing to resolve.
    "import { db } from '../lib/db'; db.query(sqlkit.build(req.query.tag));",
    // Callee is an undeclared global: resolveVariable finds no binding at all.
    "import { db } from '../lib/db'; db.query(globalBuild(req.query.tag));",
    // Callee resolves to nothing in this file - the imported-escaper shape.
    "import { db } from '../lib/db'; import { esc } from 'pg-escape'; db.query(esc(req.query.tag));",
    // Callee resolves, but not to a function.
    "import { db } from '../lib/db'; const build = 'not a function'; db.query(build(req.query.tag));",
    // Callee resolves to a function whose body is NOT an interpolated string.
    "import { db } from '../lib/db'; const build = (t) => lookup(t); db.query(build(req.query.tag));",
  ],
  invalid: [
    {
      // The builder itself: resolved, and the injection surfaces AT THE
      // DEFAULT. Substituting the body used to yield a template interpolating
      // the builder's OWN parameter `t`, which had no provenance — so the shape
      // was visible but the taint was not, and only the strict option reported
      // it. Binding `t` to the argument `req.query.tag` closes that gap, and it
      // is the same binding that keeps `build('admin')` quiet.
      code: "import { db } from '../lib/db'; const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; db.query(build(req.query.tag));",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Concatenating builder, the BinaryExpression arm.
      code: "import { db } from '../lib/db'; const build = (t) => 'SELECT * FROM logs WHERE tag = ' + t; db.query(build(req.query.tag));",
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * REGRESSION LOCKS — ADVERSARIAL WAVE 2.
 *
 * Written AFTER the rule reached 100% F1 on its first corpus, for the sole
 * purpose of breaking it. It did: the rule dropped from 100% to 75.9% F1 —
 * six false negatives and one false positive, on 32 fixtures.
 *
 * Corpus: benchmarks/rule-corpus/secure-coding__no-sql-injection/
 * (`vulnerable/09`–`17`, `safe/07`–`15`). Every case below fails on the rule
 * as it stood before this wave.
 */
ruleTester.run('no-sql-injection-adversarial-wave-2', noSqlInjection, {
  valid: [
    // safe/07 — the builder resolves, but the argument is a literal. This is
    // what makes parameter binding a precision feature and not only a recall
    // one: treating a builder's parameter as tainted without looking at the
    // call site reports this file.
    "import { db } from '../lib/db'; const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f() { return db.query(build('admin')); }",
    // safe/20 — bound to a constant the CALLER declared, one hop away.
    "import { db } from '../lib/db'; const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f() { const t = 'admin'; return db.query(build(t)); }",
    // safe/08 — a parameter every write to which is a literal.
    "import { db } from '../lib/db'; export function f(column) { column = 'created_at'; return db.query('SELECT * FROM users ORDER BY ' + column); }",
    // safe/09 — the concatenation is in the BOUND VALUES, not the statement.
    "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM items WHERE name LIKE $1', ['%' + req.query.term + '%']); }",
    // safe/11 — THE FALSE POSITIVE THIS WAVE FOUND. `req` is a membership
    // check on a name, and a name is not evidence: an object literal written
    // one line above answers to it. A root this file constructs is not inbound.
    "import { db } from '../lib/db'; const req = { params: { table: 'users' } }; export function f() { return db.query('SELECT * FROM ' + req.params.table + ' WHERE active = true'); }",
    // safe/12 — a local escaper that really neutralises the quote. Inlining it
    // lands on a member call that resolves to nothing, so the chain breaks.
    `import { db } from '../lib/db'; const quote = (v) => \`'\${String(v).split("'").join("''")}'\`; export function f(req) { return db.query('SELECT * FROM users WHERE name = ' + quote(req.query.name)); }`,
    // safe/13 — a tagged template parameterises; it is not a built string.
    "import { db } from '../lib/db'; import { sql } from '../lib/sql-tag'; export function f(req) { return db.query(sql`SELECT * FROM users WHERE id = ${req.params.id}`); }",
    // safe/14 — only LOOKS concatenated: both operands are literals.
    "import { db } from '../lib/db'; const WHERE = ' WHERE id = $1'; export function f(req) { return db.query('SELECT id, name FROM users' + WHERE, [req.params.id]); }",
    // safe/15 — a loop binding whose only source is a literal array.
    "import { db } from '../lib/db'; const COLUMNS = ['id', 'name']; export async function f() { for (const c of COLUMNS) { await db.query('SELECT ' + c + ' FROM users WHERE active = true'); } }",
    // safe/10 — the vulnerable spelling exists only in a comment.
    `import { db } from '../lib/db'; export function f(req) {
  // db.query("SELECT * FROM users WHERE email = '" + req.query.email + "'");
  return db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
}`,
  ],
  invalid: [
    {
      // vulnerable/09 — the sink name reached through a const. The cheapest
      // evasion there is: move the name one line up.
      name: 'the sink name reached through a const',
      code: "import { db } from '../lib/db'; const METHOD = 'query'; export function f(req) { return db[METHOD]('SELECT * FROM users WHERE id = ' + req.params.id); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/10 — `String()` is a call, but it is not an escaper.
      name: 'String() is transparent, not sanitising',
      code: "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM reports WHERE owner = ' + String(req.query.owner)); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/11 — one arm of a ternary is attacker-controlled.
      name: 'a ternary arm carries taint',
      code: "import { db } from '../lib/db'; export function f(req) { const o = req.query.sort ? req.query.sort : 'id'; return db.query('SELECT * FROM users ORDER BY ' + o); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/12 — a `let` seeded with a literal, overwritten from the
      // request. Following only single-assignment bindings missed it.
      name: 'a conditional reassignment from the request',
      code: `import { db } from '../lib/db'; export function f(req) {
  let name = 'anonymous';
  if (req.query.name) { name = req.query.name; }
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}`,
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/13 — a LOCAL helper wearing a trusted name that only wraps
      // the value in quotes. Its body is in this file, so it can be read
      // instead of trusted.
      name: 'a local helper named escape that escapes nothing',
      code: "import { db } from '../lib/db'; const escape = (v) => `'${v}'`; export function f(req) { return db.query('SELECT * FROM users WHERE name = ' + escape(req.query.name)); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/14 — the handle is a private class field.
      name: 'a private class field holding the handle',
      code: `import { pool } from '../infra/pool'; export class R {
  #db = pool;
  async byOwner(req) { return this.#db.query(\`SELECT * FROM reports WHERE owner = '\${req.query.owner}'\`); }
}`,
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/15 — the loop binding takes its value from the request.
      name: 'a for-of binding over a request value',
      code: `import { db } from '../lib/db'; export async function f(req) {
  for (const tag of req.query.tags) { await db.execute("DELETE FROM logs WHERE tag = '" + tag + "'"); }
}`,
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/16 — a driver name as DATA must not open the partition.
      name: 'a driver name in a string does not hand the site away',
      code: "import { db } from '../lib/db'; export const DRIVER = 'pg'; export function f(req) { return db.query('SELECT * FROM users WHERE id = ' + req.params.id); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/17 — the sink reached through an optional chain.
      name: 'an optional-chained sink',
      code: "import { db } from '../lib/db'; export function f(req) { return db?.query(`SELECT * FROM users WHERE email = '${req.body.email}'`); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * REGRESSION LOCKS — ADVERSARIAL WAVE 3.
 *
 * Written after wave 2 was fixed and the rule was back at 100%. It found nine
 * more false negatives. Corpus: `vulnerable/18`–`23`, `safe/16`–`20`.
 */
ruleTester.run('no-sql-injection-adversarial-wave-3', noSqlInjection, {
  valid: [
    // safe/16 — the same append shape with every clause a literal.
    `import { db } from '../lib/db'; export function f(activeOnly) {
  let sql = 'SELECT id FROM users WHERE 1=1';
  if (activeOnly) { sql += ' AND active = true'; }
  return db.query(sql);
}`,
    // safe/17 — the query-config form used correctly.
    "import { db } from '../lib/db'; export function f(req) { const s = { name: 'byOwner', text: 'SELECT * FROM reports WHERE owner = $1', values: [req.query.owner] }; return db.query(s); }",
    // safe/18 — a loop counter is written by the loop, not by a caller.
    "import { db } from '../lib/db'; export async function f(n) { for (let p = 0; p < n; p++) { await db.query('SELECT * FROM users LIMIT 10 OFFSET ' + p * 10); } }",
    // safe/19 — `String` here is a LOCAL escaper, not the ambient global.
    "import { db } from '../lib/db'; import { escapeLiteral } from '../lib/escape'; function String(v) { return escapeLiteral(v); } export function f(req) { return db.query('SELECT * FROM reports WHERE owner = ' + String(req.query.owner)); }",
    // A join whose receiver cannot be resolved to an array literal.
    "import { db } from '../lib/db'; export function f(req, rows) { return db.query(rows.join(' ')); }",
    // A join on a receiver that resolves to something other than an array.
    "import { db } from '../lib/db'; export function f(req) { const parts = 'SELECT'; return db.query(parts.join(' ')); }",
    // A block-bodied builder with more than one statement is not inlined —
    // an intervening statement could sanitise.
    "import { db } from '../lib/db'; function build(t) { const c = clean(t); return `SELECT * FROM logs WHERE tag = '${c}'`; } export function f(req) { return db.query(build(req.query.tag)); }",
    // A block-bodied builder with a bare `return;` has no expression to inline.
    "import { db } from '../lib/db'; function build(t) { return; } export function f(req) { return db.query(build(req.query.tag)); }",
    // A query-config object with no statement property at all.
    "import { db } from '../lib/db'; export function f(req) { return db.query({ values: ['SELECT * FROM t WHERE a = ' + req.query.a] }); }",
    // A self-recursive builder terminates instead of blowing the stack.
    "import { db } from '../lib/db'; const f = (x) => `SELECT * FROM t WHERE a = '${f(x)}'`; export function g(req) { return db.query(f(req.query.a)); }",
  ],
  invalid: [
    {
      // vulnerable/18 — base clause and injected clause are separate writes.
      name: 'an append builder assembles the statement across writes',
      code: `import { db } from '../lib/db'; export function f(req) {
  let sql = 'SELECT * FROM users WHERE 1=1';
  sql += " AND name = '" + req.query.name + "'";
  return db.query(sql);
}`,
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/19 — concatenation spelled as an array join.
      name: 'Array#join is concatenation',
      code: `import { db } from '../lib/db'; export function f(req) {
  const parts = ['SELECT * FROM items WHERE name =', "'" + req.query.term + "'"];
  return db.query(parts.join(' '));
}`,
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/20 — the driver query-config form with a built `text`.
      name: 'a built text in a query-config object',
      code: "import { db } from '../lib/db'; export function f(req) { return db.query({ text: 'SELECT * FROM reports WHERE owner = ' + req.query.owner, values: [] }); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // The same, reached through a binding, with a quoted key.
      name: 'a query-config object behind a binding',
      code: "import { db } from '../lib/db'; export function f(req) { const q = { 'text': 'SELECT * FROM reports WHERE owner = ' + req.query.owner }; return db.query(q); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/21 — a hoisted function declaration is a `FunctionName`
      // definition with no write reference, so the written-once test never
      // saw the most ordinary way to spell a builder.
      name: 'a function-declaration builder',
      code: "import { db } from '../lib/db'; function build(t) { return `SELECT * FROM logs WHERE tag = '${t}'`; } export function f(req) { return db.query(build(req.query.tag)); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/22 — `|| 'id'` does not stop the left arm.
      name: 'a logical default keeps the tainted arm',
      code: "import { db } from '../lib/db'; export function f(req) { const c = req.query.sort || 'id'; return db.query('SELECT * FROM users ORDER BY ' + c); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // vulnerable/23 — awaited before it reaches the sink.
      name: 'an awaited builder',
      code: "import { db } from '../lib/db'; const build = async (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export async function f(req) { return db.query(await build(req.query.tag)); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // A template nested inside a template still reaches the request.
      name: 'a template nested in a template',
      code: "import { db } from '../lib/db'; export function f(req) { return db.query(`SELECT * FROM t WHERE a = '${`${req.query.a}`}'`); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // A root initialised from something opaque is NOT disqualified: the
      // locally-constructed test must reject only what this file BUILT.
      name: 'a request bound from an opaque value is still inbound',
      code: "import { db } from '../lib/db'; export function f(ctx) { const req = ctx.request; return db.query('SELECT * FROM users WHERE id = ' + req.params.id); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * OPTION CONTRACT — every option in its OVERRIDDEN state.
 *
 * Each option has an explicit default in `defaultOptions` and in the schema;
 * these prove the override is honoured in both directions, so no list here is
 * a hardcoded word list a consumer cannot change.
 */
ruleTester.run('no-sql-injection-option-overrides', noSqlInjection, {
  valid: [
    // treatParametersAsUntrusted: false — back to attributable taint only.
    {
      code: `import { db } from '../lib/db'; export function search(term) {
  return db.query("SELECT * FROM items WHERE name LIKE '%" + term + "%'");
}`,
      options: [{ treatParametersAsUntrusted: false }],
    },
    // requestRoots overridden: `req` is no longer a request root.
    {
      code: "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM users WHERE id = ' + req.params.id); }",
      options: [{ requestRoots: ['event'], treatParametersAsUntrusted: false }],
    },
    // requestProperties overridden: `params` is no longer caller-supplied.
    {
      code: "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM users WHERE id = ' + req.params.id); }",
      options: [
        { requestProperties: ['body'], treatParametersAsUntrusted: false },
      ],
    },
    // sinkMethods overridden: `query` is no longer a sink.
    {
      code: "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM users WHERE id = ' + req.params.id); }",
      options: [{ sinkMethods: ['run'] }],
    },
    // transparentCalls emptied: `String()` breaks the chain again.
    {
      code: "import { db } from '../lib/db'; export function f(req) { return db.query('SELECT * FROM users WHERE id = ' + String(req.params.id)); }",
      options: [{ transparentCalls: [], treatParametersAsUntrusted: false }],
    },
    // queryTextProperties overridden: `text` no longer holds the statement.
    {
      code: "import { db } from '../lib/db'; export function f(req) { return db.query({ text: 'SELECT * FROM users WHERE id = ' + req.params.id }); }",
      options: [{ queryTextProperties: ['statement'] }],
    },
  ],
  invalid: [
    // requestRoots widened to a house convention.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.query('SELECT * FROM users WHERE id = ' + inbound.params.id); }",
      options: [{ requestRoots: ['inbound'] }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    // requestProperties widened: this team treats `locals` as caller data.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.query('SELECT * FROM users WHERE id = ' + req.locals.id); }",
      options: [{ requestProperties: ['locals'] }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    // sinkMethods widened to a house wrapper.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.raw('SELECT * FROM users WHERE id = ' + req.params.id); }",
      options: [{ sinkMethods: ['raw'] }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    // transparentCalls widened to another conversion.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.query('SELECT * FROM users WHERE id = ' + Number(req.params.id)); }",
      options: [{ transparentCalls: ['Number'] }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    // queryTextProperties widened to a house key.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.query({ statement: 'SELECT * FROM users WHERE id = ' + req.params.id }); }",
      options: [{ queryTextProperties: ['statement'] }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    // reportUnattributedInterpolation still reaches what the default will not:
    // a property of a non-request object has no namable inlet.
    {
      code: "import { db } from '../lib/db'; export function f() { return db.query('SELECT * FROM users WHERE id = ' + config.defaultId); }",
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});

/**
 * RESOLUTION EDGES — the ways each new mechanism correctly gives up.
 *
 * Every entry here is a place the walker must stop rather than guess. They are
 * the counterweight to the waves above: the same machinery that found nine
 * false negatives is what could produce false positives if it never abstained.
 */
ruleTester.run('no-sql-injection-resolution-edges', noSqlInjection, {
  valid: [
    // ── The sink name ────────────────────────────────────────────────────
    // A private method is not a computed name and not an Identifier property.
    `class Repo {
  #query(text) { return text; }
  run(req) { return this.#query('SELECT * FROM t WHERE a = ' + req.query.a); }
}`,
    // A computed key that is not a string: nothing to compare.
    "db[1]('SELECT * FROM users WHERE id = ' + req.params.id);",
    // A computed key that resolves to no binding at all.
    "db[unknownMethodName]('SELECT * FROM users WHERE id = ' + req.params.id);",
    // A computed key whose binding is not a string literal.
    "const pick = () => 'query'; db[pick]('SELECT * FROM users WHERE id = ' + req.params.id);",
    // A computed key declared with no value.
    "let method; db[method]('SELECT * FROM users WHERE id = ' + req.params.id);",

    // ── Builder resolution ───────────────────────────────────────────────
    // A rest parameter cannot be bound positionally.
    "const build = (...parts) => 'SELECT * FROM t WHERE a = ' + parts[0]; export function f(req) { return db.query(build(req.query.a)); }",
    // A destructured parameter cannot be bound positionally either.
    "const build = ({ tag }) => `SELECT * FROM logs WHERE tag = '${tag}'`; export function f(req) { return db.query(build({ tag: req.query.tag })); }",
    // A spread ARGUMENT cannot be matched to a parameter.
    "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f(req, args) { return db.query(build(...args)); }",
    // Called with no argument at all: the parameter stands for `undefined`.
    "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f() { return db.query(build()); }",
    // A builder body that reads a global the file never declares.
    "const build = (t) => `SELECT * FROM logs WHERE tag = '${globalTag}'`; export function f(req) { return db.query(build(req.query.tag)); }",

    // ── Array#join ───────────────────────────────────────────────────────
    // The receiver is a parameter assigned once: written once, but a parameter
    // definition carries no initialiser to follow.
    "export function f(req, parts) { parts = ['SELECT * FROM t WHERE a =', req.query.a]; return db.query(parts.join(' ')); }",
    // The receiver resolves to no binding in this file at all.
    "db.query(unknownParts.join(' '));",
    // The receiver is declared without an initialiser, then assigned: the
    // declaration carries nothing to follow.
    "let parts; parts = ['SELECT * FROM t WHERE a =', req.query.a]; db.query(parts.join(' '));",
    // A computed member is not `join`.
    "const parts = ['SELECT * FROM t WHERE a =', req.query.a]; db.query(parts['join'](' '));",
    // Some other array method.
    "const parts = ['SELECT * FROM t WHERE a =', req.query.a]; db.query(parts.slice(0));",

    // ── Query-config objects ─────────────────────────────────────────────
    // A spread property is not a keyed statement.
    'db.query({ ...base });',
    // A computed key is not compared.
    "db.query({ [key]: 'SELECT * FROM t WHERE a = ' + req.query.a });",
    // A numeric key is not a name in the list.
    "db.query({ 1: 'SELECT * FROM t WHERE a = ' + req.query.a });",

    // ── Depth ────────────────────────────────────────────────────────────
    // Resolution through single-write bindings stops at the same depth the
    // attribution walk does.
    `const q1 = 'SELECT * FROM users WHERE id = ' + req.query.id;
const q2 = q1; const q3 = q2; const q4 = q3; const q5 = q4; const q6 = q5; const q7 = q6;
db.query(q7);`,

    // ── Transparent calls ────────────────────────────────────────────────
    // A spread argument to the conversion is skipped.
    "export function f(args) { return db.query('SELECT * FROM t WHERE a = ' + String(...args)); }",
    // The conversion wraps a literal: transparent, and still not a finding.
    "db.query('SELECT * FROM t WHERE a = ' + String('x'));",

    // ── Strict mode, with a builder in play ──────────────────────────────
    {
      // The builder's parameter is bound to a LITERAL, so the strict check
      // must read the argument and stay quiet.
      code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; db.query(build('admin'));",
      options: [{ reportUnattributedInterpolation: true }],
    },
    {
      // Bound to nothing at all.
      code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; db.query(build());",
      options: [{ reportUnattributedInterpolation: true }],
    },
  ],
  invalid: [
    {
      // A cast at the SINK ARGUMENT position, not inside the statement: the
      // resolution walk erases it the same way attribution does.
      name: 'a cast wrapping the whole argument is erased',
      code: "db.query(('SELECT * FROM t WHERE a = ' + req.query.a) as string);",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // A spread element inside the array is skipped, the request read is not.
      name: 'a spread element in a joined array is skipped, not fatal',
      code: "export function f(req, bits) { const parts = ['SELECT * FROM t WHERE a =', ...bits, req.query.a]; return db.query(parts.join(' ')); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Only the ALTERNATE arm of the ternary is tainted.
      name: 'the alternate arm of a ternary is read too',
      code: "export function f(req, flag) { const c = flag ? 'id' : req.query.sort; return db.query('SELECT * FROM users ORDER BY ' + c); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Only the RIGHT operand of the logical default is tainted.
      name: 'the right operand of a logical default is read too',
      code: "export function f(req) { const c = defaults.sort || req.query.sort; return db.query('SELECT * FROM users ORDER BY ' + c); }",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // A quoted key in a query-config object.
      name: 'a string-literal key names the statement property',
      code: "db.query({ 'sql': 'SELECT * FROM t WHERE a = ' + req.query.a });",
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Strict mode, template arm: no inlet the default can name, but the
      // interpolated part is not static either.
      name: 'strict mode reports an unattributable template part',
      code: 'db.query(`SELECT * FROM users WHERE id = ${config.defaultId}`);',
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Strict mode, nested-concatenation arm.
      name: 'strict mode recurses into a nested concatenation',
      code: 'db.query(`SELECT * FROM t WHERE x = ${config.a + config.b}`);',
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Strict mode through a builder whose parameter IS bound to something
      // non-static — the substitution path of the strict check.
      name: 'strict mode reads the builder argument, not the placeholder',
      code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f() { return db.query(build(config.tag)); }",
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Strict mode where the builder body reads an undeclared global: the
      // substitution lookup finds no binding for that part.
      name: 'strict mode handles a builder body reading a global',
      code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${globalTag}' AND x = ${t}`; export function f() { return db.query(build(config.tag)); }",
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
    {
      // Strict mode where the substituted part is a MEMBER expression, not an
      // identifier, so the substitution lookup declines immediately.
      name: 'strict mode handles a non-identifier part under substitution',
      code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${config.tag}' AND x = ${t}`; export function f() { return db.query(build('a')); }",
      options: [{ reportUnattributedInterpolation: true }],
      errors: [{ messageId: 'sqlInjection' }],
    },
  ],
});
