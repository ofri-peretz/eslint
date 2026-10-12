/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP/FN review 2026-10-12: the factory paths the driver plugins configure —
 * fragment sinks, option-object statements, imported fragment functions,
 * alias callbacks, statement objects, receiver origin, the secure-coding
 * partition, value vs fragment positions and request text.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  createSqlInjectionRule,
  looksLikeSqlStatement,
} from './sql-injection-rule';
import { expect } from 'vitest';

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

const rule = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'review',
      url: 'https://example.test/r',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  modules: ['drv'],
  methods: ['query', 'prepare', 'run'],
  fragmentMethods: [
    'whereRaw',
    { name: 'joinOn', arg: 2 },
    { name: 'raw', requireDriverReceiver: true },
  ],
  fragmentFunctions: ['raw'],
  aliasCallbacks: ['Raw'],
  sqlTextProperties: ['sql'],
  statementFactories: ['prepare'],
  escapers: ['escape'],
  escaperModules: ['sqlstring'],
  fragmentFactories: ['ref'],
  doubleQuotedStrings: true,
  requireSqlKeywords: true,
  fix: 'bind it',
  documentationLink: 'https://example.test/docs',
});

const D = "import drv from 'drv';\nconst db = drv();\n";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-sqli-review-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(
  path.join(dir, 'db.ts'),
  "import drv from 'drv';\nexport const db = drv();\n",
);
const ROUTE = path.join(dir, 'route.ts');
const T = 'unsafeTemplateLiteral' as const;
const C = 'noUnsafeQuery' as const;

describe('looksLikeSqlStatement', () => {
  it('recognises statements by verb and companion', () => {
    expect(looksLikeSqlStatement('SELECT a FROM t')).toBe(true);
    expect(looksLikeSqlStatement('(SELECT 1')).toBe(true);
    expect(looksLikeSqlStatement('INSERT OR REPLACE INTO t')).toBe(true);
    expect(looksLikeSqlStatement('CREATE UNIQUE INDEX i')).toBe(true);
    expect(looksLikeSqlStatement('PRAGMA x')).toBe(true);
    expect(looksLikeSqlStatement('CALL p(')).toBe(true);
    expect(looksLikeSqlStatement('select-key')).toBe(false);
    expect(looksLikeSqlStatement('update status')).toBe(false);
  });
});

describe('createSqlInjectionRule — review 2026-10', () => {
  ruleTester.run('review', rule, {
    valid: [
      {
        name: 'test file',
        filename: '/r/__tests__/a.test.ts',
        code: D + 'db.query(`SELECT * FROM t WHERE a = ${x}`);',
      },
      {
        name: 'foreign receiver',
        code:
          D +
          "import pg from 'pg';\nconst c = new pg.Client();\nc.query(`SELECT * FROM t WHERE a = ${x}`);",
      },
      {
        name: 'raw needs a driver receiver',
        code: D + 'other.raw(`a = ${x}`);',
      },
      { name: 'no gate, unknown receiver', code: 'db.whereRaw(`a = ${x}`);' },
      {
        name: 'no gate, a shared sink on a driver receiver',
        filename: ROUTE,
        code: "import { db } from './db';\ndb.query(`SELECT * FROM t WHERE a = ${x}`);",
      },
      { name: 'missing argument', code: D + 'db.joinOn(a, b);' },
      { name: 'spread argument', code: D + 'db.query(...args);' },
      {
        name: 'statement-gate for an unknown receiver',
        code: D + 'other.query(`click ${x}`);',
      },
      { name: 'empty template', code: D + 'db.query(`SELECT 1`);' },
      { name: 'numeric addition', code: D + 'db.query(1 + n);' },
      {
        name: 'fragment hole from a caller',
        code: D + 'function f(t) { return db.query(`SELECT * FROM ${t}`); }',
      },
      {
        name: 'options object without the text key',
        code: D + 'db.query({ values: [1], [k]: 2 });',
      },
      {
        name: 'a receiver from a computed factory call',
        code:
          D + 'const s = db[m]("x");\ns.run(`SELECT * FROM t WHERE a = ${1}`);',
      },
      {
        name: 'alias callback that may not return',
        code: "import { Raw } from 'drv';\nRaw((a) => { if (y) return `${a} = '${x}'`; });",
      },
      {
        name: 'options object with a safe text',
        code: D + "db.query({ sql: 'SELECT 1' });",
      },
      {
        name: 'binding written only with fixed text',
        code: D + "let q = 'SELECT 1';\nq += ' WHERE a = 1';\ndb.query(q);",
      },
      {
        name: 'binding that is a parameter',
        code: D + 'function f(q) { return db.query(q); }',
      },
      {
        name: 'binding that never reads as SQL, gated',
        code: D + 'let q = `hello ${x}`;\nother.query(q);',
      },
      { name: 'undeclared binding', code: D + 'db.query(q);' },
      {
        name: 'call to an imported builder',
        code: D + "import { build } from 'pkg';\ndb.query(build(x));",
      },
      {
        name: 'call to a local builder with a safe return',
        code: D + "function b() { return 'SELECT 1'; }\ndb.query(b());",
      },
      {
        name: 'call to a local builder with no full return',
        code:
          D + 'function b(x) { if (x) return `SELECT ${x}`; }\ndb.query(b(1));',
      },
      {
        name: 'builders nested past the bound',
        code:
          D +
          'const a = b;\nconst b = c;\nconst c = d;\nconst d = `SELECT * FROM t WHERE a = ${x}`;\ndb.query(a);',
      },
      {
        name: 'statement object methods take values',
        code: D + 'const s = db.prepare("SELECT ?");\ns.run(req.body.a);',
      },
      {
        name: 'String() of a non-request value',
        code: D + 'db.query(String(x));',
      },
      { name: 'String() with no argument', code: D + 'db.query(String());' },
      {
        name: 'imported fragment function with no argument',
        code: "import { raw } from 'drv';\nraw();",
      },
      {
        name: 'an imported non-sink function',
        code: "import { other } from 'drv';\nother(`a = ${x}`);",
      },
      {
        name: 'a fragment function from another package',
        code: "import { raw } from 'pkg';\nraw(`a = ${x}`);",
      },
      {
        name: 'alias callback without a callback',
        code: "import { Raw } from 'drv';\nRaw(x);",
      },
      {
        name: 'alias callback returning plain text',
        code: "import { Raw } from 'drv';\nRaw((a) => 'x');",
      },
      {
        name: 'alias callback, only the alias',
        code: "import { Raw } from 'drv';\nRaw((a) => `${a} > 1`);",
      },
      {
        name: 'alias callback without parameters',
        code: "import { Raw } from 'drv';\nRaw(() => `x > ${1}`);",
      },
      {
        name: 'a local function named like an alias callback',
        code: "function Raw(f) { return f; }\nRaw((a) => `${a} = '${x}'`);",
      },
      {
        name: 'wrapper with an ambiguous name',
        code:
          D +
          'class A { run(q) { return db.query(q); } }\nclass B { run(q) { return q; } }\nnew B().run(`SELECT * FROM t WHERE a = ${x}`);',
      },
      {
        name: 'wrapper call with a safe argument',
        code: D + "const w = (q) => db.query(q);\nw('SELECT 1');",
      },
      {
        name: 'computed callee',
        code: D + 'db[m](`SELECT * FROM t WHERE a = ${x}`);',
      },
      {
        name: 'IIFE callee',
        code: D + '(() => db)()(`SELECT * FROM t WHERE a = ${x}`);',
      },
      {
        name: 'escaper in a value position',
        code:
          D +
          "import S from 'sqlstring';\ndb.query(`SELECT * FROM t WHERE a = ${S.escape(x)}`);",
      },
      {
        name: 'driver fragment in a value position',
        code: D + 'db.query(`SELECT * FROM t WHERE a = ${db.ref(x)}`);',
      },
    ],
    invalid: [
      {
        name: 'fragment sink',
        code: D + 'db.whereRaw(`a = ${x}`);',
        errors: [{ messageId: T }],
      },
      {
        name: 'fragment sink at a later argument',
        code: D + "db.joinOn('a', 'b', `c = ${x}`);",
        errors: [{ messageId: T }],
      },
      {
        name: 'raw on the driver receiver',
        code: D + 'db.raw(`a = ${x}`);',
        errors: [{ messageId: T }],
      },
      {
        name: 'no gate, a non-shared sink on a driver receiver',
        filename: ROUTE,
        code: "import { db } from './db';\ndb.whereRaw(`a = ${x}`);",
        errors: [{ messageId: T }],
      },
      {
        name: 'options object form',
        code: D + 'db.query({ sql: `SELECT * FROM t WHERE a = ${x}` });',
        errors: [{ messageId: T }],
      },
      {
        name: 'concatenation',
        code: D + "db.query('SELECT * FROM t WHERE a = ' + x);",
        errors: [{ messageId: C }],
      },
      {
        name: 'double-quoted string literal (MySQL)',
        code: D + 'db.query(`SELECT * FROM t WHERE a = "${x}"`);',
        errors: [{ messageId: T }],
      },
      {
        name: 'binding written by +=',
        code:
          D +
          "let q = 'SELECT * FROM t WHERE 1=1';\nq += ` AND a = ${x}`;\ndb.query(q);",
        errors: [{ messageId: T }],
      },
      {
        name: 'binding shadowing an import of the same name',
        code: "import q from 'drv';\nconst q = `SELECT * FROM t WHERE a = ${x}`;\nq.raw(q);",
        errors: [{ messageId: T }],
      },
      {
        name: 'local builder',
        code:
          D +
          'function b(x) { return `SELECT * FROM t WHERE a = ${x}`; }\ndb.query(b(1));',
        errors: [{ messageId: T }],
      },
      {
        name: 'request data as the whole text',
        code: D + 'export const h = (r) => db.query(r.body.sql);',
        errors: [{ messageId: C }],
      },
      {
        name: 'request data through String()',
        code:
          D + 'export const h = (r) => db.query(String(String(r.body.sql)));',
        errors: [{ messageId: C }],
      },
      {
        name: 'the request payload itself',
        code: D + 'export const h = async (r) => db.query(await r.json());',
        errors: [{ messageId: C }],
      },
      {
        name: 'imported fragment function',
        code: "import { raw as r } from 'drv';\nr(`a = '${x}'`);",
        errors: [{ messageId: T }],
      },
      {
        name: 'alias callback',
        code: "import { Raw } from 'drv';\nRaw((a) => `${a} = '${x}'`);",
        errors: [{ messageId: T }],
      },
      {
        name: 'alias callback with two returns',
        code: "import { Raw } from 'drv';\nRaw((a) => { if (y) return `${a} = 1`; return `${a} = '${x}'`; });",
        errors: [{ messageId: T }],
      },
      {
        name: 'wrapper',
        code:
          D +
          'const w = (q, p) => db.query(q, p);\nw(`SELECT * FROM t WHERE a = ${x}`, []);',
        errors: [{ messageId: T }],
      },
      {
        name: 'wrapper through a binding',
        code:
          D +
          'function w(q) { return db.query(q); }\nconst s = `SELECT * FROM t WHERE a = ${x}`;\nw(s);',
        errors: [{ messageId: T }],
      },
      {
        name: 'request-traced fragment',
        code:
          D +
          'export const h = (r) => db.query(`SELECT * FROM t ORDER BY ${r.query.sort}`);',
        errors: [{ messageId: T }],
      },
    ],
  });
});
