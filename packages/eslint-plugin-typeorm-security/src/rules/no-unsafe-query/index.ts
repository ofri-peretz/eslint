/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — TypeORM-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with TypeORM's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in TypeORM raw queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-typeorm-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // Only files importing TypeORM's DataSource/EntityManager/Repository.query().
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['typeorm', '@nestjs/typeorm'],
  methods: ['query'],
  // Query-builder clauses take a raw SQL fragment; values belong in the
  // `:name` parameters object. Join conditions are the third argument.
  fragmentMethods: [
    'where',
    'andWhere',
    'orWhere',
    'having',
    'andHaving',
    'orHaving',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'select',
    'addSelect',
    { name: 'leftJoin', arg: 2 },
    { name: 'leftJoinAndSelect', arg: 2 },
    { name: 'innerJoin', arg: 2 },
    { name: 'innerJoinAndSelect', arg: 2 },
    { name: 'leftJoinAndMapOne', arg: 3 },
    { name: 'leftJoinAndMapMany', arg: 3 },
    { name: 'innerJoinAndMapOne', arg: 3 },
    { name: 'innerJoinAndMapMany', arg: 3 },
  ],
  // `Raw((alias) => \`${alias} > :v\`, { v })` — the alias is TypeORM's.
  aliasCallbacks: ['Raw'],
  // `dataSource.driver.escape(name)` quotes an identifier.
  escapers: ['escape'],
  // `query` is also a GraphQL / HTTP client method. The statement gate applies
  // only when the receiver cannot be traced to TypeORM.
  requireSqlKeywords: true,
  fix: 'Pass values as the second-argument parameters array, or use query-builder parameters (`:name`), instead of interpolating them.',
  documentationLink:
    'https://typeorm.io/#/select-query-builder/using-parameters-to-escape-data',
});
