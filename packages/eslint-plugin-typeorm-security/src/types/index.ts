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
 * Options for `require-tls`.
 *
 * The rule takes none: which key disables TLS is fixed by the driver's own
 * config schema, not by project preference.
 */
export type RequireTlsOptions = [];

export interface AllTypeORMRulesOptions {
  'typeorm-security/no-mass-assignment': NoMassAssignmentOptions;
  'typeorm-security/no-unsafe-query': NoUnsafeQueryOptions;
  'typeorm-security/require-tls': RequireTlsOptions;
}
