/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What reaches the statement, and what does not.
 *
 * Each case below states one claim about the four conditions in the rule's doc
 * ("What it takes to report"): which text is a statement, which value is
 * attributable, which guard narrows a parameter, which file owns the call. They
 * were written against the mutation report: every case here is the one input
 * that tells a correct rule from a plausible-looking wrong one.
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

const reported = [{ messageId: 'sqlInjection' as const }];
const strict = [{ reportUnattributedInterpolation: true }];

describe('no-sql-injection — which text is a statement', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    // A verb only counts as a whole word: inside a longer word it is prose.
    valid: [
      {
        name: 'unselect … from is prose, not SELECT … FROM',
        code: `export const h = (req) => job.execute('Unselect the rows from ' + req.query.list);`,
      },
      {
        name: 'reinsert into is prose, not INSERT INTO',
        code: `export const h = (req) => job.execute('Reinsert into queue: ' + req.body.id);`,
      },
      {
        name: 'autoupdate … set is prose, not UPDATE … SET',
        code: `export const h = (req) => job.execute('Autoupdate is set for ' + req.query.pkg);`,
      },
      {
        name: 'undelete from is prose, not DELETE FROM',
        code: `export const h = (req) => job.execute('Undelete from trash: ' + req.query.id);`,
      },
      {
        name: 'a camelCase name ending in Replace is not REPLACE INTO',
        code: `export const h = (req) => job.execute('Running safeReplace into ' + req.query.target);`,
      },
      {
        name: 'automerge into is prose, not MERGE INTO',
        code: `export const h = (req) => job.execute('Automerge into main: ' + req.query.branch);`,
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a statement that opens with a WITH clause is still a statement',
        code: `export const h = (req) => db.query('WITH recent AS (SELECT id FROM orders) SELECT * FROM recent WHERE id = ' + req.query.id);`,
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a statement after a leading SQL comment is still a statement',
        code: `export const h = (req) => db.query('/* by id */ SELECT * FROM t WHERE id = ' + req.query.id);`,
        errors: reported,
      },
      {
        name: 'a multi-line INSERT with the verb and INTO on separate lines',
        code: `export const h = (req) => db.query(\`
          INSERT
            INTO audit (who) VALUES ('\${req.body.who}')\`);`,
        errors: reported,
      },
      {
        name: 'a multi-line UPDATE … SET',
        code: `export const h = (req) => db.query(\`
          UPDATE users
             SET name = '\${req.body.name}'\`);`,
        errors: reported,
      },
      {
        name: 'a multi-line DELETE with FROM on the next line',
        code: `export const h = (req) => db.query(\`
          DELETE
            FROM sessions WHERE id = '\${req.params.id}'\`);`,
        errors: reported,
      },
      {
        name: 'REPLACE INTO is a statement',
        code: `export const h = (req) => db.query("REPLACE INTO kv (k) VALUES ('" + req.body.k + "')");`,
        errors: reported,
      },
      {
        name: 'a multi-line REPLACE  INTO, padded',
        code: `export const h = (req) => db.query(\`
          REPLACE   INTO kv (k) VALUES ('\${req.body.k}')\`);`,
        errors: reported,
      },
      {
        name: 'MERGE INTO is a statement',
        code: `export const h = (req) => db.query("MERGE INTO t USING s ON t.id = " + req.body.id);`,
        errors: reported,
      },
      {
        name: 'a multi-line MERGE  INTO, padded',
        code: `export const h = (req) => db.query(\`
          MERGE   INTO t USING s ON t.id = \${req.body.id}\`);`,
        errors: reported,
      },
    ],
  });
});

describe('no-sql-injection — which file owns the call', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        name: 'a scoped driver imported through a subpath still names the driver',
        code: `import { PrismaClient } from '@prisma/client/edge';
          export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + req.query.id);`,
      },
    ],
    invalid: [
      {
        name: 'a require with no argument, or a non-string one, names no driver and does not crash the scan',
        code: `require(); require(1);
          export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + req.query.id);`,
        errors: reported,
      },
      {
        name: 'a plain call with a driver-named string is not an import',
        code: `track('pg');
          export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + req.query.id);`,
        errors: reported,
      },
    ],
  });
});

describe('no-sql-injection — which value is attributable', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        name: 'a request value coerced with unary plus is a number, not text',
        code: `export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + +req.query.id);`,
      },
      {
        name: 'arithmetic on a request value yields a number, not text',
        code: `export const h = (req) => db.query('SELECT * FROM t LIMIT 10 OFFSET ' + (req.query.page - 1) * 10);`,
      },
      {
        name: 'a configured global is not a caller-supplied parameter',
        code: `db.query('SELECT * FROM t WHERE tenant = ' + tenantId);`,
        languageOptions: { globals: { tenantId: 'readonly' } },
      },
      {
        name: 'a request-named list this file builds is not a request',
        code: `const request = [{ body: { id: 1 } }];
          db.query('SELECT * FROM t WHERE id = ' + request[0].body.id);`,
      },
      {
        name: 'a local function with an empty body returns nothing to attribute',
        code: `function audit(v) {}
          export const h = (req) => db.query('SELECT * FROM t WHERE a = ' + audit(req.query.a));`,
      },
      {
        name: 'a local function that returns nothing gives nothing to attribute',
        code: `function audit(v) { return; }
          export const h = (req) => db.query('SELECT * FROM t WHERE a = ' + audit(req.query.a));`,
      },
      {
        name: 'a declared builder called with a literal builds a static statement',
        code: `function build(id) { return 'SELECT * FROM t WHERE id = ' + id; }
          db.query(build('1'));`,
      },
      {
        name: 'an empty String() call carries nothing',
        code: `db.query('SELECT * FROM t WHERE a = ' + String());`,
      },
      {
        // The doc's own example: a static write every path passes through
        // before the statement replaces the caller's value.
        name: 'a parameter overwritten with a constant before the statement is static',
        code: `export function fmt(v) {
          v = 'id';
          return db.query('SELECT * FROM t ORDER BY ' + v);
        }`,
      },
      {
        name: 'an unconditional constant overwrite makes a later conditional constant one static too',
        code: `export function fmt(v, desc) {
          v = 'id';
          if (desc) v = 'id DESC';
          return db.query('SELECT * FROM t ORDER BY ' + v);
        }`,
      },
      {
        name: 'a self-referencing binding terminates and attributes nothing',
        code: `export function h() {
          var a = a;
          return db.query('SELECT * FROM t WHERE id = ' + a);
        }`,
      },
      {
        name: 'two bindings initialised from each other terminate and attribute nothing',
        code: `export function h() {
          var a = b;
          var b = a;
          return db.query('SELECT * FROM t WHERE id = ' + a);
        }`,
      },
      {
        name: 'a builder that calls itself terminates',
        code: `const again = (x) => again(x);
          export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + again('1'));`,
      },
      {
        // @found mutation testing
        name: 'builder defaults that read each other terminate',
        code: `const build = (a = b, b = a) => 'SELECT * FROM t WHERE id = ' + a;
          db.query(build());`,
      },
    ],
    invalid: [
      {
        name: 'a request-named object reassigned from a parameter is no longer locally built',
        code: `export function handler(input) {
          let req = { query: { id: '1' } };
          req = input;
          return db.query('SELECT * FROM t WHERE id = ' + req.query.id);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter re-cast through String in place is still the caller value',
        code: `export function find(id) {
          id = String(id);
          return db.query('SELECT * FROM t WHERE id = ' + id);
        }`,
        errors: reported,
      },
      {
        name: 'a request value in a later element of an inline joined list',
        code: `export const h = (req) => db.query('SELECT * FROM t WHERE id IN (' + ['0', req.query.id].join(',') + ')');`,
        errors: reported,
      },
      {
        name: 'a hole in a joined list contributes nothing and hides nothing',
        code: `export const h = (req) => db.query('SELECT * FROM t WHERE id IN (' + ['0', , req.query.id].join(',') + ')');`,
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a request list spread into a joined list',
        code: `export const h = (req) => db.query('SELECT * FROM t WHERE id IN (' + [...req.query.ids].join(',') + ')');`,
        errors: reported,
      },
      {
        name: 'a request value four aliases away still attributes',
        code: `export function h(req) {
          const a = req.query.id;
          const b = a;
          const c = b;
          const d = c;
          return db.query('SELECT * FROM t WHERE id = ' + d);
        }`,
        errors: reported,
      },
      {
        name: 'a statement passed through five aliases is still the same statement',
        code: `export function h(req) {
          const a = 'SELECT * FROM t WHERE id = ' + req.query.id;
          const b = a;
          const c = b;
          const d = c;
          const e = d;
          const f = e;
          return db.query(f);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter narrowed by a type assertion in place is still the caller value',
        code: `export function find(id: unknown) {
          id = id as string;
          return db.query('SELECT * FROM t WHERE id = ' + id);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter suffixed in place is still the caller value',
        code: `export function search(name) {
          name = name + '%';
          return db.query("SELECT * FROM t WHERE name LIKE '" + name + "'");
        }`,
        errors: reported,
      },
      {
        name: 'a parameter defaulted through a conditional keeps its caller value (consequent)',
        code: `export function list(sort) {
          sort = sort ? sort : 'id';
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter defaulted through a conditional keeps its caller value (alternate)',
        code: `export function list(sort, reset) {
          sort = reset ? 'id' : sort;
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter defaulted with || keeps its caller value',
        code: `export function list(sort) {
          sort = sort || 'id';
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        name: 'a parameter overridden with ?? keeps its caller value',
        code: `export function list(sort, opts) {
          sort = opts.sort ?? sort;
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        name: 'one static write among others does not make a parameter static',
        code: `export function list(sort, dir) {
          if (dir === 'desc') sort = sort + ' DESC';
          else sort = 'id';
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        // A default written on one branch leaves the caller's value on the
        // other: a truthy `sort` reaches the statement untouched.
        // @found mutation testing
        name: 'FN: a default written on one branch does not make the other branch static',
        code: `export function list(sort) {
          if (!sort) sort = 'id';
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        // @found mutation testing
        name: 'FN: a default parameter value applies only when the caller passes nothing',
        code: `export function list(sort = 'id') {
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        // @found mutation testing
        name: 'FN: a constant overwrite after the statement does not reach back to it',
        code: `export function list(sort) {
          const rows = db.query('SELECT * FROM t ORDER BY ' + sort);
          sort = 'id';
          return rows;
        }`,
        errors: reported,
      },
      {
        name: 'a self-referencing binding still attributes the request value it appends',
        code: `export function h(req) {
          let a = 'x';
          a = a + req.query.y;
          return db.query('SELECT * FROM t WHERE id = ' + a);
        }`,
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.y' } },
        ],
      },
      {
        // There is no depth at which a chain of aliases stops being the value.
        // @found mutation testing
        name: 'FN: a request value ten aliases away still attributes',
        code: `export function h(req) {
          const a = req.query.id;
          const b = a; const c = b; const d = c; const e = d;
          const f = e; const g = f; const i = g; const j = i; const k = j;
          return db.query('SELECT * FROM t WHERE id = ' + k);
        }`,
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.id' } },
        ],
      },
      {
        // @found mutation testing
        name: 'FN: a statement passed through ten aliases is still the same statement',
        code: `export function h(req) {
          const a = 'SELECT * FROM t WHERE id = ' + req.query.id;
          const b = a; const c = b; const d = c; const e = d;
          const f = e; const g = f; const i = g; const j = i; const k = j;
          return db.query(k);
        }`,
        errors: reported,
      },
      {
        name: 'an arrow in a typed class field is still an inlet: the field type describes the function',
        code: `export class Repo {
          find: Finder = (term) => db.query('SELECT * FROM t WHERE a = ' + term);
        }`,
        errors: reported,
      },
    ],
  });
});

describe('no-sql-injection — the finding names its source', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [],
    invalid: [
      {
        name: 'the message names the request path that reached the statement',
        code: `export const h = (req) => db.query('SELECT * FROM t WHERE id = ' + req.query.id);`,
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.id' } },
        ],
      },
      {
        name: 'a computed segment with no static name is left out of the named path',
        code: `export const h = (req, key) => db.query('SELECT * FROM t WHERE a = ' + req.query[key]);`,
        errors: [{ messageId: 'sqlInjection', data: { source: 'req.query' } }],
      },
    ],
  });
});

describe('no-sql-injection — local builders and helpers', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        // The inner builder's parameter is bound to the outer one's, and the
        // outer one to a constant: the statement is static.
        // @found mutation testing
        name: 'FP: a builder calling another builder with a constant builds a static statement',
        code: `const where = (v) => 'a = ' + v;
          const build = (t) => 'SELECT * FROM t WHERE ' + where(t);
          db.query(build('1'));`,
      },
      {
        name: 'a nested builder bound to a constant is static under reportUnattributedInterpolation too',
        code: `const where = (v) => 'a = ' + v;
          const build = (t) => 'SELECT * FROM t WHERE ' + where(t);
          db.query(build('1'));`,
        options: strict,
      },
      {
        name: 'a pass-through helper called with nothing hands the sink no statement',
        code: `const run = (s) => s;
          db.query(run());`,
      },
      {
        name: 'a builder returning another builder call with a constant is static',
        code: `const build = (t) => 'SELECT * FROM t WHERE a = ' + t;
          const outer = (u) => build(u);
          db.query(outer('1'));`,
      },
      {
        name: 'a builder returning another builder call with a constant is static under reportUnattributedInterpolation too',
        code: `const build = (t) => 'SELECT * FROM t WHERE a = ' + t;
          const outer = (u) => build(u);
          db.query(outer('1'));`,
        options: strict,
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a local pass-through helper does not launder a request value',
        code: `const orDefault = (v) => v ?? 'id';
          export const h = (req) => db.query('SELECT * FROM t ORDER BY ' + orDefault(req.query.sort));`,
        errors: reported,
      },
      {
        name: 'a function-expression builder is inlined like an arrow',
        code: `const where = function (v) { return 'a = ' + v; };
          export const h = (req) => db.query('SELECT * FROM t WHERE ' + where(req.query.a));`,
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a builder parameter with a default still binds the caller argument',
        code: `const orderBy = (col = 'id') => 'SELECT * FROM t ORDER BY ' + col;
          export const h = (req) => db.query(orderBy(req.query.sort));`,
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a contract-typed builder parameter does not shift the arguments after it',
        code: `const PREFIX = 'app_';
          function build(prefix: TablePrefix, id) { return 'SELECT * FROM ' + prefix + 'users WHERE id = ' + id; }
          export const h = (req) => db.query(build(PREFIX, req.query.id));`,
        errors: reported,
      },
      {
        name: 'a builder default binds when the caller omits the argument',
        code: `export const h = (req) => {
          const orderBy = (col = req.query.sort) => 'SELECT * FROM t ORDER BY ' + col;
          return db.query(orderBy());
        };`,
        errors: reported,
      },
      {
        name: 'a TypeScript this-parameter takes no argument in a builder',
        code: `function build(this: Ctx, id) { return 'SELECT * FROM t WHERE id = ' + id; }
          export const h = (req) => db.query(build(req.query.id));`,
        errors: reported,
      },
      {
        // Was pinned VALID ("a spread argument cannot be matched to a
        // parameter"). A spread supplies its position and every later one, so
        // the builder's parameter holds the caller's list — a caller-supplied
        // parameter, which is an inlet under treatParametersAsUntrusted.
        name: 'a caller-supplied list spread into a builder is the caller value',
        code: "const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`; export function f(req, args) { return db.query(build(...args)); }",
        errors: reported,
      },
      {
        // The outer argument is what the inner builder's parameter stands
        // for, two calls down — not the outer builder's own parameter.
        // @found mutation testing
        name: 'FN: a builder calling another builder keeps the outer argument',
        code: `const where = (v) => 'a = ' + v;
          const build = (t) => 'SELECT * FROM t WHERE ' + where(t);
          export const h = (req) => db.query(build(req.query.a));`,
        options: [{ treatParametersAsUntrusted: false }],
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.a' } },
        ],
      },
      {
        name: 'a pass-through builder applied twice reaches the innermost argument',
        code: `const wrap = (s) => s;
          export const h = (req) => db.query('SELECT * FROM t WHERE a = ' + wrap(wrap(req.query.a)));`,
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.a' } },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: request values spread into a local builder still reach it',
        code: `const orderBy = (col) => 'SELECT * FROM t ORDER BY ' + col;
          export const h = (req) => db.query(orderBy(...req.query.sort));`,
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a builder returning another builder call reaches the statement it builds',
        code: `const build = (t) => 'SELECT * FROM t WHERE a = ' + t;
          const outer = (u) => build(u);
          export const h = (req) => db.query(outer(req.query.a));`,
        options: [{ treatParametersAsUntrusted: false }],
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.a' } },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a pass-through helper at the sink executes the statement it was handed',
        code: `const run = (s) => s;
          export const h = (req) => db.query(run('SELECT * FROM t WHERE a = ' + req.query.a));`,
        errors: [
          { messageId: 'sqlInjection', data: { source: 'req.query.a' } },
        ],
      },
    ],
  });
});

describe('no-sql-injection — which guard narrows a parameter', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        name: 'a guard clause in a class method narrows the parameter',
        code: `const ALLOWED = ['id', 'name'];
          export class Repo {
            find(sort) {
              if (!ALLOWED.includes(sort)) throw new Error('bad sort');
              return db.query('SELECT * FROM t ORDER BY ' + sort);
            }
          }`,
      },
      {
        name: 'a guard block that logs before it throws still narrows',
        code: `const ALLOWED = ['id', 'name'];
          export function find(sort) {
            if (!ALLOWED.includes(sort)) { log('bad sort'); throw new Error('bad sort'); }
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
      },
      {
        name: 'a guard block that returns narrows',
        code: `const ALLOWED = ['id', 'name'];
          export function find(sort) {
            if (!ALLOWED.includes(sort)) { return null; }
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
      },
    ],
    invalid: [
      {
        name: 'a guard against a list this file never declares does not narrow',
        code: `export function find(sort) {
          if (!ALLOWED_SORTS.includes(sort)) throw new Error('bad sort');
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
      {
        name: 'a guard against a configured global list does not narrow',
        code: `export function find(sort) {
          if (!ALLOWED_SORTS.includes(sort)) throw new Error('bad sort');
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        languageOptions: { globals: { ALLOWED_SORTS: 'readonly' } },
        errors: reported,
      },
      {
        name: 'a guard against a list declared without a value does not narrow',
        code: `let ALLOWED;
          export function find(sort) {
            if (!ALLOWED.includes(sort)) throw new Error('bad sort');
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
        errors: reported,
      },
      {
        name: 'a substring check against a string is not an allowlist',
        code: `const ALLOWED = 'id,name';
          export function find(sort) {
            if (!ALLOWED.includes(sort)) throw new Error('bad sort');
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
        errors: reported,
      },
      {
        name: 'a probabilistic filter is not an allowlist',
        code: `const ALLOWED = new BloomFilter(['id', 'name']);
          export function find(sort) {
            if (!ALLOWED.has(sort)) throw new Error('bad sort');
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
        errors: reported,
      },
      {
        name: 'a Set constructed empty and filled later is not a closed set',
        code: `const ALLOWED = new Set();
          ALLOWED.add('id');
          export function find(sort) {
            if (!ALLOWED.has(sort)) throw new Error('bad sort');
            return db.query('SELECT * FROM t ORDER BY ' + sort);
          }`,
        errors: reported,
      },
      {
        name: 'an allowlist holding a variable is not a closed set',
        code: `export function find(sort, extra) {
          const ALLOWED = ['id', extra];
          if (!ALLOWED.includes(sort)) throw new Error('bad sort');
          return db.query('SELECT * FROM t ORDER BY ' + sort);
        }`,
        errors: reported,
      },
    ],
  });
});

describe('no-sql-injection — reportUnattributedInterpolation', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        name: 'an escaped value in a three-piece concatenation is not raw',
        code: `import { escape } from 'sqlstring';
          export const h = (x) => db.query('SELECT * FROM t WHERE a = ' + escape(x) + ' AND b = 1');`,
        options: strict,
      },
      {
        name: 'an escaped value inside a nested template is not raw',
        code: `import { escape } from 'sqlstring';
          export const h = (x) => db.query('SELECT * FROM t WHERE ' + \`a = \${escape(x)}\`);`,
        options: strict,
      },
    ],
    invalid: [
      {
        name: 'an unattributed write after a plain one still reports',
        code: `export class Repo {
          find(c) {
            let sql = 'SELECT * FROM t';
            if (c) sql = 'SELECT * FROM t WHERE a = ' + this.a;
            return db.query(sql);
          }
        }`,
        options: strict,
        errors: reported,
      },
    ],
  });
});

describe('no-sql-injection — requestRoots and the request shape', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: widening requestRoots keeps the shape path on',
        code: `export const h = (inbound) => db.query('SELECT * FROM t WHERE id = ' + inbound.query.id);`,
        options: [
          {
            requestRoots: ['req', 'request', 'ctx', 'event', 'evt'],
            treatParametersAsUntrusted: false,
          },
        ],
        errors: reported,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: reordering the default requestRoots keeps the shape path on',
        code: `export const h = (inbound) => db.query('SELECT * FROM t WHERE id = ' + inbound.query.id);`,
        options: [
          {
            requestRoots: ['event', 'ctx', 'request', 'req'],
            treatParametersAsUntrusted: false,
          },
        ],
        errors: reported,
      },
    ],
  });
});
