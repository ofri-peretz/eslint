/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-raw-identifier-interpolation — Drizzle CWE-89.
 *
 * Instantiates the shared detector (`createRawIdentifierRule` in
 * @interlace/eslint-devkit).
 *
 * This is the advisory shape: GHSA-gpj5-g38j-94v9 is `` sql`…` `` with an
 * identifier hole. Drizzle's own `eslint-plugin-drizzle` does not check it —
 * that package's entire published surface is the unscoped-delete rule.
 *
 * Unlike Prisma, Drizzle ships a real escaper, `sql.identifier()`, so the
 * remediation here can be a one-call fix rather than an allowlist. It is
 * exempt from the rule for the obvious reason: it is the answer.
 *
 * See docs/rules/no-raw-identifier-interpolation.md.
 */

import { createRawIdentifierRule } from '@interlace/eslint-devkit';

export const noRawIdentifierInterpolation = createRawIdentifierRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow interpolating table, column or sort identifiers into a Drizzle sql`` template, where bind parameters cannot reach them.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-drizzle-security/docs/rules/no-raw-identifier-interpolation.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  tags: ['sql'],
  modules: ['drizzle-orm'],
  // `sql` is a name any project may define, so it only counts when it is a
  // bare tag bound to a drizzle-orm import.
  requireImport: true,
  // Drizzle's composition surface, all of which produce SQL chunks rather than
  // spliced text. `sql.raw` is pointedly absent: it is the one member of this
  // family that does splice, so `${sql.raw(table)}` stays a finding.
  identifierHelpers: ['sql.identifier', 'sql.join', 'sql.fromList', 'sql.placeholder'],
  fix: 'Wrap the identifier in `sql.identifier(name)`, which quotes and escapes it, or map the input through a fixed allowlist first.',
  sortDirectionFix: 'Use Drizzle\'s `asc()` / `desc()` helpers on a known column, or resolve the direction to a literal: `input === "desc" ? "desc" : "asc"`.',
  documentationLink: 'https://orm.drizzle.team/docs/sql',
});
