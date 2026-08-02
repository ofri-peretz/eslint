/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — pg-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with the pg sink (`client.query()` /
 * `pool.query()`) and the pg remediation copy (`$1, $2` placeholders,
 * node-postgres docs). Behaviour, rule id and message ids are unchanged from
 * the hand-rolled implementation this replaced.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  methods: ['query'],
  // Historical behaviour: any interpolation into `.query()` is a finding,
  // whether or not the static text looks like SQL. The sink is unambiguous
  // in a pg codebase, so the keyword gate would only add false negatives.
  requireSqlKeywords: false,
  description:
    'Prevent SQL injection by disallowing string concatenation or unsafe template literals in queries.',
  url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-query.md',
  fix: 'Use parameterized queries ($1, $2) instead of string concatenation.',
  documentationLink: 'https://node-postgres.com/features/queries#parameterized-queries',
});
