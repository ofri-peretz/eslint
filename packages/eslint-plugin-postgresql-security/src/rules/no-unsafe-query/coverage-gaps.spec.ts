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
    valid: [
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
    ],
    invalid: [
      {
        name: 'template-tainted variable via += reports unsafeTemplateLiteral',
        code: 'let q = "SELECT 1"; q += ` AND id = ${id}`; db.query(q);',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
