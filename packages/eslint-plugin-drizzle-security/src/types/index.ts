/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Options for `no-mass-assignment`.
 *
 * The rule takes none. An allowlist option would let a project re-approve the
 * dangerous shape wholesale, one config file further from the call site.
 */
export type NoMassAssignmentOptions = [];

export type NoUnsafeQueryOptions = [];

/**
 * Options for `no-unscoped-mutation`.
 *
 * The rule takes none: what counts as a scoped mutation is fixed by the
 * driver's own API, not by project preference.
 */
export type NoUnscopedMutationOptions = [];

export interface AllDrizzleRulesOptions {
  'drizzle-security/no-mass-assignment': NoMassAssignmentOptions;
  'drizzle-security/no-unsafe-query': NoUnsafeQueryOptions;
  'drizzle-security/no-unscoped-mutation': NoUnscopedMutationOptions;
}
