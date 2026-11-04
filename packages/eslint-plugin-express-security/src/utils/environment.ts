/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Reading which environment a branch runs in, for options that exempt
 * development-only code (`allowInDevelopment`, `allowInDev`).
 *
 * A condition that merely mentions `NODE_ENV` is not a development guard:
 * `if (NODE_ENV === 'production')` runs in production. The direction of the
 * test decides it.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { propertyName, staticString } from '@interlace/eslint-devkit';

function isNodeEnv(node: TSESTree.Node): boolean {
  return (
    (node.type === 'MemberExpression' && propertyName(node) === 'NODE_ENV') ||
    (node.type === 'Identifier' && node.name === 'NODE_ENV')
  );
}

/**
 * Which environment an expression is true in: `'dev'` when only outside
 * production (`NODE_ENV === 'development'`, `!== 'production'`, `isDev`,
 * `!isProd`), `'prod'` when in production (`=== 'production'`,
 * `!== 'development'`, `isProd`), `null` when it cannot be read.
 */
export function environmentOf(node: TSESTree.Node): 'dev' | 'prod' | null {
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    const inner = environmentOf(node.argument);
    return inner === null ? null : inner === 'dev' ? 'prod' : 'dev';
  }
  if (node.type === 'Identifier') {
    if (/^is(Prod|Production)$/.test(node.name)) return 'prod';
    if (/^is(Dev|Development)$/.test(node.name)) return 'dev';
    return null;
  }
  if (node.type !== 'BinaryExpression') return null;
  const equal = node.operator === '===' || node.operator === '==';
  if (!equal && node.operator !== '!==' && node.operator !== '!=') return null;
  const [env, other] = isNodeEnv(node.left)
    ? [node.left, node.right]
    : [node.right, node.left];
  if (!isNodeEnv(env)) return null;
  const value = staticString(other);
  if (value === 'production') return equal ? 'prod' : 'dev';
  if (value === 'development') return equal ? 'dev' : 'prod';
  return null;
}

/**
 * Is `node` only reached in development — inside a branch whose condition
 * selects development, or the `else` of one that selects production?
 */
export function inDevelopmentBranch(node: TSESTree.Node): boolean {
  let child: TSESTree.Node = node;
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (p.type === 'IfStatement' || p.type === 'ConditionalExpression') {
      const env = environmentOf(p.test);
      if (child === p.consequent && env === 'dev') return true;
      if (child === p.alternate && env === 'prod') return true;
    }
    if (
      p.type === 'LogicalExpression' &&
      p.operator === '&&' &&
      child === p.right &&
      environmentOf(p.left) === 'dev'
    ) {
      return true;
    }
  }
  return false;
}
