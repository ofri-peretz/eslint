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
    valid: [],
    invalid: [
      {
        name: 'client.query referenced without a call still counts as single-query usage',
        code: `
          async function f() {
            const client = await pool.connect();
            const fn = client.query;
            client.release();
          }
        `,
        errors: [{ messageId: 'preferPoolQuery' }],
      },
    ],
  });
});

describe('prefer-pool-query — coverage gaps (Layer 2, synthetic AST)', () => {
  it('returns silently when the declarator resolves to no variable', () => {
    const { listeners, reports } = createWithMockContext(preferPoolQuery);
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
