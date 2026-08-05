/**
 * Tests for drizzle-security/no-raw-identifier-interpolation
 * CWE-89 — identifiers spliced into a template that only parameterizes values.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Drizzle
 * *contract*: the `sql` tag is gated on the drizzle-orm import, value holes
 * stay silent, and `sql.identifier()` — the fix the message recommends — is
 * never itself a finding.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noRawIdentifierInterpolation } from './index';

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

/** Opens the rule's import gate; see `modules` on the factory config. */
const DRIVER = "import { sql } from 'drizzle-orm';\n";

describe('no-raw-identifier-interpolation', () => {
  describe('Valid — value positions, which the template does parameterize', () => {
    ruleTester.run('valid', noRawIdentifierInterpolation, {
      valid: [
        {
          name: 'a WHERE value is exactly what the tag is for',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);',
        },
        {
          name: 'LIMIT and OFFSET take bind parameters',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users LIMIT ${n} OFFSET ${o}`);',
        },
        {
          name: 'INSERT values',
          code: DRIVER + 'await db.execute(sql`INSERT INTO users (name) VALUES (${name})`);',
        },
        {
          name: 'UPDATE ... SET value',
          code: DRIVER + 'await db.execute(sql`UPDATE users SET name = ${name} WHERE id = ${id}`);',
        },
        {
          name: 'a literal identifier is developer-written, not input',
          code: DRIVER + "await db.execute(sql`SELECT * FROM ${'users'}`);",
        },
        {
          name: 'sql.identifier() is the remediation, never a finding',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${sql.identifier(table)}`);',
        },
        {
          name: 'a nested sql fragment is the composition primitive',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${sql`users`}`);',
        },
        {
          name: 'sql.join composes chunks, it does not splice text',
          code: DRIVER + 'await db.execute(sql`SELECT ${sql.join(cols, sql`, `)} FROM users`);',
        },
        {
          name: 'sql.placeholder is a bind placeholder',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM users ORDER BY name ${sql.placeholder("dir")}`);',
        },
        {
          name: 'no interpolation at all',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users`);',
        },
        {
          name: 'an ORDER BY hole that a later clause has left',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM t ORDER BY created_at LIMIT ${n}`);',
        },
        {
          // The gate is the whole reason this rule can live in a driver plugin.
          name: 'a project-local sql helper in a file that never imports drizzle',
          code: 'await db.execute(sql`SELECT * FROM ${table}`);',
        },
        {
          name: 'a different tag entirely',
          code: DRIVER + 'const s = gql`query { user(id: ${id}) }`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — identifier positions, where no bind parameter can reach', () => {
    ruleTester.run('invalid', noRawIdentifierInterpolation, {
      valid: [],
      invalid: [
        {
          // GHSA-gpj5-g38j-94v9, reduced.
          name: 'table name after FROM',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${table}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'column name after ORDER BY',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users ORDER BY ${column}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'sort direction inside the ORDER BY clause',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM users ORDER BY name ${dir}`);',
          errors: [{ messageId: 'sortDirectionInterpolation' }],
        },
        {
          name: 'quoted table name — looks escaped, is not',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM "${table}"`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'JOIN target',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM a JOIN ${other} ON a.id = b.id`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'INSERT INTO target',
          code: DRIVER + 'await db.execute(sql`INSERT INTO ${table} (a) VALUES (${v})`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'UPDATE target',
          code: DRIVER + 'await db.execute(sql`UPDATE ${table} SET a = ${v}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'select list',
          code: DRIVER + 'await db.execute(sql`SELECT ${columns} FROM users`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'GROUP BY column',
          code: DRIVER + 'await db.execute(sql`SELECT count(*) FROM t GROUP BY ${column}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // The value hole is fine; only the identifier one is reported. A rule
          // that reported both would be indistinguishable from no-unsafe-query.
          name: 'a safe value hole and an unsafe identifier hole in one query',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM ${table} WHERE id = ${id}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // Regression: clause detection has to survive an earlier hole, which
          // means joining every preceding quasi rather than reading just one.
          name: 'ORDER BY after an earlier value interpolation',
          code:
            DRIVER +
            'await db.execute(sql`SELECT * FROM t WHERE a = ${a} ORDER BY ${col}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'require() form opens the same gate',
          code:
            "const { sql } = require('drizzle-orm');\nawait db.execute(sql`SELECT * FROM ${table}`);",
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          // sql.raw is the one member of the sql.* family that splices, so it
          // is deliberately not in identifierHelpers.
          name: 'sql.raw is not a composition helper',
          code: DRIVER + 'await db.execute(sql`SELECT * FROM ${sql.raw(table)}`);',
          errors: [{ messageId: 'identifierInterpolation' }],
        },
        {
          name: 'two identifier holes report twice',
          code: DRIVER + 'await db.execute(sql`SELECT ${cols} FROM ${table}`);',
          errors: [
            { messageId: 'identifierInterpolation' },
            { messageId: 'identifierInterpolation' },
          ],
        },
      ],
    });
  });
});
