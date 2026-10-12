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
  // `sqlite` is the promise wrapper over sqlite3; `@libsql/client` is the
  // SQLite fork Turso ships, whose `execute()` takes the statement or
  // `{ sql, args }`.
  modules: [
    'sqlite3',
    'better-sqlite3',
    'node:sqlite',
    'bun:sqlite',
    'sqlite',
    '@libsql/client',
  ],
  // sqlite3 adds `each`; bun:sqlite adds `query`; libsql adds `execute`.
  methods: ['prepare', 'exec', 'run', 'all', 'get', 'each', 'query', 'execute'],
  // better-sqlite3's `db.pragma('table_info(…)')` takes PRAGMA text without
  // the verb, so it is a fragment: never keyword-gated.
  fragmentMethods: ['pragma'],
  sqlTextProperties: ['sql'],
  // `db.prepare(sql)` / bun's `db.query(sql)` return a Statement whose
  // `.get(id)` / `.run(id)` / `.all(id)` take bound values, not SQL.
  statementFactories: ['prepare', 'query'],
  requireSqlKeywords: true,
  fix: 'Use bound parameters (`?` or `:name`) and pass values to `.run()` / `.get()` / `.all()` instead of interpolating them.',
  documentationLink:
    'https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters',
});
