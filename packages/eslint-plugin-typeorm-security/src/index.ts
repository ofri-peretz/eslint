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

import { TSESLint, withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';
import { noMassAssignment } from './rules/no-mass-assignment';
import { noUnsafeQuery } from './rules/no-unsafe-query';
import { requireTls } from './rules/require-tls';

/**
 * Collection of all rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-mass-assignment': noMassAssignment,
  'no-unsafe-query': noUnsafeQuery,
  'require-tls': requireTls,
};

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-typeorm-security', rules);


/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-typeorm-security',
    version: '0.3.4',
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

export type { AllTypeORMRulesOptions, NoHardcodedCredentialsOptions, NoMassAssignmentOptions, NoUnsafeQueryOptions } from './types/index';
