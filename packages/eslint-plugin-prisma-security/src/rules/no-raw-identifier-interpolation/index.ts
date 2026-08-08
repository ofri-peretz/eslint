/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-raw-identifier-interpolation — Prisma CWE-89.
 *
 * Instantiates the shared detector (`createRawIdentifierRule` in
 * @interlace/eslint-devkit).
 *
 * Prisma is the sharpest case in the family, because it ships both spellings
 * and names one of them "Unsafe":
 *
 *     prisma.$queryRawUnsafe(`SELECT * FROM ${t}`)   // no-unsafe-query reports
 *     prisma.$queryRaw`SELECT * FROM ${t}`           // this rule reports
 *
 * A developer who moves from the first to the second — exactly what the
 * `Unsafe` suffix tells them to do — parameterizes every *value* in the query
 * and keeps the identifier hole wide open. Nothing in Prisma's own tooling
 * says so.
 *
 * See docs/rules/no-raw-identifier-interpolation.md.
 */

import { createRawIdentifierRule } from '@interlace/eslint-devkit';

export const noRawIdentifierInterpolation = createRawIdentifierRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow interpolating table, column or sort identifiers into a Prisma $queryRaw / $executeRaw template, where bind parameters cannot reach them.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-prisma-security/docs/rules/no-raw-identifier-interpolation.md',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  tags: ['$queryRaw', '$executeRaw'],
  // Not consulted: `$queryRaw` is specific enough to stand alone, and the
  // client is routinely re-exported from a local module, so demanding an
  // @prisma/client import in the same file would miss most real codebases.
  modules: ['@prisma/client'],
  requireImport: false,
  identifierHelpers: [],
  fix: 'Map the input through a fixed allowlist before it reaches the query — `const column = ALLOWED[input] ?? "id"`. Prisma has no identifier escaper, so an allowlist is the only safe construction.',
  sortDirectionFix: 'Resolve the direction to a literal: `const dir = input === "desc" ? "desc" : "asc"`, or move the sort into the type-safe `orderBy` argument.',
  documentationLink: 'https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries#considerations',
});
