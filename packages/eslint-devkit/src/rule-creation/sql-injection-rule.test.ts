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
  methods: ['query'],
  requireSqlKeywords: false,
  description: 'test rule (ungated)',
  url: 'https://example.test/ungated',
  fix: 'Use parameterized queries ($1, $2).',
  documentationLink: 'https://example.test/docs',
});

/** Keyword-gated multi-sink instance — the ORM / multi-driver shape. */
const gated = createSqlInjectionRule({
  methods: ['query', 'raw', 'execute'],
  requireSqlKeywords: true,
  description: 'test rule (gated)',
  url: 'https://example.test/gated',
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
      expect(gated.meta.messages.unsafeTemplateLiteral).toContain('placeholders');
    });
  });

  describe('ungated instance (single sink, no keyword gate)', () => {
    ruleTester.run('ungated', ungated, {
      valid: [
        { name: 'no arguments', code: `client.query();` },
        { name: 'non-sink method', code: `client.other('SELECT ' + 1);` },
        { name: 'bare identifier callee', code: `query(\`SELECT * FROM t WHERE id = \${id}\`);` },
        // Known limitation, inherited from the original pg rule: only
        // identifier property access is matched, so `client['query']` is a
        // false negative. Documented in both rule docs.
        { name: 'non-identifier member property', code: `client['query'](\`SELECT \${x}\`);` },
        { name: 'parameterized', code: `client.query('SELECT * FROM users WHERE id = $1', [id]);` },
        { name: 'template without expressions', code: 'pool.query(`SELECT * FROM users`);' },
        { name: 'spread argument', code: `client.query(...args);` },
        { name: 'declarator without init', code: `let q; db.query('SELECT 1');` },
        { name: 'destructured declarator', code: `const { sql } = cfg; db.query(sql);` },
        { name: 'untainted identifier', code: `const q = 'SELECT 1'; db.query(q);` },
        { name: 'plain string +=', code: `let q = 'SELECT 1'; q += ' WHERE active'; db.query(q);` },
        { name: 'non-+= operator', code: `let n = 1; n -= step; db.query(n);` },
        { name: 'member-expression += target', code: `state.q += 'a' + suffix; db.query(state.q);` },
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
            'sql += ` AND name = \'${name}\'`;',
            'db.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
