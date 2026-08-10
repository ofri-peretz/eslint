/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — Sequelize-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with Sequelize's two raw-SQL escapes and
 * Sequelize's remediation copy (`replacements` / `bind`).
 *
 * This is the rule that reports OWASP Juice Shop's `routes/search.ts` and
 * `routes/login.ts` — the injections that no recommended preset caught,
 * because the only implementation shipped inside the Postgres plugin.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in raw Sequelize queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-sequelize-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // `sequelize.query()` runs raw SQL; `Sequelize.literal()` splices raw SQL
  // into a builder query (the usual ORDER BY / column-name injection).
  // Only files importing Sequelize's own query API.
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['sequelize', 'sequelize-typescript', '@nestjs/sequelize'],
  methods: ['query', 'literal'],
  // Both names are unambiguous inside a Sequelize codebase, and this plugin
  // is only installed by Sequelize users — so no keyword gate, which would
  // otherwise miss `literal(`${sortColumn}`)` (no SQL keyword of its own).
  requireSqlKeywords: false,
  fix: 'Pass values via `replacements` or `bind` instead of interpolating them into the SQL string.',
  documentationLink: 'https://sequelize.org/docs/v7/querying/raw-queries/',
});
