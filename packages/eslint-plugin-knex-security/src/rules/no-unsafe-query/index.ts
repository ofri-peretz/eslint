/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — Knex-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with Knex's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in knex.raw() calls.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-knex-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  methods: ['raw'],
  requireSqlKeywords: false,
  fix: 'Pass values as knex bindings (`?` placeholders with a bindings array) instead of interpolating them.',
  documentationLink: 'https://knexjs.org/guide/raw.html#raw-parameter-binding',
});
