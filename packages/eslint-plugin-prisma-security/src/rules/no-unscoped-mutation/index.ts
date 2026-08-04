/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unscoped-mutation — Prisma-flavoured CWE-284.
 *
 * Instantiates the shared detector (`createUnscopedMutationRule` in
 * @interlace/eslint-devkit) with Prisma's bulk-mutation sinks.
 *
 * Prisma has no instance-mutation methods — `deleteMany()` is always the
 * bulk form — so a bare call with no arguments is reported directly.
 * See docs/rules/no-unscoped-mutation.md.
 */

import { createUnscopedMutationRule } from '@interlace/eslint-devkit';

export const noUnscopedMutation = createUnscopedMutationRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a `where` filter on Prisma bulk mutations, so deleteMany and updateMany cannot rewrite or delete every row in the table.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-prisma-security/docs/rules/no-unscoped-mutation.md',
      cwe: 'CWE-284',
      cvss: 7.5,
      confidence: 'high',
    },
  },
  methods: ['deleteMany', 'updateMany'],
  modules: ['@prisma/client', '.prisma/client'],
  receiverPattern: /^(prisma|db|database|client|tx|trx)$|[Pp]risma$|[Cc]lient$/,
  fix: 'Pass a `where` filter, e.g. `prisma.user.deleteMany({ where: { id } })`.',
  documentationLink:
    'https://www.prisma.io/docs/orm/prisma-client/queries/crud#delete-all-records',
});
