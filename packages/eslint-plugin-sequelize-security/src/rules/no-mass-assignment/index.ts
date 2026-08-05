/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-mass-assignment — Sequelize CWE-915.
 *
 * Instantiates the shared detector (`createMassAssignmentRule` in
 * @interlace/eslint-devkit).
 *
 * Sequelize takes the attributes as the first argument on every write
 * form, instance and static alike.
 *
 * See docs/rules/no-mass-assignment.md.
 */

import { createMassAssignmentRule } from '@interlace/eslint-devkit';

export const noMassAssignment = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing an inbound request object straight to the database through Sequelize, which lets the caller set every column the model exposes.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-sequelize-security/docs/rules/no-mass-assignment.md',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['create', 'update', 'bulkCreate', 'set', 'upsert'],
  payloadKeys: [],
  receiverPattern: /^(sequelize|db|database|model|Model|tx|trx)$|[Ss]equelize$|[Mm]odel$/,
  modules: ['sequelize', 'sequelize-typescript'],
  fix: 'Name the attributes you accept, or pass Sequelize\'s own allowlist — `User.create(req.body, { fields: [\'name\', \'email\'] })`, which is exactly what `fields` is for.',
  documentationLink: 'https://sequelize.org/docs/v6/core-concepts/model-instances/',
});
