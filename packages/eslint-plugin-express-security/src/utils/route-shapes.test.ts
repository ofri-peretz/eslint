/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/** Tests for the `app.route(path).verb(…)` chain and middleware-array helpers. */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { flattenMiddleware, routeChainRoot } from './route-shapes';

const call = (code: string): TSESTree.CallExpression => {
  const ast = parse(code, { range: true }) as TSESTree.Program;
  const stmt = ast.body[0] as TSESTree.ExpressionStatement;
  return stmt.expression as TSESTree.CallExpression;
};

describe('routeChainRoot', () => {
  it.each([
    "app.route('/x').post(h);",
    "app.route('/x').get(a).post(h);",
    "app['route']('/x').post(h);",
  ])('%s is a route chain', (code) => {
    expect(routeChainRoot(call(code).callee)).not.toBeNull();
  });

  it.each([
    'post(h);',
    "app.post('/x', h);",
    "app.route('/x')[verb](a).post(h);",
    'make().post(h);',
    "app.router('/x').post(h);",
  ])('%s is not a route chain', (code) => {
    expect(routeChainRoot(call(code).callee)).toBeNull();
  });
});

describe('flattenMiddleware', () => {
  it('spreads arrays and drops holes', () => {
    const args = flattenMiddleware(call('use(a, [b, , c]);').arguments);
    expect(args.map((a) => (a as TSESTree.Identifier).name)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
