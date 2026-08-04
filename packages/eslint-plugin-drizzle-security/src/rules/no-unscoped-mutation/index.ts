/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unscoped-mutation — Drizzle-flavoured CWE-284.
 *
 * Instantiates the shared detector (`createUnscopedMutationRule` in
 * @interlace/eslint-devkit) with Drizzle's bulk-mutation sinks.
 *
 * Drizzle's argument is the table (`db.delete(users)`), never a filter — the
 * scope always arrives as a chained `.where()`, so `argumentRole: 'table'`.
 * See docs/rules/no-unscoped-mutation.md.
 */

import { createUnscopedMutationRule } from '@interlace/eslint-devkit';

export const noUnscopedMutation = createUnscopedMutationRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a chained `.where()` on Drizzle delete and update builders, so a bulk mutation cannot rewrite or delete every row in the table.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-drizzle-security/docs/rules/no-unscoped-mutation.md',
      cwe: 'CWE-284',
      cvss: 7.5,
      confidence: 'high',
    },
  },
  methods: ['delete', 'update'],
  argumentRole: 'table',
  fix: 'Chain a `.where()` clause, e.g. `db.delete(users).where(eq(users.id, id))`.',
  documentationLink: 'https://orm.drizzle.team/docs/delete',
});
