/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Coverage-gap tests for no-unsafe-query: taint-tracking listener guards
 * (declarators without init / destructuring, non-`+=` and non-identifier
 * assignment targets, safe `+=` right-hand sides).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

/**
 * Every fixture imports a PostgreSQL client, because the rule now abstains in
 * files that use no PostgreSQL at all. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the import
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
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

describe('no-unsafe-query — coverage gaps', () => {
  ruleTester.run('taint-listener guards', noUnsafeQuery, {
    valid: pg([
      {
        name: 'declarator without init is not tracked',
        code: `let q; db.query('SELECT 1');`,
      },
      {
        name: 'destructured declarator id is not tracked',
        code: `const { sql } = cfg; db.query(sql);`,
      },
      {
        name: 'plain string += does not taint',
        code: `let q = 'SELECT 1'; q += ' WHERE active'; db.query(q);`,
      },
      {
        name: 'non-+= assignment operator is ignored',
        code: `let n = 1; n -= step; db.query(n);`,
      },
      {
        name: 'member-expression += target is ignored',
        code: `state.q += 'a' + suffix; db.query(state.q);`,
      },
    ]),
    invalid: pg([
      {
        name: 'template-tainted variable via += reports unsafeTemplateLiteral',
        code: 'let q = "SELECT 1"; q += ` AND id = ${id}`; db.query(q);',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ]),
  });
});
