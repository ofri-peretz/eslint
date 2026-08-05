/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Options for `no-raw-identifier-interpolation`.
 *
 * The rule takes none. Which SQL positions can accept a bind parameter is
 * fixed by the database's grammar, not by project preference.
 */
export type NoRawIdentifierInterpolationOptions = [];

export type NoUnsafeQueryOptions = [];

/**
 * Options for `no-unscoped-mutation`.
 *
 * The rule takes none: what counts as a scoped mutation is fixed by the
 * driver's own API, not by project preference.
 */
export type NoUnscopedMutationOptions = [];

export interface AllPrismaRulesOptions {
  'prisma-security/no-raw-identifier-interpolation': NoRawIdentifierInterpolationOptions;
  'prisma-security/no-unsafe-query': NoUnsafeQueryOptions;
  'prisma-security/no-unscoped-mutation': NoUnscopedMutationOptions;
}
