/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-mass-assignment — Prisma CWE-915.
 *
 * Instantiates the shared detector (`createMassAssignmentRule` in
 * @interlace/eslint-devkit).
 *
 * Prisma carries the row under `data`, and `upsert` carries two payloads
 * (`create` and `update`), so all three keys are payload positions.
 *
 * See docs/rules/no-mass-assignment.md.
 */

import { createMassAssignmentRule } from '@interlace/eslint-devkit';

export const noMassAssignment = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing an inbound request object straight to the database through Prisma, which lets the caller set every column the model exposes.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-prisma-security/docs/rules/no-mass-assignment.md',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['create', 'update', 'upsert', 'createMany', 'updateMany'],
  payloadKeys: ['data', 'create', 'update'],
  modules: ['@prisma/client'],
  fix: 'Name the columns you accept — `data: { name: req.body.name }` — or validate into a typed object first (`const input = UserUpdate.parse(req.body)`). Prisma will happily write any column in the model.',
  documentationLink: 'https://www.prisma.io/docs/orm/prisma-client/queries/crud',
});
