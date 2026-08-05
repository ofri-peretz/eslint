/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-mass-assignment — TypeORM CWE-915.
 *
 * Instantiates the shared detector (`createMassAssignmentRule` in
 * @interlace/eslint-devkit).
 *
 * TypeORM's repository writes take the partial entity directly. `update`
 * takes it second, after the criteria, which the rule handles by checking
 * every argument rather than a fixed index.
 *
 * See docs/rules/no-mass-assignment.md.
 */

import { createMassAssignmentRule } from '@interlace/eslint-devkit';

export const noMassAssignment = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing an inbound request object straight to the database through TypeORM, which lets the caller set every column the model exposes.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-typeorm-security/docs/rules/no-mass-assignment.md',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['save', 'insert', 'update', 'create', 'merge', 'preload'],
  payloadKeys: [],
  modules: ['typeorm'],
  fix: 'Name the columns you accept, or build the entity explicitly and assign only the fields this endpoint owns. `save()` writes every property present on the object.',
  documentationLink: 'https://typeorm.io/repository-api',
});
