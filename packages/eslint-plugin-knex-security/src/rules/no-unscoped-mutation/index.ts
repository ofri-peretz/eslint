/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unscoped-mutation — Knex-flavoured CWE-284.
 *
 * Instantiates the shared detector (`createUnscopedMutationRule` in
 * @interlace/eslint-devkit) with Knex's bulk-mutation sinks.
 *
 * Knex's `update()` argument is the values object, not a filter, and `del()`
 * takes none — scope always arrives as a chained `.where*()`, so
 * `argumentRole: 'table'`. The whole `where` family is listed because Knex
 * spells the same clause several ways and any one of them scopes the query.
 * See docs/rules/no-unscoped-mutation.md.
 */

import { createUnscopedMutationRule } from '@interlace/eslint-devkit';

export const noUnscopedMutation = createUnscopedMutationRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a chained `.where()` on Knex delete and update builders, so a bulk mutation cannot rewrite or delete every row in the table.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-knex-security/docs/rules/no-unscoped-mutation.md',
      cwe: 'CWE-284',
      cvss: 7.5,
      confidence: 'high',
    },
  },
  methods: ['del', 'delete', 'update'],
  argumentRole: 'table',
  modules: ['knex'],
  receiverPattern: /^(knex|db|database|qb|builder|tx|trx)$|[Kk]nex$|[Dd]b$/,
  scopeMethods: [
    // Knex spells the same clause many ways, and any one of them scopes the
    // query. A missing variant is a false positive on correct code, so the
    // list mirrors the builder's `where` family in full.
    'where',
    'whereIn',
    'whereNot',
    'whereNotIn',
    'whereRaw',
    'whereNull',
    'whereNotNull',
    'whereBetween',
    'whereNotBetween',
    'whereExists',
    'whereNotExists',
    'whereLike',
    'whereILike',
    'whereWrapped',
    'whereJsonObject',
    'whereJsonPath',
    'whereJsonSupersetOf',
    'whereJsonSubsetOf',
    'andWhere',
    'andWhereNot',
    'andWhereRaw',
    'andWhereBetween',
    'orWhere',
    'orWhereIn',
    'orWhereNot',
    'orWhereNotIn',
    'orWhereRaw',
    'orWhereNull',
    'orWhereNotNull',
    'orWhereBetween',
    'orWhereNotBetween',
    'orWhereExists',
    'orWhereNotExists',
    'orWhereLike',
    'orWhereILike',
  ],
  fix: "Chain a `.where()` clause, e.g. `knex('users').where({ id }).del()`.",
  documentationLink: 'https://knexjs.org/guide/query-builder.html#del-delete',
});
