/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-2 coverage-gap test for no-missing-client-release.
 *
 * The `!variable` early return is unreachable through the real parser: a
 * VariableDeclarator with an Identifier id always declares exactly one
 * variable. `createWithMockContext` stubs `getDeclaredVariables` to return
 * an empty list, so the guard is exercised directly.
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noMissingClientRelease } from './index';

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


describe('no-missing-client-release — coverage gaps (Layer 2, synthetic AST)', () => {
  it('returns silently when the declarator resolves to no variable', () => {
    const { listeners, reports } = createWithMockContext(
      noMissingClientRelease,
      { ast: PG_AST },
    );
    const declarator = {
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'client' },
    };
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'pool' },
        property: { type: 'Identifier', name: 'connect' },
      },
      arguments: [],
      parent: declarator,
    };
    const visit = listeners['CallExpression'] as (n: unknown) => void;
    visit(node);
    expect(reports).toHaveLength(0);
  });
});
