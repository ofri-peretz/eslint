/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-mass-assignment — Drizzle CWE-915.
 *
 * Instantiates the shared detector (`createMassAssignmentRule` in
 * @interlace/eslint-devkit).
 *
 * Drizzle's writes are builder calls that take the row directly —
 * `.values(row)` on an insert, `.set(row)` on an update — so there is no
 * nested payload key.
 *
 * See docs/rules/no-mass-assignment.md.
 */

import { createMassAssignmentRule } from '@interlace/eslint-devkit';

export const noMassAssignment = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing an inbound request object straight to the database through Drizzle, which lets the caller set every column the model exposes.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-drizzle-security/docs/rules/no-mass-assignment.md',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['values', 'set'],
  payloadKeys: [],
  modules: ['drizzle-orm'],
  fix: 'Name the columns you accept — `.values({ name: req.body.name })` — or validate into a typed object first. Drizzle writes every key present on the object.',
  documentationLink: 'https://orm.drizzle.team/docs/insert',
});
