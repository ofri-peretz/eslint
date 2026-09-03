/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Options for `no-hardcoded-credentials`.
 *
 * The rule takes none: a literal password is a literal password.
 */
export type NoHardcodedCredentialsOptions = [];

export type NoUnsafeQueryOptions = [];

/**
 * Options for `require-tls`.
 *
 * The rule takes none: which key disables TLS is fixed by the driver's own
 * config schema, not by project preference.
 */
export type RequireTlsOptions = [];

export interface AllMySQLRulesOptions {
  'mysql-security/no-hardcoded-credentials': NoHardcodedCredentialsOptions;
  'mysql-security/no-unsafe-query': NoUnsafeQueryOptions;
  'mysql-security/require-tls': RequireTlsOptions;
}
