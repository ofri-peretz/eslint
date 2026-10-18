/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-query — Prisma-flavoured CWE-89.
 *
 * Instantiates the shared detector (`createSqlInjectionRule` in
 * @interlace/eslint-devkit) with Prisma's raw-SQL sinks and its own
 * remediation copy. See docs/rules/no-unsafe-query.md.
 */

import { createSqlInjectionRule } from '@interlace/eslint-devkit';

export const noUnsafeQuery = createSqlInjectionRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection by disallowing string concatenation or interpolated template literals in Prisma raw queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-prisma-security/docs/rules/no-unsafe-query.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  // Only files importing Prisma's $queryRawUnsafe/$executeRawUnsafe.
  // Method names alone are shared across drivers; the import is the evidence.
  modules: ['@prisma/client', 'prisma'],
  methods: [],
  fragmentMethods: [
    '$queryRawUnsafe',
    '$executeRawUnsafe',
    // `Prisma.raw(text)` splices text into a `Prisma.sql` / `$queryRaw`
    // template unescaped. Only on the driver's own `Prisma` namespace.
    { name: 'raw', requireDriverReceiver: true },
  ],
  // `Prisma.join`, `Prisma.empty`, a `Prisma.sql` fragment — rendered by
  // Prisma as bound parameters, never text.
  fragmentFactories: ['join', 'empty', 'sql', 'raw'],
  requireSqlKeywords: false,
  fix: 'Use the `$queryRaw` tagged template (or `Prisma.sql`), which parameterizes interpolated values.',
  documentationLink:
    'https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#queryrawunsafe',
});
