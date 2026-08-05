/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

export type NoUnsafeQueryOptions = [];

/**
 * Options for `require-tls`.
 *
 * The rule takes none: which key disables TLS is fixed by the driver's own
 * config schema, not by project preference.
 */
export type RequireTlsOptions = [];

export interface AllTypeORMRulesOptions {
  'typeorm-security/no-unsafe-query': NoUnsafeQueryOptions;
  'typeorm-security/require-tls': RequireTlsOptions;
}
