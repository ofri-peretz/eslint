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

/**
 * Options for `require-tls`.
 *
 * The rule takes none: which key disables TLS is fixed by the driver's own
 * config schema, not by project preference.
 */
export type RequireTlsOptions = [];

export interface AllKnexRulesOptions {
  'knex-security/no-unsafe-query': NoUnsafeQueryOptions;
  'knex-security/no-unscoped-mutation': NoUnscopedMutationOptions;
  'knex-security/require-tls': RequireTlsOptions;
}
