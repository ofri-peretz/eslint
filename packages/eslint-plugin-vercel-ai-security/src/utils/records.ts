/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Whole database records, recognised by where they come from.
 *
 * A call is a full-row read when its call chain is rooted at a client from a
 * database package — resolved through the import, `new PrismaClient()`,
 * `new Pool()`, `drizzle(...)`, `knex(...)` — and nothing in the chain
 * narrows the columns: no Prisma `select` / `omit`, no `select(...)` with a
 * column list, no SQL text other than `SELECT *`.
 */

import {
  AST_NODE_TYPES,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { calleeName, optionValue } from './sdk';
import { lookupVariable } from './flow';

const DATABASE_MODULES = new Set([
  '@prisma/client',
  'pg',
  'postgres',
  'mysql2',
  'mysql2/promise',
  'knex',
  'kysely',
  '@vercel/postgres',
  'better-sqlite3',
]);

function isDatabaseModule(module: string): boolean {
  return DATABASE_MODULES.has(module) || module.startsWith('drizzle-orm');
}

/** A database client: imported from a database package, or constructed by one. */
function isDatabaseHandle(
  root: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (root.type !== AST_NODE_TYPES.Identifier) return false;
  const scope = sourceCode.getScope(root);
  const imported = resolveModuleBinding(root, scope);
  if (imported) return isDatabaseModule(imported.module);
  const def = lookupVariable(root.name, scope)?.defs[0];
  if (def?.type !== 'Variable' || def.node.init === null) return false;
  let init: TSESTree.Node = def.node.init;
  if (init.type === AST_NODE_TYPES.AwaitExpression) init = init.argument;
  if (
    init.type !== AST_NODE_TYPES.NewExpression &&
    init.type !== AST_NODE_TYPES.CallExpression
  ) {
    return false;
  }
  const factory = resolveModuleBinding(init.callee, sourceCode.getScope(init));
  return factory !== undefined && isDatabaseModule(factory.module);
}

/** Does this call in the chain name its columns? */
function isProjection(call: TSESTree.CallExpression): boolean {
  const [first] = call.arguments;
  if (
    first?.type === AST_NODE_TYPES.ObjectExpression &&
    (optionValue(first, 'select') !== undefined ||
      optionValue(first, 'omit') !== undefined)
  ) {
    return true;
  }
  if (calleeName(call.callee) === 'select' && first !== undefined) {
    return call.arguments.some((arg) => staticString(arg) !== '*');
  }
  // SQL text names its columns unless it is `SELECT *`; a table name
  // (`knex('users')`) is not SQL.
  const sql = first === undefined ? null : staticString(first);
  return (
    sql !== null && /^\s*select\b/i.test(sql) && !/^\s*select\s+\*/i.test(sql)
  );
}

/** A call that reads whole rows from a database client. */
export function isDatabaseRowRead(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const calls: TSESTree.CallExpression[] = [];
  let current: TSESTree.Node = node;
  for (;;) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      calls.push(current);
      current = current.callee;
    } else if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
    } else {
      break;
    }
  }
  return isDatabaseHandle(current, sourceCode) && !calls.some(isProjection);
}
