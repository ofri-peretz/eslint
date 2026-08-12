/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-postgresql-security
 * 
 * ESLint plugin with security and best practices rules for the pg Node.js driver.
 * 
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-postgresql-security
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
    name: 'eslint-plugin-postgresql-security',
    version: '2.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — exactly the rule(s) from this plugin that appear in
   * the ecosystem-wide flagship list (`.agent/flagship-rules.md`). Use this
   * when you want the highest-signal subset shippable in CI gates without
   * the noise of `recommended`.
   */
  flagship: {
    plugins: { 'postgresql-security': plugin, 'pg': plugin },
    rules: {
      'postgresql-security/no-unsafe-query': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Recommended preset - balanced security for most projects
   */
  recommended: {
    plugins: {
      'postgresql-security': plugin,
      // Deprecated alias — see the note in eslint-plugin-jwt-security. This
      // package publishes as `eslint-plugin-postgresql-security` but emitted
      // `pg/` prefixes, so registering under the package name failed.
      // Removed in the next major.
      'pg': plugin,
    },
    rules: {
      // Security rules (errors)
      'postgresql-security/no-unsafe-query': 'error',
      'postgresql-security/no-insecure-ssl': 'error',
      'postgresql-security/no-hardcoded-credentials': 'error',
      'postgresql-security/no-unsafe-search-path': 'error',
      'postgresql-security/no-unsafe-copy-from': 'error',
      'postgresql-security/no-transaction-on-pool': 'error',
      // Resource management (errors)
      'postgresql-security/no-missing-client-release': 'error',
      'postgresql-security/prevent-double-release': 'error',
      'postgresql-security/no-floating-query': 'error',
      // Quality (warnings)
      'postgresql-security/check-query-params': 'warn',
      'postgresql-security/no-select-all': 'warn',
      'postgresql-security/prefer-pool-query': 'warn',
      'postgresql-security/no-batch-insert-loop': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict preset - all rules as errors
   */
  strict: {
    plugins: {
      'postgresql-security': plugin,
      // Deprecated alias — see the note in eslint-plugin-jwt-security. This
      // package publishes as `eslint-plugin-postgresql-security` but emitted
      // `pg/` prefixes, so registering under the package name failed.
      // Removed in the next major.
      'pg': plugin,
    },
    rules: {
      'postgresql-security/no-unsafe-query': 'error',
      'postgresql-security/no-insecure-ssl': 'error',
      'postgresql-security/no-hardcoded-credentials': 'error',
      'postgresql-security/no-unsafe-search-path': 'error',
      'postgresql-security/no-unsafe-copy-from': 'error',
      'postgresql-security/no-transaction-on-pool': 'error',
      'postgresql-security/no-missing-client-release': 'error',
      'postgresql-security/prevent-double-release': 'error',
      'postgresql-security/no-floating-query': 'error',
      'postgresql-security/check-query-params': 'error',
      'postgresql-security/no-select-all': 'error',
      'postgresql-security/prefer-pool-query': 'error',
      'postgresql-security/no-batch-insert-loop': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

export default plugin;
