/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression locks for `no-unsafe-copy-from`.
 *
 * The pre-rewrite rule decided with `/\bCOPY\b.*\bFROM\b/i` and skipped every
 * identifier and call argument as "cannot verify statically". Against
 * `benchmarks/rule-corpus/postgresql-security__no-unsafe-copy-from` it scored
 * 4 TP / 4 FP / 6 FN — precision 50.0%, recall 40.0%.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeCopyFrom } from './index';

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

const dynamic = [{ messageId: 'dynamicPath' as const }];
const hardcoded = [{ messageId: 'hardcodedPath' as const }];

describe('no-unsafe-copy-from — regression locks', () => {
  ruleTester.run('structural detection', noUnsafeCopyFrom, {
    valid: pg([
      // Resolution edges — shapes where the file cannot say what the sink
      // receives, so the honest answer is silence.
      {
        name: 'lock: a parameter assigned once is not a declaration',
        code: `function r(q) { q = "COPY t FROM '/x.csv'"; client.query(q); }`,
      },
      {
        name: 'lock: a declaration whose single write supplies no initialiser',
        code: `let q; q = "COPY t FROM '/x.csv'"; client.query(q);`,
      },
      {
        name: 'lock: a callee that is a function parameter',
        code: 'function r(b) { client.query(b()); }',
      },
      {
        name: 'lock: a builder binding written twice',
        code: "let b = (p) => `COPY t FROM '${p}'`; b = other; client.query(b(x));",
      },
      {
        name: 'lock: a concise-arrow builder returning a non-string',
        code: 'const b = () => 1; client.query(b());',
      },
      // FP: COPY … TO writes. The old regex saw the FROM inside the target
      // query and called an export an arbitrary file read.
      {
        name: 'lock: COPY (SELECT … FROM …) TO is an export',
        code: `client.query("COPY (SELECT * FROM orders) TO '/srv/x.csv'");`,
      },
      {
        name: 'lock: nested parentheses in the target query stay balanced',
        code: `client.query("COPY (SELECT * FROM (SELECT id FROM o) t) TO '/srv/x.csv'");`,
      },
      // FP: the two words in that order in an ordinary SELECT.
      {
        name: 'lock: COPY and FROM as ordinary words in a SELECT',
        code: `client.query("SELECT * FROM jobs WHERE kind = 'copy' AND id IN (SELECT id FROM u)");`,
      },
      // FP: a retired COPY left behind as a comment.
      {
        name: 'lock: a COPY inside a line comment is not a statement',
        code: "client.query(`-- COPY t FROM '/x.csv'\\nSELECT 1`);",
      },
      {
        name: 'lock: a COPY inside a block comment is not a statement',
        code: "client.query(`/* COPY t FROM '/x.csv' */ SELECT 1`);",
      },
      // FP: the statement as DATA in an INSERT.
      {
        name: 'lock: a COPY statement quoted inside an INSERT',
        code: `client.query("INSERT INTO audit (a) VALUES ('COPY t FROM /x.csv')");`,
      },
      // STDIN is the remediation, in every spelling.
      { name: 'lock: STDIN', code: `client.query('COPY t FROM STDIN CSV');` },
      {
        name: 'lock: STDIN across newlines, lowercased',
        code: 'client.query(`copy t\\n  from\\n  stdin\\n  with (format csv)`);',
      },
      {
        name: 'lock: STDIN reached through a binding',
        code: "const SQL = 'COPY t FROM STDIN'; client.query(SQL);",
      },
      {
        name: 'lock: a dynamic TABLE with a STDIN source belongs to no-unsafe-query',
        code: 'client.query(`COPY ${table} FROM STDIN CSV`);',
      },
      {
        name: 'lock: a COPY segment after a SELECT segment is still found',
        code: "client.query(`SELECT 1;\\nCOPY t FROM STDIN;`);",
      },
      // Tagged templates other than String.raw are left alone.
      {
        name: 'lock: a non-String.raw tag is not unwrapped',
        code: 'client.query(sql`COPY t FROM ${p}`);',
      },
      // Shapes the sink never reaches.
      { name: 'lock: computed sink property', code: "client['query']('COPY t FROM /x');" },
      { name: 'lock: bare callee', code: "query(\"COPY t FROM '/x.csv'\");" },
      { name: 'lock: unrelated method', code: "audit.push(\"COPY t FROM '/x.csv'\");" },
      { name: 'lock: no arguments', code: 'client.query();' },
      { name: 'lock: spread argument', code: 'client.query(...args);' },
      { name: 'lock: a member-expression argument', code: 'client.query(cfg.sql);' },
      { name: 'lock: an undeclared binding', code: 'client.query(undeclaredSql);' },
      { name: 'lock: a non-COPY statement', code: "client.query('SELECT 1');" },
      { name: 'lock: a COPY with no direction keyword', code: "client.query('COPY t');" },
      { name: 'lock: an unterminated parenthesis group', code: "client.query('COPY (a, b FROM x');" },
      {
        name: 'lock: a call whose callee is a member expression',
        code: 'client.query(builders.copy(p));',
      },
      {
        name: 'lock: a local builder returning a non-string',
        code: 'function b() { const x = 1; return x; } client.query(b());',
      },
      {
        name: 'lock: a local builder with a multi-statement body',
        code: "function b(p) { const q = 'COPY t FROM ' + p; return q; } client.query(b(x));",
      },
      {
        name: 'lock: a local builder that returns nothing',
        code: 'function b() { return; } client.query(b());',
      },
      {
        name: 'lock: a binding that is not a function, called',
        code: "const b = 'x'; client.query(b(p));",
      },
      {
        name: 'lock: a statement binding written twice',
        code: "let q = 'SELECT 1'; q = 'SELECT 2'; client.query(q);",
      },
      { name: 'lock: a declaration with no initialiser', code: 'let q; client.query(q);' },
      { name: 'lock: a function parameter as the statement', code: 'function r(q) { client.query(q); }' },
      {
        name: 'lock: resolution is bounded — a six-hop chain abstains',
        code: [
          "const a = `COPY t FROM '${p}'`;",
          'const b = a; const c = b; const d = c; const e = d; const f = e;',
          'client.query(f);',
        ].join('\n'),
      },
      // Options.
      {
        name: 'lock: allowHardcodedPaths silences the constant path',
        code: `client.query("COPY t FROM '/etc/passwd'");`,
        options: [{ allowHardcodedPaths: true }],
      },
      {
        name: 'lock: an allowlisted path',
        code: `client.query("COPY t FROM '/data/ok.csv'");`,
        options: [{ allowedPaths: ['^/data/'] }],
      },
      {
        name: 'lock: an allowlisted path across a multi-line statement',
        code: 'client.query(`COPY t\\n  FROM \'/data/ok.csv\'`);',
        options: [{ allowedPaths: ['^/data/'] }],
      },
    ]),
    invalid: pg([
      // FN: `.` never crossed a newline, so every multi-line COPY was invisible.
      {
        name: 'lock: a multi-line COPY with a constant path',
        code: "client.query(`\\n  COPY t (a, b)\\n  FROM '/srv/seed.csv'\\n  WITH (FORMAT csv)\\n`);",
        errors: hardcoded,
      },
      {
        name: 'lock: a multi-line COPY with a dynamic path',
        code: "client.query(`\\n  copy t\\n    from '${p}'\\n`);",
        errors: dynamic,
      },
      // FN: the statement reached the sink through a binding or a builder.
      {
        name: 'lock: the statement in a binding',
        code: "const q = `COPY t FROM '${p}'`; client.query(q);",
        errors: dynamic,
      },
      {
        name: 'lock: concise-arrow builder',
        code: "const b = (p) => `COPY t FROM '${p}'`; client.query(b(x));",
        errors: dynamic,
      },
      {
        name: 'lock: function-declaration builder',
        code: `function b(p) { return "COPY t FROM '" + p + "'"; } client.query(b(x));`,
        errors: dynamic,
      },
      {
        name: 'lock: a builder returning a constant statement',
        code: `const b = () => "COPY t FROM '/srv/seed.csv'"; client.query(b());`,
        errors: hardcoded,
      },
      // FN: the second sink spelling, pinned as VALID by the rule's own suite.
      {
        name: 'lock: the execute sink',
        code: `client.execute("COPY t FROM '/etc/passwd'");`,
        errors: hardcoded,
      },
      // FN: String.raw.
      {
        name: 'lock: String.raw',
        code: "client.query(String.raw`COPY t FROM '${p}'`);",
        errors: dynamic,
      },
      {
        // @typescript-eslint 8.68.0 nulls `cooked` for an invalid escape;
        // 8.54.0 handed back the raw text. Dropping the quasi would lose the
        // COPY and with it the finding.
        name: 'lock: String.raw with an escape the cooked value cannot hold',
        code: "client.query(String.raw`COPY t FROM '${p}' \\x`);",
        errors: dynamic,
      },
      // The COPY is not the first statement in the string.
      {
        name: 'lock: a COPY inside an explicit transaction',
        code: "client.query(`BEGIN;\\nCOPY t FROM '${p}';\\nCOMMIT;`);",
        errors: dynamic,
      },
      // A column list in parens sits between the verb and the direction.
      {
        name: 'lock: a column list before FROM PROGRAM',
        code: "client.query(`COPY t (a, b) FROM PROGRAM 'curl ${u}'`);",
        errors: dynamic,
      },
      {
        name: 'lock: FROM PROGRAM with a constant command',
        code: `client.query("COPY t FROM PROGRAM 'gzip -dc backup.gz'");`,
        errors: hardcoded,
      },
      // A folded constant is a hardcoded path, not an injection — the two
      // findings have different severities and different fixes.
      {
        name: 'lock: a path folded from a constant is hardcoded, not dynamic',
        code: "const P = '/srv/seed.csv'; client.query(`COPY t FROM '${P}'`);",
        errors: hardcoded,
      },
      // A call cannot launder a path: joining does not constrain it.
      {
        name: 'lock: path.join does not make a path constant',
        code: 'client.query(`COPY t FROM \'${path.join(DIR, name)}\'`);',
        errors: dynamic,
      },
      {
        name: 'lock: a value overwritten from the request',
        code: "let p = '/srv/a.csv'; p = req.body.p; client.query(`COPY t FROM '${p}'`);",
        errors: dynamic,
      },
      {
        name: 'lock: concatenation of literals with a constant path',
        code: `client.query('COPY t ' + "FROM '/etc/passwd'");`,
        errors: hardcoded,
      },
      {
        name: 'lock: a constant path outside the allowlist',
        code: `client.query("COPY t FROM '/etc/passwd'");`,
        options: [{ allowedPaths: ['^/data/'] }],
        errors: hardcoded,
      },
      {
        name: 'lock: a dynamic path is reported even with allowHardcodedPaths',
        code: "client.query(`COPY t FROM '${p}'`);",
        options: [{ allowHardcodedPaths: true }],
        errors: dynamic,
      },
    ]),
  });

  /**
   * The module gate. Every fixture above imports a PostgreSQL client, so
   * without this block the `return {}` arm — the one that makes 94 per cent of
   * this plugin's historical findings disappear — is never executed by a test.
   */
  ruleTester.run('abstains without a PostgreSQL client', noUnsafeCopyFrom, {
    valid: [{ name: 'lock: no pg import, no analysis', code: `db.query("COPY t FROM '/etc/passwd'");` }],
    invalid: [],
  });
});
