/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the shared CWE-89 detector.
 *
 * Two instances are exercised side by side because driver plugins configure
 * it differently: `eslint-plugin-pg` runs the historical ungated single-sink
 * form, while a plugin covering an ORM or several drivers needs the broad
 * multi-sink form behind the SQL-keyword precision gate.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { createSqlInjectionRule } from './sql-injection-rule';

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

/** Ungated single-sink instance — the pg shape. */
const ungated = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test rule (ungated)',
      url: 'https://example.test/ungated',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  methods: ['query'],
  requireSqlKeywords: false,
  fix: 'Use parameterized queries ($1, $2).',
  documentationLink: 'https://example.test/docs',
});

/** Keyword-gated multi-sink instance — the ORM / multi-driver shape. */
const gated = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test rule (gated)',
      url: 'https://example.test/gated',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  methods: ['query', 'raw', 'execute'],
  requireSqlKeywords: true,
  fix: 'Use placeholders and pass values separately.',
  documentationLink: 'https://example.test/docs',
});

describe('createSqlInjectionRule', () => {
  describe('metadata', () => {
    it('documents CWE-89 / CVSS 9.8 and passes caller copy through', () => {
      // meta.docs.cvss is locked against the emitted CVSS token for every
      // security plugin by security-cvss-docs-consistency.lock.test.ts.
      expect(ungated.meta.docs?.cwe).toBe('CWE-89');
      expect(ungated.meta.docs?.cvss).toBe(9.8);
      expect(ungated.meta.docs?.description).toBe('test rule (ungated)');
      expect(ungated.meta.docs?.url).toBe('https://example.test/ungated');
      expect(ungated.meta.messages.noUnsafeQuery).toContain('$1, $2');
      expect(gated.meta.messages.unsafeTemplateLiteral).toContain(
        'placeholders',
      );
    });

    // Both messageIds are primary findings — `create` picks between them on
    // `kind === 'template'`, not on severity. unsafeTemplateLiteral once
    // carried no cwe/owasp/compliance at all, so the template half of every
    // SQL rule in the ecosystem reported without a CWE. The cross-plugin
    // CVSS lock could not see it: that lock reads the *first* message
    // carrying a CVSS token and stops, and noUnsafeQuery is always first.
    it.each(['noUnsafeQuery', 'unsafeTemplateLiteral'] as const)(
      'emits CWE-89 and CVSS:9.8 in %s, not just in the first message',
      (messageId) => {
        for (const rule of [ungated, gated]) {
          expect(rule.meta.messages[messageId]).toContain('CWE-89');
          expect(rule.meta.messages[messageId]).toContain('CVSS:9.8');
        }
      },
    );
  });

  describe('ungated instance (single sink, no keyword gate)', () => {
    ruleTester.run('ungated', ungated, {
      valid: [
        { name: 'no arguments', code: `client.query();` },
        { name: 'non-sink method', code: `client.other('SELECT ' + 1);` },
        {
          name: 'bare identifier callee',
          code: `query(\`SELECT * FROM t WHERE id = \${id}\`);`,
        },
        // Known limitation, inherited from the original pg rule: only
        // identifier property access is matched, so `client['query']` is a
        // false negative. Documented in both rule docs.
        {
          name: 'non-identifier member property',
          code: `client['query'](\`SELECT \${x}\`);`,
        },
        {
          name: 'parameterized',
          code: `client.query('SELECT * FROM users WHERE id = $1', [id]);`,
        },
        {
          name: 'template without expressions',
          code: 'pool.query(`SELECT * FROM users`);',
        },
        { name: 'spread argument', code: `client.query(...args);` },
        {
          name: 'declarator without init',
          code: `let q; db.query('SELECT 1');`,
        },
        {
          name: 'destructured declarator',
          code: `const { sql } = cfg; db.query(sql);`,
        },
        {
          name: 'untainted identifier',
          code: `const q = 'SELECT 1'; db.query(q);`,
        },
        {
          name: 'plain string +=',
          code: `let q = 'SELECT 1'; q += ' WHERE active'; db.query(q);`,
        },
        { name: 'non-+= operator', code: `let n = 1; n -= step; db.query(n);` },
        {
          name: 'member-expression += target',
          code: `state.q += 'a' + suffix; db.query(state.q);`,
        },
        // Regression: `+` is also numeric addition. With no string literal in
        // the expression there is no evidence of SQL, so even the ungated
        // instance must stay silent.
        {
          name: 'numeric addition is not concatenation',
          code: `db.query(1 + offset);`,
        },
        {
          name: 'variable-only addition has no static text',
          code: `db.query(a + b);`,
        },
      ],
      invalid: [
        {
          name: 'direct concatenation',
          code: `client.query('SELECT * FROM users WHERE id = ' + id);`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'direct interpolation',
          code: 'pool.query(`SELECT * FROM users WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'no SQL keywords still reports when ungated',
          code: 'db.query(`give me ${everything}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'concat-tainted variable',
          code: `const q = "SELECT * FROM users WHERE id = '" + userId + "'"; db.query(q);`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'template-tainted variable via +=',
          code: 'let q = "SELECT 1"; q += ` AND id = ${id}`; db.query(q);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });

  // Reported as a false positive in #261 ("wrapper flags my parameterized
  // query"); the FP could not be reproduced, but the same shape turned out to
  // be a total *false negative* — a genuinely injectable query was invisible
  // the moment it went through a one-line helper, even with the helper three
  // lines above in the same file. Every `invalid` case here reported nothing
  // before this rule learned about wrappers.
  describe('same-file query wrappers', () => {
    ruleTester.run('wrapper-aware (ungated)', ungated, {
      valid: [
        // The exact snippet from #261. A wrapper is only a sink for unsafe
        // *construction* — a non-interpolated template stays safe forever.
        {
          name: 'issue #261: parameterized call through an arrow wrapper',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q(`SELECT * FROM users WHERE id = $1`, [id]);',
          ].join('\n'),
        },
        // An anonymous function has no name to match at a call site, so it
        // never becomes a wrapper — `callableName` returns undefined.
        {
          name: 'anonymous callback around a sink is not a named wrapper',
          code: [
            'items.forEach(function (sql) { pool.query(sql); });',
            'send(`SELECT * FROM users WHERE id = ${id}`);',
          ].join('\n'),
        },
        {
          name: 'spread argument into a helper carries no analysable shape',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q(...args);',
          ].join('\n'),
        },
        // Tainted, but with no SQL keyword anywhere — the forced gate applies
        // to the identifier path too, not just to inline construction.
        {
          name: 'tainted-but-not-SQL variable through a wrapper',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'const label = `run ${id}`;',
            'q(label, []);',
          ].join('\n'),
        },
        // Matching is by bare name, so a name meaning two different things in
        // one file is unusable. The adapter pattern — several repositories
        // exposing an identically-named method — is where this bites, and
        // reporting the non-wrapping one would be precisely the false
        // positive #261 described.
        {
          name: 'same method name on a wrapping and a non-wrapping class',
          code: [
            'class PgRepo { run(sql) { return this.pool.query(sql); } }',
            'class CacheRepo { run(sql) { return this.cache.get(sql); } }',
            'new CacheRepo().run(`SELECT * FROM users WHERE id = ${id}`);',
          ].join('\n'),
        },
        {
          name: 'same free function name, only one of which wraps a sink',
          code: [
            'function send(sql) { return pool.query(sql); }',
            'function send2(x) { return x; }',
            'const send3 = (sql) => sql;',
            'send3(`SELECT * FROM users WHERE id = ${id}`);',
          ].join('\n'),
        },
        {
          name: 'unrelated helper of the same name is not a sink',
          code: 'log(`SELECT ${x}`);',
        },
        // The wrapper's own forwarding call must not report: `sql` is an
        // opaque parameter, not something this file concatenated.
        {
          name: 'the wrapper body itself',
          code: 'const q = (sql, params) => pool.query(sql, params);',
        },
        // Argument position matters — the params array is not the query.
        {
          name: 'interpolation in a non-query argument',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q("SELECT * FROM users WHERE id = $1", [`${id}`]);',
          ].join('\n'),
        },
        // Forced keyword gate: the ungated instance reports keyword-free
        // interpolation at a *real* sink, but must not through a wrapper —
        // that is how fixing this FN would have created a new FP class.
        {
          name: 'keyword-free interpolation through a wrapper stays gated',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q(`give me ${everything}`, []);',
          ].join('\n'),
        },
      ],
      invalid: [
        {
          name: 'interpolation through an arrow wrapper',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q(`SELECT * FROM users WHERE id = ${id}`, []);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'concatenation through an arrow wrapper',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'q("SELECT * FROM users WHERE id = " + id, []);',
          ].join('\n'),
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        // Hoisting: the helper is declared *below* its caller, which is why
        // wrapper findings are resolved at Program:exit rather than inline.
        {
          name: 'function declaration hoisted below its call site',
          code: [
            'run(`SELECT * FROM users WHERE id = ${id}`);',
            'function run(sql) { return pool.query(sql); }',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'class method wrapper',
          code: [
            'class Db { run(sql, p) { return this.pool.query(sql, p); } }',
            'new Db().run(`SELECT * FROM users WHERE id = ${id}`, []);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        // Class field holding an arrow — the shape NestJS services use, where
        // the helper is a property rather than a method.
        {
          name: 'class field arrow wrapper',
          code: [
            'class Db { q = (sql) => this.pool.query(sql); }',
            'new Db().q(`SELECT * FROM users WHERE id = ${id}`);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'object-literal method wrapper',
          code: [
            'const db = { run(sql) { return pool.query(sql); } };',
            'db.run("SELECT * FROM users WHERE id = " + id);',
          ].join('\n'),
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        // The query is not the first parameter of the helper.
        {
          name: 'query at a non-zero parameter index',
          code: [
            'const q = (conn, sql) => conn.query(sql);',
            'q(pool, `SELECT * FROM users WHERE id = ${id}`);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        // The variable acquires its SQL-ness at the `+=`, not at its
        // declaration. `pool.query(sql)` always caught this; `q(sql)` used to
        // drop it, because `sqlish` was only ever seeded from a declarator.
        {
          name: 'variable made SQL-ish by += then handed to a wrapper',
          code: [
            'const q = (sql) => pool.query(sql);',
            "let sql = '';",
            'sql += `SELECT * FROM users WHERE id = ${id}`;',
            'q(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'tainted variable handed to a wrapper',
          code: [
            'const q = (sql, params) => pool.query(sql, params);',
            'const sql = "SELECT * FROM users WHERE id = " + id;',
            'q(sql, []);',
          ].join('\n'),
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
      ],
    });
  });

  describe('gated instance (multi sink, keyword gate)', () => {
    ruleTester.run('gated', gated, {
      valid: [
        {
          name: 'interpolation without SQL keywords is not a SQL finding',
          code: 'page.execute(`click ${selector}`);',
        },
        {
          name: 'concatenation without SQL keywords is not a SQL finding',
          code: `job.raw('retry-' + attempt);`,
        },
        {
          name: 'tainted-but-not-SQL variable is not tracked',
          code: 'const label = `run ${id}`; job.raw(label);',
        },
        {
          name: 'numeric concatenation carries no static SQL text',
          code: `queue.execute(1 + offset);`,
        },
        {
          name: '+= onto a non-SQL seed stays gated',
          code: 'let label = "run"; label += ` ${id}`; job.raw(label);',
        },
      ],
      invalid: [
        {
          name: 'knex raw',
          code: 'db.raw(`SELECT * FROM users WHERE id = ${id}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'mysql2 execute',
          code: `conn.execute('SELECT * FROM users WHERE email = ' + email);`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'keyword carried by a concatenated template operand',
          code: 'db.query(`SELECT * FROM t` + ` WHERE id = ${id}`);',
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'keyword-free fragment appended to a SQL-seeded variable',
          code: [
            "let sql = 'SELECT * FROM products WHERE 1=1';",
            "sql += ` AND name = '${name}'`;",
            'db.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
