/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — SQLite-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with SQLite's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in SQLite statements.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-sqlite-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // Only files importing better-sqlite3 / node:sqlite statements.
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['sqlite3', 'better-sqlite3', 'node:sqlite', 'bun:sqlite'],
  methods: ['prepare', 'exec', 'run', 'all', 'get'],
  requireSqlKeywords: true,
  fix: 'Use bound parameters (`?` or `:name`) and pass values to `.run()` / `.get()` / `.all()` instead of interpolating them.',
  documentationLink: 'https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters',
});
