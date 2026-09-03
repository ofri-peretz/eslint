/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression locks for `no-unsafe-search-path`.
 *
 * Every case here fails on the pre-rewrite rule, whose whole detection was
 * `queryArg` shape-matching plus
 * `str.toLowerCase().includes('set search_path')`. Measured against
 * `benchmarks/rule-corpus/postgresql-security__no-unsafe-search-path`, that
 * implementation scored 4 TP / 5 FP / 6 FN — precision 44.4%, recall 40.0%.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeSearchPath } from './index';

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

const error = [{ messageId: 'noUnsafeSearchPath' as const }];

describe('no-unsafe-search-path — regression locks', () => {
  ruleTester.run('structural detection', noUnsafeSearchPath, {
    valid: pg([
      // Resolution edges — shapes where the file cannot say what the sink
      // receives, so the honest answer is silence.
      {
        name: 'lock: a parameter assigned once is not a declaration',
        code: 'function r(q) { q = `SET search_path TO ${s}`; client.query(q); }',
      },
      {
        name: 'lock: a declaration whose single write supplies no initialiser',
        code: 'let q; q = `SET search_path TO ${s}`; client.query(q);',
      },
      {
        name: 'lock: a callee that is a function parameter',
        code: 'function r(b) { client.query(b()); }',
      },
      {
        name: 'lock: a builder binding written twice',
        code: 'let b = (s) => `SET search_path TO ${s}`; b = other; client.query(b(x));',
      },
      {
        name: 'lock: a concise-arrow builder returning a non-string',
        code: 'const b = () => 1; client.query(b());',
      },
      // FP: a constant folded through a binding. The old rule reported any
      // template with any expression in it.
      {
        name: 'lock: a schema that folds to a literal is not dynamic',
        code: "const S = 'analytics'; client.query(`SET search_path TO ${S}`);",
      },
      // FP: every operand of the concatenation is a literal.
      {
        name: 'lock: concatenating two constants produces a constant',
        code: "client.query('SET search_path TO ' + 'app, public');",
      },
      // FP: the phrase is DATA inside a quoted string on an INSERT. The old
      // substring test could not tell a statement from a string constant.
      {
        name: 'lock: the phrase inside a string literal is not a SET',
        code: "client.query(`INSERT INTO audit (m) VALUES ('set search_path by ${who}')`);",
      },
      {
        name: 'lock: the phrase inside a line comment is not a SET',
        code: 'client.query(`-- SET search_path TO ${s}\\nSELECT 1`);',
      },
      {
        name: 'lock: the phrase inside a block comment is not a SET',
        code: 'client.query(`/* SET search_path TO ${s} */ SELECT 1`);',
      },
      // FP: the documented CWE-426 remediation is an allowlist, and both
      // spellings of it abort before the statement runs.
      {
        name: 'lock: allowlist guard that throws',
        code: `
          const OK = new Set(['a', 'b']);
          function go(schema) {
            if (!OK.has(schema)) { throw new Error('no'); }
            client.query(\`SET search_path TO \${schema}\`);
          }
        `,
      },
      {
        name: 'lock: allowlist guard that returns',
        code: `
          const OK = ['a', 'b'];
          function go(schema, res) {
            if (!OK.includes(schema)) { res.sendStatus(400); return; }
            client.query(\`SET search_path TO \${schema}\`);
          }
        `,
      },
      // A local builder that returns a constant statement.
      {
        name: 'lock: a builder returning a constant folds to a constant',
        code: `
          const P = 'app, public';
          function build() { return \`SET search_path TO \${P}\`; }
          client.query(build());
        `,
      },
      {
        name: 'lock: a builder returning a plain literal',
        code: "const build = () => 'SET search_path TO app'; client.query(build());",
      },
      // pg-format with every argument constant.
      {
        name: 'lock: a formatter handed only constants',
        code: "client.query(format('SET search_path TO %I', 'public'));",
      },
      // Tagged templates other than String.raw parameterise their
      // interpolations; unwrapping them would report the safest clients.
      {
        name: 'lock: a non-String.raw tag is not unwrapped',
        code: 'client.query(sql`SET search_path TO ${schema}`);',
      },
      // Shapes the sink never reaches.
      { name: 'lock: computed sink property', code: "client['query'](`SET search_path TO ${s}`);" },
      { name: 'lock: bare callee', code: 'query(`SET search_path TO ${s}`);' },
      { name: 'lock: unrelated method', code: 'client.log(`SET search_path TO ${s}`);' },
      { name: 'lock: no arguments', code: 'client.query();' },
      { name: 'lock: spread argument', code: 'client.query(...args);' },
      { name: 'lock: a number argument', code: 'client.query(123);' },
      { name: 'lock: a member-expression argument', code: 'client.query(cfg.sql);' },
      {
        name: 'lock: a call whose callee is a member expression',
        code: 'client.query(builders.searchPath(schema));',
      },
      {
        name: 'lock: a call to a local non-string builder',
        code: 'function build() { const q = 1; return q; } client.query(build());',
      },
      {
        name: 'lock: a call to a local builder with a multi-statement body',
        code: `
          function build(s) { const q = \`SET search_path TO \${s}\`; return q; }
          client.query(build(x));
        `,
      },
      {
        name: 'lock: a call to a local builder that returns nothing',
        code: 'function build() { return; } client.query(build());',
      },
      {
        name: 'lock: a call to a binding that is not a function',
        code: "const build = 'not a function'; client.query(build(x));",
      },
      {
        name: 'lock: a formatter whose statement argument is not search_path',
        code: "client.query(format('SELECT %I', col));",
      },
      // A binding written twice has no knowable value at the sink.
      {
        name: 'lock: a statement binding written twice',
        code: "let q = 'SELECT 1'; q = 'SELECT 2'; client.query(q);",
      },
      {
        name: 'lock: a declaration with no initialiser',
        code: 'let q; client.query(q);',
      },
      {
        name: 'lock: a function parameter as the statement',
        code: 'function run(q) { client.query(q); }',
      },
      {
        name: 'lock: an undeclared statement binding',
        code: 'client.query(undeclaredSql);',
      },
      {
        name: 'lock: a static statement with no interpolation at all',
        code: 'client.query(`\\n  SET search_path TO app, public;\\n`);',
      },
      {
        name: 'lock: a different session parameter',
        code: 'client.query(`SET TIME ZONE ${tz}`);',
      },
      {
        name: 'lock: resolution is bounded — a six-hop chain abstains',
        code: `
          const a = \`SET search_path TO \${s}\`;
          const b = a; const c = b; const d = c; const e = d; const f = e;
          client.query(f);
        `,
      },
    ]),
    invalid: pg([
      // FN: whitespace and the LOCAL/SESSION qualifiers defeated the substring.
      {
        name: 'lock: irregular whitespace still sets the search path',
        code: 'client.query(`set   search_path  to ${s}`);',
        errors: error,
      },
      {
        name: 'lock: SET LOCAL',
        code: 'client.query(`SET LOCAL search_path TO ${s}`);',
        errors: error,
      },
      {
        name: 'lock: SET SESSION',
        code: 'client.query(`SET SESSION search_path TO ${s}`);',
        errors: error,
      },
      {
        name: 'lock: the SET is the second statement in the string',
        code: 'client.query(`BEGIN; SET search_path TO ${s}; SELECT 1;`);',
        errors: error,
      },
      // FN: the statement reached the sink through a binding.
      {
        name: 'lock: the statement in a binding',
        code: 'const q = `SET search_path TO ${s}`; client.query(q);',
        errors: error,
      },
      // FN: local builders, all three spellings.
      {
        name: 'lock: concise-arrow builder',
        code: 'const b = (s) => `SET search_path TO ${s}`; client.query(b(t));',
        errors: error,
      },
      {
        name: 'lock: block-bodied arrow builder',
        code: 'const b = (s) => { return `SET search_path TO ${s}`; }; client.query(b(t));',
        errors: error,
      },
      {
        name: 'lock: function-declaration builder',
        code: "function b(s) { return 'SET search_path TO ' + s; } client.query(b(t));",
        errors: error,
      },
      // FN: the second sink spelling.
      {
        name: 'lock: the execute sink',
        code: 'client.execute(`SET search_path TO ${s}`);',
        errors: error,
      },
      // FN: String.raw hands the template through unchanged.
      {
        name: 'lock: String.raw',
        code: 'client.query(String.raw`SET search_path TO ${s}`);',
        errors: error,
      },
      {
        // @typescript-eslint 8.68.0 nulls `cooked` for an invalid escape;
        // 8.54.0 handed back the raw text. `String.raw` is exactly the tag
        // whose raw text IS what the server sees, so the statement must still
        // be read rather than dropped.
        //
        // The escape sits in the SAME quasi as the statement, before the
        // expression, deliberately. With it trailing, the first quasi still
        // cooked to `SET search_path TO ` and the rule matched on cooked text —
        // the fixture passed without ever reaching the raw fallback it exists
        // to lock. Raised by CodeRabbit on PR #783.
        name: 'lock: String.raw with an escape the cooked value cannot hold',
        code: 'client.query(String.raw`SET search_path TO \\x${s}`);',
        errors: error,
      },
      // A call part is raw HERE even though it is the fix for CWE-89: quoting
      // an attacker-chosen schema does not stop the hijack.
      {
        name: 'lock: escapeIdentifier is not the remediation for CWE-426',
        code: 'client.query(`SET search_path TO ${escapeIdentifier(s)}`);',
        errors: error,
      },
      {
        name: 'lock: pg-format with a dynamic identifier',
        code: "client.query(format('SET search_path TO %I', schema));",
        errors: error,
      },
      {
        name: 'lock: pg-format with a spread argument list',
        code: "client.query(format('SET search_path TO %I', ...parts));",
        errors: error,
      },
      // A guard that cannot stop the call is not a guard.
      {
        name: 'lock: the guard runs after the sink',
        code: `
          const OK = new Set(['a']);
          function go(schema) {
            client.query(\`SET search_path TO \${schema}\`);
            if (!OK.has(schema)) { throw new Error('no'); }
          }
        `,
        errors: error,
      },
      {
        name: 'lock: the guard does not leave the function',
        code: `
          const OK = new Set(['a']);
          function go(schema) {
            if (!OK.has(schema)) { console.warn('odd'); }
            client.query(\`SET search_path TO \${schema}\`);
          }
        `,
        errors: error,
      },
      {
        name: 'lock: a reference in an if body is not a guard',
        code: `
          function go(schema, flag) {
            if (flag) { log(schema); }
            client.query(\`SET search_path TO \${schema}\`);
          }
        `,
        errors: error,
      },
      // A binding written twice is not the constant it started as.
      {
        name: 'lock: a value overwritten from the request',
        code: "let s = 'public'; s = req.query.s; client.query(`SET search_path TO ${s}`);",
        errors: error,
      },
      // Nested shapes on both sides of the concatenation.
      {
        name: 'lock: a raw value nested inside a concatenation',
        code: "client.query('SET search_path TO ' + ('' + s));",
        errors: error,
      },
      {
        name: 'lock: a raw value nested inside an interpolation',
        code: 'client.query(`SET search_path TO ${`${s}`}`);',
        errors: error,
      },
    ]),
  });

  /**
   * The module gate. Every fixture above imports a PostgreSQL client, so
   * without this block the `return {}` arm — the one that makes 94 per cent of
   * this plugin's historical findings disappear — is never executed by a test.
   */
  ruleTester.run('abstains without a PostgreSQL client', noUnsafeSearchPath, {
    valid: [{ name: 'lock: no pg import, no analysis', code: 'db.query(`SET search_path TO ${s}`);' }],
    invalid: [],
  });
});
