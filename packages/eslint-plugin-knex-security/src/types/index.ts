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

/**
 * Options for `no-hardcoded-credentials`.
 *
 * The rule takes none: a literal password is a literal password.
 */
export type NoHardcodedCredentialsOptions = [];

export type NoUnsafeQueryOptions = [];

/**
 * Options for `no-unscoped-mutation`.
 *
 * The rule takes none: what counts as a scoped mutation is fixed by the
 * driver's own API, not by project preference.
 */
export type NoUnscopedMutationOptions = [];

/**
 * Options for `require-tls`.
 *
 * The rule takes none: which key disables TLS is fixed by the driver's own
 * config schema, not by project preference.
 */
export type RequireTlsOptions = [];

export interface AllKnexRulesOptions {
  'knex-security/no-mass-assignment': NoMassAssignmentOptions;
  'knex-security/no-hardcoded-credentials': NoHardcodedCredentialsOptions;
  'knex-security/no-unsafe-query': NoUnsafeQueryOptions;
  'knex-security/no-unscoped-mutation': NoUnscopedMutationOptions;
  'knex-security/require-tls': RequireTlsOptions;
}
