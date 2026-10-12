/**
 * Tests for mysql-security/no-unsafe-query
 * CWE-89 — SQL injection through MySQL's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
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
          code: "import mysql from 'mysql2';\nconn.execute('SELECT * FROM users WHERE id = ?', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import mysql from 'mysql2';\nconn.query('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import mysql from "mysql2";\nconn.query();',
        },
        {
          name: 'unrelated code',
          code: 'import mysql from "mysql2";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import mysql from 'mysql2';\nconst sql = 'SELECT * FROM users'; conn.query(sql);",
        },
        {
          name: 'non-SQL text into the same sink is not a SQL finding',
          code: 'import mysql from "mysql2";\njob.execute(`retry ${attempt}`);',
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
          code: 'import mysql from "mysql2";\nconn.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import mysql from 'mysql2';\nconn.query('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import mysql from 'mysql2';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'conn.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'execute() sink',
          code: 'import mysql from "mysql2";\nconn.execute(`SELECT * FROM audit WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-mysql-security.md).
 *
 * Every binding below is named `foo` / `bar` / `baz` on purpose: the rule must
 * reach the same verdict whatever a variable is called.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const M =
    "import mysql from 'mysql2/promise';\nconst foo = mysql.createPool({});\n";
  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (constant table name)
        name: 'FP: a constant interpolated as the table name',
        code:
          M +
          "const bar = 'users';\nfoo.query(`SELECT * FROM ${bar} WHERE id = ?`, [1]);",
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (placeholder list)
        name: 'FP: a ? placeholder list built from the ids it binds',
        code:
          M +
          "const bar = [1, 2];\nfoo.query(`SELECT * FROM t WHERE id IN (${bar.map(() => '?').join(',')})`, bar);",
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (fixed column list)
        name: 'FP: a fixed column list joined into the select list',
        code:
          M +
          "const bar = ['id', 'name'];\nfoo.query(`SELECT ${bar.join(', ')} FROM t`);",
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (numeric pagination)
        name: 'FP: a value forced to a number',
        code:
          M +
          'export function h(bar) { return foo.query(`SELECT * FROM t LIMIT ${Number(bar.query.n)} OFFSET ${(Number(bar.query.p) - 1) * 10}`); }',
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (driver escapers)
        name: "FP: the driver's own escapers",
        code:
          M +
          "import SqlString from 'sqlstring';\n" +
          'export function h(bar) {\n' +
          '  foo.query(`SELECT * FROM t WHERE a = ${foo.escape(bar.query.a)}`);\n' +
          '  foo.query(`SELECT * FROM t ORDER BY ${mysql.escapeId(String(bar.query.c))}`);\n' +
          '  foo.query(`SELECT * FROM t WHERE b = ${SqlString.escape(bar.query.b)}`);\n' +
          "  foo.query(mysql.format('SELECT * FROM ?? WHERE id = ?', ['t', bar.query.id]));\n" +
          '}',
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (closed choices)
        name: 'FP: a ternary between two keywords, an enum member, a const-object member',
        code:
          M +
          "enum Dir { Asc = 'ASC', Desc = 'DESC' }\nconst SORTS = { name: 'name' } as const;\n" +
          'export function h(bar) {\n' +
          "  foo.query(`SELECT * FROM t ORDER BY a ${bar.query.d ? 'DESC' : 'ASC'}`);\n" +
          '  foo.query(`SELECT * FROM t ORDER BY a ${Dir.Desc}`);\n' +
          '  foo.query(`SELECT * FROM t ORDER BY ${SORTS.name}`);\n' +
          "  const baz = ['a', 'b'].includes(bar.query.s) ? bar.query.s : 'id';\n" +
          '  foo.query(`SELECT * FROM t ORDER BY ${baz}`);\n' +
          '}',
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (local helper returning fixed text)
        name: 'FP: a local helper every return of which is fixed text',
        code:
          M +
          "function bar(k) { if (k === 'ts') return ' AT TIME ZONE UTC'; return ''; }\n" +
          "foo.query(`SELECT created${bar('ts')} FROM t`);",
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (taint was keyed by name)
        name: "FP: another function's tainted `sql` is not this parameter",
        code:
          M +
          'function bar(x) { const sql = `SELECT * FROM a WHERE x = ${x}`; return sql; }\n' +
          'async function baz(sql) { return foo.query(sql); }\n' +
          'export { bar, baz };',
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (another driver in the same file)
        name: "FP: another driver's client is that driver's plugin's to judge",
        code:
          M +
          "import pg from 'pg';\nconst bar = new pg.Client();\nexport const h = (baz) => bar.query(`SELECT * FROM t WHERE id = ${baz}`);",
      },
      {
        // @found n8n-io/n8n:packages/nodes-base/nodes/MySql/v1/MySqlV1.node.ts:448
        name: 'FP: identifiers composed from a caller-supplied value — no bind parameter exists there',
        code:
          M +
          "import { escapeSqlIdentifier as bar } from './helpers';\n" +
          'export async function h(baz, qux, quux) {\n' +
          "  const sql = `UPDATE ${bar(baz)} SET ${qux.map((c) => `${bar(c)} = ?`).join(',')} WHERE ${bar(quux)} = ?;`;\n" +
          '  await foo.query(sql, []);\n' +
          '}',
      },
      {
        // @found n8n-io/n8n:packages/nodes-base/nodes/MySql/v1/MySqlV1.node.ts:416
        name: 'FP: a keyword option composed into an INSERT verb',
        code:
          M +
          'export async function h(bar, baz) {\n' +
          "  const sql = `INSERT ${bar || ''} ${baz ? 'IGNORE' : ''} INTO t (a) VALUES (?);`;\n" +
          '  await foo.query(sql, [1]);\n' +
          '}',
      },
      {
        name: 'a builder whose every append is fixed text stays silent',
        code:
          M +
          'export async function h(bar) {\n' +
          "  let sql = 'SELECT * FROM t WHERE 1=1';\n" +
          "  if (bar.query.a) sql += ' AND a = ?';\n" +
          '  await foo.query(sql, [bar.query.a]);\n' +
          '}',
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)
        name: 'FP: a test file is not the shipped attack surface',
        filename: '/repo/src/__tests__/users.test.ts',
        code: M + 'foo.query(`SELECT * FROM t WHERE id = ${bar}`);',
      },
    ],
    invalid: [
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (options-object form)
        name: 'FN: the statement passed as { sql } in the options form',
        code:
          M +
          'export const h = (bar) => foo.query({ sql: `SELECT * FROM t WHERE id = ${bar.params.id}`, timeout: 1000 });',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (request text as the statement)
        name: 'FN: request data handed over as the statement itself',
        code:
          M +
          'export const h = async (bar) => { const baz = JSON.parse(bar.body); return foo.query(baz.sql); };',
        errors: [{ messageId: 'noUnsafeQuery' }],
      },
      {
        // Kept reporting under the value/fragment split: an identifier position
        // is reported once its value is traced to the request.
        name: "the caller's own field names composed into a column list",
        code:
          M +
          'export async function h(bar) {\n' +
          '  const baz = Object.keys(bar.body);\n' +
          "  await foo.query(`INSERT INTO t (${baz.join(',')}) VALUES (?)`, [Object.values(bar.body)]);\n" +
          '}',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        name: 'a non-driver format() is no escaper',
        code:
          M +
          "import util from 'node:util';\nexport const h = (bar) => foo.query(`SELECT * FROM t WHERE a = '${util.format('%s', bar.a)}'`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        name: 'a parameter spliced into a value position is reported, whatever it is called',
        code:
          M +
          'export async function bar(baz) { return foo.query(`SELECT * FROM tutorials WHERE id = ${baz}`); }',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        name: 'MySQL reads "…" as a string: a concatenated value inside it is a value',
        code:
          M +
          "export const h = (bar) => foo.query('SELECT * FROM t WHERE name = \"' + bar.query.n + '\"');",
        errors: [{ messageId: 'noUnsafeQuery' }],
      },
    ],
  });
});

/**
 * Disagreements the Quint oracle found (benchmarks/quint/models/
 * mysql-security.no-unsafe-query*.qnt), each locked as the rendered case.
 */
describe('no-unsafe-query — quint oracle 2026-10', () => {
  const M =
    "import mysql from 'mysql2/promise';\nconst foo = mysql.createPool({});\n";
  ruleTester.run('quint oracle 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found quint mysql-security.no-unsafe-query: ReqBody/Allowlist/Eq/Inline/PoolQuery
        name: 'FP: an allowlist ternary written inline in the template',
        code:
          M +
          "export async function h(bar) { return foo.query(`SELECT * FROM t WHERE id = ${['a', 'b'].includes(bar.body.c) ? bar.body.c : 'a'}`); }",
      },
      {
        // @found quint mysql-security.no-unsafe-query: Literal/Escape/Quoted/Inline/PoolQuery
        name: 'FP: an escaped constant inside quotes is still a constant',
        code:
          M +
          "foo.query(`SELECT * FROM t WHERE name = '${mysql.escape('admin')}'`);",
      },
    ],
    invalid: [
      {
        // @found quint mysql-security.no-unsafe-query: Param/Escape/Quoted/ViaLet/PoolQuery
        name: "FN: an escaped value inside '…' — the escaper's own quotes close the string",
        code:
          M +
          "export async function h(bar) { let baz = '';\n  baz = mysql.escape(bar);\n  return foo.query(`SELECT * FROM t WHERE name = '${baz}'`); }",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found quint mysql-security.no-unsafe-query: ReqBody/Escape/Quoted/Inline/QueryOptions
        name: 'FN: escapeId inside backticks — its backticks close the identifier',
        code:
          M +
          'export async function h(bar) { return foo.query({ sql: `SELECT * FROM t ORDER BY \\`${mysql.escapeId(bar.body.c)}\\`` }); }',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
