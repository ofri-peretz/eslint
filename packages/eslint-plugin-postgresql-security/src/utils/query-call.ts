/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, objectKeyName } from '@interlace/eslint-devkit';

/** Keys only a node-postgres `QueryConfig` carries. */
const QUERY_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'text',
  'values',
  'name',
]);

/**
 * Is this `.query(...)` argument an object literal that is NOT a node-postgres
 * `QueryConfig` — none of `text`, `values`, `name`?
 *
 * A pg config carries at least one of them (`{ text, values, name, rowMode }`).
 * `request(app).get('/users').query({ page: 2 })` — supertest / superagent's
 * query-STRING builder, common in integration tests that also import `pg` to
 * seed the database — carries none, and was reported as a floating database
 * query and as an N+1 loop.
 */
export function isNonPgQueryObject(
  argument: TSESTree.Node | undefined,
): boolean {
  return (
    argument?.type === AST_NODE_TYPES.ObjectExpression &&
    !argument.properties.some(
      (property) =>
        property.type !== AST_NODE_TYPES.Property ||
        QUERY_CONFIG_KEYS.has(objectKeyName(property) ?? ''),
    )
  );
}
