/**
 * eslint-plugin-pg
 * 
 * ESLint plugin with security and best practices rules for the pg Node.js driver.
 * 
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg
 */

import { TSESLint } from '@interlace/eslint-devkit';

import { noUnsafeQuery } from './rules/no-unsafe-query';
import { noInsecureSsl } from './rules/no-insecure-ssl';
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';
import { checkQueryParams } from './rules/check-query-params';
import { noMissingClientRelease } from './rules/no-missing-client-release';
import { noTransactionOnPool } from './rules/no-transaction-on-pool';
import { noFloatingQuery } from './rules/no-floating-query';
import { noSelectAll } from './rules/no-select-all';
import { preferPoolQuery } from './rules/prefer-pool-query';
import { noBatchInsertLoop } from './rules/no-batch-insert-loop';
import { noUnsafeSearchPath } from './rules/no-unsafe-search-path';
import { noUnsafeCopyFrom } from './rules/no-unsafe-copy-from';
import { preventDoubleRelease } from './rules/prevent-double-release';

/**
 * Collection of all rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-unsafe-query': noUnsafeQuery,
  'no-insecure-ssl': noInsecureSsl,
  'no-hardcoded-credentials': noHardcodedCredentials,
  'check-query-params': checkQueryParams,
  'no-missing-client-release': noMissingClientRelease,
  'no-transaction-on-pool': noTransactionOnPool,
  'no-floating-query': noFloatingQuery,
  'no-select-all': noSelectAll,
  'prefer-pool-query': preferPoolQuery,
  'no-batch-insert-loop': noBatchInsertLoop,
  'no-unsafe-search-path': noUnsafeSearchPath,
  'no-unsafe-copy-from': noUnsafeCopyFrom,
  'prevent-double-release': preventDoubleRelease,
};

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-pg',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended preset - balanced security for most projects
   */
  recommended: {
    plugins: {
      'pg': plugin,
    },
    rules: {
      // Security rules (errors)
      'pg/no-unsafe-query': 'error',
      'pg/no-insecure-ssl': 'error',
      'pg/no-hardcoded-credentials': 'error',
      'pg/no-unsafe-search-path': 'error',
      'pg/no-unsafe-copy-from': 'error',
      'pg/no-transaction-on-pool': 'error',
      // Resource management (errors)
      'pg/no-missing-client-release': 'error',
      'pg/prevent-double-release': 'error',
      'pg/no-floating-query': 'error',
      // Quality (warnings)
      'pg/check-query-params': 'warn',
      'pg/no-select-all': 'warn',
      'pg/prefer-pool-query': 'warn',
      'pg/no-batch-insert-loop': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict preset - all rules as errors
   */
  strict: {
    plugins: {
      'pg': plugin,
    },
    rules: {
      'pg/no-unsafe-query': 'error',
      'pg/no-insecure-ssl': 'error',
      'pg/no-hardcoded-credentials': 'error',
      'pg/no-unsafe-search-path': 'error',
      'pg/no-unsafe-copy-from': 'error',
      'pg/no-transaction-on-pool': 'error',
      'pg/no-missing-client-release': 'error',
      'pg/prevent-double-release': 'error',
      'pg/no-floating-query': 'error',
      'pg/check-query-params': 'error',
      'pg/no-select-all': 'error',
      'pg/prefer-pool-query': 'error',
      'pg/no-batch-insert-loop': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

export default plugin;
