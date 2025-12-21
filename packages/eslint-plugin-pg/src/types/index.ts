import { TSESLint } from '@interlace/eslint-devkit';

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
export type NoUnsafeCopyFromOptions = [];
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
