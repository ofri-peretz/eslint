/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage-gap tests for prefer-pool-query.
 *
 * Layer 1: a `client.query` member access that is never invoked (the
 * `.parent.parent` CallExpression check's false side).
 * Layer 2: `getDeclaredVariables` returning no variable for the declarator —
 * unreachable through the real parser because an Identifier-id declarator
 * always declares exactly one variable.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { preferPoolQuery } from './index';

/**
 * The synthetic Program the module gate reads. These tests drive listeners
 * directly, so the file they stand for has to carry the same PostgreSQL
 * evidence a real one would — otherwise the rule registers no listeners and
 * the gap under test is never reached.
 */
const PG_AST = {
  type: 'Program',
  body: [
    {
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 'pg' },
      specifiers: [],
    },
  ],
  tokens: [],
  comments: [],
} as never;


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

describe('prefer-pool-query — coverage gaps (Layer 1)', () => {
  ruleTester.run('uninvoked query member access', preferPoolQuery, {
    valid: pg([
      {
        // REGRESSION LOCK. This case used to assert a REPORT, on the reasoning
        // that `client.query` taken as a value "still counts as single-query
        // usage". It does not: the method is extracted and handed somewhere
        // else, so how many times it runs — and against what — is not knowable
        // from this file. The handle has escaped, which is the same reason
        // `doSomething(client)` abstains.
        name: 'client.query taken as a value is an escape, not a single-shot query',
        code: `
          async function f() {
            const client = await pool.connect();
            const fn = client.query;
            client.release();
          }
        `,
      },
    ]),
    invalid: [],
  });
});

describe('prefer-pool-query — coverage gaps (Layer 2, synthetic AST)', () => {
  it('returns silently when the declarator resolves to no variable', () => {
    const { listeners, reports } = createWithMockContext(preferPoolQuery, { ast: PG_AST });
    const node = {
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'client' },
      init: {
        type: 'AwaitExpression',
        argument: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'pool' },
            property: { type: 'Identifier', name: 'connect' },
          },
          arguments: [],
        },
      },
    };
    const visit = listeners['VariableDeclarator'] as (n: unknown) => void;
    visit(node);
    expect(reports).toHaveLength(0);
  });
});
