/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression locks for `check-query-params`.
 *
 * The pre-rewrite rule read only `query(<string literal>, <array literal>)` and
 * only the shortfall direction. Against
 * `benchmarks/rule-corpus/postgresql-security__check-query-params` it scored
 * 2 TP / 0 FP / 9 FN — precision 100%, recall 18.2%.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { checkQueryParams } from './index';

const withPg = (code: string): string => `import { Pool } from 'pg';\n${code}`;
const pg = <T,>(cases: T[]): T[] =>
  cases.map((c) =>
    typeof c === 'string'
      ? (withPg(c) as T)
      : ({ ...c, code: withPg((c as { code: string }).code) } as T),
  );

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

const error = [{ messageId: 'parameterCountMismatch' as const }];

describe('check-query-params — regression locks', () => {
  ruleTester.run('structural counting', checkQueryParams, {
    valid: pg([
      // Resolution edges: a binding whose single write is not a declaration,
      // a callee that is a parameter rather than a function, and a builder
      // binding written twice. Each is a shape where the file cannot say what
      // the sink receives.
      {
        name: 'lock: a parameter assigned once is not a declaration',
        code: "function r(q) { q = 'SELECT $1, $2'; client.query(q, [a]); }",
      },
      {
        name: 'lock: a declaration whose single write supplies no initialiser',
        code: "let q; q = 'SELECT $1, $2'; client.query(q, [a]);",
      },
      {
        name: 'lock: a callee that is a function parameter',
        code: 'function r(b) { client.query(b(), [a]); }',
      },
      {
        name: 'lock: a builder binding written twice',
        code: "let b = () => 'SELECT $1, $2'; b = other; client.query(b(), [a]);",
      },
      {
        name: 'lock: a statement concatenated with something unknowable',
        code: "client.query('SELECT $1, $2' + suffix, [a]);",
      },
      {
        name: 'lock: a config object with a numeric key',
        code: "client.query({ 1: 'SELECT $1, $2', values: [a] });",
      },
      // Counting rules.
      {
        name: 'lock: a repeated placeholder binds one value',
        code: "client.query('SELECT * FROM u WHERE a = $1 OR b = $1', [x]);",
      },
      {
        name: 'lock: a gap is covered when the array reaches the highest index',
        code: "client.query('SELECT $1, $3', [a, b, c]);",
      },
      {
        name: 'lock: no placeholders and no values',
        code: "client.query('SELECT 1', []);",
      },
      // What is NOT a placeholder.
      {
        name: 'lock: $1 inside a string constant',
        code: `client.query("SELECT replace(b, '$1', n) FROM t WHERE id = $1", [id]);`,
      },
      {
        name: 'lock: a string constant with a doubled quote',
        code: `client.query("SELECT 'it''s $9' FROM t WHERE id = $1", [id]);`,
      },
      {
        name: 'lock: $1 inside a quoted identifier',
        code: `client.query('SELECT "$9" FROM t WHERE id = $1', [id]);`,
      },
      {
        name: 'lock: $n inside a line comment',
        code: "client.query('SELECT 1 -- $9', []);",
      },
      {
        name: 'lock: $n inside a block comment',
        code: "client.query('SELECT 1 /* $9 */', []);",
      },
      // FP the rewrite had to avoid: a dollar-quoted body is full of
      // placeholder-looking text that is not a placeholder.
      {
        name: 'lock: an anonymous dollar-quoted body',
        code: "client.query('DO $$ BEGIN RAISE NOTICE \\'$9\\'; END $$;', []);",
      },
      {
        name: 'lock: a named dollar-quote tag',
        code: "client.query('CREATE FUNCTION f() AS $b$ SELECT $9; $b$ LANGUAGE sql', []);",
      },
      // Abstentions: the count is genuinely unknowable.
      {
        name: 'lock: a spread element makes the length unknowable',
        code: "client.query('SELECT * FROM u WHERE id = ANY($1)', [...ids]);",
      },
      {
        name: 'lock: a mapped array is not an array literal',
        code: "client.query('SELECT $1', rows.map(r => r.id));",
      },
      {
        name: 'lock: an undeclared values binding',
        code: "client.query('SELECT $1, $2', undeclaredValues);",
      },
      {
        name: 'lock: a values binding written twice',
        code: "let p = [a]; p = [a, b]; client.query('SELECT $1, $2', p);",
      },
      {
        name: 'lock: a values declaration with no initialiser',
        code: "let p; client.query('SELECT $1, $2', p);",
      },
      {
        name: 'lock: a template WITH interpolation is not a knowable statement',
        code: 'client.query(`SELECT * FROM ${t} WHERE a = $1 AND b = $2`, [x]);',
      },
      {
        name: 'lock: an interpolated statement with a matching count is still quiet',
        code: 'client.query(`SELECT * FROM u ORDER BY ${col} LIMIT $1`, [n]);',
      },
      // The surplus direction needs `$n` evidence, or a `?`-placeholder client
      // in the same file reports a mismatch that does not exist.
      {
        name: 'lock: a statement with no $n placeholders is not judged',
        code: "legacy.query('UPDATE u SET email = ? WHERE id = ?', [email, id]);",
      },
      // Shapes the sink never reaches.
      { name: 'lock: computed sink property', code: "client['query']('SELECT $1, $2', [a]);" },
      { name: 'lock: bare callee', code: "query('SELECT $1, $2', [a]);" },
      { name: 'lock: unrelated method', code: "client.log('SELECT $1, $2', [a]);" },
      { name: 'lock: no arguments', code: 'client.query();' },
      { name: 'lock: spread first argument', code: 'client.query(...args);' },
      { name: 'lock: a spread second argument', code: "client.query('SELECT $1, $2', ...rest);" },
      { name: 'lock: no second argument', code: "client.query('SELECT $1, $2');" },
      {
        name: 'lock: a callback as the second argument',
        code: "client.query('SELECT $1', (e, r) => r);",
      },
      { name: 'lock: a numeric statement argument', code: 'client.query(123, [a]);' },
      {
        name: 'lock: a config object with no values property',
        code: "client.query({ name: 'h', text: 'SELECT $1' });",
      },
      {
        name: 'lock: a config object with a spread property',
        code: "client.query({ ...base, values: [a] });",
      },
      {
        name: 'lock: a config object with a computed non-literal key',
        code: "client.query({ [k]: 'SELECT $1, $2', values: [a] });",
      },
      {
        name: 'lock: a config object whose values are not knowable',
        code: "client.query({ text: 'SELECT $1, $2', values });",
      },
      {
        name: 'lock: a config object whose text is not knowable',
        code: 'client.query({ text: buildText(), values: [a] });',
      },
      // Tagged templates other than String.raw bind their own parameters.
      {
        name: 'lock: a non-String.raw tag is not unwrapped',
        code: 'sql.query(tag`SELECT $1, $2`, [a]);',
      },
      // Builder resolution.
      {
        name: 'lock: a call whose callee is a member expression',
        code: 'client.query(builders.sql(), [a]);',
      },
      {
        name: 'lock: a local builder with a multi-statement body',
        code: "function b() { const q = 'SELECT $1, $2'; return q; } client.query(b(), [a]);",
      },
      {
        name: 'lock: a local builder that returns nothing',
        code: 'function b() { return; } client.query(b(), [a]);',
      },
      {
        name: 'lock: a binding that is not a function, called',
        code: "const b = 'x'; client.query(b(), [a]);",
      },
      {
        name: 'lock: a statement binding written twice',
        code: "let q = 'SELECT $1'; q = 'SELECT $1, $2'; client.query(q, [a]);",
      },
      {
        name: 'lock: a function parameter as the statement',
        code: 'function r(q) { client.query(q, [a]); }',
      },
      {
        name: 'lock: resolution is bounded — a six-hop chain abstains',
        code: [
          "const a1 = 'SELECT $1, $2';",
          'const b1 = a1; const c1 = b1; const d1 = c1; const e1 = d1; const f1 = e1;',
          'client.query(f1, [x]);',
        ].join('\n'),
      },
    ]),
    invalid: pg([
      {
        // A raw template with an invalid escape has a `cooked` value of null.
        // Falling back to `raw` is what keeps the statement readable at all.
        name: 'lock: String.raw with an escape the cooked value cannot hold',
        code: 'client.query(String.raw`SELECT $1, $2 \\x`, [a]);',
        errors: error,
      },
      {
        name: 'lock: the canonical shortfall',
        code: "client.query('SELECT * FROM u WHERE id = $1 AND org = $2', [id]);",
        errors: error,
      },
      // FN: multi-line SQL is a template literal, and requiring `Literal`
      // meant the rule could not read the form long parameter lists are
      // actually written in.
      {
        name: 'lock: a template literal with no interpolation is knowable',
        code: 'client.query(`SELECT * FROM u\n  WHERE a = $1 AND b = $2`, [x]);',
        errors: error,
      },
      // FN: literal concatenation.
      {
        name: 'lock: a statement concatenated from literals',
        code: "client.query('SELECT * FROM u ' + 'WHERE a = $1 AND b = $2', [x]);",
        errors: error,
      },
      // FN: the config-object call shape was not handled at all.
      {
        name: 'lock: the config-object form',
        code: "client.query({ text: 'UPDATE u SET n = $1 WHERE id = $2', values: [n] });",
        errors: error,
      },
      {
        name: 'lock: the config-object form with computed string keys',
        code: "client.query({ ['text']: 'SELECT $1, $2', ['values']: [a] });",
        errors: error,
      },
      {
        name: 'lock: the config-object form with quoted string keys',
        code: "client.query({ 'text': 'SELECT $1, $2', 'values': [a] });",
        errors: error,
      },
      {
        name: 'lock: the config-object form with shorthand properties',
        code: "const text = 'SELECT $1, $2'; const values = [a]; client.query({ text, values });",
        errors: error,
      },
      {
        name: 'lock: the config object itself reached through a binding',
        code: "const c = { text: 'SELECT $1, $2', values: [a] }; client.query(c);",
        errors: error,
      },
      // FN: the statement or the values reached the sink through a binding.
      {
        name: 'lock: the statement in a module constant',
        code: "const SQL = 'INSERT INTO e VALUES ($1, $2, $3)'; client.query(SQL, [a, b]);",
        errors: error,
      },
      {
        name: 'lock: the values array in a binding',
        code: "const p = [a, b]; client.query('INSERT INTO p VALUES ($1, $2, $3)', p);",
        errors: error,
      },
      {
        name: 'lock: a local builder returning the statement',
        code: "const b = () => 'DELETE FROM s WHERE id = $1 AND u = $2'; client.query(b(), [id]);",
        errors: error,
      },
      {
        name: 'lock: a function-declaration builder',
        code: "function b() { return 'SELECT $1, $2'; } client.query(b(), [a]);",
        errors: error,
      },
      // FN: the second sink spelling.
      {
        name: 'lock: the execute sink',
        code: "client.execute('UPDATE d SET s = $2 WHERE id = $1', [id]);",
        errors: error,
      },
      // FN: String.raw.
      {
        name: 'lock: String.raw',
        code: 'client.query(String.raw`SELECT $1, $2`, [a]);',
        errors: error,
      },
      // FN: the surplus direction, which PostgreSQL rejects just as loudly as
      // a shortfall.
      {
        name: 'lock: more values than placeholders',
        code: "client.query('SELECT * FROM u WHERE id = $1', [id, orgId]);",
        errors: error,
      },
      {
        name: 'lock: a surplus in the config-object form',
        code: "client.query({ text: 'SELECT $1', values: [a, b] });",
        errors: error,
      },
      // FN: two-digit indices.
      {
        name: 'lock: $10 is the tenth parameter',
        code: "client.query('INSERT INTO l VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [1,2,3,4,5,6,7,8,9]);",
        errors: error,
      },
      {
        name: 'lock: a repeated two-digit index',
        code: "client.query('SELECT $12 FROM t WHERE b = $12', [1,2,3,4,5,6,7,8,9,10,11]);",
        errors: error,
      },
      // The stripping must not swallow the real placeholders around it.
      {
        name: 'lock: real placeholders survive comment and string stripping',
        code: `client.query("SELECT '$9' -- $9\\nFROM t WHERE a = $1 AND b = $2", [x]);`,
        errors: error,
      },
    ]),
  });

  /**
   * The module gate. Every fixture above imports a PostgreSQL client, so
   * without this block the `return {}` arm — the one that makes 94% of this
   * plugin's historical findings disappear — is never executed by any test.
   */
  ruleTester.run('abstains without a PostgreSQL client', checkQueryParams, {
    valid: [
      { name: 'lock: no pg import, no analysis', code: "db.query('SELECT $1, $2', [a]);" },
    ],
    invalid: [],
  });
});
