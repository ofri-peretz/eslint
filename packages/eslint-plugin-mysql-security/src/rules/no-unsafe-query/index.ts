/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — MySQL-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with MySQL's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in mysql/mysql2 queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mysql-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // Only files importing mysql/mysql2 Connection and Pool.
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['mysql', 'mysql2'],
  methods: ['query', 'execute'],
  // mysql2's options form: `query({ sql, values, timeout })`.
  sqlTextProperties: ['sql'],
  // The driver's own escaping API — `mysql.escape(v)`, `pool.escapeId(col)`,
  // `mysql.format('… ?? …', [col])`. Its output is quoted text.
  escapers: ['escape', 'escapeId', 'format'],
  // `sqlstring` is the escaper both drivers are built on.
  escaperModules: ['sqlstring'],
  // MySQL's default sql_mode reads `"…"` as a string literal.
  doubleQuotedStrings: true,
  requireSqlKeywords: true,
  fix: 'Pass values as a second-argument array with `?` placeholders instead of interpolating them into the SQL string.',
  documentationLink:
    'https://sidorares.github.io/node-mysql2/docs#using-prepared-statements',
});
