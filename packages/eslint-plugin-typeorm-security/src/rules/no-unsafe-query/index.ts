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
  methods: ['query'],
  requireSqlKeywords: false,
  fix: 'Pass values as the second-argument parameters array, or use query-builder parameters (`:name`), instead of interpolating them.',
  documentationLink: 'https://typeorm.io/#/select-query-builder/using-parameters-to-escape-data',
});
