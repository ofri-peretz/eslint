/**
 * no-unsafe-query — five policy gaps the owner decided on 2026-10-18
 * (benchmarks/audits/2026-10-18-fp-fn-quint-stryker.md, "Open: owner decisions"):
 *
 *   1. `.length` is a placeholder index only on an array this file builds —
 *      a JSON body can send `{"length": "1 OR 1=1"}`;
 *   2. `??=`, `||=` and `&&=` into a query variable are tracked like `+=`;
 *   3. a provably numeric value is safe outside `$N` too — arithmetic,
 *      `Number(x)`, `ids.map(Number).join(',')`;
 *   4. a lookup in a const object/Map literal of strings is the allowlist fix;
 *   5. `(SELECT …) UNION …`, `EXPLAIN …`, `SET …`, `SHOW …` and `VALUES (…)`
 *      are SQL statements.
 *
 * The headline case of each decision gave the opposite verdict on the rule
 * before it; the cases around it pin the boundary on both sides.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

const withPg = (code: string): string =>
  `import { Pool } from 'pg';\nconst pool = new Pool();\n${code}`;
const pg = <T extends { code: string }>(cases: T[]): T[] =>
  cases.map((c) => ({ ...c, code: withPg(c.code) }));

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const tpl = [{ messageId: 'unsafeTemplateLiteral' as const }];
const concat = [{ messageId: 'noUnsafeQuery' as const }];

describe('.length is an index only on an array built here', () => {
  ruleTester.run('placeholder .length', noUnsafeQuery, {
    valid: pg([
      {
        name: 'the params array this builder pushes into',
        code: `export function q(req) {
  const params = [];
  params.push(req.query.name);
  return pool.query(\`SELECT * FROM t WHERE name = $\${params.length}\`, params);
}`,
      },
      {
        name: 'an array parameter annotated as one',
        code: `export function where(params: unknown[], v: unknown) {
  params.push(v);
  return pool.query(\`SELECT * FROM t WHERE a = $\${params.length}\`, params);
}`,
      },
      {
        name: 'Array<T> and ReadonlyArray<T> annotations',
        code: `export function where(a: Array<unknown>, b: ReadonlyArray<unknown>) {
  return pool.query(\`SELECT * FROM t WHERE a = $\${a.length} AND b = $\${b.length}\`, [...a, ...b]);
}`,
      },
      {
        name: 'a const annotated as an array',
        code: 'const params: string[] = load();\nawait pool.query(`SELECT * FROM t WHERE a = $${params.length}`, params);',
      },
      {
        name: 'the result of map() is an array',
        code: 'const params = rows.map((r) => r.id);\nawait pool.query(`SELECT * FROM t WHERE a = $${params.length}`, params);',
      },
      {
        // TDZ code that never runs; pinned so the alias walk is shown to stop.
        name: 'cyclic const aliases do not hang the analysis',
        code: 'const a = b, b = a;\nawait pool.query(`SELECT * FROM t WHERE id = $${a.length}`);',
      },
      {
        name: 'the length of a constant string is a number, outside $N too',
        code: "const TAG = 'abc';\nawait pool.query(`SELECT * FROM t LIMIT ${TAG.length}`);",
      },
    ]),
    invalid: pg([
      {
        name: 'request JSON can send {"length": "1 OR 1=1"}',
        code: 'await pool.query(`SELECT * FROM t WHERE id = $${req.body.x.length}`);',
        errors: tpl,
      },
      {
        name: 'a parameter that is not known to be an array',
        code: 'export function q(opts) { return pool.query(`SELECT * FROM t WHERE id = $${opts.length}`); }',
        errors: tpl,
      },
      {
        name: 'a const copied from the request is the request',
        code: 'const ids = req.body.ids;\nawait pool.query(`SELECT * FROM t WHERE id = $${ids.length}`);',
        errors: tpl,
      },
      {
        name: 'an undeclared name is not an array built here',
        code: 'await pool.query(`SELECT * FROM t WHERE id = $${values.length}`, values);',
        errors: tpl,
      },
      {
        name: 'a value returned by some other call',
        code: 'const p = store.load(req.query.k);\nawait pool.query(`SELECT * FROM t WHERE id = $${p.length}`, p);',
        errors: tpl,
      },
      {
        name: 'an imported binding',
        code: "import { shared } from './state';\nawait pool.query(`SELECT * FROM t WHERE id = $${shared.length}`, shared);",
        errors: tpl,
      },
      {
        name: 'a destructured element is not the array',
        code: 'const [first] = [req.body.list];\nawait pool.query(`SELECT * FROM t WHERE id = $${first.length}`);',
        errors: tpl,
      },
      {
        name: 'a parameter annotated as a Set or a qualified Array is not an array',
        code: 'export function q(a: Set<string>, b: ns.Array<string>) { return pool.query(`SELECT * FROM t WHERE x = $${a.length} AND y = $${b.length}`); }',
        errors: tpl,
      },
      {
        name: 'a method chosen at runtime does not name an array method',
        code: 'const p = rows[req.query.m]();\nawait pool.query(`SELECT * FROM t WHERE id = $${p.length}`, p);',
        errors: tpl,
      },
      {
        name: 'a let reassigned after its declaration',
        code: 'let p = [];\np = req.body.p;\nawait pool.query(`SELECT * FROM t WHERE id = $${p.length}`, p);',
        errors: tpl,
      },
      {
        name: 'a counter mixed with a request write is not numeric',
        code: 'let n = 0;\nn++;\nn -= 1;\nn = req.query.n;\nawait pool.query(`SELECT * FROM t LIMIT ${n}`);',
        errors: tpl,
      },
    ]),
  });
});

describe('logical assignments into a query variable', () => {
  ruleTester.run('??= ||= &&=', noUnsafeQuery, {
    valid: pg([
      {
        name: '??= with fixed text',
        code: "let q;\nq ??= 'SELECT * FROM t';\nawait pool.query(q);",
      },
    ]),
    invalid: pg([
      {
        name: 'q ??= `SELECT … ${x}`',
        code: 'let q;\nq ??= `SELECT * FROM t WHERE a = ${req.query.a}`;\nawait pool.query(q);',
        errors: tpl,
      },
      {
        name: 'q ||= a concatenation',
        code: "let q = '';\nq ||= 'SELECT * FROM t WHERE a = ' + req.query.a;\nawait pool.query(q);",
        errors: concat,
      },
      {
        name: 'q &&= q + more text',
        code: "let q = 'SELECT * FROM t WHERE 1=1';\nq &&= q + ' AND a = ' + req.query.a;\nawait pool.query(q);",
        errors: concat,
      },
    ]),
  });
});

describe('a provably numeric value outside $N', () => {
  ruleTester.run('numbers', noUnsafeQuery, {
    valid: pg([
      {
        name: 'arithmetic yields a number',
        code: 'await pool.query(`SELECT * FROM t LIMIT 10 OFFSET ${req.query.page * 10}`);',
      },
      {
        name: 'unary plus yields a number',
        code: 'await pool.query(`SELECT * FROM t LIMIT ${+req.query.limit}`);',
      },
      {
        name: 'a concatenated Number() conversion',
        code: "await pool.query('SELECT * FROM t LIMIT ' + Number(req.query.limit));",
      },
      {
        name: 'ids.map(Number).join(",") is a list of numbers',
        code: "await pool.query(`SELECT * FROM t WHERE id IN (${req.body.ids.map(Number).join(',')})`);",
      },
      {
        name: 'a map callback that converts each element',
        code: "await pool.query(`SELECT * FROM t WHERE id IN (${ids.map((id) => parseInt(id, 10)).join(', ')})`);",
      },
    ]),
    invalid: pg([
      {
        name: 'a + of request data is string concatenation, not arithmetic',
        code: 'await pool.query(`SELECT * FROM t LIMIT ${req.query.a + req.query.b}`);',
        errors: tpl,
      },
      {
        name: 'a map that does not convert keeps the request text',
        code: "await pool.query(`SELECT * FROM t WHERE id IN (${req.body.ids.map(String).join(',')})`);",
        errors: tpl,
      },
      {
        name: 'a join separator taken from the request is not fixed text',
        code: 'await pool.query(`SELECT * FROM t WHERE id IN (${ids.map(Number).join(req.query.sep)})`);',
        errors: tpl,
      },
    ]),
  });
});

describe('an allowlist lookup in a const literal of strings', () => {
  ruleTester.run('allowlist lookup', noUnsafeQuery, {
    valid: pg([
      {
        name: 'TABLES[req.query.t] on a const object of strings',
        code: "const TABLES = { users: 'app_users', orders: 'app_orders' };\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);",
      },
      {
        name: 'a const Map literal looked up with get()',
        code: "const COLUMNS = new Map([['name', 'full_name'], ['age', 'age_years']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
      },
    ]),
    invalid: pg([
      {
        name: 'an object with a value that is not fixed text',
        code: "const TABLES = { users: 'app_users', other: req.query.x };\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);",
        errors: tpl,
      },
      {
        name: 'an object written to after its declaration',
        code: "const TABLES = { users: 'app_users' };\nTABLES[req.query.k] = req.query.v;\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);",
        errors: tpl,
      },
      {
        name: 'a Map that is set() later',
        code: "const COLUMNS = new Map([['name', 'full_name']]);\nCOLUMNS.set('x', req.query.x);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a let-bound object can be replaced',
        code: "let TABLES = { users: 'app_users' };\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);",
        errors: tpl,
      },
      {
        name: 'get() on an object literal is not a Map lookup',
        code: "const COLUMNS = { name: 'full_name' };\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a Map built from request entries',
        code: 'const COLUMNS = new Map(Object.entries(req.body));\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);',
        errors: tpl,
      },
    ]),
  });
});

describe('more statement forms', () => {
  ruleTester.run('statements', noUnsafeQuery, {
    valid: pg([
      {
        name: 'an English sentence that starts with "show" is not a statement',
        code: 'await pool.query(`showing ${req.query.n} rows`);',
      },
    ]),
    invalid: pg([
      {
        name: '(SELECT …) UNION (SELECT …)',
        code: 'await pool.query(`(SELECT id FROM a WHERE x = ${req.query.x}) UNION (SELECT id FROM b)`);',
        errors: tpl,
      },
      {
        name: 'EXPLAIN SELECT …',
        code: 'await pool.query(`EXPLAIN ANALYZE SELECT * FROM t WHERE a = ${req.query.a}`);',
        errors: tpl,
      },
      {
        name: 'SET search_path TO …',
        code: 'await pool.query(`SET search_path TO ${req.query.schema}`);',
        errors: tpl,
      },
      {
        name: 'SET with an interpolated setting name',
        code: "await pool.query('SET ' + req.query.guc + ' = 0');",
        errors: concat,
      },
      {
        name: 'SHOW …',
        code: 'await pool.query(`SHOW ${req.query.setting}`);',
        errors: tpl,
      },
      {
        name: 'VALUES (…)',
        code: "await pool.query(`VALUES (1, '${req.query.name}')`);",
        errors: tpl,
      },
    ]),
  });
});

// Boundaries pinned by mutation testing (Stryker, 2026-10-18): each case is an
// input on which a surviving mutant of the new logic and the rule disagreed.
describe('policy-decision edges found by mutation testing', () => {
  ruleTester.run('mutation edges', noUnsafeQuery, {
    valid: pg([
      {
        name: 'a parenthesised word later in a sentence is not a set operation',
        code: 'await pool.query(`text (select ${req.query.x})`);',
      },
      {
        name: 'a call wrapping select is not a parenthesised query',
        code: 'await pool.query(`count(select ${req.query.x})`);',
      },
      {
        name: 'explain later in a sentence is not EXPLAIN',
        code: 'await pool.query(`Please explain why we select ${req.query.x}`);',
      },
      {
        name: 'a word ending in explain is not EXPLAIN',
        code: 'await pool.query(`re-explain the select of ${req.query.x}`);',
      },
      {
        name: 'a word ending in set is not SET',
        code: 'await pool.query(`Please reset all to ${req.query.x}`);',
      },
      {
        name: 'a word ending in show is not SHOW',
        code: 'await pool.query(`slideshow ${req.query.x}`);',
      },
      {
        name: 'values later in a sentence is not VALUES',
        code: 'await pool.query(`the values (${req.query.x})`);',
      },
    ]),
    invalid: pg([
      {
        name: 'a space after the opening parenthesis',
        code: 'await pool.query(`( SELECT id FROM a WHERE x = ${req.query.x}) UNION (SELECT id FROM b)`);',
        errors: tpl,
      },
      {
        name: 'SET with two spaces after the verb',
        code: 'await pool.query(`SET  search_path TO ${req.query.schema}`);',
        errors: tpl,
      },
      {
        name: 'SET SESSION with two spaces before the name',
        code: 'await pool.query(`SET SESSION  statement_timeout = ${req.query.ms}`);',
        errors: tpl,
      },
      {
        name: 'SET name=value with no spaces',
        code: 'await pool.query(`SET statement_timeout=${req.query.ms}`);',
        errors: tpl,
      },
      {
        name: 'SET LOCAL name TO value',
        code: 'await pool.query(`SET LOCAL search_path TO ${req.query.schema}`);',
        errors: tpl,
      },
      {
        name: 'SET ROLE',
        code: 'await pool.query(`SET ROLE ${req.query.role}`);',
        errors: tpl,
      },
      {
        name: 'SET TIME ZONE',
        code: "await pool.query(`SET TIME ZONE '${req.query.tz}'`);",
        errors: tpl,
      },
      {
        name: 'SET TRANSACTION',
        code: 'await pool.query(`SET TRANSACTION ISOLATION LEVEL ${req.query.level}`);',
        errors: tpl,
      },
      {
        name: 'SET CONSTRAINTS',
        code: 'await pool.query(`SET CONSTRAINTS ${req.query.c} DEFERRED`);',
        errors: tpl,
      },
      {
        name: 'SET SESSION AUTHORIZATION',
        code: 'await pool.query(`SET SESSION AUTHORIZATION ${req.query.user}`);',
        errors: tpl,
      },
      {
        name: 'VALUES( with no space',
        code: "await pool.query(`VALUES(1, '${req.query.name}')`);",
        errors: tpl,
      },
      {
        name: 'a property of an array other than length is not a number',
        code: 'const params = [];\nawait pool.query(`SELECT * FROM t WHERE a = $${params.note}`, params);',
        errors: tpl,
      },
      {
        name: 'a value returned by a bare function call is not a built array',
        code: 'const p = load(req.query.k);\nawait pool.query(`SELECT * FROM t WHERE id = $${p.length}`, p);',
        errors: tpl,
      },
      {
        name: 'n ||= request data makes n request data',
        code: 'let n = 0;\nn ||= req.query.n;\nawait pool.query(`SELECT * FROM t WHERE a = $${n}`);',
        errors: tpl,
      },
      {
        name: 'v ||= request data is a value v can hold',
        code: "let v = '';\nv ||= req.query.x;\nawait pool.query(`SELECT * FROM t WHERE a = '${v}'`);",
        errors: tpl,
      },
      {
        name: 'filter(Number) keeps the original strings',
        code: "await pool.query(`SELECT * FROM t WHERE id IN (${req.body.ids.filter(Number).join(',')})`);",
        errors: tpl,
      },
      {
        name: 'a list built by a bare helper is not a number list',
        code: "await pool.query(`SELECT * FROM t WHERE id IN (${toList(req.body.ids).join(',')})`);",
        errors: tpl,
      },
      {
        name: 'an undeclared table is not a lookup table',
        code: 'await pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);',
        errors: tpl,
      },
      {
        name: 'a table declared only by a global comment is not a lookup table',
        code: '/* global TABLES */\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);',
        errors: tpl,
      },
      {
        name: 'a function is not a lookup table',
        code: 'function TABLES() {}\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);',
        errors: tpl,
      },
      {
        name: 'a Map indexed like an object is not an object lookup',
        code: "const COLUMNS = new Map([['name', 'full_name']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS[req.query.k]}`);",
        errors: tpl,
      },
      {
        name: 'a for…of const is not a declared table',
        code: 'for (const T of lists) {\n  await pool.query(`SELECT * FROM ${T[req.query.t]} ORDER BY ${T.get(req.query.s)}`);\n}',
        errors: tpl,
      },
      {
        name: 'an object table with a spread has values this file cannot see',
        code: "const TABLES = { ...EXTRA, users: 'app_users' };\nawait pool.query(`SELECT * FROM ${TABLES[req.query.t]}`);",
        errors: tpl,
      },
      {
        name: 'a constructed collection that is not a Map',
        code: "const COLUMNS = new Registry([['name', 'full_name']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'one Map entry whose value is request data',
        code: "const COLUMNS = new Map([['name', 'full_name'], ['x', req.query.y]]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a Map entry that is not a pair literal',
        code: "const COLUMNS = new Map([pair, ['name', 'full_name']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a hole in the Map entries',
        code: "const COLUMNS = new Map([, ['name', 'full_name']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a Map entry with a key and no value',
        code: "const COLUMNS = new Map([['name']]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
      {
        name: 'a Map entry whose value is a hole',
        code: "const COLUMNS = new Map([['name', , ]]);\nawait pool.query(`SELECT * FROM t ORDER BY ${COLUMNS.get(req.query.sort)}`);",
        errors: tpl,
      },
    ]),
  });
});
