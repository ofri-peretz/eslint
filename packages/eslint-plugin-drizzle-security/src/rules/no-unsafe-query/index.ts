/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — Drizzle-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with Drizzle's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in Drizzle sql.raw() calls.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-drizzle-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // Only files importing Drizzle's sql.raw().
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['drizzle-orm'],
  // `db.execute('…')` / `db.run('…')` accept a plain string as well as a
  // `sql` template, and a string is never parameterised.
  methods: ['execute', 'run', 'all', 'get', 'values'],
  fragmentMethods: [{ name: 'raw', requireDriverReceiver: true }],
  // `db.insert(t).values(row)` — the builder's `values` takes a row.
  statementFactories: ['insert', 'update', 'select', 'delete'],
  // Drizzle's own fragment builders render identifiers and parameters.
  fragmentFactories: ['identifier', 'join', 'placeholder', 'raw', 'empty'],
  // `execute` / `run` / `get` are generic names. The statement gate applies
  // only when the receiver cannot be traced to a `drizzle()` instance.
  requireSqlKeywords: true,
  fix: 'Use the `sql` tagged template, which parameterizes interpolated values, instead of `sql.raw()`.',
  documentationLink: 'https://orm.drizzle.team/docs/sql#sqlraw',
});
