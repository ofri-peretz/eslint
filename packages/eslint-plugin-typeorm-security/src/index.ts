/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-typeorm-security
 *
 * ESLint plugin with security rules for TypeORM.
 *
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-typeorm-security
 */

import { TSESLint } from '@interlace/eslint-devkit';

import { noUnsafeQuery } from './rules/no-unsafe-query';

/**
 * Collection of all rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-unsafe-query': noUnsafeQuery,
};

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-typeorm-security',
    version: '0.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — the highest-signal rule(s) from this plugin, shippable
   * in a CI gate. Currently identical to `recommended`.
   */
  flagship: {
    plugins: { 'typeorm-security': plugin },
    rules: {
      'typeorm-security/no-unsafe-query': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Recommended preset — balanced security for most projects
   */
  recommended: {
    plugins: { 'typeorm-security': plugin },
    rules: {
      'typeorm-security/no-unsafe-query': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict preset — all rules as errors
   */
  strict: {
    plugins: { 'typeorm-security': plugin },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [`typeorm-security/${ruleName}`, 'error']),
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

export type { AllTypeORMRulesOptions, NoUnsafeQueryOptions } from './types/index';
