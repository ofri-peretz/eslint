/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-mass-assignment — knex CWE-915.
 *
 * Instantiates the shared detector (`createMassAssignmentRule` in
 * @interlace/eslint-devkit).
 *
 * knex takes the row object directly on both write builders, so the
 * argument itself is the payload.
 *
 * See docs/rules/no-mass-assignment.md.
 */

import { createMassAssignmentRule } from '@interlace/eslint-devkit';

export const noMassAssignment = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing an inbound request object straight to the database through knex, which lets the caller set every column the model exposes.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-knex-security/docs/rules/no-mass-assignment.md',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['insert', 'update'],
  payloadKeys: [],
  receiverPattern: /^(knex|db|database|qb|builder|tx|trx)$|[Kk]nex$|[Dd]b$/,
  modules: ['knex'],
  fix: 'Name the columns you accept — `.insert({ name: req.body.name })` — or pick them explicitly before the call. knex inserts every key on the object.',
  documentationLink: 'https://knexjs.org/guide/query-builder.html#insert',
});
