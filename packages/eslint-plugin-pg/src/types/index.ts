/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

export type NoUnsafeQueryOptions = [];
export type NoInsecureSslOptions = [];
export type NoHardcodedCredentialsOptions = [];
export type NoInjectionInIdentifierOptions = [];
export type CheckQueryParamsOptions = [];
export type NoMissingClientReleaseOptions = [];
export type NoTransactionOnPoolOptions = [];
export type NoFloatingQueryOptions = [];
export type NoUselessClientOptions = [];
export type EnforceIdleTimeoutOptions = [];
export type NoSelectAllOptions = [];
export type PreferPoolQueryOptions = [];
export type NoBatchInsertLoopOptions = [];
export type PreferCursorForLargeResultsOptions = [];
export type NoTopLevelQueryOptions = [];
export type EnforceCamelcaseColumnsOptions = [];
export type ConnectOnceOptions = [];

// Phase 2
export type NoUnsafeSearchPathOptions = [];
export type NoUnsafeCopyFromOptions = [
  {
    /** Allow hardcoded file paths (for admin/migration scripts). Default: false */
    allowHardcodedPaths?: boolean;
    /** List of allowed file path patterns (regex strings) */
    allowedPaths?: string[];
  }?,
];
export type PreventDoubleReleaseOptions = [];

export interface AllPgRulesOptions {
  'pg/no-unsafe-query': NoUnsafeQueryOptions;
  'pg/no-insecure-ssl': NoInsecureSslOptions;
  'pg/no-hardcoded-credentials': NoHardcodedCredentialsOptions;
  'pg/no-injection-in-identifier': NoInjectionInIdentifierOptions;
  'pg/check-query-params': CheckQueryParamsOptions;
  'pg/no-missing-client-release': NoMissingClientReleaseOptions;
  'pg/no-transaction-on-pool': NoTransactionOnPoolOptions;
  'pg/no-floating-query': NoFloatingQueryOptions;
  'pg/no-useless-client': NoUselessClientOptions;
  'pg/enforce-idle-timeout': EnforceIdleTimeoutOptions;
  'pg/no-select-all': NoSelectAllOptions;
  'pg/prefer-pool-query': PreferPoolQueryOptions;
  'pg/no-batch-insert-loop': NoBatchInsertLoopOptions;
  'pg/prefer-cursor-for-large-results': PreferCursorForLargeResultsOptions;
  'pg/no-top-level-query': NoTopLevelQueryOptions;
  'pg/enforce-camelcase-columns': EnforceCamelcaseColumnsOptions;
  'pg/connect-once': ConnectOnceOptions;
  'pg/no-unsafe-search-path': NoUnsafeSearchPathOptions;
  'pg/no-unsafe-copy-from': NoUnsafeCopyFromOptions;
  'pg/prevent-double-release': PreventDoubleReleaseOptions;
}
