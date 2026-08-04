/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

export type NoUnsafeQueryOptions = [];

/**
 * Options for `no-unscoped-mutation`.
 *
 * The rule takes none: what counts as a scoped mutation is fixed by the
 * driver's own API, not by project preference.
 */
export type NoUnscopedMutationOptions = [];

export interface AllPrismaRulesOptions {
  'prisma-security/no-unsafe-query': NoUnsafeQueryOptions;
  'prisma-security/no-unscoped-mutation': NoUnscopedMutationOptions;
}
